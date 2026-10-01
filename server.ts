import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';
import QRCode from 'qrcode';
import dotenv from 'dotenv';
import { db } from './server/db';
import { DocumentProcessor } from './server/docProcessor';
import { AIQuestionGenerator } from './server/aiGenerator';
import { realtimeEngine } from './server/realtimeEngine';
import { QuizEvent, QuizGame, Question } from './src/types';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = parseInt(process.env.PORT || '3000', 10);
const app = express();
const httpServer = createServer(app);

// WebSockets are supported by the local/container server, but Vercel's
// serverless runtime does not expose a long-lived upgrade server. Avoid
// constructing the WebSocket listener during a serverless function import.
if (process.env.VERCEL !== '1') {
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (ws) => {
    realtimeEngine.registerClient(ws);
    ws.on('message', (msg) => {
      realtimeEngine.handleMessage(ws, msg.toString());
    });
  });
}

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Enable CORS and preflight handling for web preview iframes and external clients
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// --- API ENDPOINTS ---

// Health & System status with detected public application URL
app.get('/api/health', (req, res) => {
  const forwardedProto = (req.headers['x-forwarded-proto'] as string) || 'https';
  const forwardedHost = (req.headers['x-forwarded-host'] as string) || req.headers.host;
  const detectedPublicUrl = process.env.APP_URL || (forwardedHost ? `${forwardedProto}://${forwardedHost}` : '');

  res.json({
    status: 'SYS_ONLINE',
    uptime: process.uptime(),
    timestamp: Date.now(),
    serverTimeIso: new Date().toISOString(),
    publicAppUrl: detectedPublicUrl
  });
});

app.get('/api/app-info', (req, res) => {
  const forwardedProto = (req.headers['x-forwarded-proto'] as string) || 'https';
  const forwardedHost = (req.headers['x-forwarded-host'] as string) || req.headers.host;
  const detectedPublicUrl = process.env.APP_URL || (forwardedHost ? `${forwardedProto}://${forwardedHost}` : '');

  res.json({
    publicAppUrl: detectedPublicUrl,
    environment: process.env.NODE_ENV || 'production',
    serverTime: new Date().toISOString()
  });
});

// Events
app.get('/api/events', (req, res) => {
  res.json(db.getEvents());
});

app.get('/api/events/:id', (req, res) => {
  const event = db.getEventById(req.params.id);
  if (!event) return res.status(404).json({ error: 'Event not found' });
  res.json(event);
});

app.post('/api/events', (req, res) => {
  const body = req.body as Partial<QuizEvent>;
  if (!body.name) {
    return res.status(400).json({ error: 'Event name is required' });
  }

  const event: QuizEvent = {
    id: body.id || `evt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    name: body.name,
    description: body.description || '',
    eventDate: body.eventDate || new Date().toISOString().split('T')[0],
    endDate: body.endDate,
    logoUrl: body.logoUrl || 'https://images.unsplash.com/photo-1531482615713-2afd69097998?w=200&h=200&fit=crop&q=80',
    coverImage: body.coverImage || 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=1200&h=400&fit=crop&q=80',
    organizerInfo: body.organizerInfo || { name: 'Lead Host', email: 'host@quizterm.app' },
    visibility: body.visibility || 'PUBLIC',
    status: body.status || 'DRAFT',
    gameIds: body.gameIds || [],
    createdAt: body.createdAt || new Date().toISOString()
  };

  const saved = db.saveEvent(event);
  res.json(saved);
});

app.delete('/api/events/:id', (req, res) => {
  const success = db.deleteEvent(req.params.id);
  res.json({ success });
});

// Games
app.get('/api/games', (req, res) => {
  const eventId = req.query.eventId as string | undefined;
  res.json(db.getGames(eventId));
});

app.get('/api/games/:id', (req, res) => {
  const game = db.getGameById(req.params.id);
  if (!game) return res.status(404).json({ error: 'Game not found' });
  res.json(game);
});

app.get('/api/games/code/:code', (req, res) => {
  const game = db.getGameByJoinCode(req.params.code);
  if (!game) return res.status(404).json({ error: 'Game code not found' });
  res.json(game);
});

app.post('/api/games', (req, res) => {
  const body = req.body as Partial<QuizGame>;
  if (!body.name || !body.eventId) {
    return res.status(400).json({ error: 'Game name and eventId are required' });
  }

  // Generate unique 6-character alphanumeric join code if not provided
  const existing = body.id ? db.getGameById(body.id) : undefined;
  const joinCode = (body.joinCode || existing?.joinCode || Math.random().toString(36).substring(2, 8)).toUpperCase();
  const codeOwner = db.getGameByJoinCode(joinCode);
  if (codeOwner && codeOwner.id !== existing?.id) {
    return res.status(409).json({ error: `Join code ${joinCode} is already in use. Choose another code.` });
  }

  const game: QuizGame = {
    id: body.id || existing?.id || `game-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    eventId: body.eventId,
    name: body.name,
    description: body.description !== undefined ? body.description : (existing?.description || ''),
    joinCode,
    status: body.status || existing?.status || 'READY',
    questionIds: body.questionIds !== undefined ? body.questionIds : (existing?.questionIds || []),
    timePerQuestion: body.timePerQuestion || existing?.timePerQuestion || 10,
    customQuestionTimeLimits: body.customQuestionTimeLimits !== undefined ? body.customQuestionTimeLimits : (existing?.customQuestionTimeLimits || {}),
    difficultyTimeLimits: body.difficultyTimeLimits !== undefined ? body.difficultyTimeLimits : (existing?.difficultyTimeLimits || {}),
    questionTypeTimeLimits: body.questionTypeTimeLimits !== undefined ? body.questionTypeTimeLimits : (existing?.questionTypeTimeLimits || {}),
    pointsPerCorrect: body.pointsPerCorrect || existing?.pointsPerCorrect || 1,
    leaderboardVisibility: body.leaderboardVisibility || existing?.leaderboardVisibility || 'AFTER_EACH',
    randomizeQuestions: body.randomizeQuestions !== undefined ? !!body.randomizeQuestions : !!existing?.randomizeQuestions,
    randomizeOptions: body.randomizeOptions !== undefined ? !!body.randomizeOptions : !!existing?.randomizeOptions,
    maxParticipants: body.maxParticipants || existing?.maxParticipants || 1000,
    currentQuestionIndex: body.currentQuestionIndex !== undefined ? body.currentQuestionIndex : (existing?.currentQuestionIndex || 0),
    createdAt: existing?.createdAt || body.createdAt || new Date().toISOString()
  };

  const saved = db.saveGame(game);
  res.json(saved);
});

