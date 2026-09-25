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

  // Fetch overview
  const fetchOverview = async () => {
    try {
      const data = await api.getAdminOverview(adminToken);
      setOverview(data);
    } catch (err: any) {
      console.error('Overview fetch failed:', err);
    } finally {
      setLoading(false);
    }
  };

  // Real-time SSE listener
  useEffect(() => {
    fetchOverview();

    // Setup EventSource for real-time live updates
    const eventSource = new EventSource(`/api/admin/events-stream?token=${adminToken}`);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.overview) {
          setOverview(data.overview);
        }
      } catch (err) {
        // Heartbeat or parse error
      }
    };

    eventSource.onerror = () => {
      // EventSource reconnects automatically
    };

    // Polling fallback every 6s
    const pollTimer = setInterval(fetchOverview, 6000);

    return () => {
      eventSource.close();
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

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-6 sm:py-8">
      {/* Top Banner / Hero */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-stone-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase font-mono tracking-widest text-stone-600 font-semibold">
              TECH TEST
            </span>
            <span className="text-stone-300">·</span>
            <span className="text-xs uppercase font-mono tracking-wider font-semibold text-emerald-800 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
              LIVE QUIZ DASHBOARD
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-stone-900 mt-1">
            Real-Time Examination Control
          </h1>
        </div>

        {/* Quick Actions Bar */}
        <div className="flex items-center flex-wrap gap-2">
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

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-stone-200 shadow-xs">
          <div className="flex items-center justify-between text-stone-600 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Flagged</span>
            <ShieldAlert className="w-4 h-4 text-amber-800" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-amber-800">
            {overview?.flaggedParticipants ?? 0}
          </div>
          <div className="text-[11px] text-stone-600 mt-1 font-medium">Tab-switch violations</div>
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
                <th className="py-3.5 px-4">Participant ID</th>
                <th className="py-3.5 px-4 text-center">Progress</th>
                <th className="py-3.5 px-4 text-center">Score</th>
                <th className="py-3.5 px-4 text-center">Time</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-center">Violations</th>
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
                  return (
                    <tr
                      key={p.id}
                      onClick={() => handleOpenParticipant(p.id)}
                      className="hover:bg-stone-50/80 cursor-pointer transition-colors"
                    >
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-stone-900">{p.name}</div>
                        <div className="text-[11px] text-stone-600 font-normal">
                          {p.department || 'General'}
                          {p.isDemo && (
                            <span className="ml-1.5 text-[10px] text-stone-500 font-mono">
                              (Demo)
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-semibold text-stone-700">
                        {p.participantId}
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono text-stone-700">
                        {p.progressText}
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono font-bold text-stone-900">
                        {p.scoreText}
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono text-stone-600">
                        {p.timeDisplay}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`text-[11px] font-semibold uppercase ${
                            p.status === 'flagged'
                              ? 'text-rose-700'
                              : p.status === 'warning'
                              ? 'text-amber-700'
                              : p.status === 'submitted'
                              ? 'text-stone-800'
                              : 'text-emerald-700'
                          }`}
                        >
                          {p.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono">
                        {p.violations > 0 ? (
                          <span
                            className={`font-bold ${
                              p.violations >= 3 ? 'text-rose-700' : 'text-amber-700'
                            }`}
                          >
                            {p.violations}
                          </span>
                        ) : (
                          <span className="text-stone-500">0</span>
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
            filteredParticipants.map((p) => (
              <div
                key={p.id}
                onClick={() => handleOpenParticipant(p.id)}
                className="p-4 active:bg-stone-50 cursor-pointer transition-colors"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <div className="font-bold text-xs text-stone-900">{p.name}</div>
                    <div className="text-[11px] font-mono text-stone-600">
                      {p.participantId} {p.department && `· ${p.department}`}
                      {p.isDemo && ' (Demo)'}
                    </div>
                  </div>
                  <span
                    className={`text-[10px] font-semibold uppercase ${
                      p.status === 'flagged'
                        ? 'text-rose-700'
                        : p.status === 'warning'
                        ? 'text-amber-700'
                        : p.status === 'submitted'
                        ? 'text-stone-800'
                        : 'text-emerald-700'
                    }`}
                  >
                    {p.status}
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-2 pt-2 border-t border-stone-100 text-center font-mono">
                  <div>
                    <div className="text-[9px] uppercase text-stone-600">Progress</div>
                    <div className="text-xs font-semibold text-stone-900">{p.progressText}</div>
                  </div>
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
                        p.violations > 0 ? 'text-amber-700' : 'text-stone-600'
                      }`}
                    >
                      {p.violations}
                    </div>
                  </div>
                </div>
              </div>
            ))
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
                <span className="text-xs font-bold uppercase tracking-wide text-stone-900 block mt-1">
                  {selectedParticipant.status}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-medium text-stone-600 block">
                  Violations
                </span>
                <span
                  className={`text-lg font-bold font-mono ${
                    selectedParticipant.violations > 0 ? 'text-amber-700' : 'text-stone-900'
                  }`}
                >
                  {selectedParticipant.violations}
                </span>
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
