import React, { useState, useEffect } from 'react';
import {
  Users,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Download,
  Settings,
  RefreshCw,
  Search,
  Eye,
  Trash2,
  Play,
  Pause,
  StopCircle,
  FileSpreadsheet,
  X,
  Clock,
  ShieldAlert,
  Database,
  SlidersHorizontal,
  BookOpen
} from 'lucide-react';
import { api, AdminOverviewResponse } from '../services/api';
import { ParticipantSummary, Participant, EventState, EventSettings } from '../shared/types';
import { AdminQuestionEditor } from './AdminQuestionEditor';
import { clientQuizStore } from '../services/clientQuizStore';

interface AdminDashboardProps {
  adminToken: string;
  onLogout: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ adminToken, onLogout }) => {
  const [overview, setOverview] = useState<AdminOverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'monitoring' | 'questions'>('monitoring');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'warning' | 'submitted' | 'flagged'>('all');
  const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [isLiveConnected, setIsLiveConnected] = useState<boolean>(true);

  // Fetch overview
  const fetchOverview = async () => {
    try {
      const data = await api.getAdminOverview(adminToken);
      setOverview(data);
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (err: any) {
      console.error('Overview fetch failed:', err);
    } finally {
      setLoading(false);
    }
  };

  // Real-time live monitoring listeners
  useEffect(() => {
    fetchOverview();

    // 1. Subscribe to clientQuizStore (immediate memory sync)
    const unsubClient = clientQuizStore.subscribe(() => {
      fetchOverview();
    });

    // 2. Window storage & custom events (cross-tab/window sync)
    const handleStoreUpdate = () => fetchOverview();
    window.addEventListener('tech_test_store_updated', handleStoreUpdate);
    window.addEventListener('storage', handleStoreUpdate);

    // 3. EventSource SSE (server-authoritative live stream)
    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource(`/api/admin/events-stream?token=${encodeURIComponent(adminToken)}`);

      eventSource.onopen = () => {
        setIsLiveConnected(true);
      };

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.overview) {
            setOverview(data.overview);
            setLastUpdated(new Date().toLocaleTimeString());
            setIsLiveConnected(true);
          }
        } catch (err) {
          // Heartbeat or parse error
        }
      };

      eventSource.onerror = () => {
        setIsLiveConnected(false);
      };
    } catch (err) {
      setIsLiveConnected(false);
    }

    // 4. Polling fallback every 2.5 seconds (ensures ultra-responsive updates)
    const pollTimer = setInterval(fetchOverview, 2500);

    return () => {
      unsubClient();
      window.removeEventListener('tech_test_store_updated', handleStoreUpdate);
      window.removeEventListener('storage', handleStoreUpdate);
      if (eventSource) eventSource.close();
      clearInterval(pollTimer);
    };
  }, [adminToken]);

  // Open participant detail modal
  const handleOpenParticipant = async (id: string) => {
    setLoadingDetails(true);
    try {
      const res = await api.getAdminParticipant(adminToken, id);
      setSelectedParticipant(res.participant);
    } catch (err) {
      console.error('Participant details fetch failed:', err);
    } finally {
      setLoadingDetails(false);
    }
  };

  // Update Event State
  const handleStateChange = async (newState: EventState) => {
    setActionLoading(true);
    try {
      await api.updateAdminSettings(adminToken, { state: newState });
      await fetchOverview();
    } catch (err: any) {
      alert(err.message || 'Failed to update event state');
    } finally {
      setActionLoading(false);
    }
  };

  // Seed demo
  const handleSeedDemo = async () => {
    setActionLoading(true);
    try {
      await api.seedDemo(adminToken);
      await fetchOverview();
    } finally {
      setActionLoading(false);
    }
  };

  // Clear demo
  const handleClearDemo = async () => {
    setActionLoading(true);
    try {
      await api.clearDemo(adminToken);
      await fetchOverview();
    } finally {
      setActionLoading(false);
    }
  };

  // Reset Event
  const handleResetEvent = async (clearDemo: boolean) => {
    setActionLoading(true);
    try {
      await api.resetEvent(adminToken, clearDemo);
      setShowResetModal(false);
      setSelectedParticipant(null);
      await fetchOverview();
    } finally {
      setActionLoading(false);
    }
  };

  // Export CSV download (works on both server and client fallback)
  const handleExportCSV = async () => {
    setActionLoading(true);
    try {
      await api.downloadExportCsv(adminToken);
    } catch (err: any) {
      alert(err.message || 'Failed to export CSV');
    } finally {
      setActionLoading(false);
    }
  };

  const filteredParticipants = (overview?.participants || []).filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.participantId.toLowerCase().includes(search.toLowerCase()) ||
      p.department.toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;
    if (statusFilter === 'all') return true;
    if (statusFilter === 'active') return p.status === 'active' || p.status === 'normal';
    if (statusFilter === 'warning') return p.status === 'warning';
    if (statusFilter === 'submitted') return p.status === 'submitted';
    if (statusFilter === 'flagged') return p.status === 'flagged';
    return true;
  });

  const hasDemo = (overview?.participants || []).some((p) => p.isDemo);
  const maxViolationsAllowed = overview?.settings.maxViolations ?? 3;
  const violatedCandidates = (overview?.participants || []).filter(
    (p) => p.violations >= maxViolationsAllowed
  );

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-6 sm:py-8">
      {/* Top Banner / Hero */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-stone-200">
        <div>
          <div className="flex items-center flex-wrap gap-2">
            <span className="text-xs uppercase font-mono tracking-widest text-stone-600 font-semibold">
              {overview?.settings.name || 'Computer Science – 2nd Year Quiz'}
            </span>
            <span className="text-stone-300">·</span>
            <span className="text-[11px] uppercase font-mono tracking-wider font-semibold text-emerald-800 flex items-center gap-1.5 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              <span className={`w-2 h-2 rounded-full ${isLiveConnected ? 'bg-emerald-600 animate-pulse' : 'bg-amber-500'}`} />
              {isLiveConnected ? 'LIVE MONITORING' : 'POLLING LIVE'}
            </span>
            {lastUpdated && (
              <span className="text-[11px] font-mono text-stone-500 hidden sm:inline">
                Synced {lastUpdated}
              </span>
            )}
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-stone-900 mt-1">
            Real-Time Examination Control
          </h1>
        </div>

        {/* Quick Actions Bar */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Manual Refresh Button */}
          <button
            onClick={() => {
              setActionLoading(true);
              fetchOverview().finally(() => setActionLoading(false));
            }}
            disabled={actionLoading}
            className="px-2.5 py-1.5 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 text-xs font-semibold flex items-center gap-1.5 transition shadow-xs"
            title="Refresh now"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${actionLoading ? 'animate-spin text-stone-900' : 'text-stone-600'}`} />
            <span>Sync</span>
          </button>

          {/* State Switcher */}
          <div className="inline-flex rounded-xl border border-stone-200 p-1 bg-stone-50">
            <button
              onClick={() => handleStateChange('ACTIVE')}
              disabled={actionLoading || overview?.settings.state === 'ACTIVE'}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                overview?.settings.state === 'ACTIVE'
                  ? 'bg-stone-900 text-white shadow-xs'
                  : 'text-stone-700 hover:text-stone-900'
              }`}
            >
              <Play className="w-3 h-3" />
              <span>Active</span>
            </button>
            <button
              onClick={() => handleStateChange('WAITING')}
              disabled={actionLoading || overview?.settings.state === 'WAITING'}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                overview?.settings.state === 'WAITING'
                  ? 'bg-stone-900 text-white shadow-xs'
                  : 'text-stone-700 hover:text-stone-900'
              }`}
            >
              <Pause className="w-3 h-3" />
              <span>Pause</span>
            </button>
            <button
              onClick={() => handleStateChange('ENDED')}
              disabled={actionLoading || overview?.settings.state === 'ENDED'}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                overview?.settings.state === 'ENDED'
                  ? 'bg-stone-900 text-white shadow-xs'
                  : 'text-stone-700 hover:text-stone-900'
              }`}
            >
              <StopCircle className="w-3 h-3" />
              <span>End Quiz</span>
            </button>
          </div>

          {/* Export CSV */}
          <button
            onClick={handleExportCSV}
            className="px-3 py-1.5 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-stone-800 text-xs font-semibold flex items-center gap-1.5 transition shadow-xs"
            title="Download CSV report"
          >
            <Download className="w-3.5 h-3.5 text-stone-600" />
            <span>Export Results</span>
          </button>

          {/* Settings modal trigger */}
          <button
            onClick={() => setShowSettingsModal(true)}
            className="p-2 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 transition"
            title="Event Settings"
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* Reset Event trigger */}
          <button
            onClick={() => setShowResetModal(true)}
            className="p-2 rounded-xl border border-stone-200 bg-white hover:bg-rose-50 text-stone-700 hover:text-rose-700 transition"
            title="Reset Event"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Admin Tabs */}
      <div className="flex items-center gap-2 mt-6 mb-2 border-b border-stone-200 pb-3">
        <button
          onClick={() => setActiveTab('monitoring')}
          className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition flex items-center gap-2 ${
            activeTab === 'monitoring'
              ? 'bg-stone-900 text-white shadow-xs'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Live Monitoring</span>
        </button>

        <button
          onClick={() => setActiveTab('questions')}
          className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition flex items-center gap-2 ${
            activeTab === 'questions'
              ? 'bg-stone-900 text-white shadow-xs'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Customize Questions</span>
        </button>
      </div>

      {activeTab === 'questions' ? (
        <div className="mt-4">
          <AdminQuestionEditor adminToken={adminToken} onQuestionsUpdated={fetchOverview} />
        </div>
      ) : (
        <>
          {/* Critical Violation Alert Banner when candidate exceeds allowed violations */}
          {violatedCandidates.length > 0 && (
            <div className="my-5 p-4 sm:p-5 rounded-2xl bg-rose-50 border-2 border-rose-300 shadow-sm ring-2 ring-rose-200/60 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div className="p-2.5 rounded-xl bg-rose-600 text-white shadow-sm shrink-0 mt-0.5 animate-pulse">
                    <ShieldAlert className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono uppercase tracking-wider font-bold px-2 py-0.5 rounded-full bg-rose-200 text-rose-900 border border-rose-300">
                        Proctoring Alert
                      </span>
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-500 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-600"></span>
                      </span>
                      <span className="text-xs font-bold text-rose-900 uppercase">
                        Violation Limit Exceeded ({maxViolationsAllowed} Allowed)
                      </span>
                    </div>
                    <h3 className="text-sm sm:text-base font-bold text-rose-950 mt-1">
                      {violatedCandidates.length} candidate{violatedCandidates.length > 1 ? 's have' : ' has'} exceeded the permitted violation threshold!
                    </h3>
                    <p className="text-xs text-rose-800 mt-0.5">
                      The automated proctor detected window switches and blur events exceeding the limit. Their exams have been flagged and locked.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {violatedCandidates.map((vc) => (
                    <button
                      key={vc.id}
                      onClick={() => handleOpenParticipant(vc.id)}
                      className="px-3 py-1.5 rounded-xl bg-white hover:bg-rose-100 border border-rose-300 text-rose-900 text-xs font-semibold flex items-center gap-1.5 shadow-xs transition cursor-pointer"
                      title="Inspect participant activity log"
                    >
                      <Eye className="w-3.5 h-3.5 text-rose-700" />
                      <span>{vc.name} ({vc.violations} violations)</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 4 Stat KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 my-6">
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-stone-200 shadow-xs">
              <div className="flex items-center justify-between text-stone-600 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Participants</span>
                <Users className="w-4 h-4 text-stone-600" />
              </div>
              <div className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-stone-900">
                {overview?.totalParticipants ?? 0}
              </div>
              <div className="text-[11px] text-stone-600 mt-1 font-medium">Total registered candidates</div>
            </div>

            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-stone-200 shadow-xs">
              <div className="flex items-center justify-between text-stone-600 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Active</span>
                <Activity className="w-4 h-4 text-emerald-800" />
              </div>
              <div className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-emerald-800">
                {overview?.activeParticipants ?? 0}
              </div>
              <div className="text-[11px] text-stone-600 mt-1 font-medium">Taking test currently</div>
            </div>

            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-stone-200 shadow-xs">
              <div className="flex items-center justify-between text-stone-600 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Submitted</span>
                <CheckCircle2 className="w-4 h-4 text-stone-600" />
              </div>
              <div className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-stone-900">
                {overview?.submittedParticipants ?? 0}
              </div>
              <div className="text-[11px] text-stone-600 mt-1 font-medium">Tests completed</div>
            </div>

            <div className={`p-4 sm:p-5 rounded-2xl border shadow-xs transition-all ${
              violatedCandidates.length > 0
                ? 'bg-rose-50/90 border-rose-300 ring-2 ring-rose-200/60'
                : 'bg-white border-stone-200'
            }`}>
              <div className="flex items-center justify-between text-stone-600 mb-2">
                <span className={`text-xs font-semibold uppercase tracking-wider ${
                  violatedCandidates.length > 0 ? 'text-rose-900 font-bold' : ''
                }`}>
                  {violatedCandidates.length > 0 ? 'Limit Exceeded' : 'Flagged'}
                </span>
                <div className="relative">
                  <ShieldAlert className={`w-4 h-4 ${violatedCandidates.length > 0 ? 'text-rose-600 animate-pulse' : 'text-amber-800'}`} />
                  {violatedCandidates.length > 0 && (
                    <span className="animate-ping absolute -top-1 -right-1 inline-flex h-2 w-2 rounded-full bg-rose-500 opacity-75"></span>
                  )}
                </div>
              </div>
              <div className={`text-2xl sm:text-3xl font-bold font-mono tracking-tight ${
                violatedCandidates.length > 0 ? 'text-rose-700' : 'text-amber-800'
              }`}>
                {overview?.flaggedParticipants ?? 0}
              </div>
              <div className="text-[11px] text-stone-600 mt-1 font-medium">
                {violatedCandidates.length > 0
                  ? `${violatedCandidates.length} candidate(s) over max violations`
                  : 'Tab-switch violations'}
              </div>
            </div>
          </div>

      {/* Demo Data Management Strip */}
      <div className="mb-6 px-4 py-3 rounded-xl bg-stone-100/80 border border-stone-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-stone-700">
          <Database className="w-4 h-4 text-stone-600 shrink-0" />
          <span>
            {hasDemo
              ? 'Showing sample test candidates for dashboard evaluation.'
              : 'Only real participants are currently in the database.'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {hasDemo ? (
            <button
              onClick={handleClearDemo}
              disabled={actionLoading}
              className="px-2.5 py-1 rounded-lg border border-stone-300 bg-white hover:bg-stone-50 font-medium text-stone-700"
            >
              Clear Demo Participants
            </button>
          ) : (
            <button
              onClick={handleSeedDemo}
              disabled={actionLoading}
              className="px-2.5 py-1 rounded-lg border border-stone-300 bg-white hover:bg-stone-50 font-medium text-stone-700"
            >
              Load Demo Participants
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-xs p-4 mb-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-stone-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search candidate name or ID..."
            className="w-full pl-9 pr-3 py-1.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-stone-900"
          />
        </div>

        {/* Status Filters */}
        <div className="flex items-center gap-1 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          {(['all', 'active', 'warning', 'submitted', 'flagged'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1 rounded-lg text-xs font-medium capitalize transition whitespace-nowrap ${
                statusFilter === st
                  ? 'bg-stone-900 text-white'
                  : 'text-stone-600 hover:bg-stone-100'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Participant Table (Desktop) & Cards (Mobile) */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
        {/* Desktop View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-stone-50/80 border-b border-stone-200 text-stone-600 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3.5 px-4">Participant</th>
                <th className="py-3.5 px-4">ID</th>
                <th className="py-3.5 px-4 text-center min-w-[170px]">Live Progress</th>
                <th className="py-3.5 px-4 text-center">Score</th>
                <th className="py-3.5 px-4 text-center">Time</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-center min-w-[140px]">Violations</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 font-medium">
              {filteredParticipants.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-stone-600">
                    No participants found matching the criteria.
                  </td>
                </tr>
              ) : (
                filteredParticipants.map((p) => {
                  const isLimitExceeded = p.violations >= maxViolationsAllowed;
                  const totalQ = p.totalQuestions || overview?.settings ? 5 : 5;
                  const answered = p.answeredCount ?? Object.keys(p.answers || {}).length;
                  const pct = p.progressPercentage ?? Math.round((answered / (totalQ || 1)) * 100);

                  return (
                    <tr
                      key={p.id}
                      onClick={() => handleOpenParticipant(p.id)}
                      className={`cursor-pointer transition-colors ${
                        isLimitExceeded
                          ? 'bg-rose-50/70 border-l-4 border-l-rose-600 hover:bg-rose-100/60'
                          : p.status === 'warning'
                          ? 'bg-amber-50/30 hover:bg-stone-50'
                          : 'hover:bg-stone-50/80'
                      }`}
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          {isLimitExceeded && (
                            <span className="relative flex h-2.5 w-2.5 shrink-0" title="Violations limit exceeded!">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-500 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-600"></span>
                            </span>
                          )}
                          <div>
                            <div className="font-bold text-stone-900 flex items-center gap-1.5">
                              <span>{p.name}</span>
                              {isLimitExceeded && (
                                <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-rose-200 text-rose-900">
                                  ALERT
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-stone-600 font-normal">
                              {p.department || 'General'}
                              {p.isDemo && (
                                <span className="ml-1.5 text-[10px] text-stone-500 font-mono">
                                  (Demo)
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-semibold text-stone-700">
                        {p.participantId}
                      </td>
                      <td className="py-3.5 px-4">
                        {/* Live Visual Progress Display */}
                        <div className="w-full max-w-[150px] mx-auto">
                          <div className="flex items-center justify-between text-[11px] font-mono mb-1">
                            <span className="font-bold text-stone-900">{answered}/{totalQ} answered</span>
                            <span className={`font-bold ${pct === 100 ? 'text-emerald-700' : 'text-stone-700'}`}>
                              {pct}%
                            </span>
                          </div>
                          <div className="w-full bg-stone-200 rounded-full h-2 overflow-hidden shadow-inner">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${
                                pct === 100
                                  ? 'bg-emerald-500'
                                  : pct > 0
                                  ? 'bg-stone-900'
                                  : 'bg-stone-300'
                              }`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          {/* Question Dots */}
                          <div className="flex items-center justify-center gap-1 mt-1.5">
                            {Array.from({ length: totalQ }).map((_, qIdx) => {
                              const qNum = qIdx + 1;
                              const isAns = p.answers ? p.answers[qNum] !== undefined : false;
                              return (
                                <span
                                  key={qNum}
                                  title={`Question ${qNum}: ${isAns ? 'Answered' : 'Not yet answered'}`}
                                  className={`w-3.5 h-3.5 rounded-xs flex items-center justify-center text-[9px] font-mono font-bold ${
                                    isAns
                                      ? 'bg-emerald-600 text-white'
                                      : 'bg-stone-100 text-stone-400 border border-stone-200'
                                  }`}
                                >
                                  {qNum}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono font-bold text-stone-900">
                        {p.scoreText}
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono text-stone-600">
                        {p.timeDisplay}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {isLimitExceeded ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-100 text-rose-800 border border-rose-300 shadow-xs animate-pulse">
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-500 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-600"></span>
                            </span>
                            EXCEEDED
                          </span>
                        ) : (
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold uppercase ${
                              p.status === 'flagged'
                                ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                : p.status === 'warning'
                                ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                : p.status === 'submitted'
                                ? 'bg-stone-100 text-stone-800 border border-stone-200'
                                : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            }`}
                          >
                            {p.status}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono">
                        {isLimitExceeded ? (
                          <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-600 text-white font-bold text-xs shadow-xs animate-pulse">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            <span>{p.violations} / {maxViolationsAllowed} EXCEEDED</span>
                          </div>
                        ) : p.violations > 0 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-300 font-bold text-xs">
                            <AlertTriangle className="w-3 h-3 text-amber-600" />
                            <span>{p.violations} / {maxViolationsAllowed}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-emerald-700 text-xs font-semibold">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>0</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenParticipant(p.id);
                          }}
                          className="px-2.5 py-1 text-xs text-stone-700 hover:text-stone-950 font-medium hover:bg-stone-100 rounded-lg transition"
                        >
                          View Log
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards View */}
        <div className="md:hidden divide-y divide-stone-100">
          {filteredParticipants.length === 0 ? (
            <div className="py-8 text-center text-stone-600 text-xs">
              No participants found.
            </div>
          ) : (
            filteredParticipants.map((p) => {
              const isLimitExceeded = p.violations >= maxViolationsAllowed;
              const totalQ = p.totalQuestions || 5;
              const answered = p.answeredCount ?? Object.keys(p.answers || {}).length;
              const pct = p.progressPercentage ?? Math.round((answered / (totalQ || 1)) * 100);

              return (
                <div
                  key={p.id}
                  onClick={() => handleOpenParticipant(p.id)}
                  className={`p-4 active:bg-stone-50 cursor-pointer transition-colors ${
                    isLimitExceeded
                      ? 'bg-rose-50/70 border-l-4 border-l-rose-600'
                      : p.status === 'warning'
                      ? 'bg-amber-50/30'
                      : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2.5">
                    <div className="flex items-start gap-2">
                      {isLimitExceeded && (
                        <span className="relative flex h-2.5 w-2.5 shrink-0 mt-1">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-500 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-600"></span>
                        </span>
                      )}
                      <div>
                        <div className="font-bold text-xs text-stone-900 flex items-center gap-1.5">
                          <span>{p.name}</span>
                          {isLimitExceeded && (
                            <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-rose-200 text-rose-900">
                              LIMIT EXCEEDED
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] font-mono text-stone-600">
                          {p.participantId} {p.department && `· ${p.department}`}
                          {p.isDemo && ' (Demo)'}
                        </div>
                      </div>
                    </div>
                    <span
                      className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full ${
                        isLimitExceeded
                          ? 'bg-rose-600 text-white font-bold animate-pulse'
                          : p.status === 'flagged'
                          ? 'bg-rose-100 text-rose-800'
                          : p.status === 'warning'
                          ? 'bg-amber-100 text-amber-800'
                          : p.status === 'submitted'
                          ? 'bg-stone-100 text-stone-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {isLimitExceeded ? 'EXCEEDED' : p.status}
                    </span>
                  </div>

                  {/* Mobile Live Progress Bar */}
                  <div className="my-2.5 p-2 rounded-xl bg-stone-100/70">
                    <div className="flex items-center justify-between text-[11px] font-mono mb-1">
                      <span className="font-bold text-stone-800">Progress: {answered}/{totalQ} Answered</span>
                      <span className="font-bold text-stone-700">{pct}%</span>
                    </div>
                    <div className="w-full bg-stone-200 rounded-full h-2 overflow-hidden shadow-inner">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          pct === 100
                            ? 'bg-emerald-500'
                            : pct > 0
                            ? 'bg-stone-900'
                            : 'bg-stone-300'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-stone-100 text-center font-mono">
                    <div>
                      <div className="text-[9px] uppercase text-stone-600">Score</div>
                      <div className="text-xs font-bold text-stone-900">{p.scoreText}</div>
                    </div>
                    <div>
                      <div className="text-[9px] uppercase text-stone-600">Time</div>
                      <div className="text-xs text-stone-700">{p.timeDisplay}</div>
                    </div>
                    <div>
                      <div className="text-[9px] uppercase text-stone-600">Violations</div>
                      <div
                        className={`text-xs font-bold ${
                          isLimitExceeded
                            ? 'text-rose-700 underline font-black animate-pulse'
                            : p.violations > 0
                            ? 'text-amber-700'
                            : 'text-stone-600'
                        }`}
                      >
                        {p.violations} {isLimitExceeded && '⚠'}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
      </>
      )}

      {/* Individual Participant Modal / Drawer */}
      {selectedParticipant && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-stone-200 shadow-xl max-w-xl w-full max-h-[85vh] flex flex-col text-stone-900 animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="p-5 border-b border-stone-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold tracking-tight">
                  {selectedParticipant.name}
                </h3>
                <div className="flex items-center gap-2 text-xs text-stone-600 font-mono mt-0.5">
                  <span>{selectedParticipant.participantId}</span>
                  {selectedParticipant.department && (
                    <>
                      <span>·</span>
                      <span className="font-sans">{selectedParticipant.department}</span>
                    </>
                  )}
                </div>
              </div>
              <button
                onClick={() => setSelectedParticipant(null)}
                className="p-1.5 rounded-lg text-stone-500 hover:text-stone-800 hover:bg-stone-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Metrics Row */}
            <div className="p-5 border-b border-stone-100 bg-stone-50/50 grid grid-cols-3 gap-3 text-center">
              <div>
                <span className="text-[10px] uppercase font-medium text-stone-600 block">
                  Official Score
                </span>
                <span className="text-lg font-bold font-mono text-stone-900">
                  {selectedParticipant.score} / {selectedParticipant.totalQuestions}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-medium text-stone-600 block">
                  Status
                </span>
                <span className={`text-xs font-bold uppercase tracking-wide block mt-1 ${
                  selectedParticipant.violations >= maxViolationsAllowed
                    ? 'text-rose-700 underline'
                    : 'text-stone-900'
                }`}>
                  {selectedParticipant.status}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-medium text-stone-600 block">
                  Violations
                </span>
                <span
                  className={`text-lg font-bold font-mono ${
                    selectedParticipant.violations >= maxViolationsAllowed
                      ? 'text-rose-700'
                      : selectedParticipant.violations > 0
                      ? 'text-amber-700'
                      : 'text-stone-900'
                  }`}
                >
                  {selectedParticipant.violations} / {maxViolationsAllowed}
                </span>
              </div>
            </div>

            {/* Violation Alert Banner if exceeded */}
            {selectedParticipant.violations >= maxViolationsAllowed && (
              <div className="mx-5 mt-4 p-3 rounded-xl bg-rose-50 border border-rose-300 text-rose-950 flex items-start gap-3 shadow-xs">
                <div className="p-1.5 rounded-lg bg-rose-600 text-white shrink-0 mt-0.5 animate-pulse">
                  <ShieldAlert className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-xs uppercase tracking-wide text-rose-900 flex items-center gap-2">
                    <span>Violation Limit Exceeded</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-rose-200 text-rose-900">
                      FLAGGED
                    </span>
                  </div>
                  <p className="text-[11px] text-rose-800 mt-0.5 leading-snug">
                    Participant exceeded the maximum allowed limit of {maxViolationsAllowed} window/tab departures ({selectedParticipant.violations} violations logged). Test was automatically locked and flagged for review.
                  </p>
                </div>
              </div>
            )}

            {/* Candidate Live Progress Map */}
            <div className="px-5 pt-4 pb-2 border-b border-stone-100">
              <div className="flex items-center justify-between text-xs font-semibold text-stone-800 mb-1.5">
                <span className="flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-stone-600" />
                  <span>Examination Progress</span>
                </span>
                <span className="font-mono text-stone-600">
                  {Object.keys(selectedParticipant.answers || {}).length} of {selectedParticipant.totalQuestions} Questions Completed ({Math.round((Object.keys(selectedParticipant.answers || {}).length / (selectedParticipant.totalQuestions || 1)) * 100)}%)
                </span>
              </div>

              <div className="w-full bg-stone-200 rounded-full h-2.5 overflow-hidden shadow-inner mb-3">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.round((Object.keys(selectedParticipant.answers || {}).length / (selectedParticipant.totalQuestions || 1)) * 100)}%`
                  }}
                />
              </div>

              {/* Question Chips Map */}
              <div className="grid grid-cols-5 gap-1.5 mb-2">
                {Array.from({ length: selectedParticipant.totalQuestions || 5 }).map((_, qIdx) => {
                  const qNum = qIdx + 1;
                  const chosenOpt = selectedParticipant.answers ? selectedParticipant.answers[qNum] : undefined;
                  const isAns = chosenOpt !== undefined && chosenOpt !== null;
                  const letter = isAns ? String.fromCharCode(65 + Number(chosenOpt)) : null;

                  return (
                    <div
                      key={qNum}
                      className={`p-1.5 rounded-lg border text-center ${
                        isAns
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-semibold'
                          : 'bg-stone-50 border-stone-200 text-stone-400'
                      }`}
                    >
                      <div className="text-[10px] font-mono uppercase text-stone-500">Q{qNum}</div>
                      <div className="text-xs font-bold font-mono">
                        {isAns ? `Option ${letter}` : 'Pending'}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Chronological Activity Log */}
            <div className="flex-1 overflow-y-auto p-5">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-stone-600 mb-3">
                Audit & Activity Log
              </h4>
              <div className="space-y-2.5">
                {selectedParticipant.activityLog.length === 0 ? (
                  <p className="text-xs text-stone-500">No events recorded yet.</p>
                ) : (
                  selectedParticipant.activityLog.map((item) => (
                    <div
                      key={item.id}
                      className="p-2.5 rounded-xl border border-stone-100 bg-stone-50 text-xs flex items-start gap-2.5"
                    >
                      <span className="font-mono text-stone-600 text-[11px] shrink-0 mt-0.5">
                        {item.formattedTime}
                      </span>
                      <span className="text-stone-300">·</span>
                      <div className="flex-1">
                        <span
                          className={`font-medium ${
                            item.eventType === 'tab_switched' || item.eventType === 'window_blurred'
                              ? 'text-amber-800'
                              : item.eventType === 'auto_submitted'
                              ? 'text-rose-800 font-bold'
                              : item.eventType === 'submitted'
                              ? 'text-emerald-800 font-bold'
                              : 'text-stone-800'
                          }`}
                        >
                          {item.description}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-stone-100 flex justify-end">
              <button
                onClick={() => setSelectedParticipant(null)}
                className="px-4 py-2 rounded-xl bg-stone-900 text-white text-xs font-medium hover:bg-stone-800 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettingsModal && overview && (
        <SettingsModal
          settings={overview.settings}
          onClose={() => setShowSettingsModal(false)}
          onSave={async (newSettings) => {
            await api.updateAdminSettings(adminToken, newSettings);
            setShowSettingsModal(false);
            await fetchOverview();
          }}
        />
      )}

      {/* Confirmation Modal for Reset */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-stone-200 shadow-xl max-w-sm w-full p-6 text-stone-900 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-base font-bold tracking-tight text-rose-800 mb-2">
              Reset Entire Event?
            </h3>
            <p className="text-xs text-stone-600 leading-relaxed mb-5">
              This will wipe all active quiz candidate sessions and submitted responses. This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-2.5">
              <button
                onClick={() => setShowResetModal(false)}
                className="px-4 py-2 rounded-xl border border-stone-200 text-xs font-semibold text-stone-700 hover:bg-stone-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleResetEvent(false)}
                disabled={actionLoading}
                className="px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 transition"
              >
                Confirm Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

interface SettingsModalProps {
  settings: EventSettings;
  onClose: () => void;
  onSave: (newSettings: Partial<EventSettings>) => Promise<void>;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ settings, onClose, onSave }) => {
  const [timeLimit, setTimeLimit] = useState(settings.timeLimitMinutes);
  const [maxViolations, setMaxViolations] = useState(settings.maxViolations);
  const [autoSubmit, setAutoSubmit] = useState(settings.autoSubmitOnMaxViolations);
  const [leaderboardPublic, setLeaderboardPublic] = useState(settings.leaderboardPublic);
  const [saving, setSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({
        timeLimitMinutes: Number(timeLimit),
        maxViolations: Number(maxViolations),
        autoSubmitOnMaxViolations: autoSubmit,
        leaderboardPublic
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-stone-200 shadow-xl max-w-sm w-full p-6 text-stone-900 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-3 border-b border-stone-100 mb-4">
          <h3 className="text-base font-bold tracking-tight">Event Settings</h3>
          <button onClick={onClose} className="text-stone-500 hover:text-stone-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-stone-800 mb-1">
              Time Limit (Minutes)
            </label>
            <input
              type="number"
              min={1}
              max={60}
              value={timeLimit}
              onChange={(e) => setTimeLimit(Number(e.target.value))}
              required
              className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-mono text-stone-900"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-800 mb-1">
              Max Violations Threshold
            </label>
            <input
              type="number"
              min={1}
              max={10}
              value={maxViolations}
              onChange={(e) => setMaxViolations(Number(e.target.value))}
              required
              className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-mono text-stone-900"
            />
          </div>

          <div className="space-y-2 pt-1 text-xs">
            <label className="flex items-center gap-2 cursor-pointer text-stone-800">
              <input
                type="checkbox"
                checked={autoSubmit}
                onChange={(e) => setAutoSubmit(e.target.checked)}
                className="rounded border-stone-300 text-stone-900 focus:ring-stone-900"
              />
              <span>Auto-submit when violation limit reached</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer text-stone-800">
              <input
                type="checkbox"
                checked={leaderboardPublic}
                onChange={(e) => setLeaderboardPublic(e.target.checked)}
                className="rounded border-stone-300 text-stone-900 focus:ring-stone-900"
              />
              <span>Allow participants to view live leaderboard</span>
            </label>
          </div>

          <div className="flex items-center justify-end gap-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-stone-200 text-xs font-semibold text-stone-700 hover:bg-stone-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-xl bg-stone-900 text-white text-xs font-semibold hover:bg-stone-800"
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
