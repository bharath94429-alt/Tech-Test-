import {
  EventSettings,
  Participant,
  ParticipantSummary,
  Question,
  SanitizedQuestion,
  LeaderboardEntry
} from '../shared/types';
import { clientQuizStore } from './clientQuizStore';

const API_BASE = '/api';

export interface RegisterResponse {
  token: string;
  participant: {
    id: string;
    participantId: string;
    name: string;
    department: string;
    status: Participant['status'];
    answers: Record<number, number>;
    violations: number;
    currentQuestionIndex: number;
    startTime: number;
  };
  timeRemainingSeconds: number;
  timeLimitMinutes: number;
  questions: SanitizedQuestion[];
}

export interface SessionResponse {
  participant: {
    id: string;
    participantId: string;
    name: string;
    department: string;
    status: Participant['status'];
    answers: Record<number, number>;
    violations: number;
    currentQuestionIndex: number;
    score?: number;
    submissionTime?: number | null;
    completionDurationSeconds?: number | null;
    correctCount?: number;
    wrongCount?: number;
    unansweredCount?: number;
  };
  eventState: EventSettings['state'];
  timeRemainingSeconds: number;
  timeLimitMinutes: number;
  maxViolations: number;
  questions: SanitizedQuestion[];
}

export interface ViolationResponse {
  ok: boolean;
  violations: number;
  status: Participant['status'];
  autoSubmitted: boolean;
  message: string;
}

export interface SubmitResponse {
  ok: boolean;
  score: number;
  totalQuestions: number;
  correctCount: number;
  wrongCount: number;
  unansweredCount: number;
  completionDurationSeconds: number | null;
  status: Participant['status'];
  violations: number;
}

export interface AdminOverviewResponse {
  totalParticipants: number;
  activeParticipants: number;
  submittedParticipants: number;
  flaggedParticipants: number;
  settings: EventSettings;
  participants: ParticipantSummary[];
}

// Token storage helpers
const PARTICIPANT_TOKEN_KEY = 'tech_test_participant_token';
const ADMIN_TOKEN_KEY = 'tech_test_admin_token';

export const getStoredParticipantToken = (): string | null => {
  return localStorage.getItem(PARTICIPANT_TOKEN_KEY);
};

export const setStoredParticipantToken = (token: string) => {
  localStorage.setItem(PARTICIPANT_TOKEN_KEY, token);
};

export const clearStoredParticipantToken = () => {
  localStorage.removeItem(PARTICIPANT_TOKEN_KEY);
};

export const getStoredAdminToken = (): string | null => {
  return sessionStorage.getItem(ADMIN_TOKEN_KEY);
};

export const setStoredAdminToken = (token: string) => {
  sessionStorage.setItem(ADMIN_TOKEN_KEY, token);
};

export const clearStoredAdminToken = () => {
  sessionStorage.removeItem(ADMIN_TOKEN_KEY);
};

// Safe request runner that detects 404 HTML (e.g. Vercel static routing) and falls back to client store
async function safeFetch<T>(
  url: string,
  init?: RequestInit
): Promise<{ ok: boolean; data?: T; status: number; error?: string; isHtml404: boolean }> {
  try {
    const res = await fetch(url, init);
    const contentType = res.headers.get('content-type') || '';

    // If server returned HTML (Vercel 404 / 502 / static rewrite), do NOT parse as JSON!
    if (!contentType.includes('application/json')) {
      return {
        ok: false,
        status: res.status,
        error: `Server route returned non-JSON (${res.status})`,
        isHtml404: res.status === 404 || !res.ok
      };
    }

    const data = await res.json();
    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        error: data?.error || `Request failed with status ${res.status}`,
        isHtml404: false
      };
    }

    return { ok: true, data, status: res.status, isHtml404: false };
  } catch (err: any) {
    return {
      ok: false,
      status: 0,
      error: err.message || 'Network error',
      isHtml404: true
    };
  }
}

