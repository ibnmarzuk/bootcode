import React from 'react';
import {
  Calendar,
  Layers,
  Users,
  HelpCircle,
  FileText,
  Plus,
  Play,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Radio
} from 'lucide-react';
import { QuizEvent, QuizGame, Question, DocumentItem, AuditLog } from '../types';

interface DashboardProps {
  events: QuizEvent[];
  games: QuizGame[];
  questions: Question[];
  documents: DocumentItem[];
  auditLogs: AuditLog[];
  onNavigate: (tab: any) => void;
  onSelectGameForHost: (gameId: string) => void;
  onOpenCreateEvent: () => void;
  onOpenCreateGame: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  events,
  games,
  questions,
  documents,
  auditLogs,
  onNavigate,
  onSelectGameForHost,
  onOpenCreateEvent,
  onOpenCreateGame
}) => {
  const activeEvents = events.filter(e => e.status === 'ACTIVE' || e.status === 'PUBLISHED');
  const liveGames = games.filter(g => g.status === 'LIVE' || g.status === 'LOBBY');
  const approvedQuestions = questions.filter(q => q.status === 'APPROVED');
  const pendingQuestions = questions.filter(q => q.status === 'PENDING');

  return (
    <div className="space-y-6">
      {/* Hero / Quick Action Bar */}
      <div className="rounded-xl border border-slate-800 bg-gradient-to-r from-slate-900/90 via-slate-900/50 to-slate-950 p-5 sm:p-6 relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-radial from-emerald-500/10 to-transparent pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center space-x-2 font-mono text-xs text-emerald-400 mb-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              <span>HOST COMMAND CONSOLE // EVENT_ENGINE_ACTIVE</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Real-Time Quiz & Competition Platform
            </h1>
            <p className="text-sm text-slate-400 mt-1 max-w-2xl">
              Turn any learning material into a live competition in minutes. Upload documents, extract knowledge with AI, launch timed questions, and broadcast results authoritatively.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={onOpenCreateGame}
              className="flex items-center space-x-2 px-3.5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Create Game</span>
            </button>

            <button
              onClick={onOpenCreateEvent}
              className="flex items-center space-x-2 px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-medium text-xs transition-all"
            >
              <Calendar className="w-4 h-4 text-emerald-400" />
              <span>Create Event</span>
            </button>

            <button
              onClick={() => onNavigate('documents')}
              className="flex items-center space-x-2 px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-medium text-xs transition-all"
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>AI Generate Qs</span>
            </button>
          </div>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        {/* Events */}
        <div
          onClick={() => onNavigate('events')}
          className="cursor-pointer p-4 rounded-xl border border-slate-800 bg-slate-900/60 hover:bg-slate-900 hover:border-slate-700 transition-all group"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">Events</span>
            <Calendar className="w-4 h-4 text-slate-400 group-hover:text-emerald-400 transition-colors" />
          </div>
          <div className="text-2xl font-bold font-mono text-white">{events.length}</div>
          <div className="text-[11px] text-emerald-400 font-mono mt-1 flex items-center space-x-1">
            <span>{activeEvents.length} active</span>
          </div>
        </div>

        {/* Live Games */}
        <div
          onClick={() => onNavigate('games')}
          className="cursor-pointer p-4 rounded-xl border border-slate-800 bg-slate-900/60 hover:bg-slate-900 hover:border-slate-700 transition-all group"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">Games</span>
            <Layers className="w-4 h-4 text-slate-400 group-hover:text-emerald-400 transition-colors" />
          </div>
          <div className="text-2xl font-bold font-mono text-white">{games.length}</div>
          <div className="text-[11px] text-emerald-400 font-mono mt-1 flex items-center space-x-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>{liveGames.length} live / lobby</span>
          </div>
        </div>

        {/* Questions */}
        <div
          onClick={() => onNavigate('questions')}
          className="cursor-pointer p-4 rounded-xl border border-slate-800 bg-slate-900/60 hover:bg-slate-900 hover:border-slate-700 transition-all group"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">Questions</span>
            <HelpCircle className="w-4 h-4 text-slate-400 group-hover:text-emerald-400 transition-colors" />
          </div>
          <div className="text-2xl font-bold font-mono text-white">{questions.length}</div>
          <div className="text-[11px] text-slate-400 font-mono mt-1">
            <span className="text-emerald-400">{approvedQuestions.length} approved</span>
            {pendingQuestions.length > 0 && <span className="text-amber-400 ml-1.5">({pendingQuestions.length} pending)</span>}
          </div>
        </div>

        {/* Documents */}
        <div
          onClick={() => onNavigate('documents')}
          className="cursor-pointer p-4 rounded-xl border border-slate-800 bg-slate-900/60 hover:bg-slate-900 hover:border-slate-700 transition-all group"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">Documents</span>
            <FileText className="w-4 h-4 text-slate-400 group-hover:text-emerald-400 transition-colors" />
          </div>
          <div className="text-2xl font-bold font-mono text-white">{documents.length}</div>
          <div className="text-[11px] text-slate-400 font-mono mt-1">
            {documents.reduce((acc, d) => acc + (d.chunks?.length || 0), 0)} chunks indexed
          </div>
        </div>

        {/* System & Capacity */}
        <div
          onClick={() => onNavigate('monitor')}
          className="cursor-pointer p-4 rounded-xl border border-slate-800 bg-slate-900/60 hover:bg-slate-900 hover:border-slate-700 transition-all group col-span-2 sm:col-span-1"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">Capacity</span>
            <ShieldCheck className="w-4 h-4 text-slate-400 group-hover:text-emerald-400 transition-colors" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-400">10,000+</div>
          <div className="text-[11px] text-slate-400 font-mono mt-1">
            Target Scale
          </div>
        </div>
      </div>

      {/* Main Grid: Active Games & Recent Audit Log */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Games Section */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <h2 className="text-base font-semibold text-white">Live Competitions & Games</h2>
              <span className="text-xs font-mono text-slate-400">({games.length})</span>
            </div>
            <button
              onClick={() => onNavigate('games')}
              className="text-xs text-emerald-400 hover:text-emerald-300 font-mono flex items-center space-x-1"
            >
              <span>View all</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {games.slice(0, 4).map((game) => {
              const event = events.find(e => e.id === game.eventId);
              const isLive = game.status === 'LIVE' || game.status === 'LOBBY';

              return (
                <div
                  key={game.id}
                  className="p-4 rounded-xl border border-slate-800 bg-slate-900/70 hover:bg-slate-900 hover:border-slate-700 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold text-white text-sm">{game.name}</span>
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded uppercase font-semibold ${
                          game.status === 'LIVE'
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30 animate-pulse'
                            : game.status === 'LOBBY'
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            : game.status === 'COMPLETED'
                            ? 'bg-slate-800 text-slate-400'
                            : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        }`}
                      >
                        {game.status}
                      </span>
                    </div>

                    <div className="text-xs text-slate-400 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono">
                      <span>Event: {event?.name || 'General'}</span>
                      <span>•</span>
                      <span>Code: <strong className="text-emerald-400">{game.joinCode}</strong></span>
                      <span>•</span>
                      <span>{game.questionIds.length} questions</span>
                      <span>•</span>
                      <span>{game.timePerQuestion}s timer</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => onSelectGameForHost(game.id)}
                      className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-mono font-medium transition-colors"
                    >
                      <Radio className="w-3.5 h-3.5" />
                      <span>Host Room</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Audit Log / Activity */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-white">System Activity Log</h2>
            <Clock className="w-4 h-4 text-slate-400" />
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3 space-y-2 max-h-[360px] overflow-y-auto">
            {auditLogs.length === 0 ? (
              <div className="text-xs text-slate-500 font-mono py-4 text-center">No logs recorded yet</div>
            ) : (
              auditLogs.slice(0, 8).map((log) => (
                <div key={log.id} className="text-xs p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-emerald-400 text-[11px] font-semibold">{log.action}</span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-slate-300 text-[11px] leading-relaxed">{log.details}</p>
                  <div className="text-[10px] text-slate-400 font-mono">by {log.actor}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
