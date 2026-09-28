import React, { useState } from 'react';
import {
  HelpCircle,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Edit3,
  Trash2,
  FileText,
  Clock,
  Check,
  AlertCircle
} from 'lucide-react';
import { Question } from '../types';

interface QuestionBankProps {
  questions: Question[];
  onSaveQuestion: (question: Partial<Question>) => Promise<void>;
  onDeleteQuestion: (id: string) => Promise<void>;
  onUpdateQuestionStatus: (id: string, status: Question['status']) => Promise<void>;
}

export const QuestionBank: React.FC<QuestionBankProps> = ({
  questions,
  onSaveQuestion,
  onDeleteQuestion,
  onUpdateQuestionStatus
}) => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedDifficulty, setSelectedDifficulty] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);

  // Form states
  const [text, setText] = useState('');
  const [optA, setOptA] = useState('');
  const [optB, setOptB] = useState('');
  const [optC, setOptC] = useState('');
  const [optD, setOptD] = useState('');
  const [correctAnswer, setCorrectAnswer] = useState<'A' | 'B' | 'C' | 'D'>('A');
  const [explanation, setExplanation] = useState('');
  const [category, setCategory] = useState('Artificial Intelligence');
  const [difficulty, setDifficulty] = useState<Question['difficulty']>('MEDIUM');
  const [timeLimit, setTimeLimit] = useState(5);
  const [sourceDoc, setSourceDoc] = useState('');
  const [sourcePage, setSourcePage] = useState<number | ''>('');
  const [isSaving, setIsSaving] = useState(false);

  const categories = Array.from(new Set(questions.map(q => q.category).filter(Boolean)));

  const filtered = questions.filter(q => {
    if (selectedCategory !== 'ALL' && q.category !== selectedCategory) return false;
    if (selectedDifficulty !== 'ALL' && q.difficulty !== selectedDifficulty) return false;
    if (selectedStatus !== 'ALL' && q.status !== selectedStatus) return false;
    if (search.trim()) {
      const s = search.toLowerCase();
      return (
        q.text.toLowerCase().includes(s) ||
        q.category.toLowerCase().includes(s) ||
        (q.sourceDocument && q.sourceDocument.toLowerCase().includes(s))
      );
    }
    return true;
  });

  const handleOpenCreate = () => {
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
    setTimeLimit(5);
    setSourceDoc('');
    setSourcePage('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (q: Question) => {
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
    setTimeLimit(q.timeLimit || 5);
    setSourceDoc(q.sourceDocument || '');
    setSourcePage(q.sourcePage ?? '');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
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
        timeLimit: timeLimit || 5,
        sourceDocument: sourceDoc.trim() || undefined,
        sourcePage: typeof sourcePage === 'number' ? sourcePage : undefined,
        status: editingQuestion ? editingQuestion.status : 'APPROVED'
      });
      setIsModalOpen(false);
    } finally {
      setIsSaving(false);
    }
  };

  // Bulk actions
  const handleBulkApprove = async () => {
    for (const id of selectedIds) {
      await onUpdateQuestionStatus(id, 'APPROVED');
    }
    setSelectedIds([]);
  };

  const handleBulkReject = async () => {
    for (const id of selectedIds) {
      await onUpdateQuestionStatus(id, 'REJECTED');
    }
    setSelectedIds([]);
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Delete ${selectedIds.length} selected questions?`)) return;
    for (const id of selectedIds) {
      await onDeleteQuestion(id);
    }
    setSelectedIds([]);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="text-xs font-mono text-emerald-400 mb-1">MODULE // 04_QUESTION_BANK</div>
          <h2 className="text-xl font-bold text-white tracking-tight">Question Bank & Review</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Curate, edit, and approve technical questions with 4-choice options, correct answer keys, and source document validation.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="flex items-center space-x-2 px-3.5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs transition-all shadow-md shadow-emerald-500/10 active:scale-95 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Question</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search keyword or doc..."
              className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Category */}
          <div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white text-xs font-mono focus:outline-none focus:border-emerald-500"
            >
              <option value="ALL">All Categories</option>
              {categories.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Difficulty */}
          <div>
            <select
              value={selectedDifficulty}
              onChange={(e) => setSelectedDifficulty(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white text-xs font-mono focus:outline-none focus:border-emerald-500"
            >
              <option value="ALL">All Difficulties</option>
              <option value="EASY">EASY</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="HARD">HARD</option>
            </select>
          </div>

          {/* Status */}
          <div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white text-xs font-mono focus:outline-none focus:border-emerald-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="APPROVED">APPROVED</option>
              <option value="PENDING">PENDING REVIEW</option>
              <option value="REJECTED">REJECTED</option>
            </select>
          </div>
        </div>

        {/* Bulk Action Strip */}
        {selectedIds.length > 0 && (
          <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs font-mono text-slate-300">
            <span>{selectedIds.length} questions selected</span>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleBulkApprove}
                className="px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30"
              >
                Bulk Approve
              </button>
              <button
                onClick={handleBulkReject}
                className="px-2.5 py-1 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30"
              >
                Bulk Reject
              </button>
              <button
                onClick={handleBulkDelete}
                className="px-2.5 py-1 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30"
              >
                Bulk Delete
              </button>
              <button
                onClick={() => setSelectedIds([])}
                className="text-slate-400 hover:text-slate-200 ml-2"
              >
                Clear
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Questions List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="p-8 text-center rounded-xl border border-slate-800 bg-slate-900/40 text-slate-400 text-sm">
            No questions matching your filters.
          </div>
        ) : (
          filtered.map((q) => {
            const isSelected = selectedIds.includes(q.id);

            return (
              <div
                key={q.id}
                className={`p-4 rounded-xl border transition-all ${
                  isSelected
                    ? 'border-emerald-500/50 bg-slate-900/90 shadow-sm'
                    : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start space-x-3">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelect(q.id)}
                      className="mt-1 rounded border-slate-700 text-emerald-500 focus:ring-0"
                    />

                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded font-semibold ${
                            q.status === 'APPROVED'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : q.status === 'PENDING'
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse'
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          }`}
                        >
                          {q.status}
                        </span>

                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                          {q.category}
                        </span>

                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                          DIFF: {q.difficulty}
                        </span>

                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                          {q.timeLimit || 5}s
                        </span>

                        {q.sourceDocument && (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-950/60 border border-blue-800/60 text-blue-300 flex items-center space-x-1">
                            <FileText className="w-3 h-3" />
                            <span>{q.sourceDocument} {q.sourcePage ? `p.${q.sourcePage}` : ''}</span>
                          </span>
                        )}
                      </div>

                      <h4 className="text-sm font-semibold text-white leading-snug">{q.text}</h4>

                      {/* Options Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                        {q.options.map((opt) => {
                          const isCorrect = opt.id === q.correctAnswer;
                          return (
                            <div
                              key={opt.id}
                              className={`p-2 rounded-lg text-xs font-mono flex items-center justify-between border ${
                                isCorrect
                                  ? 'bg-emerald-950/50 border-emerald-500/50 text-emerald-200 font-semibold'
                                  : 'bg-slate-950/60 border-slate-800 text-slate-400'
                              }`}
                            >
                              <div className="flex items-center space-x-2">
                                <span className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold ${
                                  isCorrect ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                                }`}>
                                  {opt.id}
                                </span>
                                <span className="font-sans text-xs">{opt.text}</span>
                              </div>
                              {isCorrect && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                            </div>
                          );
                        })}
                      </div>

                      {q.explanation && (
                        <p className="text-[11px] text-slate-400 pt-1 italic font-sans">
                          <strong>Explanation:</strong> {q.explanation}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-1 shrink-0">
                    {q.status === 'PENDING' && (
                      <>
                        <button
                          onClick={() => onUpdateQuestionStatus(q.id, 'APPROVED')}
                          className="px-2 py-1 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 text-xs font-mono font-medium flex items-center space-x-1"
                          title="Approve Question"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Approve</span>
                        </button>
                        <button
                          onClick={() => onUpdateQuestionStatus(q.id, 'REJECTED')}
                          className="p-1 rounded hover:bg-amber-950/50 text-amber-400 text-xs"
                          title="Reject"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      </>
                    )}

                    <button
                      onClick={() => handleOpenEdit(q)}
                      className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200"
                      title="Edit"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => onDeleteQuestion(q.id)}
                      className="p-1.5 rounded hover:bg-rose-950/50 text-slate-400 hover:text-rose-400"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Manual Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-2xl rounded-xl border border-slate-800 bg-[#0d131f] shadow-2xl overflow-hidden my-8 animate-in fade-in">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-base font-bold text-white font-mono">
                {editingQuestion ? 'EDIT_QUESTION' : 'CREATE_QUESTION'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-200 text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1">Question Text *</label>
                <textarea
                  rows={2}
                  required
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="e.g. What does LLM stand for in modern artificial intelligence?"
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:border-emerald-500 font-sans"
                />
              </div>

              {/* 4 Options */}
              <div className="space-y-2">
                <label className="block text-xs font-mono text-slate-300">
                  Multiple Choice Options (4 Required) & Correct Answer Key
                </label>

                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <span className="w-8 h-8 rounded bg-slate-800 border border-slate-700 flex items-center justify-center font-mono font-bold text-xs text-white">
                      A
                    </span>
                    <input
                      type="text"
                      required
                      value={optA}
                      onChange={(e) => setOptA(e.target.value)}
                      placeholder="Option A text..."
                      className="flex-1 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-emerald-500"
                    />
                    <label className="flex items-center space-x-1 cursor-pointer font-mono text-xs">
                      <input
                        type="radio"
                        name="correctAnswerKey"
                        checked={correctAnswer === 'A'}
                        onChange={() => setCorrectAnswer('A')}
                        className="text-emerald-500 focus:ring-0"
                      />
                      <span className={correctAnswer === 'A' ? 'text-emerald-400 font-bold' : 'text-slate-400'}>Correct</span>
                    </label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className="w-8 h-8 rounded bg-slate-800 border border-slate-700 flex items-center justify-center font-mono font-bold text-xs text-white">
                      B
                    </span>
                    <input
                      type="text"
                      required
                      value={optB}
                      onChange={(e) => setOptB(e.target.value)}
                      placeholder="Option B text..."
                      className="flex-1 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-emerald-500"
                    />
                    <label className="flex items-center space-x-1 cursor-pointer font-mono text-xs">
                      <input
                        type="radio"
                        name="correctAnswerKey"
                        checked={correctAnswer === 'B'}
                        onChange={() => setCorrectAnswer('B')}
                        className="text-emerald-500 focus:ring-0"
                      />
                      <span className={correctAnswer === 'B' ? 'text-emerald-400 font-bold' : 'text-slate-400'}>Correct</span>
                    </label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className="w-8 h-8 rounded bg-slate-800 border border-slate-700 flex items-center justify-center font-mono font-bold text-xs text-white">
                      C
                    </span>
                    <input
                      type="text"
                      required
                      value={optC}
                      onChange={(e) => setOptC(e.target.value)}
                      placeholder="Option C text..."
                      className="flex-1 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-emerald-500"
                    />
                    <label className="flex items-center space-x-1 cursor-pointer font-mono text-xs">
                      <input
                        type="radio"
                        name="correctAnswerKey"
                        checked={correctAnswer === 'C'}
                        onChange={() => setCorrectAnswer('C')}
                        className="text-emerald-500 focus:ring-0"
                      />
                      <span className={correctAnswer === 'C' ? 'text-emerald-400 font-bold' : 'text-slate-400'}>Correct</span>
                    </label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className="w-8 h-8 rounded bg-slate-800 border border-slate-700 flex items-center justify-center font-mono font-bold text-xs text-white">
                      D
                    </span>
                    <input
                      type="text"
                      required
                      value={optD}
                      onChange={(e) => setOptD(e.target.value)}
                      placeholder="Option D text..."
                      className="flex-1 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-emerald-500"
                    />
                    <label className="flex items-center space-x-1 cursor-pointer font-mono text-xs">
                      <input
                        type="radio"
                        name="correctAnswerKey"
                        checked={correctAnswer === 'D'}
                        onChange={() => setCorrectAnswer('D')}
                        className="text-emerald-500 focus:ring-0"
                      />
                      <span className={correctAnswer === 'D' ? 'text-emerald-400 font-bold' : 'text-slate-400'}>Correct</span>
                    </label>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1">Explanation</label>
                <textarea
                  rows={2}
                  value={explanation}
                  onChange={(e) => setExplanation(e.target.value)}
                  placeholder="Why is this answer correct? Displayed to participants after the question locks."
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[11px] font-mono text-slate-300 mb-1">Category</label>
                  <input
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="AI / Web"
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono text-slate-300 mb-1">Difficulty</label>
                  <select
                    value={difficulty}
                    onChange={(e: any) => setDifficulty(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs font-mono"
                  >
                    <option value="EASY">EASY</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="HARD">HARD</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-mono text-slate-300 mb-1">Time Limit (s)</label>
                  <input
                    type="number"
                    min={3}
                    max={120}
                    value={timeLimit}
                    onChange={(e) => setTimeLimit(parseInt(e.target.value, 10) || 5)}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono text-slate-300 mb-1">Source Page</label>
                  <input
                    type="number"
                    min={1}
                    value={sourcePage}
                    onChange={(e) => setSourcePage(e.target.value ? parseInt(e.target.value, 10) : '')}
                    placeholder="Page #"
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1">Source Document Name (Optional)</label>
                <input
                  type="text"
                  value={sourceDoc}
                  onChange={(e) => setSourceDoc(e.target.value)}
                  placeholder="e.g. AI_Curriculum_2026.pdf"
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs"
                />
              </div>

              <div className="pt-4 border-t border-slate-800 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-700 text-slate-300 text-xs font-mono hover:bg-slate-800"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs font-mono transition-colors"
                >
                  {isSaving ? 'SAVING...' : 'SAVE_QUESTION'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
