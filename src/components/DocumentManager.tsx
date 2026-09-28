import React, { useState, useRef } from 'react';
import {
  FileText,
  UploadCloud,
  Sparkles,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Eye,
  FileCode,
  Layers,
  ArrowRight,
  Loader2
} from 'lucide-react';
import { DocumentItem, Question } from '../types';

interface DocumentManagerProps {
  documents: DocumentItem[];
  onUploadDocument: (payload: { filename: string; rawText?: string; base64Content?: string }) => Promise<void>;
  onDeleteDocument: (id: string) => Promise<void>;
  onGenerateQuestions: (options: {
    documentId: string;
    count: number;
    difficulty?: string;
    category?: string;
    language?: string;
  }) => Promise<{ count: number; questions: Question[] }>;
  onNavigateToQuestions: () => void;
}

export const DocumentManager: React.FC<DocumentManagerProps> = ({
  documents,
  onUploadDocument,
  onDeleteDocument,
  onGenerateQuestions,
  onNavigateToQuestions
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [selectedDocForChunks, setSelectedDocForChunks] = useState<DocumentItem | null>(null);

  // AI Generation Modal
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [selectedDocForAi, setSelectedDocForAi] = useState<DocumentItem | null>(null);
  const [questionCount, setQuestionCount] = useState(5);
  const [difficulty, setDifficulty] = useState('MEDIUM');
  const [category, setCategory] = useState('Curriculum Review');
  const [language, setLanguage] = useState('English');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationSuccess, setGenerationSuccess] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      if (file.name.toLowerCase().endsWith('.pdf')) {
        // Read as base64
        const reader = new FileReader();
        reader.onload = async () => {
          const base64 = reader.result as string;
          await onUploadDocument({
            filename: file.name,
            base64Content: base64
          });
          setIsUploading(false);
        };
        reader.readAsDataURL(file);
      } else {
        // Read as plain text
        const reader = new FileReader();
        reader.onload = async () => {
          const rawText = reader.result as string;
          await onUploadDocument({
            filename: file.name,
            rawText
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

  const handleOpenAiModal = (doc: DocumentItem) => {
    setSelectedDocForAi(doc);
    setCategory(doc.filename.replace(/\.[^/.]+$/, '').replace(/_/g, ' '));
    setGenerationSuccess(null);
    setIsAiModalOpen(true);
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDocForAi) return;

    setIsGenerating(true);
    try {
      const res = await onGenerateQuestions({
        documentId: selectedDocForAi.id,
        count: questionCount,
        difficulty,
        category,
        language
      });
      setGenerationSuccess(res.count);
    } catch (err) {
      console.error('Generation failed:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="text-xs font-mono text-emerald-400 mb-1">MODULE // 05_DOCUMENT_PROCESSING_PIPELINE</div>
          <h2 className="text-xl font-bold text-white tracking-tight">Documents & AI Pipeline</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Upload PDFs and curriculums. The pipeline extracts text, produces semantic chunks, and generates structured quiz questions via Gemini.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".pdf,.txt,.md,.json"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="flex items-center space-x-2 px-3.5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs transition-all shadow-md shadow-emerald-500/10 active:scale-95 disabled:opacity-50"
          >
            {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
            <span>{isUploading ? 'Extracting Text...' : 'Upload PDF / Doc'}</span>
          </button>
        </div>
      </div>

      {/* Pipeline Status Banner */}
      <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/40 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
        <div className="space-y-1">
          <span className="text-slate-500 text-[10px]">TOTAL DOCUMENTS</span>
          <div className="text-base font-bold text-white">{documents.length} files</div>
        </div>
        <div className="space-y-1">
          <span className="text-slate-500 text-[10px]">CHUNKS EXTRACTED</span>
          <div className="text-base font-bold text-emerald-400">
            {documents.reduce((acc, d) => acc + (d.chunks?.length || 0), 0)} chunks
          </div>
        </div>
        <div className="space-y-1">
          <span className="text-slate-500 text-[10px]">AI ENGINE</span>
          <div className="text-base font-bold text-white flex items-center space-x-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Gemini 3.8 Flash</span>
          </div>
        </div>
        <div className="space-y-1">
          <span className="text-slate-500 text-[10px]">TARGET CAPACITY</span>
          <div className="text-base font-bold text-slate-300">100+ PDFs</div>
        </div>
      </div>

      {/* Document List */}
      <div className="space-y-3">
        {documents.length === 0 ? (
          <div className="p-8 text-center rounded-xl border border-dashed border-slate-800 bg-slate-900/20 text-slate-400 text-sm space-y-3">
            <UploadCloud className="w-8 h-8 text-slate-600 mx-auto" />
            <div>
              <p className="font-semibold text-slate-300">No documents uploaded yet</p>
              <p className="text-xs text-slate-500 mt-0.5">Upload a PDF or text file to extract chunks and generate AI questions.</p>
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-mono text-emerald-400 border border-slate-700"
            >
              Select File to Upload
            </button>
          </div>
        ) : (
          documents.map((doc) => (
            <div
              key={doc.id}
              className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 hover:border-slate-700 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="flex items-start space-x-3.5">
                <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shrink-0">
                  <FileText className="w-5 h-5" />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <h4 className="font-semibold text-white text-sm">{doc.filename}</h4>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      {doc.status}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-mono text-slate-400">
                    <span>{Math.round(doc.size / 1024)} KB</span>
                    <span>•</span>
                    <span>{doc.pageCount} pages</span>
                    <span>•</span>
                    <span className="text-emerald-400 font-semibold">{doc.chunks?.length || 0} chunks</span>
                    <span>•</span>
                    <span>{doc.questionsGeneratedCount || 0} questions generated</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2 self-end sm:self-center">
                <button
                  onClick={() => setSelectedDocForChunks(doc)}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono flex items-center space-x-1.5 border border-slate-700 transition-colors"
                  title="Inspect Chunks"
                >
                  <Eye className="w-3.5 h-3.5 text-slate-400" />
                  <span>Inspect Chunks</span>
                </button>

                <button
                  onClick={() => handleOpenAiModal(doc)}
                  className="px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-mono font-medium flex items-center space-x-1.5 transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Generate Qs</span>
                </button>

                <button
                  onClick={() => onDeleteDocument(doc.id)}
                  className="p-1.5 rounded hover:bg-rose-950/50 text-slate-500 hover:text-rose-400 transition-colors"
                  title="Delete Document"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Chunks Inspector Modal */}
      {selectedDocForChunks && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-3xl rounded-xl border border-slate-800 bg-[#0d131f] shadow-2xl overflow-hidden my-8 animate-in fade-in">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white font-mono flex items-center space-x-2">
                  <Layers className="w-4 h-4 text-emerald-400" />
                  <span>SEMANTIC_CHUNKS // {selectedDocForChunks.filename}</span>
                </h3>
                <div className="text-xs text-slate-400 font-mono mt-0.5">
                  {selectedDocForChunks.chunks?.length || 0} chunks extracted • Ready for AI grounding
                </div>
              </div>
              <button
                onClick={() => setSelectedDocForChunks(null)}
                className="text-slate-400 hover:text-slate-200 text-sm"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-3 max-h-[70vh] overflow-y-auto">
              {selectedDocForChunks.chunks?.map((chunk, idx) => (
                <div key={chunk.id} className="p-3.5 rounded-lg bg-slate-950/80 border border-slate-800 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between text-[11px] font-mono text-emerald-400">
                    <span>Chunk #{idx + 1} • Page {chunk.page}</span>
                    <span className="text-slate-400">{chunk.section}</span>
                  </div>
                  <p className="text-slate-300 leading-relaxed font-sans">{chunk.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* AI Question Generation Modal */}
      {isAiModalOpen && selectedDocForAi && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-xl border border-slate-800 bg-[#0d131f] shadow-2xl overflow-hidden animate-in fade-in">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <h3 className="text-base font-bold text-white font-mono">GENERATE_AI_QUESTIONS</h3>
              </div>
              <button
                onClick={() => setIsAiModalOpen(false)}
                className="text-slate-400 hover:text-slate-200 text-sm"
              >
                ✕
              </button>
            </div>

            {generationSuccess !== null ? (
              <div className="p-6 text-center space-y-4">
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-white">Questions Successfully Generated!</h4>
                  <p className="text-xs text-slate-400 mt-1">
                    Generated <strong className="text-emerald-400">{generationSuccess} questions</strong> strictly grounded in <strong className="text-slate-200">{selectedDocForAi.filename}</strong>.
                    They are currently in <strong className="text-amber-400">PENDING REVIEW</strong> status.
                  </p>
                </div>
                <div className="flex items-center justify-center space-x-3 pt-2">
                  <button
                    onClick={() => {
                      setIsAiModalOpen(false);
                      onNavigateToQuestions();
                    }}
                    className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs font-mono flex items-center space-x-1.5"
                  >
                    <span>Review & Approve Questions</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleGenerate} className="p-6 space-y-4">
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono space-y-1">
                  <span className="text-slate-500">GROUNDING SOURCE:</span>
                  <div className="text-white font-semibold truncate">{selectedDocForAi.filename}</div>
                  <div className="text-slate-400 text-[11px]">{selectedDocForAi.chunks?.length || 0} semantic chunks will be fed into Gemini</div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-mono text-slate-300 mb-1">Number of Questions</label>
                    <select
                      value={questionCount}
                      onChange={(e) => setQuestionCount(parseInt(e.target.value, 10))}
                      className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs font-mono focus:outline-none focus:border-emerald-500"
                    >
                      <option value={3}>3 Questions</option>
                      <option value={5}>5 Questions</option>
                      <option value={10}>10 Questions</option>
                      <option value={15}>15 Questions</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-slate-300 mb-1">Difficulty</label>
                    <select
                      value={difficulty}
                      onChange={(e) => setDifficulty(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs font-mono focus:outline-none focus:border-emerald-500"
                    >
                      <option value="MIXED">Mixed (Balanced)</option>
                      <option value="EASY">EASY</option>
                      <option value="MEDIUM">MEDIUM</option>
                      <option value="HARD">HARD</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-mono text-slate-300 mb-1">Category / Topic</label>
                    <input
                      type="text"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      placeholder="e.g. Transformers & Attention"
                      className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-slate-300 mb-1">Language</label>
                    <select
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs font-mono focus:outline-none focus:border-emerald-500"
                    >
                      <option value="English">English</option>
                      <option value="French">French</option>
                      <option value="Spanish">Spanish</option>
                      <option value="Swahili">Swahili</option>
                    </select>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800 flex items-center justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setIsAiModalOpen(false)}
                    className="px-4 py-2 rounded-lg border border-slate-700 text-slate-300 text-xs font-mono hover:bg-slate-800"
                  >
                    CANCEL
                  </button>
                  <button
                    type="submit"
                    disabled={isGenerating}
                    className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs font-mono transition-all flex items-center space-x-1.5 shadow-md shadow-emerald-500/10"
                  >
                    {isGenerating && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>{isGenerating ? 'GENERATING WITH GEMINI...' : 'GENERATE QUESTIONS'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
