import React, { useState, useRef } from 'react';
import {
  Sparkles,
  Plus,
  Search,
  UploadCloud,
  FileText,
  CheckCircle2,
  XCircle,
  Edit3,
  Trash2,
  Check,
  Loader2,
  FileCode,
  Layers
} from 'lucide-react';
import { Question, DocumentItem } from '../types';

interface QuestionsAndAiManagerProps {
  questions: Question[];
  documents: DocumentItem[];
  onSaveQuestion: (question: Partial<Question>) => Promise<void>;
  onDeleteQuestion: (id: string) => Promise<void>;
  onUpdateQuestionStatus: (id: string, status: Question['status']) => Promise<void>;
  onUploadDocument: (payload: { filename: string; rawText?: string; base64Content?: string }) => Promise<any>;
  onDeleteDocument: (id: string) => Promise<void>;
  onGenerateQuestions: (options: {
    documentId: string;
    count: number;
    difficulty?: string;
    category?: string;
    language?: string;
  }) => Promise<{ count: number; questions: Question[] }>;
}

export const QuestionsAndAiManager: React.FC<QuestionsAndAiManagerProps> = ({
  questions,
  documents,
  onSaveQuestion,
  onDeleteQuestion,
  onUpdateQuestionStatus,
  onUploadDocument,
  onDeleteDocument,
  onGenerateQuestions
}) => {
  const [search, setSearch] = useState('');
  const [filterDifficulty, setFilterDifficulty] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');

  // Modals
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);

  // AI Gen form
  const [selectedDocId, setSelectedDocId] = useState(documents[0]?.id || '');
  const [genCount, setGenCount] = useState(5);
  const [genDifficulty, setGenDifficulty] = useState('MEDIUM');
  const [isGenerating, setIsGenerating] = useState(false);
  const [genSuccessMsg, setGenSuccessMsg] = useState<string | null>(null);

  // Manual Question Form
  const [text, setText] = useState('');
  const [optA, setOptA] = useState('');
  const [optB, setOptB] = useState('');
  const [optC, setOptC] = useState('');
  const [optD, setOptD] = useState('');
  const [correctAnswer, setCorrectAnswer] = useState<'A' | 'B' | 'C' | 'D'>('A');
  const [explanation, setExplanation] = useState('');
  const [category, setCategory] = useState('AI & Tech');
  const [difficulty, setDifficulty] = useState<Question['difficulty']>('MEDIUM');
  const [isSaving, setIsSaving] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const pendingQuestions = questions.filter(q => q.status === 'PENDING');

  const filteredQuestions = questions.filter(q => {
    if (filterDifficulty !== 'ALL' && q.difficulty !== filterDifficulty) return false;
    if (filterStatus !== 'ALL' && q.status !== filterStatus) return false;
    if (search.trim()) {
      const s = search.toLowerCase();
      return q.text.toLowerCase().includes(s) || q.category.toLowerCase().includes(s);
    }
    return true;
  });

  const handleApproveAllPending = async () => {
    for (const q of pendingQuestions) {
      await onUpdateQuestionStatus(q.id, 'APPROVED');
    }
  };

  const handleOpenCreateManual = () => {
    setEditingQuestion(null);
    setText('');
    setOptA('');
    setOptB('');
    setOptC('');
    setOptD('');
    setCorrectAnswer('A');
    setExplanation('');
    setCategory('General');
    setDifficulty('MEDIUM');
    setIsManualModalOpen(true);
  };

  const handleOpenEditManual = (q: Question) => {
    setEditingQuestion(q);
    setText(q.text);
    setOptA(q.options.find(o => o.id === 'A')?.text || '');
    setOptB(q.options.find(o => o.id === 'B')?.text || '');
    setOptC(q.options.find(o => o.id === 'C')?.text || '');
    setOptD(q.options.find(o => o.id === 'D')?.text || '');
    setCorrectAnswer(q.correctAnswer);
    setExplanation(q.explanation);
    setCategory(q.category);
    setDifficulty(q.difficulty);
    setIsManualModalOpen(true);
  };

  const handleSubmitManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !optA.trim() || !optB.trim() || !optC.trim() || !optD.trim()) return;

    setIsSaving(true);
    try {
      await onSaveQuestion({
        id: editingQuestion?.id,
        text: text.trim(),
        options: [
          { id: 'A', text: optA.trim() },
          { id: 'B', text: optB.trim() },
          { id: 'C', text: optC.trim() },
          { id: 'D', text: optD.trim() }
        ],
        correctAnswer,
        explanation: explanation.trim(),
        category: category.trim() || 'General',
        difficulty,
        points: 1,
        timeLimit: 5,
        status: editingQuestion ? editingQuestion.status : 'APPROVED'
      });
      setIsManualModalOpen(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleGenerateAi = async (e: React.FormEvent) => {
    e.preventDefault();
    const docId = selectedDocId || documents[0]?.id;
    if (!docId) return;

    setIsGenerating(true);
    setGenSuccessMsg(null);
    try {
      const res = await onGenerateQuestions({
        documentId: docId,
        count: genCount,
        difficulty: genDifficulty
      });
      setGenSuccessMsg(`Success! Generated ${res.count} new questions ready for review.`);
    } catch (e: any) {
      console.error('AI Gen error:', e);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      if (file.name.toLowerCase().endsWith('.pdf')) {
        const reader = new FileReader();
        reader.onload = async () => {
          await onUploadDocument({
            filename: file.name,
            base64Content: reader.result as string
          });
          setIsUploading(false);
        };
        reader.readAsDataURL(file);
      } else {
        const reader = new FileReader();
        reader.onload = async () => {
          await onUploadDocument({
            filename: file.name,
            rawText: reader.result as string
          });
          setIsUploading(false);
        };
        reader.readAsText(file);
      }
    } catch (err) {
      console.error('File upload error:', err);
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-mono text-amber-400 font-bold uppercase">
              QUESTION STUDIO
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white">Questions & AI Generator</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Generate quiz questions automatically from uploaded documents or add them manually.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".pdf,.txt,.md,.json"
            className="hidden"
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="flex items-center space-x-1.5 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 text-xs font-semibold transition-all"
          >
            <UploadCloud className="w-4 h-4 text-emerald-400" />
            <span>{isUploading ? 'Uploading...' : 'Upload PDF / Doc'}</span>
          </button>

          <button
            onClick={() => {
              setGenSuccessMsg(null);
              setIsAiModalOpen(true);
            }}
            className="flex items-center space-x-1.5 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-all shadow-md shadow-amber-500/10 active:scale-95"
          >
            <Sparkles className="w-4 h-4" />
            <span>AI Generate Questions</span>
          </button>

          <button
            onClick={handleOpenCreateManual}
            className="flex items-center space-x-1.5 px-3.5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Add Manually</span>
          </button>
        </div>
      </div>

      {/* Pending Questions Alert & One-Click Approve All */}
      {pendingQuestions.length > 0 && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <span className="text-xs font-bold text-amber-300">
              {pendingQuestions.length} AI-Generated Questions Waiting for Review
            </span>
            <p className="text-xs text-slate-300">
              Review and approve them below to make them available in live games.
            </p>
          </div>

          <button
            onClick={handleApproveAllPending}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-all shrink-0"
          >
            Approve All ({pendingQuestions.length})
          </button>
        </div>
      )}

      {/* Search & Filter Strip */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search questions..."
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <select
            value={filterDifficulty}
            onChange={(e) => setFilterDifficulty(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs"
          >
            <option value="ALL">All Difficulties</option>
            <option value="EASY">Easy</option>
            <option value="MEDIUM">Medium</option>
            <option value="HARD">Hard</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs"
          >
            <option value="ALL">All Statuses</option>
            <option value="APPROVED">Approved</option>
            <option value="PENDING">Pending Review</option>
          </select>
        </div>
      </div>

      {/* Questions List */}
      <div className="space-y-3">
        {filteredQuestions.length === 0 ? (
          <div className="p-8 text-center rounded-2xl border border-slate-800 bg-slate-900/40 text-slate-400 text-xs">
            No questions found. Click "AI Generate Questions" or "Add Manually" above.
          </div>
        ) : (
          filteredQuestions.map((q) => (
            <div
              key={q.id}
              className={`p-4 rounded-2xl border transition-all ${
                q.status === 'PENDING'
                  ? 'border-amber-500/40 bg-amber-500/5'
                  : 'border-slate-800 bg-slate-900/60'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                        q.status === 'APPROVED'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      }`}
                    >
                      {q.status}
                    </span>

                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                      {q.category}
                    </span>

                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                      {q.difficulty}
                    </span>

                    {q.sourceDocument && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-950/60 text-blue-300 border border-blue-800/40">
                        {q.sourceDocument}
                      </span>
                    )}
                  </div>

                  <h4 className="text-sm font-bold text-white leading-snug">{q.text}</h4>

                  {/* 4 Options Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    {q.options.map((opt) => {
                      const isCorrect = opt.id === q.correctAnswer;
                      return (
                        <div
                          key={opt.id}
                          className={`p-2.5 rounded-xl text-xs flex items-center justify-between border ${
                            isCorrect
                              ? 'bg-emerald-950/60 border-emerald-500/60 text-emerald-200 font-semibold'
                              : 'bg-slate-950/60 border-slate-800 text-slate-300'
                          }`}
                        >
                          <div className="flex items-center space-x-2">
                            <span className={`w-5 h-5 rounded flex items-center justify-center font-bold text-[10px] ${
                              isCorrect ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                            }`}>
                              {opt.id}
                            </span>
                            <span className="text-xs">{opt.text}</span>
                          </div>
                          {isCorrect && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                        </div>
                      );
                    })}
                  </div>

                  {q.explanation && (
                    <p className="text-[11px] text-slate-400 pt-1">
                      <strong className="text-slate-300">Explanation:</strong> {q.explanation}
                    </p>
                  )}
                </div>

                {/* Question Actions */}
                <div className="flex items-center space-x-1 shrink-0">
                  {q.status === 'PENDING' && (
                    <button
                      onClick={() => onUpdateQuestionStatus(q.id, 'APPROVED')}
                      className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 text-xs font-bold"
                    >
                      Approve
                    </button>
                  )}

                  <button
                    onClick={() => handleOpenEditManual(q)}
                    className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
                    title="Edit"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => onDeleteQuestion(q.id)}
                    className="p-1.5 rounded-lg hover:bg-rose-950/50 text-slate-500 hover:text-rose-400"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Uploaded Documents List */}
      <div className="pt-4 border-t border-slate-800 space-y-3">
        <h3 className="text-sm font-bold text-white flex items-center space-x-2">
          <FileText className="w-4 h-4 text-emerald-400" />
          <span>Uploaded Knowledge Materials ({documents.length})</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {documents.map((doc) => (
            <div key={doc.id} className="p-3.5 rounded-2xl border border-slate-800 bg-slate-900/60 flex items-center justify-between text-xs">
              <div className="space-y-0.5 truncate pr-2">
                <span className="font-bold text-white truncate block">{doc.filename}</span>
                <span className="text-[11px] text-slate-400 font-mono">
                  {doc.chunks?.length || 0} chunks extracted • {Math.round(doc.size / 1024)} KB
                </span>
              </div>

              <div className="flex items-center space-x-2 shrink-0">
                <button
                  onClick={() => {
                    setSelectedDocId(doc.id);
                    setIsAiModalOpen(true);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-semibold"
                >
                  Generate Qs
                </button>
                <button
                  onClick={() => onDeleteDocument(doc.id)}
                  className="p-1 rounded hover:bg-rose-950/50 text-slate-500 hover:text-rose-400"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* AI Generate Modal */}
      {isAiModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-[#0d131f] p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-base text-white">Generate Questions with AI</h3>
              </div>
              <button onClick={() => setIsAiModalOpen(false)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>

            {genSuccessMsg ? (
              <div className="text-center py-4 space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <p className="text-sm font-semibold text-white">{genSuccessMsg}</p>
                <button
                  onClick={() => setIsAiModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs"
                >
                  Close & View Questions
                </button>
              </div>
            ) : (
              <form onSubmit={handleGenerateAi} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Select Source Document
                  </label>
                  <select
                    value={selectedDocId}
                    onChange={(e) => setSelectedDocId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs"
                  >
                    {documents.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.filename} ({d.chunks?.length || 0} chunks)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Question Count
                    </label>
                    <select
                      value={genCount}
                      onChange={(e) => setGenCount(parseInt(e.target.value, 10))}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-semibold"
                    >
                      <option value={5}>5 Questions</option>
                      <option value={10}>10 Questions</option>
                      <option value={20}>20 Questions</option>
                      <option value={30}>30 Questions</option>
                      <option value={40}>40 Questions</option>
                      <option value={50}>50 Questions</option>
                      <option value={-1}>Custom Count...</option>
                    </select>
                    {genCount === -1 && (
                      <input
                        type="number"
                        min={1}
                        max={100}
                        placeholder="Enter count (1-100)"
                        defaultValue={25}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          if (!isNaN(val) && val > 0) setGenCount(val);
                        }}
                        className="mt-1.5 w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white text-xs"
                      />
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Difficulty
                    </label>
                    <select
                      value={genDifficulty}
                      onChange={(e) => setGenDifficulty(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs"
                    >
                      <option value="MIXED">Mixed</option>
                      <option value="EASY">Easy</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HARD">Hard</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-end space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsAiModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isGenerating}
                    className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center space-x-1.5"
                  >
                    {isGenerating && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>{isGenerating ? 'Generating...' : 'Generate Now'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Manual Question Modal */}
      {isManualModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in overflow-y-auto">
          <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-[#0d131f] p-6 space-y-4 shadow-2xl my-8">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-white">
                {editingQuestion ? 'Edit Question' : 'Add New Question'}
              </h3>
              <button onClick={() => setIsManualModalOpen(false)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitManual} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Question Text</label>
                <textarea
                  rows={2}
                  required
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="e.g. Which algorithm was introduced in 'Attention Is All You Need'?"
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-300">
                  4 Options & Correct Answer
                </label>
                {[
                  { id: 'A' as const, val: optA, set: setOptA },
                  { id: 'B' as const, val: optB, set: setOptB },
                  { id: 'C' as const, val: optC, set: setOptC },
                  { id: 'D' as const, val: optD, set: setOptD }
                ].map(({ id, val, set }) => (
                  <div key={id} className="flex items-center space-x-2">
                    <span className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-300 shrink-0">
                      {id}
                    </span>
                    <input
                      type="text"
                      required
                      value={val}
                      onChange={(e) => set(e.target.value)}
                      placeholder={`Option ${id} text...`}
                      className="flex-1 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs"
                    />
                    <label className="flex items-center space-x-1 text-xs cursor-pointer">
                      <input
                        type="radio"
                        name="correctAnswerKey"
                        checked={correctAnswer === id}
                        onChange={() => setCorrectAnswer(id)}
                        className="text-emerald-500"
                      />
                      <span className={correctAnswer === id ? 'text-emerald-400 font-bold' : 'text-slate-400'}>
                        Correct
                      </span>
                    </label>
                  </div>
                ))}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Explanation</label>
                <textarea
                  rows={2}
                  value={explanation}
                  onChange={(e) => setExplanation(e.target.value)}
                  placeholder="Why is this answer correct?"
                  className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Category</label>
                  <input
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Difficulty</label>
                  <select
                    value={difficulty}
                    onChange={(e: any) => setDifficulty(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs"
                  >
                    <option value="EASY">Easy</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HARD">Hard</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsManualModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs"
                >
                  {isSaving ? 'Saving...' : 'Save Question'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
