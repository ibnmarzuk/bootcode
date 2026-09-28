import React, { useState, useEffect } from 'react';
import {
  Radio,
  Play,
  Pause,
  SkipForward,
  StopCircle,
  Trophy,
  Users,
  Clock,
  Activity,
  AlertTriangle,
  Megaphone,
  Maximize2,
  Copy,
  Check,
  Bot,
  Sparkles,
  QrCode,
  Download,
  ExternalLink
} from 'lucide-react';
import QRCode from 'qrcode';
import { QuizGame, Question, RealtimeRoomState } from '../types';
import { api } from '../services/api';
import { getPublicJoinUrl } from '../services/urlHelper';

interface HostControlRoomProps {
  game: QuizGame;
  questions: Question[];
  roomState: RealtimeRoomState | null;
  latency: number;
  publicServerUrl?: string;
  onStartGame: () => void;
  onPauseGame: () => void;
  onResumeGame: () => void;
  onNextQuestion: () => void;
  onEndGame: () => void;
  onSetAnnouncement: (msg: string) => void;
  onToggleLeaderboard: () => void;
  onOpenProjector: () => void;
  onTestJoin?: (code: string) => void;
}

export const HostControlRoom: React.FC<HostControlRoomProps> = ({
  game,
  questions,
  roomState,
  latency,
  publicServerUrl,
  onStartGame,
  onPauseGame,
  onResumeGame,
  onNextQuestion,
  onEndGame,
  onSetAnnouncement,
  onToggleLeaderboard,
  onOpenProjector,
  onTestJoin
}) => {
  const [announcementText, setAnnouncementText] = useState('');
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [remainingTime, setRemainingTime] = useState<number>(0);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isAddingBots, setIsAddingBots] = useState(false);
  const [miniQrUrl, setMiniQrUrl] = useState<string>('');

  const joinUrl = getPublicJoinUrl(game.joinCode, publicServerUrl);

  useEffect(() => {
    QRCode.toDataURL(joinUrl, {
      errorCorrectionLevel: 'H',
      margin: 2,
      scale: 8,
      color: { dark: '#000000', light: '#ffffff' }
    }).then(setMiniQrUrl).catch(() => {});
  }, [joinUrl]);

  const status = roomState?.gameStatus || game.status;
  const currentQ = roomState?.currentQuestion;
  const totalQuestions = roomState?.totalQuestions || game.questionIds.length;
  const answeredCount = roomState?.answeredCount || 0;
  const connectedCount = roomState?.connectedParticipantsCount || 0;

  // Real-time authoritative timer countdown calculation
  useEffect(() => {
    if (!roomState?.endTime || status !== 'LIVE') {
      setRemainingTime(0);
      return;
    }

    const updateTimer = () => {
      const now = Date.now();
      const diff = Math.max(0, Math.ceil((roomState.endTime! - now) / 1000));
      setRemainingTime(diff);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 200);
    return () => clearInterval(interval);
  }, [roomState?.endTime, status]);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(game.joinCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleSendAnnouncement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!announcementText.trim()) return;
    onSetAnnouncement(announcementText.trim());
    setAnnouncementText('');
  };

  // Helper to add simulated demo players for instant testing
  const handleAddDemoBots = async () => {
    setIsAddingBots(true);
    const demoUsers = [
      { first: 'Maya', user: 'maya_tech' },
      { first: 'David', user: 'david_k' },
      { first: 'Sara', user: 'sara_code' }
    ];

    try {
      for (const u of demoUsers) {
        await api.joinGame({
          joinCode: game.joinCode,
          firstName: u.first,
          username: `${u.user}_${Math.floor(Math.random() * 89 + 10)}`
        });
      }
    } catch (e) {
      console.error('Error adding demo players:', e);
    } finally {
      setIsAddingBots(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner: Game Code & Quick Actions */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-xs font-mono font-bold text-emerald-400 uppercase">
              LIVE GAME CONTROLLER
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white">{game.name}</h2>
          <div className="text-xs text-slate-400">
            {totalQuestions} Questions • {currentQ ? `Current Question: ${currentQ.timeLimit}s timer` : `Authoritative per-question timers`}
          </div>
        </div>

        {/* Join Code Callout & Projector launch */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700">
            <div className="text-right">
              <span className="text-[10px] text-slate-400 font-mono block uppercase">Player PIN</span>
              <span className="font-mono text-xl font-black text-emerald-400 tracking-wider">
                {game.joinCode}
              </span>
            </div>
            <button
              onClick={handleCopyCode}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-emerald-400 transition-colors"
              title="Copy Code"
            >
              {copiedCode ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>

          <button
            onClick={onOpenProjector}
            className="flex items-center space-x-2 px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 font-semibold text-xs transition-all shadow-sm"
          >
            <QrCode className="w-4 h-4 text-emerald-400" />
            <span>Show QR / Projector</span>
          </button>
        </div>
      </div>

      {/* Primary Big Control Buttons */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          {status === 'LOBBY' || status === 'READY' ? (
            <button
              onClick={onStartGame}
              className="flex items-center space-x-2 px-5 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
            >
              <Play className="w-4 h-4 fill-slate-950" />
              <span>START GAME (3-2-1)</span>
            </button>
          ) : status === 'LIVE' ? (
            <button
              onClick={onPauseGame}
              className="flex items-center space-x-2 px-5 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm transition-all active:scale-95"
            >
              <Pause className="w-4 h-4" />
              <span>PAUSE</span>
            </button>
          ) : status === 'PAUSED' ? (
            <button
              onClick={onResumeGame}
              className="flex items-center space-x-2 px-5 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm transition-all active:scale-95"
            >
              <Play className="w-4 h-4 fill-slate-950" />
              <span>RESUME</span>
            </button>
          ) : null}

          {status !== 'COMPLETED' && (
            <button
              onClick={onNextQuestion}
              className="flex items-center space-x-2 px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 text-xs font-bold transition-all"
            >
              <SkipForward className="w-4 h-4 text-emerald-400" />
              <span>NEXT QUESTION</span>
            </button>
          )}

          <button
            onClick={handleAddDemoBots}
            disabled={isAddingBots}
            className="flex items-center space-x-1.5 px-3 py-3 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-slate-700 text-xs font-medium transition-all"
            title="Adds 3 simulated players for quick testing"
          >
            <Bot className="w-4 h-4 text-blue-400" />
            <span>{isAddingBots ? 'Adding...' : '+ Add 3 Test Players'}</span>
          </button>
        </div>

        {status !== 'COMPLETED' && (
          <button
            onClick={() => setShowEndConfirm(true)}
            className="flex items-center space-x-1.5 px-4 py-2.5 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/60 text-rose-300 text-xs font-semibold transition-all ml-auto"
          >
            <StopCircle className="w-4 h-4" />
            <span>End Competition</span>
          </button>
        )}
      </div>

      {/* Telemetry metrics bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-900/60">
          <span className="text-slate-400 text-[11px] block uppercase font-mono">Current Status</span>
          <div className="text-base font-bold text-white mt-0.5 flex items-center space-x-1.5">
            <span className={`w-2 h-2 rounded-full ${status === 'LIVE' ? 'bg-rose-400 animate-ping' : 'bg-emerald-400'}`}></span>
            <span>{status}</span>
          </div>
        </div>

        <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-900/60">
          <span className="text-slate-400 text-[11px] block uppercase font-mono">Players Connected</span>
          <div className="text-base font-bold text-emerald-400 mt-0.5 flex items-center space-x-1">
            <Users className="w-4 h-4" />
            <span>{connectedCount}</span>
          </div>
        </div>

        <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-900/60">
          <span className="text-slate-400 text-[11px] block uppercase font-mono">Question Progress</span>
          <div className="text-base font-bold text-white mt-0.5">
            {currentQ ? `Question ${currentQ.number} of ${totalQuestions}` : `0 of ${totalQuestions}`}
          </div>
        </div>

        <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-900/60">
          <span className="text-slate-400 text-[11px] block uppercase font-mono">Timer Remaining</span>
          <div className={`text-base font-bold mt-0.5 flex items-center space-x-1 ${
            remainingTime <= 2 && status === 'LIVE' ? 'text-rose-400 animate-pulse' : 'text-emerald-400'
          }`}>
            <Clock className="w-4 h-4" />
            <span>{status === 'LIVE' ? `${remainingTime}s (${currentQ?.timeLimit || game.timePerQuestion}s limit)` : `${game.timePerQuestion}s default`}</span>
          </div>
        </div>
      </div>

      {/* Live Question + Live Leaderboard Side-by-Side */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Active Question Screen */}
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="font-bold text-sm text-white">
                {currentQ ? `Question ${currentQ.number} of ${totalQuestions}` : 'Waiting in Lobby'}
              </span>

              {status === 'LIVE' && (
                <span className="px-2.5 py-1 rounded bg-rose-500/20 text-rose-300 font-mono text-xs font-bold animate-pulse">
                  {remainingTime < 10 ? `0${remainingTime}` : remainingTime}s REMAINING ({currentQ?.timeLimit || game.timePerQuestion}s limit)
                </span>
              )}
            </div>

            {currentQ ? (
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-white leading-relaxed">{currentQ.text}</h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {currentQ.options.map((opt) => {
                    const isCorrect = roomState?.revealedResult?.correctAnswer === opt.id;
                    const count = roomState?.revealedResult?.optionStats[opt.id] ?? 0;

                    return (
                      <div
                        key={opt.id}
                        className={`p-3.5 rounded-xl border text-xs flex items-center justify-between transition-all ${
                          isCorrect
                            ? 'bg-emerald-950/70 border-emerald-500 text-emerald-200 font-semibold'
                            : 'bg-slate-950/70 border-slate-800 text-slate-300'
                        }`}
                      >
                        <div className="flex items-center space-x-2.5">
                          <span className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                            isCorrect ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-300'
                          }`}>
                            {opt.id}
                          </span>
                          <span className="text-xs font-medium">{opt.text}</span>
                        </div>

                        {roomState?.revealedResult && (
                          <span className="text-xs font-mono text-slate-400">{count} answers</span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {roomState?.revealedResult && (
                  <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-xs space-y-1">
                    <div className="font-bold text-emerald-400">
                      Correct Key: [{roomState.revealedResult.correctAnswer}]
                    </div>
                    <p className="text-slate-300 leading-relaxed">{roomState.revealedResult.explanation}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-8 px-4 flex flex-col md:flex-row items-center justify-center gap-8 text-center md:text-left">
                {/* QR Code Scannable Preview */}
                <div className="flex flex-col items-center space-y-2">
                  <div
                    onClick={onOpenProjector}
                    className="p-3 bg-white rounded-2xl shadow-xl border-2 border-emerald-500/40 cursor-pointer hover:scale-105 transition-transform group"
                    title="Click to open Fullscreen Projector"
                  >
                    {miniQrUrl ? (
                      <img
                        src={miniQrUrl}
                        alt={`QR Code for ${game.joinCode}`}
                        className="w-40 h-40 object-contain rounded"
                        style={{ imageRendering: 'pixelated' }}
                      />
                    ) : (
                      <div className="w-40 h-40 bg-slate-100 flex items-center justify-center rounded">
                        <QrCode className="w-8 h-8 text-slate-400 animate-pulse" />
                      </div>
                    )}
                  </div>
                  <span className="text-[11px] font-mono text-emerald-400 font-semibold flex items-center space-x-1">
                    <QrCode className="w-3 h-3" />
                    <span>Click QR for Projector</span>
                  </span>
                </div>

                {/* Join Details & Actions */}
                <div className="space-y-4 max-w-sm">
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest block">
                      Player Access PIN
                    </span>
                    <div className="flex items-center space-x-2">
                      <span className="text-4xl font-black font-mono tracking-widest text-emerald-400 bg-slate-950 px-4 py-1.5 rounded-xl border border-emerald-500/30">
                        {game.joinCode}
                      </span>
                      <button
                        onClick={handleCopyCode}
                        className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                        title="Copy PIN"
                      >
                        {copiedCode ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-slate-400 leading-relaxed">
                    Have competitors point their camera at the QR code or enter PIN at the join screen.
                  </p>

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <button
                      onClick={onOpenProjector}
                      className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 font-semibold text-xs transition-all flex items-center space-x-1.5"
                    >
                      <Maximize2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Projector Mode</span>
                    </button>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(joinUrl);
                        setCopiedLink(true);
                        setTimeout(() => setCopiedLink(false), 2000);
                      }}
                      className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 font-mono text-xs transition-all flex items-center space-x-1.5"
                      title="Copy direct join link with access PIN"
                    >
                      {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedLink ? 'Link Copied' : 'Copy Link'}</span>
                    </button>
                    {onTestJoin && (
                      <button
                        onClick={() => onTestJoin(game.joinCode)}
                        className="px-3 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-mono text-xs transition-all flex items-center space-x-1.5"
                        title="Simulate participant join on this device"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Test Join</span>
                      </button>
                    )}
                    <button
                      onClick={onStartGame}
                      className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition-all flex items-center space-x-1.5 shadow-md shadow-emerald-500/20"
                    >
                      <Play className="w-3.5 h-3.5 fill-slate-950" />
                      <span>Start Competition</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Quick Notice to Participants */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 space-y-2">
            <span className="text-xs font-bold text-white flex items-center space-x-1.5">
              <Megaphone className="w-3.5 h-3.5 text-emerald-400" />
              <span>Send Quick Alert to Participants</span>
            </span>
            <form onSubmit={handleSendAnnouncement} className="flex gap-2">
              <input
                type="text"
                value={announcementText}
                onChange={(e) => setAnnouncementText(e.target.value)}
                placeholder="e.g. 30 seconds until round 2 begins..."
                className="flex-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-emerald-500"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 text-xs font-semibold"
              >
                Send
              </button>
            </form>
          </div>
        </div>

        {/* Right: Live Top Leaderboard */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm text-white flex items-center space-x-2">
                <Trophy className="w-4 h-4 text-amber-400" />
                <span>Live Leaderboard</span>
              </span>
              <span className="text-xs text-slate-400">{roomState?.leaderboard?.length || 0} players</span>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {(roomState?.leaderboard || []).slice(0, 8).map((l) => (
                <div
                  key={l.participantId}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/80 border border-slate-800/80 text-xs"
                >
                  <div className="flex items-center space-x-2.5 truncate pr-2">
                    <span className={`w-5 h-5 rounded flex items-center justify-center font-bold text-[10px] ${
                      l.rank === 1 ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-300'
                    }`}>
                      {l.rank}
                    </span>
                    <span className="text-white font-medium truncate">{l.firstName}</span>
                    <span className="text-slate-500 text-[10px]">@{l.username}</span>
                  </div>
                  <span className="font-bold text-emerald-400 shrink-0">{l.score} pts</span>
                </div>
              ))}

              {(!roomState?.leaderboard || roomState.leaderboard.length === 0) && (
                <div className="text-slate-500 text-center py-6 text-xs">
                  Scores will appear here as players answer.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Dialog for End Game */}
      {showEndConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl border border-rose-800/60 bg-[#0d131f] p-6 space-y-4 shadow-2xl">
            <div className="flex items-center space-x-3 text-rose-400">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="font-bold text-base text-white">End This Competition?</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              This will conclude the quiz and calculate the final podium results for all participants.
            </p>
            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                onClick={() => setShowEndConfirm(false)}
                className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 text-xs hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowEndConfirm(false);
                  onEndGame();
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition-colors"
              >
                Yes, End Competition
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
