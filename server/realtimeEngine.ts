import { WebSocket } from 'ws';
import { db } from './db';
import {
  QuizGame,
  Question,
  Participant,
  RealtimeRoomState,
  ClientQuestion,
  LeaderboardEntry
} from '../src/types';

interface ConnectedClient {
  ws: WebSocket;
  role: 'host' | 'participant' | 'projector';
  gameId: string;
  participantId?: string;
  lastPingAt: number;
}

export class RealtimeEngine {
  private clients: Map<WebSocket, ConnectedClient> = new Map();
  private gameTimers: Map<string, NodeJS.Timeout> = new Map();
  private countdownTimers: Map<string, NodeJS.Timeout> = new Map();

  // Active question runtime state per gameId
  private activeQuestionState: Map<
    string,
    {
      question: Question;
      questionNumber: number;
      startTime: number;
      endTime: number;
      timeLimit: number;
      isLocked: boolean;
      answeredParticipantIds: Set<string>;
    }
  > = new Map();

  // Host announcements
  private announcements: Map<string, string> = new Map();

  // Host override for showing leaderboard
  private hostLeaderboardVisible: Map<string, boolean> = new Map();

  registerClient(ws: WebSocket): void {
    this.clients.set(ws, {
      ws,
      role: 'participant',
      gameId: '',
      lastPingAt: Date.now()
    });

    ws.on('close', () => {
      this.handleDisconnect(ws);
    });

    ws.on('error', (err) => {
      console.warn('WebSocket client error:', err.message);
      this.handleDisconnect(ws);
    });
  }

  private handleDisconnect(ws: WebSocket): void {
    const client = this.clients.get(ws);
    if (!client) return;

    if (client.participantId) {
      db.setParticipantConnection(client.participantId, false);
      this.broadcastRoomState(client.gameId);
    }

    this.clients.delete(ws);
  }

  handleMessage(ws: WebSocket, raw: string): void {
    let payload: any;
    try {
      payload = JSON.parse(raw);
    } catch {
      return;
    }

    const client = this.clients.get(ws);
    if (!client) return;

    const { type, data } = payload;

    switch (type) {
      case 'PING': {
        client.lastPingAt = Date.now();
        this.send(ws, 'PONG', {
          serverTime: Date.now(),
          clientSentAt: data?.clientSentAt
        });
        break;
      }

      case 'JOIN_ROOM': {
        const { gameId, role, participantId } = data || {};
        const game = db.getGameById(gameId) || db.getGameByJoinCode(gameId);
        if (!game) {
          this.send(ws, 'ERROR', { message: 'Game not found' });
          return;
        }

        client.gameId = game.id;
        client.role = role === 'host' || role === 'projector' ? role : 'participant';
        client.participantId = participantId;

        if (participantId) {
          db.setParticipantConnection(participantId, true);
        }

        this.send(ws, 'ROOM_JOINED', {
          gameId: game.id,
          role: client.role,
          participantId: client.participantId,
          serverTime: Date.now()
        });

        // Broadcast updated room state to all in this game
        this.broadcastRoomState(game.id);
        break;
      }

      case 'SUBMIT_ANSWER': {
        this.handleAnswerSubmission(ws, client, data);
        break;
      }

      // Host controls
      case 'HOST_START_GAME': {
        if (client.role !== 'host') return;
        this.hostStartGame(client.gameId);
        break;
      }

      case 'HOST_NEXT_QUESTION': {
        if (client.role !== 'host') return;
        this.hostNextQuestion(client.gameId);
        break;
      }

      case 'HOST_PAUSE_GAME': {
        if (client.role !== 'host') return;
        this.hostPauseGame(client.gameId);
        break;
      }

      case 'HOST_RESUME_GAME': {
        if (client.role !== 'host') return;
        this.hostResumeGame(client.gameId);
        break;
      }

      case 'HOST_END_GAME': {
        if (client.role !== 'host') return;
        this.hostEndGame(client.gameId);
        break;
      }

      case 'HOST_SET_ANNOUNCEMENT': {
        if (client.role !== 'host') return;
        this.announcements.set(client.gameId, data?.announcement || '');
        this.broadcastRoomState(client.gameId);
        break;
      }

      case 'HOST_TOGGLE_LEADERBOARD': {
        if (client.role !== 'host') return;
        const current = this.hostLeaderboardVisible.get(client.gameId) ?? false;
        this.hostLeaderboardVisible.set(client.gameId, !current);
        this.broadcastRoomState(client.gameId);
        break;
      }
    }
  }

