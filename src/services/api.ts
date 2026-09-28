import {
  QuizEvent,
  QuizGame,
  Question,
  DocumentItem,
  LeaderboardEntry,
  Participant,
  AuditLog
} from '../types';

// Helper for caching and resilient network fetches with automatic exponential backoff retry
async function fetchWithRetry<T>(
  url: string,
  options?: RequestInit,
  retries: number = 3,
  delayMs: number = 300
): Promise<T> {
  let lastError: any;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await fetch(url, options);

      if (!res.ok) {
        let errorMsg = `HTTP ${res.status}: ${res.statusText}`;
        try {
          const errorJson = await res.json();
          if (errorJson.error) errorMsg = errorJson.error;
        } catch {
          // Response body was not JSON
        }
        // Don't retry 4xx errors except 429
        if (res.status >= 400 && res.status < 500 && res.status !== 429) {
          throw new Error(errorMsg);
        }
        throw new Error(errorMsg);
      }

      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        return (await res.json()) as T;
      }
      return (await res.text()) as unknown as T;
    } catch (err: any) {
      lastError = err;
      // If we still have retries left, wait with backoff
      if (attempt < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, delayMs * Math.pow(2, attempt)));
      }
    }
  }

  throw lastError || new Error(`Network request to ${url} failed after ${retries} attempts.`);
}

