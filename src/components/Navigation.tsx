import React from 'react';
import {
  Terminal,
  LayoutDashboard,
  Radio,
  HelpCircle,
  Layers,
  Download,
  Smartphone,
  Volume2,
  VolumeX,
  Sparkles,
  ShieldCheck
} from 'lucide-react';
import { sounds } from '../services/sound';

export type SimpleNavTab = 'overview' | 'host' | 'questions' | 'games' | 'results';

interface NavigationProps {
  currentTab: SimpleNavTab;
  onTabChange: (tab: SimpleNavTab) => void;
  isParticipantMode: boolean;
  onToggleParticipantMode: (isParticipant: boolean) => void;
  activeGameCode?: string;
  latency?: number;
}

export const Navigation: React.FC<NavigationProps> = ({
  currentTab,
  onTabChange,
  isParticipantMode,
  onToggleParticipantMode,
  activeGameCode = 'SA50AI',
  latency = 12
}) => {
  const [soundEnabled, setSoundEnabled] = React.useState(sounds.isEnabled());

  const handleToggleSound = () => {
    const next = sounds.toggleSound();
    setSoundEnabled(next);
  };

  const navTabs: { id: SimpleNavTab; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Overview', icon: <LayoutDashboard className="w-4 h-4 text-slate-300" /> },
    { id: 'host', label: 'Host Live Room', icon: <Radio className="w-4 h-4 text-emerald-400" /> },
    { id: 'questions', label: 'Questions & AI', icon: <Sparkles className="w-4 h-4 text-amber-400" /> },
    { id: 'games', label: 'Games & Events', icon: <Layers className="w-4 h-4 text-blue-400" /> },
    { id: 'results', label: 'Results & Export', icon: <Download className="w-4 h-4 text-purple-400" /> }
  ];

  return (
    <header className="border-b border-slate-800 bg-[#0d131f]/95 backdrop-blur-md sticky top-0 z-40">
      {/* Top bar with brand and Mode Switcher */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-15">
        {/* Brand */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-mono font-bold text-sm">
            Q
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold tracking-tight text-white text-sm">QUIZTERM</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                LIVE
              </span>
            </div>
            <div className="text-[11px] text-slate-400 font-mono flex items-center space-x-2">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Game: <strong className="text-emerald-400">{activeGameCode}</strong></span>
              <span className="text-slate-600 hidden sm:inline">•</span>
              <span className="hidden sm:inline text-slate-400">{latency}ms latency</span>
            </div>
          </div>
        </div>

        {/* Global Mode Switcher: Participant vs Host Admin */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          <div className="bg-slate-900 border border-slate-800 p-0.5 rounded-xl flex items-center shadow-inner">
            <button
              onClick={() => onToggleParticipantMode(false)}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                !isParticipantMode
                  ? 'bg-slate-800 text-emerald-400 shadow-sm font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Admin Host</span>
            </button>

            <button
              onClick={() => onToggleParticipantMode(true)}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                isParticipantMode
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Participant Play</span>
            </button>
          </div>

          {/* Sound toggle */}
          <button
            onClick={handleToggleSound}
            title={soundEnabled ? 'Mute audio' : 'Enable audio'}
            className="p-2 rounded-lg border border-slate-800 bg-slate-900/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Admin tabs - shown only in Admin mode */}
      {!isParticipantMode && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 overflow-x-auto scrollbar-none border-t border-slate-800/60">
          <nav className="flex space-x-1 py-1.5">
            {navTabs.map((tab) => {
              const isActive = currentTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id)}
                  className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                    isActive
                      ? 'bg-slate-800 text-white font-semibold border border-slate-700 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      )}
    </header>
  );
};