  private handleAnswerSubmission(
    ws: WebSocket,
    client: ConnectedClient,
    data: { gameId: string; questionId: string; selectedOption: 'A' | 'B' | 'C' | 'D' }
  ): void {
    const { gameId, questionId, selectedOption } = data || {};
    const participantId = client.participantId;

    if (
      !participantId ||
      !gameId ||
      client.gameId !== gameId ||
      !questionId ||
      !(['A', 'B', 'C', 'D'] as const).includes(selectedOption)
    ) {
      this.send(ws, 'SUBMISSION_REJECTED', { reason: 'Missing submission parameters' });
      return;
    }

    const participant = db.getParticipants(gameId).find(p => p.id === participantId);
    if (!participant) {
      this.send(ws, 'SUBMISSION_REJECTED', { reason: 'Participant is not registered in this game' });
      return;
    }

    const activeState = this.activeQuestionState.get(gameId);
    if (!activeState || activeState.question.id !== questionId) {
      this.send(ws, 'SUBMISSION_REJECTED', { reason: 'Question is not currently active' });
      return;
    }

    const now = Date.now();
    // Server authoritative time check (granting 350ms network jitter grace period)
    if (now > activeState.endTime + 350 || activeState.isLocked) {
      this.send(ws, 'SUBMISSION_REJECTED', { reason: 'Question time has expired' });
      return;
    }

    if (activeState.answeredParticipantIds.has(participantId)) {
      this.send(ws, 'SUBMISSION_REJECTED', { reason: 'Answer already submitted for this question' });
      return;
    }

    // Mark as answered
    activeState.answeredParticipantIds.add(participantId);

    const question = activeState.question;
    const isCorrect = question.correctAnswer === selectedOption;
    const game = db.getGameById(gameId);
    const pointsAwarded = isCorrect ? (game?.pointsPerCorrect ?? 1) : 0;
    const responseTimeMs = Math.max(50, now - activeState.startTime);

    // Authoritative recording in database
    db.recordAnswer({
      participantId,
      gameId,
      questionId,
      selectedOption,
      responseTimeMs,
      isCorrect,
      pointsAwarded,
      submittedAt: new Date(now).toISOString()
    });

    this.send(ws, 'ANSWER_CONFIRMED', {
      questionId,
      selectedOption,
      responseTimeMs,
      status: 'LOCKED'
    });

    // Check if all connected participants in this room have answered
    const connectedParticipants = this.getConnectedParticipantCount(gameId);
    if (activeState.answeredParticipantIds.size >= connectedParticipants && connectedParticipants > 0) {
      // Early trigger lock if everyone has submitted
      this.lockCurrentQuestion(gameId);
    } else {
      this.broadcastRoomState(gameId);
    }
  }

  // --- GAME LIFECYCLE CONTROLS ---

  private hostStartGame(gameId: string): void {
    const game = db.getGameById(gameId);
    if (!game || game.questionIds.length === 0) return;

    db.updateGameStatus(gameId, 'COUNTDOWN');
    game.currentQuestionIndex = 0;
    db.saveGame(game);

    let count = 3;
    this.broadcast(gameId, 'COUNTDOWN_TICK', { count });

    const interval = setInterval(() => {
      count -= 1;
      if (count > 0) {
        this.broadcast(gameId, 'COUNTDOWN_TICK', { count });
      } else {
        clearInterval(interval);
        this.startQuestion(gameId, 0);
      }
    }, 1000);

    this.countdownTimers.set(gameId, interval);
  }

