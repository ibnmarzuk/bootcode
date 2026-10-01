import React, { useState, useEffect, useRef } from 'react';
import {
  Smartphone,
  CheckCircle2,
  XCircle,
  Clock,
  Trophy,
  Users,
  Radio,
  ArrowRight,
  RotateCcw,
  Sparkles,
  Dice5,
  Check
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useRealtime } from '../services/useRealtime';
import { api } from '../services/api';
import { Participant, QuizGame } from '../types';

interface ParticipantExperienceProps {
  initialJoinCode?: string;
}

const funNames = [
  { first: 'Leo', user: 'leo_fast' },
  { first: 'Zara', user: 'zara_pro' },
  { first: 'Tunde', user: 'tunde_dev' },
  { first: 'Amina', user: 'amina_ai' },
  { first: 'Kofi', user: 'kofi_star' },
  { first: 'Maya', user: 'maya_quiz' }
];

export const ParticipantExperience: React.FC<ParticipantExperienceProps> = ({
  initialJoinCode = ''
}) => {
  // Join form state
  const [joinCode, setJoinCode] = useState(initialJoinCode);
  const [firstName, setFirstName] = useState('');
  const [username, setUsername] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const [verifiedGame, setVerifiedGame] = useState<QuizGame | null>(null);
  const [isValidatingCode, setIsValidatingCode] = useState(false);

  // Sync initialJoinCode from URL params or host selection
  useEffect(() => {
    if (initialJoinCode) {
      setJoinCode(initialJoinCode.toUpperCase());
    }
  }, [initialJoinCode]);

  // Live lookup of game by join code
  useEffect(() => {
    const cleanCode = joinCode.trim().toUpperCase();
    if (!cleanCode || cleanCode.length < 4) {
      setVerifiedGame(null);
      return;
    }

    let isSubscribed = true;
    setIsValidatingCode(true);

    api.getGameByCode(cleanCode)
      .then(g => {
        if (isSubscribed) {
          setVerifiedGame(g);
          setErrorMsg(null);
        }
      })
      .catch(() => {
        if (isSubscribed) {
          setVerifiedGame(null);
        }
      })
      .finally(() => {
        if (isSubscribed) setIsValidatingCode(false);
      });

    return () => { isSubscribed = false; };
  }, [joinCode]);

  // Active Session
  const [participant, setParticipant] = useState<Participant | null>(() => {
    try {
      const stored = localStorage.getItem('quizterm_participant');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [activeGame, setActiveGame] = useState<QuizGame | null>(() => {
    try {
      const stored = localStorage.getItem('quizterm_game');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  // Local answer selection
  const [selectedOption, setSelectedOption] = useState<'A' | 'B' | 'C' | 'D' | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(5);

  const prevQuestionIdRef = useRef<string | null>(null);
  const hasTriggeredConfettiRef = useRef<boolean>(false);

  // Quick random name generator helper
  const handleRandomName = () => {
    const pick = funNames[Math.floor(Math.random() * funNames.length)];
    const randSuffix = Math.floor(Math.random() * 90) + 10;
    setFirstName(pick.first);
    setUsername(`${pick.user}_${randSuffix}`);
  };

  const executeJoin = async (targetCode: string, targetFirst: string, targetUser: string) => {
    setIsJoining(true);
    setErrorMsg(null);
    try {
      const res = await api.joinGame({
        joinCode: targetCode.trim().toUpperCase(),
        firstName: targetFirst.trim(),
        username: targetUser.trim().toLowerCase()
      });

      setParticipant(res.participant);
      setActiveGame(res.game);
      localStorage.setItem('quizterm_participant', JSON.stringify(res.participant));
      localStorage.setItem('quizterm_game', JSON.stringify(res.game));
    } catch (err: any) {
      setErrorMsg(err.message || 'Game not found. Check the PIN and try again.');
    } finally {
      setIsJoining(false);
    }
  };

  // Quick 1-tap join: auto fills random name if empty and joins immediately
  const handleQuickJoin = async () => {
    const code = joinCode.trim().toUpperCase();
    if (!code) {
      setErrorMsg('Please enter or scan an access PIN.');
      return;
    }

    let fName = firstName.trim();
    let uName = username.trim();
    if (!fName || !uName) {
      const pick = funNames[Math.floor(Math.random() * funNames.length)];
      const randSuffix = Math.floor(Math.random() * 90) + 10;
      fName = pick.first;
      uName = `${pick.user}_${randSuffix}`;
      setFirstName(fName);
      setUsername(uName);
    }

    await executeJoin(code, fName, uName);
  };

  // WebSocket realtime hook
  const {
    roomState,
    countdownTick,
    submitAnswer
  } = useRealtime({
    gameId: activeGame?.id || '',
    role: 'participant',
    participantId: participant?.id,
    autoConnect: !!activeGame?.id
  });

  // Handle countdown calculation from server authoritative timestamps
  useEffect(() => {
    if (!roomState?.endTime || roomState.gameStatus !== 'LIVE') {
      return;
    }

    const updateRemaining = () => {
      const now = Date.now();
      const diff = Math.max(0, Math.ceil((roomState.endTime! - now) / 1000));
      setRemainingSeconds(diff);
    };

    updateRemaining();
    const interval = setInterval(updateRemaining, 200);
    return () => clearInterval(interval);
  }, [roomState?.endTime, roomState?.gameStatus]);

  // Reset answer when a new question arrives
  useEffect(() => {
    if (roomState?.currentQuestion) {
      if (roomState.currentQuestion.id !== prevQuestionIdRef.current) {
        prevQuestionIdRef.current = roomState.currentQuestion.id;
        setSelectedOption(null);
      }
    }
  }, [roomState?.currentQuestion]);

  // Sync if already answered on reconnect
  useEffect(() => {
    if ((roomState as any)?.mySubmission?.selectedOption) {
      setSelectedOption((roomState as any).mySubmission.selectedOption);
    }
  }, [roomState]);

  // Confetti on game complete
  useEffect(() => {
    if (roomState?.gameStatus === 'COMPLETED' && !hasTriggeredConfettiRef.current) {
      hasTriggeredConfettiRef.current = true;
      try {
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.6 }
        });
      } catch {}
    }
  }, [roomState?.gameStatus]);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const code = joinCode.trim().toUpperCase();
    const fName = firstName.trim();
    const uName = username.trim().toLowerCase();

    if (!code || !fName || !uName) {
      setErrorMsg('Please enter your name and join code.');
      return;
    }

    setIsJoining(true);
    try {
      const res = await api.joinGame({
        joinCode: code,
        firstName: fName,
        username: uName
      });

      setParticipant(res.participant);
      setActiveGame(res.game);
      localStorage.setItem('quizterm_participant', JSON.stringify(res.participant));
      localStorage.setItem('quizterm_game', JSON.stringify(res.game));
    } catch (err: any) {
      setErrorMsg(err.message || 'Game not found. Check the code and try again.');
    } finally {
      setIsJoining(false);
    }
  };

  const handleSelectOption = (opt: 'A' | 'B' | 'C' | 'D') => {
    if (selectedOption || !roomState?.currentQuestion || roomState.gameStatus !== 'LIVE' || remainingSeconds <= 0) {
      return;
    }

    setSelectedOption(opt);
    submitAnswer(roomState.currentQuestion.id, opt);
  };

  const handleLeaveSession = () => {
    localStorage.removeItem('quizterm_participant');
    localStorage.removeItem('quizterm_game');
    setParticipant(null);
    setActiveGame(null);
    setSelectedOption(null);
  };

  // 1. JOIN SCREEN
  if (!participant || !activeGame) {
    return (
      <div className="min-h-screen bg-[#090d16] text-white flex flex-col justify-between p-4 sm:p-6 terminal-grid">
        {/* Top bar with quick exit/switch */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="font-bold text-sm tracking-wide text-white">QUIZTERM</span>
          </div>

        </div>

        {/* Friendly Join Form */}
        <div className="w-full max-w-sm mx-auto my-auto py-6">
          <div className="rounded-2xl border border-slate-800/90 bg-slate-900/95 backdrop-blur-xl p-6 shadow-2xl space-y-5">
            <div className="text-center space-y-1">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto mb-2 shadow-inner">
                <Smartphone className="w-7 h-7" />
              </div>
              <h2 className="text-2xl font-black text-white tracking-tight">Join the Quiz</h2>
            <p className="text-xs text-slate-400">
              {verifiedGame ? 'Access PIN verified • Enter your name to enter the arena' : 'Enter your name to jump into the competition'}
            </p>
          </div>

          {/* Scanned Game Access PIN Verification Card */}
          {verifiedGame ? (
            <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/40 text-left space-y-1.5 shadow-lg shadow-emerald-500/5 animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold text-emerald-400 flex items-center space-x-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>ACCESS PIN VERIFIED VIA QR SCAN</span>
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                  {verifiedGame.status}
                </span>
              </div>
              <div className="text-base font-bold text-white leading-tight">
                {verifiedGame.name}
              </div>
              <div className="text-[11px] text-slate-400 font-mono flex items-center space-x-2 pt-0.5">
                <span>PIN: <strong className="text-emerald-400">{verifiedGame.joinCode}</strong></span>
                <span>•</span>
                <span>{verifiedGame.questionIds?.length || 0} Questions</span>
                <span>•</span>
                <span>{verifiedGame.timePerQuestion}s Timer</span>
              </div>
            </div>
          ) : joinCode.trim().length >= 4 && !isValidatingCode ? (
            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-400 text-center">
              Target PIN: <strong className="text-emerald-400">{joinCode.toUpperCase()}</strong>
            </div>
          ) : null}

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-950/70 border border-rose-800 text-rose-300 text-xs font-medium">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleJoin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center justify-between">
                <span>Game Access PIN</span>
                {verifiedGame && (
                  <span className="text-[10px] text-emerald-400 font-mono flex items-center space-x-1">
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span>PIN Active</span>
                  </span>
                )}
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="e.g. SA50AI"
                  maxLength={8}
                  className={`w-full px-4 py-3 rounded-xl bg-slate-950 border text-emerald-400 font-mono text-xl font-bold tracking-widest uppercase focus:outline-none text-center ${
                    verifiedGame ? 'border-emerald-500/60 ring-1 ring-emerald-500/30' : 'border-slate-700 focus:border-emerald-500'
                  }`}
                />
                {verifiedGame && (
                  <div className="absolute right-3 top-3.5 text-emerald-400">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                )}
              </div>

              {/* 1-tap quick code chips shown only if not already verified */}
              {!verifiedGame && (
                <div className="flex items-center justify-center space-x-1.5 pt-2 text-[11px] font-mono">
                  <span className="text-slate-500">Sample PINs:</span>
                  <button
                    type="button"
                    onClick={() => setJoinCode('SA50AI')}
                    className={`px-2 py-0.5 rounded-md border transition-all ${
                      joinCode === 'SA50AI'
                        ? 'bg-emerald-500 text-slate-950 font-bold border-emerald-400'
                        : 'bg-slate-900 border-slate-800 text-emerald-400 hover:border-emerald-500/40'
                    }`}
                  >
                    SA50AI
                  </button>
                  <button
                    type="button"
                    onClick={() => setJoinCode('BLITZ20')}
                    className={`px-2 py-0.5 rounded-md border transition-all ${
                      joinCode === 'BLITZ20'
                        ? 'bg-blue-500 text-slate-950 font-bold border-blue-400'
                        : 'bg-slate-900 border-slate-800 text-blue-400 hover:border-blue-500/40'
                    }`}
                  >
                    BLITZ20
                  </button>
                  <button
                    type="button"
                    onClick={() => setJoinCode('CUP30')}
                    className={`px-2 py-0.5 rounded-md border transition-all ${
                      joinCode === 'CUP30'
                        ? 'bg-amber-500 text-slate-950 font-bold border-amber-400'
                        : 'bg-slate-900 border-slate-800 text-amber-400 hover:border-amber-500/40'
                    }`}
                  >
                    CUP30
                  </button>
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-300">
                  Your Name
                </label>
                <button
                  type="button"
                  onClick={handleRandomName}
                  className="text-[11px] text-emerald-400 hover:text-emerald-300 flex items-center space-x-1"
                >
                  <Dice5 className="w-3 h-3" />
                  <span>Random Nickname</span>
                </button>
              </div>
              <input
                type="text"
                required
                value={firstName}
                onChange={(e) => {
                  setFirstName(e.target.value);
                  if (!username) {
                    setUsername(e.target.value.toLowerCase().replace(/\s+/g, '_'));
                  }
                }}
                placeholder="Enter your first name"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Player Username
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-slate-500 font-mono text-sm">@</span>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="player_one"
                  className="w-full pl-8 pr-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="space-y-2 pt-1">
              <button
                type="submit"
                disabled={isJoining}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-sm tracking-wide transition-all shadow-lg shadow-emerald-500/20 active:scale-98 disabled:opacity-50"
              >
                {isJoining ? 'CONNECTING TO ARENA...' : `ENTER LIVE GAME ROOM →`}
              </button>

              <button
                type="button"
                onClick={handleQuickJoin}
                disabled={isJoining}
                className="w-full py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-emerald-400 border border-slate-700/80 font-mono text-xs font-semibold transition-all flex items-center justify-center space-x-1.5 active:scale-98 disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                <span>1-Tap Instant Join (Auto Nickname)</span>
              </button>
            </div>
            </form>
          </div>
        </div>

        <div className="text-center text-xs text-slate-500">
          Fast, mobile real-time live trivia
        </div>
      </div>
    );
  }

  // Active game state from server
  const gameStatus = roomState?.gameStatus || activeGame.status;
  const currentQ = roomState?.currentQuestion;
  const myStats = (roomState as any)?.myStats || participant;
  const mySubmission = (roomState as any)?.mySubmission;
  const revealedResult = roomState?.revealedResult;

  // 2. COUNTDOWN OVERLAY (3... 2... 1...)
  if (countdownTick !== null && countdownTick > 0 && gameStatus === 'COUNTDOWN') {
    return (
      <div className="min-h-screen bg-[#090d16] text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="space-y-4 animate-in zoom-in">
          <div className="text-sm font-bold tracking-widest text-emerald-400 uppercase">
            GET READY!
          </div>
          <div className="text-9xl font-black font-mono text-emerald-400 animate-pulse">
            {countdownTick}
          </div>
          <p className="text-sm text-slate-400">First question is loading...</p>
        </div>
      </div>
    );
  }

  // 3. WAITING ROOM (LOBBY / PAUSED)
  if (gameStatus === 'LOBBY' || gameStatus === 'READY' || (!currentQ && gameStatus !== 'COMPLETED')) {
    return (
      <div className="min-h-screen bg-[#090d16] text-white flex flex-col justify-between p-4 sm:p-6 terminal-grid">
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="font-bold text-sm text-white">{activeGame.name}</span>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={handleLeaveSession}
              className="text-xs text-rose-400 hover:underline"
            >
              Exit
            </button>
          </div>
        </div>

        {/* Center Card */}
        <div className="w-full max-w-sm mx-auto my-auto text-center space-y-6">
          <div className="w-20 h-20 rounded-full bg-emerald-500/10 border-2 border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto shadow-lg shadow-emerald-500/10">
            <Radio className="w-9 h-9 animate-pulse" />
          </div>

          <div className="space-y-2">
            <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold uppercase">
              You are in!
            </span>
            <h2 className="text-2xl font-black text-white tracking-tight">
              Waiting for the host to start
            </h2>
            <p className="text-xs text-slate-400">
              Playing as <strong className="text-emerald-400">{participant.firstName}</strong> (@{participant.username})
            </p>
          </div>

          {/* Connected Count */}
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-400 flex items-center space-x-2">
              <Users className="w-4 h-4 text-emerald-400" />
              <span>Competitors in Room:</span>
            </span>
            <span className="text-base font-bold text-white">
              {roomState?.connectedParticipantsCount || 1}
            </span>
          </div>

          {/* Announcement if any */}
          {roomState?.hostAnnouncement && (
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs text-left space-y-1">
              <span className="text-[10px] text-amber-400 uppercase font-bold block">Notice from Host</span>
              <p className="text-slate-200">{roomState.hostAnnouncement}</p>
            </div>
          )}
        </div>

        <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800/80 text-xs text-slate-400 flex items-center justify-between font-mono">
          <span>{activeGame.questionIds.length} Questions</span>
          <span>{activeGame.timePerQuestion}s Timer</span>
          <span>+{activeGame.pointsPerCorrect} Pt / Win</span>
        </div>
      </div>
    );
  }

  // 4. FINAL RESULTS SCREEN
  if (gameStatus === 'COMPLETED') {
    const leaderboard = roomState?.leaderboard || [];
    const myRank = leaderboard.find(l => l.participantId === participant.id);

    return (
      <div className="min-h-screen bg-[#090d16] text-white flex flex-col justify-between p-4 sm:p-6 terminal-grid">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <span className="font-bold text-sm text-emerald-400">Quiz Completed</span>
        </div>

        <div className="w-full max-w-sm mx-auto my-auto text-center space-y-5 py-4">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto shadow-xl">
            <Trophy className="w-8 h-8" />
          </div>

          <div>
            <h2 className="text-2xl font-black text-white">{activeGame.name}</h2>
            <p className="text-xs text-slate-400 mt-1">
              Great job, <strong className="text-emerald-400">{participant.firstName}</strong>!
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-mono block">Your Rank</span>
              <div className="text-3xl font-black text-amber-400 mt-0.5">
                #{myRank?.rank || 1}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-mono block">Total Score</span>
              <div className="text-3xl font-black text-emerald-400 mt-0.5">
                {myStats?.score || 0} pts
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 text-xs space-y-2 text-left">
            <div className="flex items-center justify-between text-slate-300">
              <span>Correct Answers</span>
              <span className="text-emerald-400 font-bold">{myStats?.correctAnswers || 0}</span>
            </div>
            <div className="flex items-center justify-between text-slate-300">
              <span>Incorrect Answers</span>
              <span className="text-rose-400 font-bold">{myStats?.wrongAnswers || 0}</span>
            </div>
            <div className="flex items-center justify-between text-slate-300">
              <span>Accuracy</span>
              <span className="text-white font-bold">{myRank?.accuracy || 0}%</span>
            </div>
          </div>

          <button
            onClick={handleLeaveSession}
            className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm transition-all"
          >
            Play Again
          </button>
        </div>

        <div className="text-center text-xs text-slate-500">
          QUIZTERM • Live Competition Platform
        </div>
      </div>
    );
  }

  // 5. LIVE QUESTION SCREEN
  const isQuestionLocked = gameStatus === 'QUESTION_LOCKED' || gameStatus === 'QUESTION_RESULTS' || remainingSeconds <= 0;
  const hasSubmitted = !!selectedOption;

  // Option colors for fast, friendly visual identification
  const optionColors: Record<'A' | 'B' | 'C' | 'D', { bg: string; badge: string }> = {
    A: { bg: 'border-blue-500/40 hover:border-blue-400', badge: 'bg-blue-600 text-white' },
    B: { bg: 'border-amber-500/40 hover:border-amber-400', badge: 'bg-amber-600 text-white' },
    C: { bg: 'border-purple-500/40 hover:border-purple-400', badge: 'bg-purple-600 text-white' },
    D: { bg: 'border-emerald-500/40 hover:border-emerald-400', badge: 'bg-emerald-600 text-white' }
  };

  return (
    <div className="min-h-screen bg-[#090d16] text-white flex flex-col justify-between p-4 sm:p-5 terminal-grid">
      {/* Top Header: Question #, Score, and Countdown Timer */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2">
            <span className="text-emerald-400 font-bold font-mono text-sm">
              Q{currentQ?.number} of {currentQ?.total}
            </span>
            <span className="text-slate-500">•</span>
            <span className="text-slate-400 truncate max-w-[140px]">{currentQ?.category}</span>
          </div>

          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold text-xs">
              {myStats?.score || 0} pts
            </span>
          </div>
        </div>

        {/* Big visual progress bar */}
        <div className="w-full h-2.5 rounded-full bg-slate-800 overflow-hidden">
          <div
            className={`h-full transition-all duration-200 ${
              remainingSeconds <= 2 ? 'bg-rose-500 animate-pulse' : 'bg-emerald-400'
            }`}
            style={{
              width: `${Math.min(100, Math.max(0, (remainingSeconds / (currentQ?.timeLimit || 5)) * 100))}%`
            }}
          />
        </div>

        {/* Timer readout */}
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-400">
            {isQuestionLocked ? 'Time up!' : 'Choose an answer:'}
          </span>
          <span className={`font-mono font-bold text-sm flex items-center space-x-1 ${
            remainingSeconds <= 2 ? 'text-rose-400 animate-pulse' : 'text-emerald-400'
          }`}>
            <Clock className="w-4 h-4" />
            <span>{remainingSeconds < 10 ? `0${remainingSeconds}` : remainingSeconds}s</span>
          </span>
        </div>
      </div>

      {/* Center: Question Text */}
      <div className="my-auto py-3 space-y-4">
        <h3 className="text-lg sm:text-xl font-bold text-white text-center leading-snug tracking-tight px-1">
          {currentQ?.text}
        </h3>

        {/* 4 Large Touch Buttons */}
        <div className="grid grid-cols-1 gap-2.5">
          {currentQ?.options.map((opt) => {
            const isSelected = selectedOption === opt.id;
            const isRevealedCorrect = revealedResult?.correctAnswer === opt.id;
            const isRevealedWrong = revealedResult && isSelected && !isRevealedCorrect;

            let cardClass = `bg-slate-900/90 border ${optionColors[opt.id].bg} text-slate-100 active:scale-[0.98]`;
            let badgeClass = optionColors[opt.id].badge;

            if (isRevealedCorrect) {
              cardClass = 'bg-emerald-950/90 border-emerald-500 text-white ring-2 ring-emerald-500 font-bold';
              badgeClass = 'bg-emerald-500 text-slate-950 font-black';
            } else if (isRevealedWrong) {
              cardClass = 'bg-rose-950/80 border-rose-500 text-rose-200 line-through opacity-75';
              badgeClass = 'bg-rose-500 text-white';
            } else if (isSelected) {
              cardClass = 'bg-emerald-950/70 border-emerald-400 text-white ring-2 ring-emerald-400';
              badgeClass = 'bg-emerald-400 text-slate-950 font-black';
            }

            return (
              <button
                key={opt.id}
                disabled={isQuestionLocked || hasSubmitted}
                onClick={() => handleSelectOption(opt.id)}
                className={`w-full p-4 rounded-xl text-left flex items-center justify-between transition-all touch-manipulation select-none ${cardClass} disabled:cursor-default`}
              >
                <div className="flex items-center space-x-3 pr-2">
                  <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm shrink-0 shadow-sm ${badgeClass}`}>
                    {opt.id}
                  </span>
                  <span className="text-sm font-medium leading-snug">{opt.text}</span>
                </div>

                {isRevealedCorrect && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />}
                {isRevealedWrong && <XCircle className="w-5 h-5 text-rose-400 shrink-0" />}
              </button>
            );
          })}
        </div>

        {/* Revealed explanation or locked status */}
        {revealedResult ? (
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1 text-xs animate-in fade-in">
            <div className="flex items-center justify-between font-semibold">
              <span className="text-emerald-400">
                Correct Answer: [{revealedResult.correctAnswer}]
              </span>
              {mySubmission && (
                <span className={mySubmission.isCorrect ? 'text-emerald-400 font-bold' : 'text-rose-400'}>
                  {mySubmission.isCorrect ? `+${mySubmission.pointsAwarded || 0} Points` : '0 Points'}
                </span>
              )}
            </div>
            <p className="text-slate-300 leading-relaxed">{revealedResult.explanation}</p>
          </div>
        ) : hasSubmitted ? (
          <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-center text-xs text-emerald-300 flex items-center justify-center space-x-2 font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Answer submitted! Waiting for question to finish...</span>
          </div>
        ) : null}
      </div>

      {/* Bottom user footer */}
      <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-500">
        <span>@{participant.username}</span>
        <span className="font-mono text-[10px] uppercase tracking-wider text-slate-600">Player mode</span>
      </div>
    </div>
  );
};