app.post('/api/games/:id/status', (req, res) => {
  const { status } = req.body;
  const validStatuses: QuizGame['status'][] = [
    'DRAFT', 'READY', 'LOBBY', 'COUNTDOWN', 'LIVE', 'PAUSED',
    'QUESTION_LOCKED', 'QUESTION_RESULTS', 'COMPLETED', 'ARCHIVED'
  ];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid game status' });
  }
  const game = db.updateGameStatus(req.params.id, status);
  if (!game) return res.status(404).json({ error: 'Game not found' });
  realtimeEngine.broadcastRoomState(game.id);
  res.json(game);
});

app.delete('/api/games/:id', (req, res) => {
  const success = db.deleteGame(req.params.id);
  res.json({ success });
});

// Questions
app.get('/api/questions', (req, res) => {
  const { category, difficulty, status, search } = req.query as Record<string, string>;
  res.json(db.getQuestions({ category, difficulty, status, search }));
});

app.get('/api/questions/:id', (req, res) => {
  const q = db.getQuestionById(req.params.id);
  if (!q) return res.status(404).json({ error: 'Question not found' });
  res.json(q);
});

app.post('/api/questions', (req, res) => {
  const body = req.body as Partial<Question>;
  if (!body.text || !body.options || body.options.length !== 4 || !body.correctAnswer) {
    return res.status(400).json({ error: 'Invalid question payload. Must have 4 options and a correct answer.' });
  }

  const question: Question = {
    id: body.id || `q-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    text: body.text,
    options: body.options as any,
    correctAnswer: body.correctAnswer,
    explanation: body.explanation || '',
    category: body.category || 'General',
    difficulty: body.difficulty || 'MEDIUM',
    points: body.points || 1,
    timeLimit: body.timeLimit || 5,
    sourceDocument: body.sourceDocument,
    sourcePage: body.sourcePage,
    status: body.status || 'APPROVED',
    createdAt: body.createdAt || new Date().toISOString()
  };

  const saved = db.saveQuestion(question);
  res.json(saved);
});

app.post('/api/questions/bulk', (req, res) => {
  const { questions } = req.body;
  if (!Array.isArray(questions)) {
    return res.status(400).json({ error: 'Expected array of questions' });
  }
  const saved = db.bulkAddQuestions(questions);
  res.json(saved);
});

app.post('/api/questions/approve-all', (req, res) => {
  const approvedCount = db.approveAllQuestions();
  res.json({ success: true, approvedCount, questions: db.getQuestions() });
});

app.post('/api/questions/:id/status', (req, res) => {
  const { status } = req.body;
  const q = db.updateQuestionStatus(req.params.id, status);
  if (!q) return res.status(404).json({ error: 'Question not found' });
  res.json(q);
});

app.delete('/api/questions/:id', (req, res) => {
  const success = db.deleteQuestion(req.params.id);
  res.json({ success });
});

// Documents
app.get('/api/documents', (req, res) => {
  res.json(db.getDocuments());
});

app.post('/api/documents/upload', async (req, res) => {
  try {
    const { filename, rawText, base64Content, estimatedPages = 1 } = req.body;
    if (!filename) {
      return res.status(400).json({ error: 'Filename is required' });
    }

    let textContent = rawText || '';
    let pageCount = estimatedPages;
    let pageTexts: { page: number; text: string }[] | undefined;

    if (base64Content) {
      const cleanBase64 = base64Content.replace(/^data:application\/pdf;base64,/, '').replace(/[\r\n\s]+/g, '');
      const buffer = Buffer.from(cleanBase64, 'base64');
      const extracted = await DocumentProcessor.extractTextFromBuffer(buffer, filename);
      textContent = extracted.text;
      pageCount = extracted.pages;
      pageTexts = extracted.pageTexts;
    }

    if (!textContent || textContent.trim().length === 0) {
      return res.status(400).json({ error: 'Document appears to be empty or unreadable' });
    }

    const docId = `doc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const processedDoc = DocumentProcessor.processTextIntoChunks(docId, filename, textContent, pageCount, pageTexts);
    const saved = db.saveDocument(processedDoc);

    res.json(saved);
  } catch (err: any) {
    console.error('Document upload error:', err);
    res.status(500).json({ error: 'Failed to process document: ' + err.message });
  }
});