  private startQuestion(gameId: string, questionIndex: number): void {
    const game = db.getGameById(gameId);
    if (!game) return;

    if (questionIndex >= game.questionIds.length) {
      this.hostEndGame(gameId);
      return;
    }

    const questionId = game.questionIds[questionIndex];
    const question = db.getQuestionById(questionId);
    if (!question) {
      this.hostEndGame(gameId);
      return;
    }

    // Clear any existing timers
    const existing = this.gameTimers.get(gameId);
    if (existing) clearTimeout(existing);

    // Authoritative calculation of question time limit:
    // 1. Custom per-question time limit configured in game (e.g., 5s, 10s, 30s)
    // 2. Question-type time limit configured in game (e.g. MULTIPLE_CHOICE, TRUE_FALSE, CODE_ANALYSIS)
    // 3. Difficulty time limit configured in game (EASY, MEDIUM, HARD)
    // 4. Question's individual timeLimit setting
    // 5. Game-level default timePerQuestion
    // 6. Safe fallback 5s
    const timeLimit =
      (game.customQuestionTimeLimits && game.customQuestionTimeLimits[question.id]) ||
      (game.questionTypeTimeLimits && question.questionType && game.questionTypeTimeLimits[question.questionType]) ||
      (game.difficultyTimeLimits && question.difficulty && game.difficultyTimeLimits[question.difficulty]) ||
      question.timeLimit ||
      game.timePerQuestion ||
      5;
    const now = Date.now();
    const startTime = now;
    const endTime = now + timeLimit * 1000;

    game.currentQuestionIndex = questionIndex;
    db.updateGameStatus(gameId, 'LIVE');
    db.saveGame(game);

    this.activeQuestionState.set(gameId, {
      question,
      questionNumber: questionIndex + 1,
      startTime,
      endTime,
      timeLimit,
      isLocked: false,
      answeredParticipantIds: new Set()
    });

    this.broadcastRoomState(gameId);

    // Schedule authoritative server expiration
    const timer = setTimeout(() => {
      this.lockCurrentQuestion(gameId);
    }, timeLimit * 1000);

    this.gameTimers.set(gameId, timer);
  }

  private lockCurrentQuestion(gameId: string): void {
    const activeState = this.activeQuestionState.get(gameId);
    if (!activeState || activeState.isLocked) return;

    activeState.isLocked = true;
    const existing = this.gameTimers.get(gameId);
    if (existing) clearTimeout(existing);

    // Tally unanswered participants
    const participants = db.getParticipants(gameId);
    for (const p of participants) {
      if (!activeState.answeredParticipantIds.has(p.id)) {
        db.recordUnanswered(p.id, gameId, activeState.question.id);
      }
    }

    db.updateGameStatus(gameId, 'QUESTION_LOCKED');
    this.broadcastRoomState(gameId);

    // Transition to reveal results / explanation phase for 3.5 seconds
    setTimeout(() => {
      const g = db.getGameById(gameId);
      if (g && g.status === 'QUESTION_LOCKED') {
        db.updateGameStatus(gameId, 'QUESTION_RESULTS');
        this.broadcastRoomState(gameId);

        // Auto-advance to next question after 4 seconds of result review
        setTimeout(() => {
          const freshGame = db.getGameById(gameId);
          if (freshGame && freshGame.status === 'QUESTION_RESULTS') {
            this.startQuestion(gameId, freshGame.currentQuestionIndex + 1);
          }
        }, 4000);
      }
    }, 1500);
  }

  private hostNextQuestion(gameId: string): void {
    const game = db.getGameById(gameId);
    if (!game) return;
    this.startQuestion(gameId, game.currentQuestionIndex + 1);
  }

  private hostPauseGame(gameId: string): void {
    const timer = this.gameTimers.get(gameId);
    if (timer) clearTimeout(timer);
    db.updateGameStatus(gameId, 'PAUSED');
    this.broadcastRoomState(gameId);
  }

  private hostResumeGame(gameId: string): void {
    const game = db.getGameById(gameId);
    if (!game) return;
    // Resume current question with fresh timer
    this.startQuestion(gameId, game.currentQuestionIndex);
  }

  private hostEndGame(gameId: string): void {
    const timer = this.gameTimers.get(gameId);
    if (timer) clearTimeout(timer);
    const countdown = this.countdownTimers.get(gameId);
    if (countdown) clearInterval(countdown);

    this.activeQuestionState.delete(gameId);
    db.updateGameStatus(gameId, 'COMPLETED');
    this.broadcastRoomState(gameId);
  }

  // --- ROOM STATE BROADCASTING ---