// API client with seamless client-store fallback
export const api = {
  // Public Event Status
  async getEventStatus(): Promise<{ settings: EventSettings; totalQuestions: number }> {
    const res = await safeFetch<{ settings: EventSettings; totalQuestions: number }>(`${API_BASE}/event/status`);
    if (res.ok && res.data) {
      return res.data;
    }
    // Fallback to client-side store
    return clientQuizStore.getEventStatus();
  },

  // Participant Register
  async register(data: {
    participantId: string;
    name: string;
    department?: string;
  }): Promise<RegisterResponse> {
    const res = await safeFetch<RegisterResponse>(`${API_BASE}/participant/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    if (res.ok && res.data) {
      setStoredParticipantToken(res.data.token);
      return res.data;
    }

    // If it was a real JSON error from server (e.g. "Duplicate ID", "Quiz Waiting"), propagate error
    if (!res.isHtml404 && res.error) {
      throw new Error(res.error);
    }

    // Fallback to client store
    const local = clientQuizStore.registerParticipant(data);
    setStoredParticipantToken(local.token);
    return local;
  },

  // Participant Session Resume
  async getSession(token: string): Promise<SessionResponse> {
    const res = await safeFetch<SessionResponse>(`${API_BASE}/participant/session`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (res.ok && res.data) {
      return res.data;
    }

    if (!res.isHtml404 && res.error) {
      throw new Error(res.error);
    }

    return clientQuizStore.getSession(token);
  },

  // Record Answer
  async recordAnswer(token: string, questionId: number, optionIndex: number) {
    const res = await safeFetch<{ ok: boolean; answers: any; status: any }>(`${API_BASE}/participant/answer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ questionId, optionIndex })
    });

    if (res.ok && res.data) {
      return res.data;
    }

    if (!res.isHtml404 && res.error) {
      throw new Error(res.error);
    }

    return clientQuizStore.recordAnswer(token, questionId, optionIndex);
  },

  // Record Violation
  async recordViolation(
    token: string,
    eventType: 'tab_switched' | 'returned_to_test' | 'window_blurred' | 'window_focused',
    questionIndex: number
  ): Promise<ViolationResponse> {
    const res = await safeFetch<ViolationResponse>(`${API_BASE}/participant/violation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ eventType, questionIndex })
    });

    if (res.ok && res.data) {
      return res.data;
    }

    if (!res.isHtml404 && res.error) {
      throw new Error(res.error);
    }

    return clientQuizStore.recordViolation(token, eventType, questionIndex);
  },

  // Submit Test
  async submitTest(token: string): Promise<SubmitResponse> {
    const res = await safeFetch<SubmitResponse>(`${API_BASE}/participant/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      }
    });

    if (res.ok && res.data) {
      return res.data;
    }

    if (!res.isHtml404 && res.error) {
      throw new Error(res.error);
    }

    return clientQuizStore.submitTest(token);
  },

  // Leaderboard
  async getLeaderboard(): Promise<{ leaderboardPublic: boolean; leaderboard: LeaderboardEntry[] }> {
    const res = await safeFetch<{ leaderboardPublic: boolean; leaderboard: LeaderboardEntry[] }>(
      `${API_BASE}/leaderboard`
    );

    if (res.ok && res.data) {
      return res.data;
    }

    return {
      leaderboardPublic: clientQuizStore.getEventStatus().settings.leaderboardPublic,
      leaderboard: clientQuizStore.getLeaderboard(false)
    };
  },

  // Admin Login
  async adminLogin(username: string, password: string): Promise<{ token: string; user: any }> {
    const res = await safeFetch<{ token: string; user: any }>(`${API_BASE}/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    if (res.ok && res.data) {
      setStoredAdminToken(res.data.token);
      return res.data;
    }

    // If server returned valid JSON error (like 401 "Invalid credentials"), throw it directly
    if (!res.isHtml404 && res.error) {
      throw new Error(res.error);
    }

    // If endpoint returned HTML 404 (e.g. Vercel without active backend), validate with client store
    const local = clientQuizStore.adminLogin(username, password);
    setStoredAdminToken(local.token);
    return local;
  },

  // Admin Overview
  async getAdminOverview(adminToken: string): Promise<AdminOverviewResponse> {
    const res = await safeFetch<AdminOverviewResponse>(`${API_BASE}/admin/overview`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    if (res.ok && res.data) {
      return res.data;
    }

    if (!res.isHtml404 && res.error) {
      throw new Error(res.error);
    }

    return clientQuizStore.getOverview();
  },

  // Admin Participant Detail
  async getAdminParticipant(adminToken: string, id: string): Promise<{ participant: Participant }> {
    const res = await safeFetch<{ participant: Participant }>(`${API_BASE}/admin/participant/${id}`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    if (res.ok && res.data) {
      return res.data;
    }

    if (!res.isHtml404 && res.error) {
      throw new Error(res.error);
    }

    return clientQuizStore.getParticipant(id);
  },

  // Admin Update Settings
  async updateAdminSettings(adminToken: string, settings: Partial<EventSettings>) {
    const res = await safeFetch<{ ok: boolean; settings: EventSettings }>(`${API_BASE}/admin/settings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify(settings)
    });

    if (res.ok && res.data) {
      return res.data;
    }

    clientQuizStore.updateSettings(settings);
    return { ok: true, settings: clientQuizStore.getEventStatus().settings };
  },

  // Admin Get Questions (with answers)
  async getAdminQuestions(adminToken: string): Promise<{ questions: Question[] }> {
    const res = await safeFetch<{ questions: Question[] }>(`${API_BASE}/admin/questions`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    if (res.ok && res.data) {
      return res.data;
    }

    return { questions: clientQuizStore.getQuestions() };
  },

  // Admin Save Questions
  async saveAdminQuestions(adminToken: string, questions: Question[]): Promise<{ ok: boolean; questions: Question[] }> {
    const res = await safeFetch<{ ok: boolean; questions: Question[] }>(`${API_BASE}/admin/questions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({ questions })
    });

    if (res.ok && res.data) {
      return res.data;
    }

    clientQuizStore.setQuestions(questions);
    return { ok: true, questions: clientQuizStore.getQuestions() };
  },

  // Admin Reset Questions
  async resetAdminQuestions(adminToken: string): Promise<{ ok: boolean; questions: Question[] }> {
    const res = await safeFetch<{ ok: boolean; questions: Question[] }>(`${API_BASE}/admin/questions/reset`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    if (res.ok && res.data) {
      return res.data;
    }

    clientQuizStore.resetQuestions();
    return { ok: true, questions: clientQuizStore.getQuestions() };
  },

  // Admin Seed Demo
  async seedDemo(adminToken: string) {
    const res = await safeFetch<{ ok: boolean }>(`${API_BASE}/admin/seed-demo`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    if (res.ok) return res.data;
    clientQuizStore.seedDemoParticipants();
    return { ok: true };
  },

  // Admin Clear Demo
  async clearDemo(adminToken: string) {
    const res = await safeFetch<{ ok: boolean }>(`${API_BASE}/admin/clear-demo`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    if (res.ok) return res.data;
    clientQuizStore.clearDemoParticipants();
    return { ok: true };
  },

  // Admin Reset
  async resetEvent(adminToken: string, clearDemo: boolean) {
    const res = await safeFetch<{ ok: boolean }>(`${API_BASE}/admin/reset`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({ clearDemo })
    });

    if (res.ok) return res.data;
    clientQuizStore.resetAll(clearDemo);
    return { ok: true };
  },

  // Download CSV helper (works on both server and client fallback!)
  async downloadExportCsv(adminToken: string) {
    try {
      const res = await fetch(`${API_BASE}/admin/export-csv`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      const ct = res.headers.get('content-type') || '';
      if (res.ok && (ct.includes('csv') || ct.includes('text/plain'))) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'tech_test_results.csv';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        return;
      }
    } catch {
      // Fallback below
    }

    // Client fallback
    const csvContent = clientQuizStore.exportCSV();
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tech_test_results.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  },

  getExportCsvUrl(): string {
    return `${API_BASE}/admin/export-csv`;
  }
};
