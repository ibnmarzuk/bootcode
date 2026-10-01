import React, { useState, useEffect, useCallback } from 'react';
import { Navigation, SimpleNavTab } from './components/Navigation';
import { HostControlRoom } from './components/HostControlRoom';
import { QuestionsAndAiManager } from './components/QuestionsAndAiManager';
import { GameManager } from './components/GameManager';
import { ResultsExport } from './components/ResultsExport';
import { ProjectorLobbyModal } from './components/ProjectorLobbyModal';
import { ParticipantExperience } from './components/ParticipantExperience';
import { OverviewDashboard } from './components/OverviewDashboard';
import { api } from './services/api';
import { useRealtime } from './services/useRealtime';
import { extractJoinCodeFromCurrentUrl } from './services/urlHelper';
import {
  QuizEvent,
  QuizGame,
  Question,
  DocumentItem,
  LeaderboardEntry,
  Participant
} from './types';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';

export default function App() {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const [currentTab, setCurrentTab] = useState<SimpleNavTab>('overview');
  const [isParticipantMode, setIsParticipantMode] = useState<boolean>(false);
  // Leave the code empty until the server data is loaded. The old hard-coded
  // demo code can point at a completed room after persisted data changes.
  const [initialJoinCode, setInitialJoinCode] = useState<string>('');
  const [publicAppUrl, setPublicAppUrl] = useState<string>('');

  // Entities
  const [events, setEvents] = useState<QuizEvent[]>([]);
  const [games, setGames] = useState<QuizGame[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);

  // Selected game for Host Room and Projector
  const [selectedGameId, setSelectedGameId] = useState<string>('');
  const [isProjectorOpen, setIsProjectorOpen] = useState(false);
  const [gameParticipants, setGameParticipants] = useState<Participant[]>([]);
  const [gameLeaderboard, setGameLeaderboard] = useState<LeaderboardEntry[]>([]);

  // Check URL parameters & hash for direct join from QR scan (e.g. ?join=SA50AI or ?pin=SA50AI)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const detectedCode = extractJoinCodeFromCurrentUrl();
      const modeParam = new URLSearchParams(window.location.search).get('mode');

      if (detectedCode) {
        setInitialJoinCode(detectedCode);
        setIsParticipantMode(true);
      } else if (modeParam === 'participant') {
        setIsParticipantMode(true);
      }

      // Fetch public server URL info for QR code rendering
      api.getAppInfo().then(info => {
        if (info.publicAppUrl) {
          setPublicAppUrl(info.publicAppUrl);
        }
      }).catch(() => {});
    }
  }, []);

  // Fetch initial database state with automatic retry & cache hydration
  const loadData = useCallback(async (isManual = false) => {
    if (isManual) setIsRetrying(true);
    try {
      const [evts, gms, qs, docs] = await Promise.all([
        api.getEvents(),
        api.getGames(),
        api.getQuestions(),
        api.getDocuments()
      ]);

      if (evts) setEvents(evts);
      if (gms) setGames(gms);
      if (qs) setQuestions(qs);
      if (docs) setDocuments(docs);
      setLoadError(null);

      setSelectedGameId(prev => {
        if (prev && gms?.some(g => g.id === prev)) return prev;
        if (!gms || gms.length === 0) return '';
        const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
        const targetCode = initialJoinCode || urlParams?.get('join') || urlParams?.get('code');
        const matched = targetCode ? gms.find(g => g.joinCode?.toUpperCase() === targetCode.toUpperCase()) : null;
        if (matched && matched.status !== 'COMPLETED' && matched.status !== 'ARCHIVED') {
          return matched.id;
        }

        const playable = gms.find(g => g.status !== 'COMPLETED' && g.status !== 'ARCHIVED');
        return playable?.id || gms[0].id;
      });
    } catch (err: any) {
      console.warn('[QuizTerm] Initial data loading will retry automatically:', err?.message || err);
      setLoadError(err?.message || 'Connecting to server...');
    } finally {
      setLoading(false);
      if (isManual) setIsRetrying(false);
    }
  }, [initialJoinCode]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Periodic automatic reconnection if initial load had an issue
  useEffect(() => {
    if (!loadError) return;
    const timer = setTimeout(() => {
      loadData();
    }, 2500);
    return () => clearTimeout(timer);
  }, [loadError, loadData]);

  // Load participants & leaderboard for selected game
  useEffect(() => {
    if (selectedGameId) {
      api.getParticipants(selectedGameId).then(setGameParticipants).catch(() => {});
      api.getLeaderboard(selectedGameId).then(setGameLeaderboard).catch(() => {});
    }
  }, [selectedGameId]);

  // Realtime hook for the host
  const {
    roomState,
    latency,
    hostStartGame,
    hostNextQuestion,
    hostPauseGame,
    hostResumeGame,
    hostEndGame,
    hostSetAnnouncement,
    hostToggleLeaderboard
  } = useRealtime({
    gameId: selectedGameId,
    role: 'host',
    autoConnect: !!selectedGameId
  });

  // Keep leaderboard in sync when roomState updates
  useEffect(() => {
    if (roomState?.leaderboard) {
      setGameLeaderboard(roomState.leaderboard);
    }
  }, [roomState?.leaderboard]);

  // Event handlers
  const handleSaveGame = async (game: Partial<QuizGame>) => {
    const saved = await api.saveGame(game);
    await loadData();
    setSelectedGameId(saved.id);
  };

  const handleDeleteGame = async (id: string) => {
    await api.deleteGame(id);
    await loadData();
  };

  const handleUpdateGameStatus = async (id: string, status: QuizGame['status']) => {
    await api.updateGameStatus(id, status);
    await loadData();
  };

  const handleSaveQuestion = async (q: Partial<Question>) => {
    await api.saveQuestion(q);
    await loadData();
  };

  const handleDeleteQuestion = async (id: string) => {
    await api.deleteQuestion(id);
    await loadData();
  };

  const handleUpdateQuestionStatus = async (id: string, status: Question['status']) => {
    await api.updateQuestionStatus(id, status);
    await loadData();
  };

  const handleUploadDocument = async (payload: { filename: string; rawText?: string; base64Content?: string }) => {
    const doc = await api.uploadDocument(payload);
    await loadData();
    return doc;
  };

  const handleDeleteDocument = async (id: string) => {
    await api.deleteDocument(id);
    await loadData();
  };

  const handleGenerateQuestions = async (options: {
    documentId?: string;
    count: number;
    difficulty?: string;
    category?: string;
    language?: string;
    autoApprove?: boolean;
    base64Pdf?: string;
    filename?: string;
  }) => {
    const res = await api.generateQuestions(options);
    await loadData();
    return res;
  };

  const handleSelectGameForHost = (gameId: string) => {
    setSelectedGameId(gameId);
    setCurrentTab('host');
  };

  const handleOpenProjectorLobby = (gameId: string) => {
    setSelectedGameId(gameId);
    setIsProjectorOpen(true);
  };

  // Find an active game object without surfacing completed history as the
  // current room when the host has not made an explicit selection.
  const playableGame = games.find(g => !['COMPLETED', 'ARCHIVED'].includes(g.status));
  const activeGame = games.find(g => g.id === selectedGameId) || playableGame || games[0];
  const activeEvent = activeGame ? events.find(e => e.id === activeGame.eventId) : events[0];

  if (loading) {
    return (
      <div className="min-h-screen bg-[#090d16] flex flex-col items-center justify-center font-mono text-emerald-400 space-y-3">
        <Loader2 className="w-8 h-8 animate-spin" />
        <div className="text-xs tracking-widest uppercase">LOADING QUIZTERM...</div>
      </div>
    );
  }

  // If in Participant Mobile View
  if (isParticipantMode) {
    return (
      <ParticipantExperience
        initialJoinCode={initialJoinCode || activeGame?.joinCode || ''}
        onExit={() => setIsParticipantMode(false)}
      />
    );
  }

  // Organizer Console
  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col selection:bg-emerald-500/30 selection:text-emerald-200">
      {/* Top Header & Navigation */}
      <Navigation
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        isParticipantMode={isParticipantMode}
        onToggleParticipantMode={setIsParticipantMode}
        activeGameCode={activeGame?.joinCode || 'SA50AI'}
        latency={latency}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-6">
        {loadError && (
          <div className="mb-4 bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 flex items-center justify-between text-xs text-amber-300">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Network sync in progress: {loadError}. Reconnecting automatically...</span>
            </div>
            <button
              onClick={() => loadData(true)}
              disabled={isRetrying}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 rounded text-amber-200 text-xs transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3 h-3 ${isRetrying ? 'animate-spin' : ''}`} />
              Retry Now
            </button>
          </div>
        )}

        {currentTab === 'overview' && (
          <OverviewDashboard
            documents={documents}
            questions={questions}
            games={games}
            activeGame={activeGame}
            onNavigate={setCurrentTab}
            onOpenProjector={() => activeGame ? setIsProjectorOpen(true) : setCurrentTab('games')}
            onToggleParticipant={() => setIsParticipantMode(true)}
          />
        )}

        {currentTab === 'host' && activeGame && (
          <HostControlRoom
            game={activeGame}
            questions={questions}
            roomState={roomState}
            latency={latency}
            publicServerUrl={publicAppUrl}
            onStartGame={hostStartGame}
            onPauseGame={hostPauseGame}
            onResumeGame={hostResumeGame}
            onNextQuestion={hostNextQuestion}
            onEndGame={hostEndGame}
            onSetAnnouncement={hostSetAnnouncement}
            onToggleLeaderboard={hostToggleLeaderboard}
            onOpenProjector={() => setIsProjectorOpen(true)}
            onTestJoin={(code) => {
              setInitialJoinCode(code);
              setIsParticipantMode(true);
            }}
          />
        )}

        {currentTab === 'host' && !activeGame && (
          <div className="bg-[#0f172a]/90 border border-slate-800 rounded-xl p-8 text-center max-w-lg mx-auto mt-12 space-y-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mx-auto font-mono text-xl">
              🎮
            </div>
            <h3 className="text-lg font-bold text-slate-100">No Competition Room Selected</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Create a new competition session in Game Manager or select an existing match to launch host controls.
            </p>
            <button
              onClick={() => setCurrentTab('games')}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer shadow-lg shadow-emerald-950/40"
            >
              Go to Game Manager
            </button>
          </div>
        )}

        {currentTab === 'questions' && (
          <QuestionsAndAiManager
            questions={questions}
            documents={documents}
            onSaveQuestion={handleSaveQuestion}
            onDeleteQuestion={handleDeleteQuestion}
            onUpdateQuestionStatus={handleUpdateQuestionStatus}
            onUploadDocument={handleUploadDocument}
            onDeleteDocument={handleDeleteDocument}
            onGenerateQuestions={handleGenerateQuestions}
          />
        )}

        {currentTab === 'games' && (
          <GameManager
            games={games}
            events={events}
            questions={questions}
            documents={documents}
            onSaveGame={handleSaveGame}
            onDeleteGame={handleDeleteGame}
            onUpdateGameStatus={handleUpdateGameStatus}
            onSelectGameForHost={handleSelectGameForHost}
            onOpenProjectorLobby={handleOpenProjectorLobby}
            onUploadDocument={handleUploadDocument}
            onGenerateQuestions={handleGenerateQuestions}
            onSaveQuestion={handleSaveQuestion}
          />
        )}

        {currentTab === 'results' && (
          <ResultsExport
            games={games}
            selectedGameId={selectedGameId}
            leaderboard={gameLeaderboard}
            onSelectGame={setSelectedGameId}
          />
        )}
      </main>

      {/* Fullscreen Projector Lobby Modal */}
      {activeGame && (
        <ProjectorLobbyModal
          game={activeGame}
          event={activeEvent}
          participants={gameParticipants}
          isOpen={isProjectorOpen}
          publicServerUrl={publicAppUrl}
          onClose={() => setIsProjectorOpen(false)}
          onStartGame={hostStartGame}
          onTestJoinOnThisDevice={(code) => {
            setInitialJoinCode(code);
            setIsParticipantMode(true);
            setIsProjectorOpen(false);
          }}
        />
      )}
    </div>
  );
}