  broadcastRoomState(gameId: string): void {
    const game = db.getGameById(gameId);
    if (!game) return;

    const participants = db.getParticipants(gameId);
    const activeState = this.activeQuestionState.get(gameId);
    const serverTime = Date.now();
    const leaderboard = db.calculateLeaderboard(gameId);

    const hostAnnouncement = this.announcements.get(gameId) || '';
    const hostToggle = this.hostLeaderboardVisible.get(gameId);

    // Determine whether leaderboard is visible to participants
    let leaderboardVisible = false;
    if (hostToggle !== undefined) {
      leaderboardVisible = hostToggle;
    } else if (game.status === 'COMPLETED') {
      leaderboardVisible = true;
    } else if (game.leaderboardVisibility === 'AFTER_EACH' && (game.status === 'QUESTION_LOCKED' || game.status === 'QUESTION_RESULTS')) {
      leaderboardVisible = true;
    } else if (game.leaderboardVisibility === 'EVERY_5' && (game.currentQuestionIndex + 1) % 5 === 0 && (game.status === 'QUESTION_LOCKED' || game.status === 'QUESTION_RESULTS')) {
      leaderboardVisible = true;
    }

    // Calculate option stats for revealed results
    let revealedResult: RealtimeRoomState['revealedResult'] = undefined;
    if (activeState && (game.status === 'QUESTION_RESULTS' || game.status === 'COMPLETED' || activeState.isLocked)) {
      const answers = db.getAnswers(gameId, activeState.question.id);
      const stats: Record<'A' | 'B' | 'C' | 'D', number> = { A: 0, B: 0, C: 0, D: 0 };
      answers.forEach(a => {
        if (stats[a.selectedOption] !== undefined) {
          stats[a.selectedOption]++;
        }
      });
      revealedResult = {
        questionId: activeState.question.id,
        correctAnswer: activeState.question.correctAnswer,
        explanation: activeState.question.explanation,
        optionStats: stats
      };
    }

    // Deliver client-safe question (NEVER leak correctAnswer during active state!)
    let currentQuestion: ClientQuestion | null = null;
    if (activeState && (game.status === 'LIVE' || game.status === 'QUESTION_LOCKED' || game.status === 'QUESTION_RESULTS')) {
      currentQuestion = {
        id: activeState.question.id,
        number: activeState.questionNumber,
        total: game.questionIds.length,
        text: activeState.question.text,
        options: activeState.question.options,
        category: activeState.question.category,
        difficulty: activeState.question.difficulty,
        points: activeState.question.points,
        timeLimit: activeState.timeLimit,
        startTime: activeState.startTime,
        endTime: activeState.endTime
      };
    }

    const answeredCount = activeState ? activeState.answeredParticipantIds.size : 0;
    const connectedParticipantsCount = participants.filter(p => p.isConnected).length;

    // Send personalized room state to each connected client
    for (const [ws, client] of this.clients.entries()) {
      if (client.gameId !== gameId) continue;

      const isHostOrProjector = client.role === 'host' || client.role === 'projector';

      // Check if this specific participant has answered the current question
      let mySubmission: any = null;
      if (client.participantId && activeState) {
        const hasAnswered = activeState.answeredParticipantIds.has(client.participantId);
        if (hasAnswered) {
          const answers = db.getAnswers(gameId, activeState.question.id);
          const mine = answers.find(a => a.participantId === client.participantId);
          if (mine) {
            mySubmission = {
              selectedOption: mine.selectedOption,
              isCorrect: activeState.isLocked || game.status === 'QUESTION_RESULTS' ? mine.isCorrect : undefined,
              pointsAwarded: mine.pointsAwarded
            };
          }
        }
      }

      // Find my participant stats
      const myStats = client.participantId
        ? participants.find(p => p.id === client.participantId)
        : null;

      const payload: RealtimeRoomState & { mySubmission?: any; myStats?: any; isHost?: boolean } = {
        gameId: game.id,
        joinCode: game.joinCode,
        gameStatus: game.status,
        currentQuestionIndex: game.currentQuestionIndex,
        totalQuestions: game.questionIds.length,
        currentQuestion,
        serverTime,
        startTime: activeState?.startTime,
        endTime: activeState?.endTime,
        answeredCount,
        connectedParticipantsCount,
        hostAnnouncement,
        leaderboardVisible: isHostOrProjector || leaderboardVisible,
        revealedResult: isHostOrProjector || revealedResult ? revealedResult : undefined,
        leaderboard: (isHostOrProjector || leaderboardVisible) ? leaderboard : [],
        mySubmission,
        myStats,
        isHost: isHostOrProjector
      };

      this.send(ws, 'GAME_STATE_UPDATE', payload);
    }
  }

  private getConnectedParticipantCount(gameId: string): number {
    let count = 0;
    for (const client of this.clients.values()) {
      if (client.gameId === gameId && client.role === 'participant') {
        count++;
      }
    }
    return count;
  }

  private broadcast(gameId: string, type: string, data: any): void {
    for (const [ws, client] of this.clients.entries()) {
      if (client.gameId === gameId) {
        this.send(ws, type, data);
      }
    }
  }

  private send(ws: WebSocket, type: string, data: any): void {
    if (ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify({ type, data }));
      } catch (e) {
        console.warn('Failed to send WS message:', e);
      }
    }
  }
}

export const realtimeEngine = new RealtimeEngine();
