import React, { useState, useRef } from 'react';
import {
  Layers,
  Plus,
  Radio,
  Clock,
  Trash2,
  Edit3,
  Copy,
  Check,
  Users,
  Shuffle,
  Timer,
  Sparkles,
  QrCode,
  FileText,
  FileUp,
  Loader2,
  AlertCircle,
  CheckCircle2,
  X
} from 'lucide-react';
import { QuizGame, QuizEvent, Question, DocumentItem } from '../types';

interface GameManagerProps {
  games: QuizGame[];
  events: QuizEvent[];
  questions: Question[];
  documents?: DocumentItem[];
  onSaveGame: (game: Partial<QuizGame>) => Promise<void>;
  onDeleteGame: (id: string) => Promise<void>;
  onUpdateGameStatus: (id: string, status: QuizGame['status']) => Promise<void>;
  onSelectGameForHost: (gameId: string) => void;
  onOpenProjectorLobby: (gameId: string) => void;
  onUploadDocument?: (payload: { filename: string; rawText?: string; base64Content?: string }) => Promise<any>;
  onGenerateQuestions?: (options: {
    documentId?: string;
    count: number;
    difficulty?: string;
    category?: string;
    language?: string;
    autoApprove?: boolean;
    base64Pdf?: string;
    filename?: string;
  }) => Promise<{ success: boolean; count: number; questions: Question[]; document?: DocumentItem }>;
  onSaveQuestion?: (q: Partial<Question>) => Promise<void>;
}

