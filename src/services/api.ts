import {
  QuizEvent,
  QuizGame,
  Question,
  DocumentItem,
  LeaderboardEntry,
  Participant,
  AuditLog
} from '../types';

export const api = {
  // Health & App Info
  async getHealth(): Promise<{ status: string; uptime: number; timestamp: number; serverTimeIso: string; publicAppUrl?: string }> {
    const res = await fetch('/api/health');
    return res.json();
  },

  async getAppInfo(): Promise<{ publicAppUrl?: string; environment: string; serverTime: string }> {
    try {
      const res = await fetch('/api/app-info');
      return await res.json();
    } catch {
      return { publicAppUrl: '', environment: 'production', serverTime: new Date().toISOString() };
    }
  },

  // Events
  async getEvents(): Promise<QuizEvent[]> {
    const res = await fetch('/api/events');
    return res.json();
  },

  async getEvent(id: string): Promise<QuizEvent> {
    const res = await fetch(`/api/events/${id}`);
    return res.json();
  },

  async saveEvent(event: Partial<QuizEvent>): Promise<QuizEvent> {
    const res = await fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event)
    });
    return res.json();
  },

  async deleteEvent(id: string): Promise<{ success: boolean }> {
    const res = await fetch(`/api/events/${id}`, { method: 'DELETE' });
    return res.json();
  },

  // Games
  async getGames(eventId?: string): Promise<QuizGame[]> {
    const url = eventId ? `/api/games?eventId=${eventId}` : '/api/games';
    const res = await fetch(url);
    return res.json();
  },

  async getGame(id: string): Promise<QuizGame> {
    const res = await fetch(`/api/games/${id}`);
    return res.json();
  },

  async getGameByCode(code: string): Promise<QuizGame> {
    const res = await fetch(`/api/games/code/${code}`);
    if (!res.ok) {
      throw new Error('Game not found with code: ' + code);
    }
    return res.json();
  },

  async saveGame(game: Partial<QuizGame>): Promise<QuizGame> {
    const res = await fetch('/api/games', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(game)
    });
    return res.json();
  },

  async updateGameStatus(id: string, status: QuizGame['status']): Promise<QuizGame> {
    const res = await fetch(`/api/games/${id}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    return res.json();
  },

  async deleteGame(id: string): Promise<{ success: boolean }> {
    const res = await fetch(`/api/games/${id}`, { method: 'DELETE' });
    return res.json();
  },

  // Questions
  async getQuestions(filters?: { category?: string; difficulty?: string; status?: string; search?: string }): Promise<Question[]> {
    const params = new URLSearchParams();
    if (filters?.category) params.append('category', filters.category);
    if (filters?.difficulty) params.append('difficulty', filters.difficulty);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.search) params.append('search', filters.search);

    const res = await fetch(`/api/questions?${params.toString()}`);
    return res.json();
  },

  async saveQuestion(question: Partial<Question>): Promise<Question> {
    const res = await fetch('/api/questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(question)
    });
    return res.json();
  },

  async updateQuestionStatus(id: string, status: Question['status']): Promise<Question> {
    const res = await fetch(`/api/questions/${id}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    return res.json();
  },

  async approveAllQuestions(): Promise<{ success: boolean; approvedCount: number; questions: Question[] }> {
    const res = await fetch('/api/questions/approve-all', { method: 'POST' });
    return res.json();
  },

  async deleteQuestion(id: string): Promise<{ success: boolean }> {
    const res = await fetch(`/api/questions/${id}`, { method: 'DELETE' });
    return res.json();
  },

  // Documents
  async getDocuments(): Promise<DocumentItem[]> {
    const res = await fetch('/api/documents');
    return res.json();
  },

  async uploadDocument(payload: {
    filename: string;
    rawText?: string;
    base64Content?: string;
    estimatedPages?: number;
  }): Promise<DocumentItem> {
    const res = await fetch('/api/documents/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Upload failed');
    }
    return res.json();
  },

  async deleteDocument(id: string): Promise<{ success: boolean }> {
    const res = await fetch(`/api/documents/${id}`, { method: 'DELETE' });
    return res.json();
  },

  // AI Generation
  async generateQuestions(options: {
    documentId?: string;
    count: number;
    difficulty?: string;
    category?: string;
    language?: string;
    autoApprove?: boolean;
    base64Pdf?: string;
    filename?: string;
  }): Promise<{ success: boolean; count: number; questions: Question[]; document?: DocumentItem }> {
    const res = await fetch('/api/generate-questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(options)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'AI generation failed');
    }
    return res.json();
  },

  // Participant Join
  async joinGame(payload: {
    joinCode: string;
    firstName: string;
    username: string;
  }): Promise<{ participant: Participant; game: QuizGame; isReconnect: boolean }> {
    const res = await fetch('/api/participants/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to join game');
    }
    return res.json();
  },

  async getParticipants(gameId: string): Promise<Participant[]> {
    const res = await fetch(`/api/participants/${gameId}`);
    return res.json();
  },

  async getLeaderboard(gameId: string): Promise<LeaderboardEntry[]> {
    const res = await fetch(`/api/leaderboard/${gameId}`);
    return res.json();
  },

  // QR Code Data URL with standard scannability
  async getQRCode(text: string, options?: { dark?: string; light?: string; margin?: number; level?: string }): Promise<string> {
    const params = new URLSearchParams({ text });
    if (options?.dark) params.set('dark', options.dark);
    if (options?.light) params.set('light', options.light);
    if (options?.margin !== undefined) params.set('margin', options.margin.toString());
    if (options?.level) params.set('level', options.level);
    const res = await fetch(`/api/qr?${params.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch QR code');
    const data = await res.json();
    return data.dataUrl;
  },

  // Audit logs
  async getAuditLogs(): Promise<AuditLog[]> {
    const res = await fetch('/api/audit-logs');
    return res.json();
  }
};
