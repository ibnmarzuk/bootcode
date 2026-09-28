import React, { useEffect, useState, useCallback } from 'react';
import {
  Maximize2,
  Minimize2,
  X,
  Play,
  Users,
  Radio,
  ExternalLink,
  Copy,
  Check,
  Download,
  Smartphone,
  CheckCircle2,
  RefreshCw,
  Globe,
  Settings2
} from 'lucide-react';
import QRCode from 'qrcode';
import { QuizGame, QuizEvent, Participant } from '../types';
import { api } from '../services/api';
import { getPublicJoinUrl } from '../services/urlHelper';

interface ProjectorLobbyModalProps {
  game: QuizGame;
  event?: QuizEvent;
  participants: Participant[];
  isOpen: boolean;
  onClose: () => void;
  onStartGame: () => void;
  publicServerUrl?: string;
  onTestJoinOnThisDevice?: (code: string) => void;
}

export const ProjectorLobbyModal: React.FC<ProjectorLobbyModalProps> = ({
  game,
  event,
  participants,
  isOpen,
  onClose,
  onStartGame,
  publicServerUrl,
  onTestJoinOnThisDevice
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [customHost, setCustomHost] = useState<string>('');
  const [showHostConfig, setShowHostConfig] = useState<boolean>(false);

  // Direct join URL for scanning - Always incorporates full protocol, host, and access PIN
  const joinUrl = getPublicJoinUrl(game.joinCode, publicServerUrl, customHost.trim() || undefined);

  // Generate ultra high-contrast scannable QR code (Client-first with Server fallback)
  const generateQRCode = useCallback(async (text: string) => {
    setIsGenerating(true);
    try {
      // 1. Instant client-side render using standard ISO/IEC 18004 high-contrast specification
      const localUrl = await QRCode.toDataURL(text, {
        errorCorrectionLevel: 'H', // 30% damage/distortion recovery for projectors
        margin: 3,                 // Standard required quiet zone
        scale: 12,                 // High-DPI crisp sharp modules
        color: {
          dark: '#000000',         // Pure pitch black modules
          light: '#ffffff'         // Pure crisp white background
        }
      });
      setQrDataUrl(localUrl);
    } catch {
      // 2. Server API fallback if browser canvas fails
      try {
        const serverUrl = await api.getQRCode(text, {
          dark: '#000000',
          light: '#ffffff',
          margin: 3,
          level: 'H'
        });
        setQrDataUrl(serverUrl);
      } catch (err2) {
        console.error('Failed to generate QR code:', err2);
      }
    } finally {
      setIsGenerating(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      generateQRCode(joinUrl);
    }
  }, [isOpen, joinUrl, generateQRCode]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(joinUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(game.joinCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleDownloadQR = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `quizterm-${game.joinCode}-qr.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#070b12] text-white flex flex-col justify-between p-6 sm:p-8 terminal-grid overflow-y-auto">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="font-mono text-xs text-emerald-400 font-semibold tracking-wider flex items-center space-x-1.5">
              <span>{event?.name ? `${event.name.toUpperCase()} // LIVE ARENA` : 'QUIZTERM ARENA'}</span>
              <span className="text-slate-600">•</span>
              <span className="text-slate-400">PROJECTOR QR LOBBY</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">{game.name}</h1>
          </div>
        </div>

        <div className="flex items-center space-x-2 sm:space-x-3">
          <button
            onClick={() => setShowHostConfig(!showHostConfig)}
            className={`p-2.5 rounded-xl border text-xs font-mono transition-colors flex items-center space-x-1.5 ${
              showHostConfig
                ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
            }`}
            title="Custom Domain / IP Host Setting"
          >
            <Settings2 className="w-4 h-4" />
            <span className="hidden sm:inline">Host URL</span>
          </button>

          <button
            onClick={toggleFullscreen}
            className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition-colors"
            title="Toggle Fullscreen Projector"
          >
            {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
          </button>
          <button
            onClick={onClose}
            className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition-colors"
            title="Close Projector"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Host URL Override configuration banner if opened */}
      {showHostConfig && (
        <div className="my-3 p-4 rounded-2xl bg-slate-900/90 border border-slate-700 text-xs font-mono space-y-2 max-w-xl mx-auto w-full">
          <div className="flex items-center justify-between text-slate-300 font-bold">
            <span className="flex items-center space-x-1.5">
              <Globe className="w-4 h-4 text-emerald-400" />
              <span>QR Destination Origin / Host IP</span>
            </span>
            <button
              onClick={() => { setCustomHost(''); setShowHostConfig(false); }}
              className="text-slate-400 hover:text-white text-[11px]"
            >
              Reset to default
            </button>
          </div>
          <p className="text-[11px] text-slate-400">
            Current QR encodes: <code className="text-emerald-300">{joinUrl}</code>
          </p>
          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={customHost}
              onChange={(e) => setCustomHost(e.target.value)}
              placeholder="e.g. https://my-quiz-app.com or http://192.168.1.15:3000"
              className="flex-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
            />
            <button
              onClick={() => setShowHostConfig(false)}
              className="px-3 py-2 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs"
            >
              Apply
            </button>
          </div>
        </div>
      )}

      {/* Main Center Stage */}
      <div className="flex-1 my-6 flex flex-col lg:flex-row items-center justify-center gap-8 lg:gap-14 max-w-6xl mx-auto w-full">
        {/* Left: High-Contrast Scannable QR Code */}
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="relative group">
            {/* Pure white scannable housing according to QR specification */}
            <div className="p-5 sm:p-7 rounded-3xl bg-white shadow-2xl shadow-emerald-500/20 ring-4 ring-emerald-500/40 flex items-center justify-center transition-transform hover:scale-[1.01]">
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt={`QR Code to join ${game.name}`}
                  className="w-64 h-64 sm:w-80 sm:h-80 object-contain rounded-lg"
                  style={{ imageRendering: 'pixelated' }}
                />
              ) : (
                <div className="w-64 h-64 sm:w-80 sm:h-80 bg-slate-100 flex flex-col items-center justify-center text-slate-400 space-y-2 rounded-lg">
                  <RefreshCw className="w-8 h-8 animate-spin text-emerald-600" />
                  <span className="text-xs font-mono font-medium">Generating QR...</span>
                </div>
              )}
            </div>

            {/* Quick overlay badges */}
            <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-slate-950 border border-emerald-500/40 text-emerald-400 px-3 py-1 rounded-full text-[11px] font-mono font-semibold flex items-center space-x-1.5 shadow-lg whitespace-nowrap">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Verified Scannable • Access PIN Embedded</span>
            </div>
          </div>

          <div className="flex flex-col items-center space-y-2 pt-2">
            <div className="font-mono text-xs sm:text-sm text-slate-200 font-medium flex items-center space-x-1.5">
              <Smartphone className="w-4 h-4 text-emerald-400" />
              <span>Point iPhone or Android Camera to join with PIN automatically</span>
            </div>
            <div className="text-[11px] font-mono text-slate-400 max-w-sm truncate">
              {joinUrl}
            </div>

            {/* Action buttons under QR */}
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={handleDownloadQR}
                disabled={!qrDataUrl}
                className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-mono text-slate-300 hover:text-white flex items-center space-x-1.5 transition-colors disabled:opacity-50"
                title="Download high-resolution QR PNG for slides or print"
              >
                <Download className="w-3.5 h-3.5 text-emerald-400" />
                <span>Save PNG</span>
              </button>

              <button
                onClick={() => generateQRCode(joinUrl)}
                disabled={isGenerating}
                className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-mono text-slate-300 hover:text-white flex items-center space-x-1.5 transition-colors"
                title="Regenerate QR code"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-slate-400 ${isGenerating ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>

              {onTestJoinOnThisDevice ? (
                <button
                  onClick={() => onTestJoinOnThisDevice(game.joinCode)}
                  className="px-3 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-xs font-mono text-emerald-300 flex items-center space-x-1.5 transition-colors"
                  title="Open player join view on this device"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Test Join</span>
                </button>
              ) : (
                <a
                  href={joinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-mono text-slate-300 hover:text-white flex items-center space-x-1.5 transition-colors"
                  title="Open Join Page in new tab to test player view"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-blue-400" />
                  <span>Test Link</span>
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Right: Join Info & Code */}
        <div className="flex flex-col items-center lg:items-start text-center lg:text-left space-y-6 max-w-lg w-full">
          {/* Big Join PIN Box */}
          <div className="space-y-2 w-full">
            <span className="text-xs font-mono text-slate-400 uppercase tracking-widest flex items-center justify-center lg:justify-start space-x-1.5">
              <span>Game Access PIN</span>
              <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 font-bold">
                AUTO-FILL ON SCAN
              </span>
            </span>
            <div className="flex items-center justify-center lg:justify-start gap-3">
              <div className="text-5xl sm:text-6xl font-black font-mono tracking-widest text-emerald-400 bg-slate-900/90 border-2 border-emerald-500/40 px-6 sm:px-8 py-3 rounded-2xl shadow-xl shadow-emerald-500/10">
                {game.joinCode}
              </div>
              <button
                onClick={handleCopyCode}
                className="p-4 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-all shadow-md active:scale-95"
                title="Copy Join Code"
              >
                {copiedCode ? <Check className="w-6 h-6 text-emerald-400" /> : <Copy className="w-6 h-6" />}
              </button>
            </div>
            <p className="text-xs font-mono text-slate-400 pt-1">
              Competitors can point their phone camera at the QR code, or enter this PIN at the join screen.
            </p>
          </div>

          {/* Quick Share URL bar */}
          <div className="w-full space-y-1.5">
            <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
              Direct Join URL
            </span>
            <div className="flex items-center space-x-2 bg-slate-900/90 border border-slate-800 rounded-xl p-2 sm:p-2.5">
              <div className="flex-1 truncate font-mono text-xs text-slate-300 select-all">
                {joinUrl}
              </div>
              <button
                onClick={handleCopyLink}
                className="px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-mono text-xs font-bold transition-all flex items-center space-x-1.5 shrink-0"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedLink ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>

          {/* Live Lobby Participant Counter */}
          <div className="w-full p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-xs font-mono text-slate-300">
                <Users className="w-4 h-4 text-emerald-400" />
                <span>
                  Connected Players: <strong className="text-white text-sm">{participants.length}</strong>
                </span>
              </div>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                LIVE LOBBY
              </span>
            </div>

            {/* Avatars Grid */}
            <div className="flex flex-wrap gap-2 max-h-28 overflow-y-auto pr-1">
              {participants.length === 0 ? (
                <div className="w-full text-center py-4 text-xs font-mono text-slate-500">
                  Waiting for players to scan QR or enter PIN...
                </div>
              ) : (
                participants.slice(0, 36).map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center space-x-1.5 bg-slate-800/80 border border-slate-700/80 px-2.5 py-1 rounded-lg text-xs font-mono text-slate-200 animate-in fade-in zoom-in-95 duration-200"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    <span className="font-semibold truncate max-w-[100px]">{p.firstName}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Control Bar */}
      <div className="flex items-center justify-between border-t border-slate-800 pt-4">
        <div className="text-xs font-mono text-slate-400 flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>Room Code: <strong className="text-emerald-400">{game.joinCode}</strong></span>
          <span className="text-slate-600">•</span>
          <span>{game.questionIds.length} Questions</span>
          <span className="text-slate-600">•</span>
          <span>{game.timePerQuestion}s Timer</span>
        </div>

        <button
          onClick={onStartGame}
          className="px-6 sm:px-8 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-sm font-mono tracking-wide shadow-lg shadow-emerald-500/20 active:scale-95 transition-all flex items-center space-x-2"
        >
          <Play className="w-4 h-4 fill-slate-950" />
          <span>START COMPETITION</span>
        </button>
      </div>
    </div>
  );
};