// Local storage cache helper to guarantee instantaneous initial load & offline resilience
function getLocalCache<T>(key: string): T | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(`quizterm_cache_${key}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function setLocalCache<T>(key: string, data: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`quizterm_cache_${key}`, JSON.stringify(data));
  } catch {
    // Ignore storage quota errors
  }
}

export const api = {
  // Health & App Info
  async getHealth(): Promise<{ status: string; uptime: number; timestamp: number; serverTimeIso: string; publicAppUrl?: string }> {
    return fetchWithRetry<{ status: string; uptime: number; timestamp: number; serverTimeIso: string; publicAppUrl?: string }>('/api/health');
  },

  async getAppInfo(): Promise<{ publicAppUrl?: string; environment: string; serverTime: string }> {
    try {
      return await fetchWithRetry<{ publicAppUrl?: string; environment: string; serverTime: string }>('/api/app-info', undefined, 2, 200);
    } catch {
      return { publicAppUrl: '', environment: 'production', serverTime: new Date().toISOString() };
    }
  },

  // Events (with cache fallback)
  async getEvents(): Promise<QuizEvent[]> {
    try {
      const data = await fetchWithRetry<QuizEvent[]>('/api/events');
      setLocalCache('events', data);
      return data;
    } catch (err) {
      const cached = getLocalCache<QuizEvent[]>('events');
      if (cached && cached.length > 0) return cached;
      throw err;
    }
  },

  async getEvent(id: string): Promise<QuizEvent> {
    return fetchWithRetry<QuizEvent>(`/api/events/${id}`);
  },

  async saveEvent(event: Partial<QuizEvent>): Promise<QuizEvent> {
    return fetchWithRetry<QuizEvent>('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event)
    }, 2, 300);
  },

  async deleteEvent(id: string): Promise<{ success: boolean }> {
    return fetchWithRetry<{ success: boolean }>(`/api/events/${id}`, { method: 'DELETE' }, 2, 300);
  },

  // Games (with cache fallback)
  async getGames(eventId?: string): Promise<QuizGame[]> {
    const url = eventId ? `/api/games?eventId=${eventId}` : '/api/games';
    try {
      const data = await fetchWithRetry<QuizGame[]>(url);
      if (!eventId) setLocalCache('games', data);
      return data;
    } catch (err) {
      if (!eventId) {
        const cached = getLocalCache<QuizGame[]>('games');
        if (cached && cached.length > 0) return cached;
      }
      throw err;
    }
  },

  async getGame(id: string): Promise<QuizGame> {
    return fetchWithRetry<QuizGame>(`/api/games/${id}`);
  },

  async getGameByCode(code: string): Promise<QuizGame> {
    return fetchWithRetry<QuizGame>(`/api/games/code/${encodeURIComponent(code)}`);
  },

  async saveGame(game: Partial<QuizGame>): Promise<QuizGame> {
    return fetchWithRetry<QuizGame>('/api/games', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(game)
    }, 2, 300);
  },

  async updateGameStatus(id: string, status: QuizGame['status']): Promise<QuizGame> {
    return fetchWithRetry<QuizGame>(`/api/games/${id}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    }, 2, 300);
  },

  async deleteGame(id: string): Promise<{ success: boolean }> {
    return fetchWithRetry<{ success: boolean }>(`/api/games/${id}`, { method: 'DELETE' }, 2, 300);
  },

  // Questions (with cache fallback)
  async getQuestions(filters?: { category?: string; difficulty?: string; status?: string; search?: string }): Promise<Question[]> {
    const params = new URLSearchParams();
    if (filters?.category) params.append('category', filters.category);
    if (filters?.difficulty) params.append('difficulty', filters.difficulty);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.search) params.append('search', filters.search);

    const url = `/api/questions?${params.toString()}`;
    try {
      const data = await fetchWithRetry<Question[]>(url);
      if (!filters?.category && !filters?.difficulty && !filters?.status && !filters?.search) {
        setLocalCache('questions', data);
      }
      return data;
    } catch (err) {
      if (!filters?.category && !filters?.difficulty && !filters?.status && !filters?.search) {
        const cached = getLocalCache<Question[]>('questions');
        if (cached && cached.length > 0) return cached;
      }
      throw err;
    }
  },

  async saveQuestion(question: Partial<Question>): Promise<Question> {
    return fetchWithRetry<Question>('/api/questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(question)
    }, 2, 300);
  },

  async updateQuestionStatus(id: string, status: Question['status']): Promise<Question> {
    return fetchWithRetry<Question>(`/api/questions/${id}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    }, 2, 300);
  },

  async approveAllQuestions(): Promise<{ success: boolean; approvedCount: number; questions: Question[] }> {
    return fetchWithRetry<{ success: boolean; approvedCount: number; questions: Question[] }>('/api/questions/approve-all', {
      method: 'POST'
    }, 2, 300);
  },

  async deleteQuestion(id: string): Promise<{ success: boolean }> {
    return fetchWithRetry<{ success: boolean }>(`/api/questions/${id}`, { method: 'DELETE' }, 2, 300);
  },

  // Documents (with cache fallback)
  async getDocuments(): Promise<DocumentItem[]> {
    try {
      const data = await fetchWithRetry<DocumentItem[]>('/api/documents');
      setLocalCache('documents', data);
      return data;
    } catch (err) {
      const cached = getLocalCache<DocumentItem[]>('documents');
      if (cached && cached.length > 0) return cached;
      throw err;
    }
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

    const responseText = await res.text();
    let data: any;
    try {
      data = JSON.parse(responseText);
    } catch {
      if (!res.ok) {
        throw new Error(`Upload failed (${res.status}): ${responseText.slice(0, 150) || res.statusText}`);
      }
      throw new Error(`Server returned non-JSON response: ${responseText.slice(0, 150)}`);
    }

    if (!res.ok) {
      throw new Error(data.error || `Upload failed with status ${res.status}`);
    }
    return data;
  },

  async deleteDocument(id: string): Promise<{ success: boolean }> {
    return fetchWithRetry<{ success: boolean }>(`/api/documents/${id}`, { method: 'DELETE' }, 2, 300);
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

    const responseText = await res.text();
    let data: any;
    try {
      data = JSON.parse(responseText);
    } catch {
      if (!res.ok) {
        throw new Error(`AI generation failed (${res.status}): ${responseText.slice(0, 150) || res.statusText}`);
      }
      throw new Error(`Server returned non-JSON response: ${responseText.slice(0, 150)}`);
    }

    if (!res.ok) {
      throw new Error(data.error || `AI question generation failed with status ${res.status}`);
    }
    return data;
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

    const responseText = await res.text();
    let data: any;
    try {
      data = JSON.parse(responseText);
    } catch {
      if (!res.ok) {
        throw new Error(`Failed to join (${res.status}): ${responseText.slice(0, 150) || res.statusText}`);
      }
      throw new Error(`Server returned non-JSON response: ${responseText.slice(0, 150)}`);
    }

    if (!res.ok) {
      throw new Error(data.error || 'Failed to join game');
    }
    return data;
  },

  async getParticipants(gameId: string): Promise<Participant[]> {
    return fetchWithRetry<Participant[]>(`/api/participants/${gameId}`, undefined, 2, 250);
  },

  async getLeaderboard(gameId: string): Promise<LeaderboardEntry[]> {
    return fetchWithRetry<LeaderboardEntry[]>(`/api/leaderboard/${gameId}`, undefined, 2, 250);
  },

  // QR Code Data URL with standard scannability
  async getQRCode(text: string, options?: { dark?: string; light?: string; margin?: number; level?: string }): Promise<string> {
    const params = new URLSearchParams({ text });
    if (options?.dark) params.set('dark', options.dark);
    if (options?.light) params.set('light', options.light);
    if (options?.margin !== undefined) params.set('margin', options.margin.toString());
    if (options?.level) params.set('level', options.level);
    const data = await fetchWithRetry<{ dataUrl: string; text: string; errorCorrectionLevel: string }>(`/api/qr?${params.toString()}`);
    return data.dataUrl;
  },

  // Audit logs
  async getAuditLogs(): Promise<AuditLog[]> {
    return fetchWithRetry<AuditLog[]>('/api/audit-logs', undefined, 2, 300);
  }
};