app.delete('/api/documents/:id', (req, res) => {
  const success = db.deleteDocument(req.params.id);
  res.json({ success });
});

// AI Question Generation
app.post('/api/generate-questions', async (req, res) => {
  try {
    const {
      documentId,
      count = 5,
      difficulty = 'MEDIUM',
      category = 'Curriculum',
      language = 'English',
      autoApprove = false,
      base64Pdf,
      filename
    } = req.body;

    let doc = documentId ? db.getDocumentById(documentId) : undefined;

    // If a new PDF base64 is provided directly
    if (base64Pdf && filename) {
      const cleanBase64 = base64Pdf.replace(/^data:application\/pdf;base64,/, '').replace(/[\r\n\s]+/g, '');
      const buffer = Buffer.from(cleanBase64, 'base64');
      const extracted = await DocumentProcessor.extractTextFromBuffer(buffer, filename);
      const docId = doc?.id || `doc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      doc = DocumentProcessor.processTextIntoChunks(docId, filename, extracted.text, extracted.pages, extracted.pageTexts);
      db.saveDocument(doc);
    }

    if (!doc && !base64Pdf) {
      const allDocs = db.getDocuments();
      if (allDocs.length > 0) {
        doc = allDocs[0];
      } else {
        return res.status(400).json({ error: 'No PDF or documents uploaded yet. Please upload a PDF curriculum file first.' });
      }
    }

    const docName = doc?.filename || filename || 'Uploaded_Curriculum.pdf';
    const chunks = doc?.chunks || [];

    const generated = await AIQuestionGenerator.generateQuestions({
      chunks,
      documentName: docName,
      count: Math.min(100, Math.max(1, count)),
      difficulty,
      category,
      language,
      autoApprove: !!autoApprove,
      // The upload route has already extracted and chunked this document.
      // Do not send the full PDF to Gemini a second time; this avoids large
      // serverless payloads and lets generation fall back quickly if AI is
      // unavailable.
      base64Pdf: doc ? undefined : base64Pdf
    });

    // Save questions to database
    db.bulkAddQuestions(generated);

    if (doc) {
      doc.questionsGeneratedCount += generated.length;
      db.saveDocument(doc);
    }

    res.json({
      success: true,
      count: generated.length,
      document: doc,
      questions: generated
    });
  } catch (err: any) {
    console.error('AI Question generation failed:', err);
    res.status(500).json({ error: 'Failed to generate questions: ' + err.message });
  }
});

// Participant Join Validation & Registration
app.post('/api/participants/join', (req, res) => {
  const { joinCode, firstName, username } = req.body;

  if (!joinCode || !firstName || !username) {
    return res.status(400).json({ error: 'Join code, first name, and username are required.' });
  }

  const normalizedFirstName = String(firstName).trim();
  const normalizedUsername = String(username).trim().toLowerCase();
  if (normalizedFirstName.length < 1 || normalizedFirstName.length > 40 || !/^[a-z0-9_-]{2,24}$/.test(normalizedUsername)) {
    return res.status(400).json({ error: 'Use a name up to 40 characters and a username with 2-24 letters, numbers, _ or -.' });
  }

  const game = db.getGameByJoinCode(String(joinCode));
  if (!game) {
    return res.status(404).json({ error: 'Invalid join code. Please check and try again.' });
  }

  if (game.status === 'COMPLETED' || game.status === 'ARCHIVED') {
    return res.status(400).json({ error: 'This game has already ended.' });
  }

  // Check unique username within this game
  const existing = db.getParticipantByUsername(game.id, normalizedUsername);
  if (existing) {
    // If it's a reconnect with same name, return existing session
    return res.json({
      participant: existing,
      game,
      isReconnect: true
    });
  }

  // Check capacity
  const participants = db.getParticipants(game.id);
  if (participants.length >= (game.maxParticipants || 1000)) {
    return res.status(400).json({ error: 'Game is currently at maximum capacity.' });
  }

  const participantId = `part-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const participant = db.saveParticipant({
    id: participantId,
    gameId: game.id,
    eventId: game.eventId,
    firstName: normalizedFirstName,
    username: normalizedUsername,
    joinedAt: new Date().toISOString(),
    isConnected: true,
    score: 0,
    correctAnswers: 0,
    wrongAnswers: 0,
    unanswered: 0,
    totalResponseTimeMs: 0,
    lastActiveAt: new Date().toISOString()
  });

  // Notify active room
  realtimeEngine.broadcastRoomState(game.id);

  res.json({
    participant,
    game,
    isReconnect: false
  });
});

app.get('/api/participants/:gameId', (req, res) => {
  res.json(db.getParticipants(req.params.gameId));
});

app.get('/api/leaderboard/:gameId', (req, res) => {
  res.json(db.calculateLeaderboard(req.params.gameId));
});

// QR Code Generator API - High-Contrast ISO/IEC 18004 Standard Scannable
app.get('/api/qr', async (req, res) => {
  try {
    const text = req.query.text as string;
    if (!text) return res.status(400).json({ error: 'Text query parameter is required' });

    // Ensure standard scannability: dark modules on pure white background
    const dark = (req.query.dark as string) || '#000000';
    const light = (req.query.light as string) || '#ffffff';
    const margin = req.query.margin ? parseInt(req.query.margin as string, 10) : 3;
    const level = (req.query.level as 'L' | 'M' | 'Q' | 'H') || 'H';

    const qrDataUrl = await QRCode.toDataURL(text, {
      errorCorrectionLevel: level,
      margin: Math.max(1, margin),
      scale: 10,
      color: {
        dark,
        light
      }
    });

    res.json({ dataUrl: qrDataUrl, text, errorCorrectionLevel: level });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to generate QR code: ' + err.message });
  }
});

// Export Results to CSV
app.get('/api/export/:gameId', (req, res) => {
  const game = db.getGameById(req.params.gameId);
  if (!game) return res.status(404).json({ error: 'Game not found' });

  const leaderboard = db.calculateLeaderboard(game.id);

  const header = 'Rank,First Name,Username,Score,Correct,Wrong,Unanswered,Accuracy (%),Avg Response Time (ms),Participant ID';
  const rows = leaderboard.map(
    l =>
      `${l.rank},"${l.firstName.replace(/"/g, '""')}","${l.username.replace(/"/g, '""')}",${l.score},${l.correctAnswers},${l.wrongAnswers},${l.unanswered},${l.accuracy}%,${l.avgResponseTimeMs},${l.participantId}`
  );

  const csv = [header, ...rows].join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="quizterm-${game.joinCode}-results.csv"`);
  res.send(csv);
});

// Audit logs
app.get('/api/audit-logs', (req, res) => {
  res.json(db.getAuditLogs());
});

// --- VITE DEV OR STATIC PRODUCTION MIDDLEWARE ---

async function setupServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`[QUIZTERM] Server running on http://0.0.0.0:${PORT}`);
    console.log(`[QUIZTERM] WebSocket active on ws://0.0.0.0:${PORT}/ws`);
  });
}

// Vercel imports the Express app as a serverless function, so it must not
// start its own listener there. Local and container deployments still use
// this file as the process entrypoint.
if (process.env.VERCEL !== '1') {
  setupServer().catch((err) => {
    console.error('Failed to start QUIZTERM server:', err);
  });
}

export { app };
