import React, { useState } from 'react';
import {
  Download,
  FileSpreadsheet,
  FileCode,
  CheckCircle2,
  BarChart3,
  Users,
  Trophy,
  Clock,
  Layers
} from 'lucide-react';
import { QuizGame, LeaderboardEntry } from '../types';

interface ResultsExportProps {
  games: QuizGame[];
  selectedGameId: string;
  leaderboard: LeaderboardEntry[];
  onSelectGame: (gameId: string) => void;
}

export const ResultsExport: React.FC<ResultsExportProps> = ({
  games,
  selectedGameId,
  leaderboard,
  onSelectGame
}) => {
  const [downloading, setDownloading] = useState(false);
  const activeGame = games.find(g => g.id === selectedGameId) || games[0];

  const handleDownloadCsv = () => {
    if (!activeGame) return;
    setDownloading(true);
    const link = document.createElement('a');
    link.href = `/api/export/${activeGame.id}`;
    link.download = `quizterm-${activeGame.joinCode}-results.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => setDownloading(false), 800);
  };

  const handleDownloadJson = () => {
    if (!activeGame) return;
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(leaderboard, null, 2));
    const link = document.createElement('a');
    link.href = dataStr;
    link.download = `quizterm-${activeGame.joinCode}-results.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalParticipants = leaderboard.length;
  const avgScore = totalParticipants > 0
    ? (leaderboard.reduce((a, b) => a + b.score, 0) / totalParticipants).toFixed(1)
    : '0';
  const avgAccuracy = totalParticipants > 0
    ? Math.round(leaderboard.reduce((a, b) => a + b.accuracy, 0) / totalParticipants)
    : 0;
  const avgSpeed = totalParticipants > 0
    ? Math.round(leaderboard.reduce((a, b) => a + b.avgResponseTimeMs, 0) / totalParticipants)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="text-xs font-mono text-emerald-400 mb-1">MODULE // 08_RESULTS_AND_EXPORT</div>
          <h2 className="text-xl font-bold text-white tracking-tight">Export Competition Results</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Download high-fidelity CSV and JSON tournament logs with participant ranks, scores, and millisecond timing.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <label className="text-xs font-mono text-slate-400">Game:</label>
          <select
            value={selectedGameId}
            onChange={(e) => onSelectGame(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs font-mono focus:outline-none focus:border-emerald-500"
          >
            {games.map(g => (
              <option key={g.id} value={g.id}>
                {g.name} [{g.joinCode}]
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 font-mono">
          <span className="text-[10px] text-slate-400 block uppercase">Participants</span>
          <div className="text-xl font-bold text-white mt-1 flex items-center space-x-1">
            <Users className="w-4 h-4 text-emerald-400" />
            <span>{totalParticipants}</span>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 font-mono">
          <span className="text-[10px] text-slate-400 block uppercase">Average Score</span>
          <div className="text-xl font-bold text-emerald-400 mt-1">
            {avgScore} pts
          </div>
        </div>

        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 font-mono">
          <span className="text-[10px] text-slate-400 block uppercase">Overall Accuracy</span>
          <div className="text-xl font-bold text-white mt-1">
            {avgAccuracy}%
          </div>
        </div>

        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 font-mono">
          <span className="text-[10px] text-slate-400 block uppercase">Avg Response Speed</span>
          <div className="text-xl font-bold text-slate-300 mt-1">
            {avgSpeed} ms
          </div>
        </div>
      </div>

      {/* Download Action Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* CSV Card */}
        <div className="p-6 rounded-xl border border-slate-800 bg-slate-900/80 space-y-4">
          <div className="flex items-center space-x-3">
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Standard CSV Export</h3>
              <p className="text-xs text-slate-400 font-mono">Includes Rank, First Name, Username, Score, Accuracy, Speed</p>
            </div>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            Ready for Google Sheets, Microsoft Excel, or school grading systems. Perfectly formatted with headers and quotes.
          </p>

          <button
            onClick={handleDownloadCsv}
            disabled={downloading}
            className="w-full flex items-center justify-center space-x-2 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs font-mono transition-all shadow-md shadow-emerald-500/10 active:scale-95"
          >
            <Download className="w-4 h-4" />
            <span>DOWNLOAD CSV FORMAT (.csv)</span>
          </button>
        </div>

        {/* JSON Card */}
        <div className="p-6 rounded-xl border border-slate-800 bg-slate-900/80 space-y-4">
          <div className="flex items-center space-x-3">
            <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400">
              <FileCode className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Structured JSON Export</h3>
              <p className="text-xs text-slate-400 font-mono">Full developer payload & programmatic tournament records</p>
            </div>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            Exports raw JSON objects with full participant telemetry for custom analytics or developer tooling integration.
          </p>

          <button
            onClick={handleDownloadJson}
            className="w-full flex items-center justify-center space-x-2 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs font-mono transition-all"
          >
            <Download className="w-4 h-4 text-blue-400" />
            <span>DOWNLOAD JSON (.json)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