export const GameManager: React.FC<GameManagerProps> = ({
  games,
  events,
  questions,
  onSaveGame,
  onDeleteGame,
  onUpdateGameStatus,
  onSelectGameForHost,
  onOpenProjectorLobby,
  onGenerateQuestions
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGame, setEditingGame] = useState<Partial<QuizGame> | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Essential Game Setup
  const [name, setName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [timePerQuestion, setTimePerQuestion] = useState<number>(10);

  // PDF Upload & AI Generation states for this session
  const [pdfBase64, setPdfBase64] = useState<string | null>(null);
  const [pdfFileName, setPdfFileName] = useState<string>('');
  const [pdfFileSize, setPdfFileSize] = useState<string>('');
  const [targetQuestionCount, setTargetQuestionCount] = useState<number>(10);
  const [targetDifficulty, setTargetDifficulty] = useState<'MIXED' | 'EASY' | 'MEDIUM' | 'HARD'>('MIXED');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState<string>('');
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Session generated questions (previewable in the modal)
  const [sessionGeneratedQuestions, setSessionGeneratedQuestions] = useState<Question[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Open Create Game modal
  const handleOpenCreate = () => {
    setEditingGame(null);
    setName('');
    setJoinCode(Math.random().toString(36).substring(2, 8).toUpperCase());
    setTimePerQuestion(10);

    // Reset PDF & questions
    setPdfBase64(null);
    setPdfFileName('');
    setPdfFileSize('');
    setTargetQuestionCount(10);
    setTargetDifficulty('MIXED');
    setIsGenerating(false);
    setGenerationStep('');
    setGenerationError(null);
    setSessionGeneratedQuestions([]);

    setIsModalOpen(true);
  };

  // Open Edit Game modal
  const handleOpenEdit = (game: QuizGame) => {
    setEditingGame(game);
    setName(game.name);
    setJoinCode(game.joinCode);
    setTimePerQuestion(game.timePerQuestion || 10);

    // Find questions belonging to this game
    const gameQuestions = questions.filter(q => game.questionIds?.includes(q.id));
    setSessionGeneratedQuestions(gameQuestions);
    setPdfBase64(null);
    setPdfFileName('');
    setPdfFileSize('');
    setGenerationError(null);
    setIsModalOpen(true);
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // Handle PDF file selection
  const handleFileSelect = (file: File) => {
    if (!file) return;
    setPdfFileName(file.name);
    setGenerationError(null);

    // Compute formatted size
    const sizeInKb = file.size / 1024;
    const formattedSize = sizeInKb > 1024
      ? `${(sizeInKb / 1024).toFixed(1)} MB`
      : `${Math.round(sizeInKb)} KB`;
    setPdfFileSize(formattedSize);

    // Auto-suggest game title if currently empty
    if (!name.trim()) {
      const cleanName = file.name
        .replace(/\.[^/.]+$/, '')
        .replace(/[-_]+/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase());
      setName(`${cleanName} Quiz`);
    }

    // Read as Base64
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setPdfBase64(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleChooseFileClick = () => {
    fileInputRef.current?.click();
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  // Generate Questions from the uploaded PDF
  const handleGenerateFromPdf = async () => {
    if (!pdfBase64 || !pdfFileName) {
      setGenerationError('Please upload a PDF curriculum file first.');
      return;
    }

    setIsGenerating(true);
    setGenerationError(null);
    setGenerationStep('Reading PDF document and formulating questions with Gemini...');

    try {
      if (onGenerateQuestions) {
        const res = await onGenerateQuestions({
          base64Pdf: pdfBase64,
          filename: pdfFileName,
          count: targetQuestionCount,
          difficulty: targetDifficulty,
          category: name.trim() || 'Curriculum',
          autoApprove: true
        });

        if (res.questions && res.questions.length > 0) {
          setSessionGeneratedQuestions(res.questions);
          setGenerationStep(`Successfully generated ${res.questions.length} questions from ${pdfFileName}!`);
        } else {
          throw new Error('No questions could be extracted from this PDF. Please check the file.');
        }
      } else {
        throw new Error('Question generator is not ready.');
      }
    } catch (err: any) {
      console.error('Question generation failed:', err);
      setGenerationError(err.message || 'Failed to generate questions. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Remove single question from session
  const handleRemoveQuestion = (qId: string) => {
    setSessionGeneratedQuestions(prev => prev.filter(q => q.id !== qId));
  };

  // Form Submit: Save Game
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setGenerationError('Please provide a name for this game.');
      return;
    }

    if (sessionGeneratedQuestions.length === 0) {
      setGenerationError('Please upload a PDF and generate questions for this game session.');
      return;
    }

    setIsSaving(true);
    try {
      await onSaveGame({
        id: editingGame?.id,
        name: name.trim(),
        description: pdfFileName ? `Quiz session based on ${pdfFileName}` : (editingGame?.description || 'Curriculum Quiz Session'),
        eventId: editingGame?.eventId || events[0]?.id || 'event-1',
        joinCode: (joinCode.trim() || Math.random().toString(36).substring(2, 8)).toUpperCase(),
        timePerQuestion,
        pointsPerCorrect: 1,
        leaderboardVisibility: 'AFTER_EACH',
        randomizeQuestions: false,
        randomizeOptions: false,
        maxParticipants: 1000,
        questionIds: sessionGeneratedQuestions.map(q => q.id),
        status: editingGame?.status || 'READY'
      });
      setIsModalOpen(false);
    } catch (err: any) {
      setGenerationError('Failed to save game: ' + (err.message || err));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="text-xs font-mono text-emerald-400 mb-1 flex items-center space-x-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            <span>PDF QUESTION GENERATOR & SESSIONS</span>
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Competition Games</h2>
          <p className="text-xs text-slate-400 mt-1">
            Create games powered by your uploaded PDF curriculum. AI generates the questions directly for each session.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs font-mono transition-all shadow-lg shadow-emerald-500/20 active:scale-95 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Create Game from PDF</span>
        </button>
      </div>

      {/* Games List Grid */}
      {games.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/30 p-12 text-center flex flex-col items-center justify-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
            <FileUp className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-white">No games created yet</h3>
            <p className="text-xs text-slate-400 max-w-sm">
              Upload your PDF curriculum to generate questions and launch your first live competition.
            </p>
          </div>
          <button
            onClick={handleOpenCreate}
            className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs font-mono transition-all shadow-md"
          >
            Create Game from PDF
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {games.map((game) => (
            <div
              key={game.id}
              className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 flex flex-col justify-between hover:border-slate-700 transition-all space-y-4 shadow-xl shadow-black/20"
            >
              <div className="space-y-3">
                {/* Title & Status */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-base font-bold text-white tracking-tight leading-snug">{game.name}</h3>
                    <div className="text-[11px] font-mono text-slate-400 mt-0.5 line-clamp-1">
                      {game.description || 'PDF-generated session'}
                    </div>
                  </div>

                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded-md uppercase font-semibold shrink-0 ${
                      game.status === 'LIVE'
                        ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30 animate-pulse'
                        : game.status === 'LOBBY'
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        : game.status === 'COMPLETED'
                        ? 'bg-slate-800 text-slate-400 border border-slate-700'
                        : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    }`}
                  >
                    {game.status}
                  </span>
                </div>

                {/* Join Code Callout */}
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-mono uppercase text-slate-400">Join PIN</span>
                    <div className="font-mono text-lg font-black text-emerald-400 tracking-wider">
                      {game.joinCode}
                    </div>
                  </div>

                  <button
                    onClick={() => handleCopyCode(game.joinCode)}
                    className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-emerald-400 transition-colors flex items-center space-x-1 text-xs font-mono"
                    title="Copy Join Code"
                  >
                    {copiedCode === game.joinCode ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-400" />
                        <span className="text-emerald-400 text-[10px]">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span className="text-[10px]">Copy</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Specs */}
                <div className="grid grid-cols-2 gap-2 text-xs font-mono text-slate-400">
                  <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800/60">
                    <span className="text-[10px] text-slate-400 block">QUESTIONS</span>
                    <strong className="text-white text-xs">{game.questionIds?.length || 0} Questions</strong>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800/60">
                    <span className="text-[10px] text-slate-400 block flex items-center space-x-1">
                      <Timer className="w-3 h-3 text-emerald-400" />
                      <span>TIMER</span>
                    </span>
                    <strong className="text-emerald-400 text-xs truncate block">
                      {game.timePerQuestion || 10}s / Question
                    </strong>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-3 border-t border-slate-800/80 flex flex-col gap-2">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => onSelectGameForHost(game.id)}
                    className="flex-1 flex items-center justify-center space-x-2 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs font-mono transition-all shadow-md shadow-emerald-500/10 active:scale-95"
                  >
                    <Radio className="w-4 h-4" />
                    <span>Host Control Room</span>
                  </button>

                  <button
                    onClick={() => onOpenProjectorLobby(game.id)}
                    className="p-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-mono flex items-center space-x-1.5 transition-colors"
                    title="Open Fullscreen Projector QR Lobby with auto-join PIN"
                  >
                    <QrCode className="w-4 h-4 text-emerald-400" />
                    <span>Scan QR</span>
                  </button>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                  <div className="flex items-center space-x-1">
                    {game.status === 'READY' && (
                      <button
                        onClick={() => onUpdateGameStatus(game.id, 'LOBBY')}
                        className="text-[11px] font-mono text-amber-400 hover:underline"
                      >
                        Open Lobby →
                      </button>
                    )}
                    {game.status === 'LOBBY' && (
                      <button
                        onClick={() => onUpdateGameStatus(game.id, 'READY')}
                        className="text-[11px] font-mono text-slate-400 hover:underline"
                      >
                        Back to Ready
                      </button>
                    )}
                    {game.status === 'COMPLETED' && (
                      <button
                        onClick={() => onUpdateGameStatus(game.id, 'READY')}
                        className="text-[11px] font-mono text-emerald-400 hover:underline"
                      >
                        Reset Game
                      </button>
                    )}
                  </div>

                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => handleOpenEdit(game)}
                      className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200"
                      title="Edit Game & Questions"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDeleteGame(game.id)}
                      className="p-1.5 rounded-lg hover:bg-rose-950/50 text-slate-400 hover:text-rose-400"
                      title="Delete Game"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* STREAMLINED CREATE / EDIT GAME MODAL: UPLOAD PDF & GENERATE QUESTIONS DIRECTLY */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
          <div className="w-full max-w-3xl rounded-2xl border border-slate-800 bg-[#0b101b] shadow-2xl overflow-hidden my-6 animate-in fade-in flex flex-col max-h-[92vh]">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between shrink-0 bg-slate-900/60">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white font-mono flex items-center space-x-2">
                    <span>{editingGame ? 'EDIT GAME & QUESTIONS' : 'CREATE GAME & GENERATE QUESTIONS FROM PDF'}</span>
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Upload your PDF curriculum for this session. Questions will be generated directly from your document.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1">
              
              {/* Game Essentials */}
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-mono text-slate-300 mb-1">
                      Game Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Chapter 4 Operating Systems Quiz"
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:border-emerald-500 font-sans"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-slate-300 mb-1">
                      Join PIN
                    </label>
                    <div className="flex items-center space-x-1.5">
                      <input
                        type="text"
                        value={joinCode}
                        onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-emerald-400 text-sm font-mono font-bold uppercase focus:outline-none focus:border-emerald-500"
                      />
                      <button
                        type="button"
                        onClick={() => setJoinCode(Math.random().toString(36).substring(2, 8).toUpperCase())}
                        className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300"
                        title="Randomize PIN"
                      >
                        <Shuffle className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Question Timer */}
                <div className="pt-1 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span className="text-xs font-mono text-slate-400">Seconds per Question:</span>
                  <div className="flex items-center space-x-1.5">
                    {[5, 10, 15, 20, 30].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setTimePerQuestion(s)}
                        className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-colors ${
                          timePerQuestion === s
                            ? 'bg-emerald-500 text-slate-950 shadow-sm'
                            : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {s}s
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* PDF Upload & Question Generator */}
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-4">
                <div className="text-xs font-mono font-bold text-white uppercase tracking-wider flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  <span>Session PDF Curriculum</span>
                </div>

                {/* Hidden File Input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.txt,.md"
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      handleFileSelect(e.target.files[0]);
                    }
                  }}
                  className="hidden"
                />

                {/* Drag & Drop Zone */}
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={handleChooseFileClick}
                  className={`border-2 border-dashed rounded-xl p-5 sm:p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center space-y-2 ${
                    isDragOver
                      ? 'border-emerald-400 bg-emerald-950/30'
                      : pdfFileName
                      ? 'border-emerald-500/50 bg-emerald-950/15'
                      : 'border-slate-700 bg-slate-950/50 hover:border-slate-500 hover:bg-slate-950/80'
                  }`}
                >
                  {pdfFileName ? (
                    <div className="flex items-center space-x-3 text-left">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30 shrink-0">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-white flex items-center space-x-1.5 truncate">
                          <span className="truncate">{pdfFileName}</span>
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {pdfFileSize} • Click or drop to replace PDF
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center space-y-1.5">
                      <div className="w-10 h-10 rounded-xl bg-slate-800 text-emerald-400 flex items-center justify-center border border-slate-700">
                        <FileUp className="w-5 h-5" />
                      </div>
                      <div className="text-xs font-bold text-white">
                        Click or drag & drop your session PDF here
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Supports PDF curriculum, lecture slides, syllabus, or notes
                      </div>
                    </div>
                  )}
                </div>

                {/* Generator Options */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[11px] font-mono text-slate-300 mb-1 flex items-center justify-between">
                      <span>Questions to Generate:</span>
                      <strong className="text-emerald-400">{targetQuestionCount}</strong>
                    </label>
                    <div className="flex items-center space-x-1">
                      {[5, 10, 15, 20].map((num) => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => setTargetQuestionCount(num)}
                          className={`flex-1 py-1 rounded-lg text-xs font-mono font-bold transition-all ${
                            targetQuestionCount === num
                              ? 'bg-emerald-500 text-slate-950 shadow-sm'
                              : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-white'
                          }`}
                        >
                          {num} Qs
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono text-slate-300 mb-1 flex items-center justify-between">
                      <span>Difficulty:</span>
                      <strong className="text-emerald-400">{targetDifficulty}</strong>
                    </label>
                    <div className="flex items-center space-x-1">
                      {(['MIXED', 'EASY', 'MEDIUM', 'HARD'] as const).map((diff) => (
                        <button
                          key={diff}
                          type="button"
                          onClick={() => setTargetDifficulty(diff)}
                          className={`flex-1 py-1 rounded-lg text-xs font-mono font-bold transition-all ${
                            targetDifficulty === diff
                              ? 'bg-emerald-500 text-slate-950 shadow-sm'
                              : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-white'
                          }`}
                        >
                          {diff}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Generate Button */}
                <button
                  type="button"
                  onClick={handleGenerateFromPdf}
                  disabled={!pdfBase64 || isGenerating}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-xs font-mono transition-all shadow-lg shadow-emerald-500/20 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                      <span>{generationStep || 'Generating Questions with Gemini...'}</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>
                        {pdfFileName
                          ? `Generate ${targetQuestionCount} Questions from "${pdfFileName}"`
                          : 'Upload PDF to Generate Questions'}
                      </span>
                    </>
                  )}
                </button>

                {generationError && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-mono flex items-center space-x-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{generationError}</span>
                  </div>
                )}
              </div>

              {/* Questions Generated for this Session */}
              {sessionGeneratedQuestions.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-mono font-bold text-white flex items-center space-x-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>
                        Questions for this Session ({sessionGeneratedQuestions.length} Questions)
                      </span>
                    </div>
                  </div>

                  <div className="max-h-72 overflow-y-auto space-y-2.5 pr-1">
                    {sessionGeneratedQuestions.map((q, idx) => (
                      <div
                        key={q.id}
                        className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-950/20 text-xs space-y-2"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start space-x-2 flex-1">
                            <span className="font-mono font-bold text-emerald-400 shrink-0">
                              Q{idx + 1}.
                            </span>
                            <span className="text-white font-medium text-xs font-sans">
                              {q.text}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemoveQuestion(q.id)}
                            className="p-1 rounded-lg hover:bg-rose-950/50 text-slate-500 hover:text-rose-400 transition-colors shrink-0"
                            title="Remove this question"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* 4 Choices */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-0.5">
                          {q.options.map((opt) => (
                            <div
                              key={opt.id}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-mono flex items-center space-x-1.5 ${
                                opt.id === q.correctAnswer
                                  ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 font-bold'
                                  : 'bg-slate-950/80 text-slate-400 border border-slate-800'
                              }`}
                            >
                              <span className="w-4 font-bold">{opt.id}.</span>
                              <span className="truncate">{opt.text}</span>
                              {opt.id === q.correctAnswer && (
                                <Check className="w-3.5 h-3.5 text-emerald-400 ml-auto shrink-0" />
                              )}
                            </div>
                          ))}
                        </div>

                        {/* Explanation & Source reference */}
                        <div className="flex items-center space-x-2 text-[10px] text-slate-400 pt-0.5 font-mono">
                          <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300">
                            Page {q.sourcePage || 1}
                          </span>
                          {q.explanation && (
                            <span className="truncate italic text-slate-400">
                              {q.explanation}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Modal Footer */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-3">
                <div className="text-xs font-mono text-slate-400">
                  {sessionGeneratedQuestions.length > 0 ? (
                    <span className="text-emerald-400 font-bold">
                      ✓ {sessionGeneratedQuestions.length} questions attached to this game
                    </span>
                  ) : (
                    <span>Upload PDF and generate questions to continue</span>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 text-xs font-mono hover:bg-slate-800 transition-colors"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={isSaving || sessionGeneratedQuestions.length === 0}
                    className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs font-mono transition-all shadow-lg shadow-emerald-500/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1.5"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <Radio className="w-3.5 h-3.5" />
                        <span>{editingGame ? 'Save Changes' : `Save & Create Game (${sessionGeneratedQuestions.length} Qs)`}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
