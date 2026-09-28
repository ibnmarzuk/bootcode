import React, { useState, useEffect, useCallback } from 'react';
import { Navigation, SimpleNavTab } from './components/Navigation';
import { HostControlRoom } from './components/HostControlRoom';
import { QuestionsAndAiManager } from './components/QuestionsAndAiManager';
import { GameManager } from './components/GameManager';
import { ResultsExport } from './components/ResultsExport';
import { ProjectorLobbyModal } from './components/ProjectorLobbyModal';
import { ParticipantExperience } from './components/ParticipantExperience';
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
import { Loader2 } from 'lucide-react';

export default function App() {
  const [loading, setLoading] = useState(true);
  const [currentTab, setCurrentTab] = useState<SimpleNavTab>('host');
  const [isParticipantMode, setIsParticipantMode] = useState<boolean>(false);
  const [initialJoinCode, setInitialJoinCode] = useState<string>('SA50AI');
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

  // Fetch initial database state
  const loadData = useCallback(async () => {
    try {
      const [evts, gms, qs, docs] = await Promise.all([
        api.getEvents(),
        api.getGames(),
        api.getQuestions(),
        api.getDocuments()
      ]);

      setEvents(evts);
      setGames(gms);
      setQuestions(qs);
      setDocuments(docs);

      if (gms.length > 0 && !selectedGameId) {
        const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
        const targetCode = initialJoinCode || urlParams?.get('join') || urlParams?.get('code');
        const matched = targetCode ? gms.find(g => g.joinCode?.toUpperCase() === targetCode.toUpperCase()) : null;
        setSelectedGameId(matched ? matched.id : gms[0].id);
      }
    } catch (err) {
      console.error('Failed to load initial data:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedGameId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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

  // Find active game object
  const activeGame = games.find(g => g.id === selectedGameId) || games[0];
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
        initialJoinCode={initialJoinCode || activeGame?.joinCode || 'SA50AI'}
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
