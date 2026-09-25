import {
  EventSettings,
  Participant,
  ParticipantSummary,
  SanitizedQuestion,
  LeaderboardEntry
} from '../shared/types';

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

// API calls
export const api = {
  // Public Event Status
  async getEventStatus(): Promise<{ settings: EventSettings; totalQuestions: number }> {
    const res = await fetch(`${API_BASE}/event/status`);
    if (!res.ok) throw new Error('Failed to fetch event status');
    return res.json();
  },

  // Participant Register
  async register(data: {
    participantId: string;
    name: string;
    department?: string;
  }): Promise<RegisterResponse> {
    const res = await fetch(`${API_BASE}/participant/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error || 'Registration failed');
    }
    setStoredParticipantToken(json.token);
    return json;
  },

  // Participant Session Resume
  async getSession(token: string): Promise<SessionResponse> {
    const res = await fetch(`${API_BASE}/participant/session`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error || 'Failed to resume session');
    }
    return json;
  },

  // Record Answer
  async recordAnswer(token: string, questionId: number, optionIndex: number) {
    const res = await fetch(`${API_BASE}/participant/answer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ questionId, optionIndex })
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to record answer');
    return json;
  },

  // Record Violation
  async recordViolation(
    token: string,
    eventType: 'tab_switched' | 'returned_to_test' | 'window_blurred' | 'window_focused',
    questionIndex: number
  ): Promise<ViolationResponse> {
    const res = await fetch(`${API_BASE}/participant/violation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ eventType, questionIndex })
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to record violation');
    return json;
  },

  // Submit Test
  async submitTest(token: string): Promise<SubmitResponse> {
    const res = await fetch(`${API_BASE}/participant/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      }
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to submit test');
    return json;
  },

  // Leaderboard
  async getLeaderboard(): Promise<{ leaderboardPublic: boolean; leaderboard: LeaderboardEntry[] }> {
    const res = await fetch(`${API_BASE}/leaderboard`);
    if (!res.ok) throw new Error('Failed to fetch leaderboard');
    return res.json();
  },

  // Admin Login
  async adminLogin(username: string, password: string): Promise<{ token: string; user: any }> {
    const res = await fetch(`${API_BASE}/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error || 'Invalid credentials');
    }
    setStoredAdminToken(json.token);
    return json;
  },

  // Admin Overview
  async getAdminOverview(adminToken: string): Promise<AdminOverviewResponse> {
    const res = await fetch(`${API_BASE}/admin/overview`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to fetch overview');
    return json;
  },

  // Admin Participant Detail
  async getAdminParticipant(adminToken: string, id: string): Promise<{ participant: Participant }> {
    const res = await fetch(`${API_BASE}/admin/participant/${id}`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to fetch participant details');
    return json;
  },

  // Admin Update Settings
  async updateAdminSettings(adminToken: string, settings: Partial<EventSettings>) {
    const res = await fetch(`${API_BASE}/admin/settings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify(settings)
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to update settings');
    return json;
  },

  // Admin Seed Demo
  async seedDemo(adminToken: string) {
    const res = await fetch(`${API_BASE}/admin/seed-demo`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    return res.json();
  },

  // Admin Clear Demo
  async clearDemo(adminToken: string) {
    const res = await fetch(`${API_BASE}/admin/clear-demo`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    return res.json();
  },

  // Admin Reset
  async resetEvent(adminToken: string, clearDemo: boolean) {
    const res = await fetch(`${API_BASE}/admin/reset`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({ clearDemo })
    });
    return res.json();
  },

  // Admin Export CSV URL
  getExportCsvUrl(): string {
    return `${API_BASE}/admin/export-csv`;
  }
};
