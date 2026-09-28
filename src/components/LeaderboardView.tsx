import React, { useState } from 'react';
import {
  Trophy,
  Medal,
  Search,
  Clock,
  CheckCircle,
  XCircle,
  HelpCircle,
  TrendingUp,
  Award
} from 'lucide-react';
import { LeaderboardEntry, QuizGame } from '../types';

interface LeaderboardViewProps {
  leaderboard: LeaderboardEntry[];
  games: QuizGame[];
  selectedGameId: string;
  onSelectGame: (gameId: string) => void;
}

export const LeaderboardView: React.FC<LeaderboardViewProps> = ({
  leaderboard,
  games,
  selectedGameId,
  onSelectGame
}) => {
  const [search, setSearch] = useState('');

  const activeGame = games.find(g => g.id === selectedGameId) || games[0];

  const filtered = leaderboard.filter(l => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return l.firstName.toLowerCase().includes(s) || l.username.toLowerCase().includes(s);
  });

  const top3 = leaderboard.slice(0, 3);

  return (
    <div className="space-y-6">
      {/* Header & Game Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="text-xs font-mono text-emerald-400 mb-1">MODULE // 07_LEADERBOARD_ENGINE</div>
          <h2 className="text-xl font-bold text-white tracking-tight">Real-Time Leaderboard</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Authoritative ranking sorted by points scored, with average response speed breaking ties.
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

      {/* Top 3 Podium (if at least 1 competitor) */}
      {top3.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          {/* Rank 2 */}
          {top3[1] && (
            <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 flex flex-col items-center text-center space-y-2 order-2 sm:order-1">
              <div className="w-10 h-10 rounded-full bg-slate-400/20 text-slate-300 border border-slate-400/40 flex items-center justify-center font-mono font-bold text-sm">
                #2
              </div>
              <div>
                <h4 className="font-bold text-white text-sm">{top3[1].firstName}</h4>
                <div className="text-xs font-mono text-slate-400">@{top3[1].username}</div>
              </div>
              <div className="text-lg font-black font-mono text-slate-200">{top3[1].score} pts</div>
              <div className="text-[11px] font-mono text-slate-400">{top3[1].accuracy}% acc • {top3[1].avgResponseTimeMs}ms</div>
            </div>
          )}

          {/* Rank 1 (Gold) */}
          {top3[0] && (
            <div className="p-5 rounded-xl border border-amber-500/40 bg-gradient-to-b from-amber-500/10 to-slate-900/90 flex flex-col items-center text-center space-y-2 shadow-xl shadow-amber-500/5 order-1 sm:order-2">
              <div className="w-12 h-12 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/50 flex items-center justify-center font-mono font-black text-base shadow-md">
                <Trophy className="w-6 h-6 text-amber-400" />
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold">
                  TOURNAMENT LEADER
                </span>
                <h4 className="font-black text-white text-base mt-1">{top3[0].firstName}</h4>
                <div className="text-xs font-mono text-slate-400">@{top3[0].username}</div>
              </div>
              <div className="text-2xl font-black font-mono text-amber-400">{top3[0].score} pts</div>
              <div className="text-xs font-mono text-slate-300">{top3[0].accuracy}% acc • {top3[0].avgResponseTimeMs}ms</div>
            </div>
          )}

          {/* Rank 3 */}
          {top3[2] && (
            <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 flex flex-col items-center text-center space-y-2 order-3">
              <div className="w-10 h-10 rounded-full bg-amber-800/20 text-amber-600 border border-amber-700/40 flex items-center justify-center font-mono font-bold text-sm">
                #3
              </div>
              <div>
                <h4 className="font-bold text-white text-sm">{top3[2].firstName}</h4>
                <div className="text-xs font-mono text-slate-400">@{top3[2].username}</div>
              </div>
              <div className="text-lg font-black font-mono text-slate-200">{top3[2].score} pts</div>
              <div className="text-[11px] font-mono text-slate-400">{top3[2].accuracy}% acc • {top3[2].avgResponseTimeMs}ms</div>
            </div>
          )}
        </div>
      )}

      {/* Search Bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search competitor..."
            className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white text-xs focus:outline-none focus:border-emerald-500"
          />
        </div>
        <div className="text-xs font-mono text-slate-400">
          Showing {filtered.length} competitors
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400">
              <tr>
                <th className="py-3 px-4">RANK</th>
                <th className="py-3 px-4">COMPETITOR</th>
                <th className="py-3 px-4 text-right">SCORE</th>
                <th className="py-3 px-4 text-center">CORRECT</th>
                <th className="py-3 px-4 text-center">WRONG</th>
                <th className="py-3 px-4 text-center">UNANSWERED</th>
                <th className="py-3 px-4 text-right">ACCURACY</th>
                <th className="py-3 px-4 text-right">AVG SPEED</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500 font-mono">
                    No leaderboard scores recorded for this game yet.
                  </td>
                </tr>
              ) : (
                filtered.map((entry) => (
                  <tr key={entry.participantId} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-bold text-white">
                      <span className={`px-2 py-0.5 rounded ${
                        entry.rank === 1
                          ? 'bg-amber-500/20 text-amber-300'
                          : entry.rank === 2
                          ? 'bg-slate-400/20 text-slate-300'
                          : entry.rank === 3
                          ? 'bg-amber-800/20 text-amber-400'
                          : 'text-slate-400'
                      }`}>
                        #{entry.rank}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-sans font-medium text-white">
                      <div>{entry.firstName}</div>
                      <div className="text-[11px] font-mono text-slate-400">@{entry.username}</div>
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-emerald-400 text-sm">
                      {entry.score} pts
                    </td>
                    <td className="py-3 px-4 text-center text-emerald-400">{entry.correctAnswers}</td>
                    <td className="py-3 px-4 text-center text-rose-400">{entry.wrongAnswers}</td>
                    <td className="py-3 px-4 text-center text-slate-400">{entry.unanswered}</td>
                    <td className="py-3 px-4 text-right font-semibold text-slate-200">
                      {entry.accuracy}%
                    </td>
                    <td className="py-3 px-4 text-right text-slate-400">
                      {entry.avgResponseTimeMs} ms
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
