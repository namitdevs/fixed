import React, { useState, useEffect } from 'react';
import { Navbar } from './components/layout/Navbar';
import { Sidebar, NavTab } from './components/layout/Sidebar';
import { NetworkGraph } from './components/graph/NetworkGraph';
import { EvidenceDrawer } from './components/evidence/EvidenceDrawer';
import { AlertsPanel } from './components/alerts/AlertsPanel';
import { CaseOverview } from './pages/CaseOverview';
import { IngestionVault } from './pages/IngestionVault';
import { TemporalTimeline } from './pages/TemporalTimeline';
import { AICopilot } from './pages/AICopilot';
import { MasterDossier } from './pages/MasterDossier';
import { CaseRegistry } from './pages/CaseRegistry';
import { ApiService } from './services/api';
import { Case, User, AlertItem } from './types';

class AppErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; message: string }> {
  state = { hasError: false, message: '' };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, message: error?.message || 'Unexpected application error' };
  }

  componentDidCatch(error: Error) {
    console.error('[UI] Unhandled render error:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
          <div className="max-w-lg w-full bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h1 className="text-sm font-bold">Investigation workspace encountered an error</h1>
            <p className="text-xs text-slate-400 mt-2">The application was prevented from going blank. Refresh the page and retry the current operation.</p>
            <p className="text-[10px] text-slate-500 font-mono mt-4 break-words">{this.state.message}</p>
            <button onClick={() => window.location.reload()} className="mt-4 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-semibold">Reload workspace</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function App() {
  const [cases, setCases] = useState<Case[]>([]);
  const [activeCase, setActiveCase] = useState<Case | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Initial load
  useEffect(() => {
    fetchCasesList();
  }, []);

  const fetchCasesList = async () => {
    try {
      setLoading(true);
      const casesRes = await ApiService.listCases();
      if (casesRes.data.success && casesRes.data.data.cases) {
        const loadedCases = casesRes.data.data.cases;
        setCases(loadedCases);
        if (loadedCases.length > 0 && !activeCase) {
          refreshCaseDetails(loadedCases[0].id);
        }
      }
    } catch (err) {
      console.error('Initial load failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const refreshCaseDetails = async (caseId: string) => {
    try {
      const res = await ApiService.getCaseById(caseId);
      if (res.data.success && res.data.data.case) {
        setActiveCase(res.data.data.case);
      }
    } catch (e) {
      console.error('Failed to fetch case details:', e);
    }
  };

  // Fetch alerts when activeCase changes
  useEffect(() => {
    if (!activeCase) return;
    refreshAlerts();
  }, [activeCase?.id]);

  const refreshAlerts = async () => {
    if (!activeCase) return;
    try {
      const res = await ApiService.listAlerts(activeCase.id);
      if (res.data.success && res.data.data.alerts) {
        setAlerts(res.data.data.alerts);
      }
    } catch (e) {
      console.error('Failed to load alerts:', e);
    }
  };

  const handleDemoLoaded = (demoCase: Case) => {
    setCases((prev) => {
      const exists = prev.find((c) => c.id === demoCase.id);
      if (exists) return prev.map((c) => (c.id === demoCase.id ? demoCase : c));
      return [demoCase, ...prev];
    });
    refreshCaseDetails(demoCase.id);
    setCurrentTab('dashboard');
    refreshAlerts();
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-950 text-slate-100">
      <Navbar
        cases={cases}
        activeCase={activeCase}
        onSelectCase={(c) => {
          refreshCaseDetails(c.id);
          setSelectedNodeId(null);
          setSelectedEdgeId(null);
        }}
        currentUser={currentUser}
        onDemoLoaded={handleDemoLoaded}
      />

      <div className="flex flex-1 overflow-hidden relative">
        <Sidebar
          currentTab={currentTab}
          onSelectTab={(tab) => setCurrentTab(tab)}
          alertCount={alerts.filter((a) => a.status === 'ACTIVE').length}
        />

        <main className="flex-1 flex flex-col overflow-hidden relative">
          {!activeCase ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 space-y-4">
              <p className="text-sm font-medium">No active investigation case selected.</p>
              <button
                onClick={() => {
                  ApiService.loadTurnkeyDemo().then((res) => {
                    if (res.data.success && res.data.data.case) {
                      localStorage.setItem('sih_auth_token', res.data.data.token);
                      handleDemoLoaded(res.data.data.case);
                    }
                  });
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow-sm transition"
              >
                Load Demo Case: Operation Nightfall
              </button>
            </div>
          ) : (
            <>
              {currentTab === 'dashboard' && (
                <CaseOverview
                  caseItem={activeCase}
                  onNavigate={(tab) => setCurrentTab(tab)}
                  onRefreshCase={() => refreshCaseDetails(activeCase.id)}
                />
              )}

              {currentTab === 'cases' && (
                <CaseRegistry
                  onSelectCase={(c) => {
                    refreshCaseDetails(c.id);
                    setCurrentTab('dashboard');
                  }}
                  onRefreshCases={fetchCasesList}
                />
              )}

              {currentTab === 'ingestion' && (
                <IngestionVault
                  caseId={activeCase.id}
                  onRefreshStats={() => refreshCaseDetails(activeCase.id)}
                />
              )}

              {currentTab === 'network' && (
                <NetworkGraph
                  caseId={activeCase.id}
                  onSelectNode={(nodeId) => {
                    setSelectedNodeId(nodeId);
                    setSelectedEdgeId(null);
                  }}
                  onSelectEdge={(edgeId) => {
                    setSelectedEdgeId(edgeId);
                    setSelectedNodeId(null);
                  }}
                />
              )}

              {currentTab === 'alerts' && (
                <AlertsPanel
                  caseId={activeCase.id}
                  alerts={alerts}
                  onRefreshAlerts={refreshAlerts}
                  onFocusNode={(nodeId) => {
                    setSelectedNodeId(nodeId);
                    setSelectedEdgeId(null);
                    setCurrentTab('network');
                  }}
                />
              )}

              {currentTab === 'timeline' && (
                <TemporalTimeline
                  caseId={activeCase.id}
                  onFocusEntity={(entity) => {
                    setCurrentTab('network');
                  }}
                />
              )}

              {currentTab === 'copilot' && (
                <AICopilot
                  caseId={activeCase.id}
                  onFocusEntity={(entity) => {
                    setCurrentTab('network');
                  }}
                />
              )}

              {currentTab === 'reports' && (
                <MasterDossier
                  caseItem={activeCase}
                />
              )}
            </>
          )}

          {/* Slide-over Evidence Drawer */}
          {activeCase && (
            <EvidenceDrawer
              caseId={activeCase.id}
              selectedNodeId={selectedNodeId}
              selectedEdgeId={selectedEdgeId}
              onClose={() => {
                setSelectedNodeId(null);
                setSelectedEdgeId(null);
              }}
              onSelectConnectedNode={(nodeId) => {
                setSelectedNodeId(nodeId);
                setSelectedEdgeId(null);
              }}
            />
          )}
        </main>
      </div>
    </div>
  );
}

export default function AppWithErrorBoundary() {
  return <AppErrorBoundary><App /></AppErrorBoundary>;
}
