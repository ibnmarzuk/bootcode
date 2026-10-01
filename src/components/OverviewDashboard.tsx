import React from 'react';
import {
  ArrowRight,
  Bot,
  Check,
  FileText,
  Layers3,
  Play,
  QrCode,
  Radio,
  ScanLine,
  Sparkles,
  Users,
  WandSparkles
} from 'lucide-react';
import { DocumentItem, Question, QuizGame } from '../types';

interface OverviewDashboardProps {
  documents: DocumentItem[];
  questions: Question[];
  games: QuizGame[];
  activeGame?: QuizGame;
  onNavigate: (tab: 'questions' | 'games' | 'host') => void;
  onOpenProjector: () => void;
  onToggleParticipant: () => void;
}

const statusTone: Record<string, string> = {
  LIVE: 'bg-rose-400',
  LOBBY: 'bg-amber-300',
  READY: 'bg-emerald-300',
  COMPLETED: 'bg-slate-500'
};

const statusLabel: Record<string, string> = {
  LIVE: 'On air now',
  LOBBY: 'Lobby open',
  READY: 'Ready to launch',
  COUNTDOWN: 'Starting soon',
  PAUSED: 'Paused',
  COMPLETED: 'Finished',
  ARCHIVED: 'Archived'
};

export const OverviewDashboard: React.FC<OverviewDashboardProps> = ({
  documents,
  questions,
  games,
  activeGame,
  onNavigate,
  onOpenProjector,
  onToggleParticipant
}) => {
  const liveGames = games.filter(game => game.status === 'LIVE' || game.status === 'LOBBY');
  const approvedQuestions = questions.filter(question => question.status === 'APPROVED');
  const setupSteps = [
    { label: 'Upload a source PDF', done: documents.length > 0, onClick: () => onNavigate('questions') },
    { label: 'Generate your question set', done: approvedQuestions.length > 0, onClick: () => onNavigate('questions') },
    { label: 'Open a live room', done: liveGames.length > 0, onClick: () => onNavigate('games') }
  ];
  const completedSteps = setupSteps.filter(step => step.done).length;

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[2rem] border border-slate-800 bg-[#101a2b] p-6 sm:p-8 lg:p-10 shadow-2xl shadow-black/20">
        <div className="absolute -right-24 -top-28 h-80 w-80 rounded-full bg-emerald-300/10 blur-3xl" />
        <div className="absolute bottom-0 right-10 h-1 w-44 bg-gradient-to-r from-transparent via-emerald-300 to-transparent opacity-70" />
        <div className="relative grid gap-8 lg:grid-cols-[1.15fr_.85fr] lg:items-end">
          <div>
            <div className="mb-4 flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-emerald-300">
              <span className="h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_16px_rgba(114,242,184,.8)]" />
              Quiz studio / ready to broadcast
            </div>
            <h1 className="max-w-2xl text-3xl font-black tracking-[-0.04em] text-white sm:text-5xl">
              Turn a PDF into a room.
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-7 text-slate-300 sm:text-base">
              Upload your learning material, let QuizTerm shape the questions, then invite the room with one scan. Built for workshops, classrooms, and fast-moving competitions.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <button onClick={() => onNavigate('questions')} className="inline-flex items-center gap-2 rounded-xl bg-emerald-300 px-4 py-3 text-xs font-black text-[#07111d] shadow-lg shadow-emerald-300/20 transition hover:-translate-y-0.5 hover:bg-emerald-200">
                <WandSparkles className="h-4 w-4" />
                Upload PDF & generate
                <ArrowRight className="h-4 w-4" />
              </button>
              <button onClick={onToggleParticipant} className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/70 px-4 py-3 text-xs font-bold text-slate-200 transition hover:border-emerald-300/50 hover:text-emerald-200">
                <ScanLine className="h-4 w-4 text-emerald-300" />
                Preview join screen
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-700/80 bg-[#08111d]/80 p-4 backdrop-blur">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Launch sequence</span>
              <span className="rounded-full bg-emerald-300/10 px-2 py-1 font-mono text-[10px] font-bold text-emerald-300">{completedSteps}/3 ready</span>
            </div>
            <div className="space-y-2 pt-3">
              {setupSteps.map((step, index) => (
                <button key={step.label} onClick={step.onClick} className="group flex w-full items-center gap-3 rounded-xl p-2 text-left transition hover:bg-white/[.04]">
                  <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border font-mono text-[11px] font-bold ${step.done ? 'border-emerald-300/40 bg-emerald-300/15 text-emerald-200' : 'border-slate-700 bg-slate-900 text-slate-400'}`}>
                    {step.done ? <Check className="h-3.5 w-3.5" /> : `0${index + 1}`}
                  </span>
                  <span className={`flex-1 text-xs font-semibold ${step.done ? 'text-slate-200' : 'text-slate-400 group-hover:text-slate-200'}`}>{step.label}</span>
                  <ArrowRight className="h-3.5 w-3.5 text-slate-600 transition group-hover:translate-x-0.5 group-hover:text-emerald-300" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Source library', value: documents.length, detail: 'PDFs indexed', icon: FileText, tone: 'text-sky-300' },
          { label: 'Question bank', value: questions.length, detail: `${approvedQuestions.length} approved`, icon: Sparkles, tone: 'text-amber-300' },
          { label: 'Live rooms', value: liveGames.length, detail: `${games.length} total games`, icon: Radio, tone: 'text-rose-300' },
          { label: 'Room capacity', value: '10k+', detail: 'participants ready', icon: Users, tone: 'text-emerald-300' }
        ].map(metric => {
          const Icon = metric.icon;
          return (
            <div key={metric.label} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 transition hover:-translate-y-0.5 hover:border-slate-700">
              <div className="flex items-center justify-between text-[10px] font-mono font-bold uppercase tracking-[0.16em] text-slate-500">
                {metric.label}
                <Icon className={`h-4 w-4 ${metric.tone}`} />
              </div>
              <div className="mt-3 text-2xl font-black tracking-tight text-white">{metric.value}</div>
              <div className="mt-1 text-xs text-slate-500">{metric.detail}</div>
            </div>
          );
        })}
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.2fr_.8fr]">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/55 p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-[10px] font-mono font-bold uppercase tracking-[0.18em] text-slate-500"><Layers3 className="h-4 w-4 text-slate-400" /> Active rooms</div>
              <h2 className="mt-2 text-lg font-black text-white">Bring the room on stage</h2>
            </div>
            <button onClick={() => onNavigate('games')} className="text-xs font-semibold text-emerald-300 hover:text-emerald-200">Manage rooms <ArrowRight className="ml-1 inline h-3.5 w-3.5" /></button>
          </div>
          {activeGame ? (
            <div className="mt-5 flex flex-col gap-4 rounded-2xl border border-emerald-300/20 bg-emerald-300/[.05] p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${statusTone[activeGame.status] || 'bg-slate-500'} ${activeGame.status === 'LIVE' ? 'animate-pulse' : ''}`} />
                  <span className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-200">{statusLabel[activeGame.status] || activeGame.status}</span>
                </div>
                <h3 className="mt-2 text-base font-bold text-white">{activeGame.name}</h3>
                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 font-mono text-[11px] text-slate-400"><span>PIN <strong className="text-emerald-300">{activeGame.joinCode}</strong></span><span>{activeGame.questionIds.length} questions</span><span>{activeGame.timePerQuestion}s timer</span></div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => onNavigate('host')} className="inline-flex items-center gap-2 rounded-xl bg-emerald-300 px-3 py-2.5 text-xs font-black text-[#07111d] transition hover:bg-emerald-200"><Play className="h-3.5 w-3.5 fill-current" /> Host room</button>
                <button onClick={onOpenProjector} className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2.5 text-xs font-bold text-slate-200 transition hover:border-emerald-300/40"><QrCode className="h-3.5 w-3.5 text-emerald-300" /> Show QR</button>
              </div>
            </div>
          ) : (
            <button onClick={() => onNavigate('games')} className="mt-5 flex w-full items-center justify-between rounded-2xl border border-dashed border-slate-700 bg-slate-950/40 p-5 text-left transition hover:border-emerald-300/40 hover:bg-slate-950/70">
              <span><span className="block text-sm font-bold text-slate-200">No room is live yet</span><span className="mt-1 block text-xs text-slate-500">Create a game and get a scan-ready PIN in seconds.</span></span>
              <ArrowRight className="h-5 w-5 text-emerald-300" />
            </button>
          )}
        </div>

        <div className="rounded-2xl border border-slate-800 bg-[#101a2b] p-5 sm:p-6">
          <div className="flex items-center gap-2 text-[10px] font-mono font-bold uppercase tracking-[0.18em] text-slate-500"><Bot className="h-4 w-4 text-amber-300" /> Host notes</div>
          <h2 className="mt-2 text-lg font-black text-white">Keep it simple in the room</h2>
          <ul className="mt-4 space-y-3 text-xs leading-5 text-slate-300">
            <li className="flex gap-2"><span className="font-mono text-emerald-300">01</span><span>Open <strong className="text-white">Show QR</strong> on the projector before people arrive.</span></li>
            <li className="flex gap-2"><span className="font-mono text-emerald-300">02</span><span>Players scan, enter the PIN if needed, and choose a display name.</span></li>
            <li className="flex gap-2"><span className="font-mono text-emerald-300">03</span><span>Start when the lobby is ready. Timing and scores stay server-authoritative.</span></li>
          </ul>
        </div>
      </section>
    </div>
  );
};
