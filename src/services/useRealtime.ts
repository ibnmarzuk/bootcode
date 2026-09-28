import { useEffect, useRef, useState, useCallback } from 'react';
import { RealtimeRoomState } from '../types';
import { sounds } from './sound';

interface UseRealtimeOptions {
  gameId: string;
  role: 'host' | 'participant' | 'projector';
  participantId?: string;
  autoConnect?: boolean;
}

export function useRealtime({ gameId, role, participantId, autoConnect = true }: UseRealtimeOptions) {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [latency, setLatency] = useState<number>(14);
  const [roomState, setRoomState] = useState<RealtimeRoomState | null>(null);
  const [countdownTick, setCountdownTick] = useState<number | null>(null);
  const [lastSubmissionStatus, setLastSubmissionStatus] = useState<string | null>(null);
  const [serverTimeOffset, setServerTimeOffset] = useState<number>(0);

  const socketRef = useRef<WebSocket | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const prevQuestionIdRef = useRef<string | null>(null);
  const prevGameStatusRef = useRef<string | null>(null);

  const connect = useCallback(() => {
    if (!gameId) return;

    if (socketRef.current && (socketRef.current.readyState === WebSocket.OPEN || socketRef.current.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws`;

    try {
      const ws = new WebSocket(wsUrl);
      socketRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        // Subscribe to game room
        ws.send(JSON.stringify({
          type: 'JOIN_ROOM',
          data: { gameId, role, participantId }
        }));

        // Start ping heartbeat
        if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
              type: 'PING',
              data: { clientSentAt: Date.now() }
            }));
          }
        }, 3000);
      };

      ws.onmessage = (event) => {
        try {
          const { type, data } = JSON.parse(event.data);

          switch (type) {
            case 'PONG': {
              const now = Date.now();
              const rtt = now - (data.clientSentAt || now);
              setLatency(Math.max(4, Math.round(rtt)));
              // Calculate clock difference
              if (data.serverTime) {
                const estimatedServerTime = data.serverTime + (rtt / 2);
                setServerTimeOffset(estimatedServerTime - now);
              }
              break;
            }

            case 'GAME_STATE_UPDATE': {
              const state = data as RealtimeRoomState;
              setRoomState(state);

              // Sound triggers on state transitions
              if (state.currentQuestion && state.currentQuestion.id !== prevQuestionIdRef.current) {
                prevQuestionIdRef.current = state.currentQuestion.id;
                sounds.playTick();
              }

              if (state.gameStatus !== prevGameStatusRef.current) {
                if (state.gameStatus === 'LIVE') {
                  sounds.playStartHorn();
                } else if (state.gameStatus === 'QUESTION_RESULTS') {
                  if (state.revealedResult && (state as any).mySubmission) {
                    if ((state as any).mySubmission.isCorrect) {
                      sounds.playCorrect();
                    } else {
                      sounds.playWrong();
                    }
                  }
                }
                prevGameStatusRef.current = state.gameStatus;
              }
              break;
            }

            case 'COUNTDOWN_TICK': {
              setCountdownTick(data.count);
              sounds.playCountdownBeep();
              break;
            }

            case 'ANSWER_CONFIRMED': {
              setLastSubmissionStatus('CONFIRMED');
              sounds.playSelect();
              break;
            }

            case 'SUBMISSION_REJECTED': {
              setLastSubmissionStatus('REJECTED: ' + data.reason);
              break;
            }
          }
        } catch (e) {
          console.error('Error parsing WS message:', e);
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
        // Automatic reconnection attempt after 2 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, 2000);
      };

      ws.onerror = () => {
        ws.close();
      };
    } catch (e) {
      console.error('WS connection error:', e);
    }
  }, [gameId, role, participantId]);

  useEffect(() => {
    if (autoConnect) {
      connect();
    }
    return () => {
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [autoConnect, connect]);

  // Actions
  const submitAnswer = useCallback((questionId: string, selectedOption: 'A' | 'B' | 'C' | 'D') => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: 'SUBMIT_ANSWER',
        data: { gameId, questionId, selectedOption }
      }));
    }
  }, [gameId]);

  const hostStartGame = useCallback(() => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: 'HOST_START_GAME',
        data: { gameId }
      }));
    }
  }, [gameId]);

  const hostNextQuestion = useCallback(() => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: 'HOST_NEXT_QUESTION',
        data: { gameId }
      }));
    }
  }, [gameId]);

  const hostPauseGame = useCallback(() => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: 'HOST_PAUSE_GAME',
        data: { gameId }
      }));
    }
  }, [gameId]);

  const hostResumeGame = useCallback(() => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: 'HOST_RESUME_GAME',
        data: { gameId }
      }));
    }
  }, [gameId]);

  const hostEndGame = useCallback(() => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: 'HOST_END_GAME',
        data: { gameId }
      }));
    }
  }, [gameId]);

  const hostSetAnnouncement = useCallback((announcement: string) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: 'HOST_SET_ANNOUNCEMENT',
        data: { gameId, announcement }
      }));
    }
  }, [gameId]);

  const hostToggleLeaderboard = useCallback(() => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: 'HOST_TOGGLE_LEADERBOARD',
        data: { gameId }
      }));
    }
  }, [gameId]);

  return {
    isConnected,
    latency,
    roomState,
    countdownTick,
    lastSubmissionStatus,
    serverTimeOffset,
    submitAnswer,
    hostStartGame,
    hostNextQuestion,
    hostPauseGame,
    hostResumeGame,
    hostEndGame,
    hostSetAnnouncement,
    hostToggleLeaderboard
  };
}
