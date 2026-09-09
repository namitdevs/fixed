const fs = require('fs');

const caseOverviewCode = \import React, { useEffect, useState } from 'react';
import { 
  FileText, 
  Users, 
  Share2, 
  AlertTriangle, 
  Activity, 
  Play, 
  Database,
  Calendar,
  ShieldCheck
} from 'lucide-react';
import { Case } from '../types';
import { ApiService } from '../services/api';

interface CaseOverviewProps {
  caseItem: Case;
  onNavigate: (tab: any) => void;
  onRefreshCase: () => void;
}

export const CaseOverview: React.FC<CaseOverviewProps> = ({
  caseItem,
  onNavigate,
  onRefreshCase,
}) => {
  const [analytics, setAnalytics] = useState<any>(null);
  const [runningAnalytics, setRunningAnalytics] = useState(false);

  useEffect(() => {
    fetchOverview();
  }, [caseItem.id]);

  const fetchOverview = async () => {
    try {
      const res = await ApiService.getAnalyticsOverview(caseItem.id);
      if (res.data.success) {
        setAnalytics(res.data.data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleRunAnalytics = async () => {
    try {
      setRunningAnalytics(true);
      await ApiService.runAnalytics(caseItem.id);
      await fetchOverview();
      onRefreshCase();
    } catch (e) {
      console.error(e);
    } finally {
      setRunningAnalytics(false);
    }
  };

  const counts = caseItem._count || {};

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-950 text-slate-100">
      {/* Top Header Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <span className="font-mono text-xs px-2.5 py-1 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 font-bold">
              {caseItem.caseNumber}
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase font-mono bg-blue-500/20 text-blue-400 border border-blue-500/30">
              {caseItem.priority} PRIORITY
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase font-mono bg-slate-800 text-slate-300 border border-slate-700">
              {caseItem.status}
            </span>
          </div>
          <h1 className="text-xl font-bold text-slate-100 mt-2">{caseItem.title}</h1>
          <p className="text-xs text-slate-400 mt-1 max-w-3xl leading-relaxed">
            {caseItem.description || 'No detailed case description recorded in registry.'}
          </p>
        </div>

        <div className="flex items-center space-x-3 shrink-0">
          <button
            onClick={handleRunAnalytics}
            disabled={runningAnalytics}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-sm transition"
          >
            <Play className={"w-3.5 h-3.5 " + (runningAnalytics ? "animate-spin" : "")} />
            <span>{runningAnalytics ? 'Running Intelligence...' : 'Run Network Intelligence'}</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
        <div 
          onClick={() => onNavigate('network')}
          className="bg-slate-900 border border-slate-800 hover:border-blue-500/50 cursor-pointer p-4 rounded-xl transition"
        >
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Entities</span>
            <Users className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-mono font-bold text-slate-100 mt-2">
            {counts.graphNodes ?? 0}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            {counts.persons ?? 0} Persons • {counts.phones ?? 0} Phones
          </div>
        </div>

        <div 
          onClick={() => onNavigate('network')}
          className="bg-slate-900 border border-slate-800 hover:border-blue-500/50 cursor-pointer p-4 rounded-xl transition"
        >
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Relationships</span>
            <Share2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-mono font-bold text-slate-100 mt-2">
            {counts.graphEdges ?? 0}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            {counts.calls ?? 0} Calls • {counts.transactions ?? 0} Transfers
          </div>
        </div>

        <div 
          onClick={() => onNavigate('alerts')}
          className="bg-slate-900 border border-slate-800 hover:border-red-500/50 cursor-pointer p-4 rounded-xl transition"
        >
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Alerts</span>
            <AlertTriangle className="w-4 h-4 text-red-400" />
          </div>
          <div className="text-2xl font-mono font-bold text-slate-100 mt-2">
            {counts.alerts ?? 0}
          </div>
          <div className="text-[10px] text-red-400 mt-1">
            Active triaged alerts
          </div>
        </div>

        <div 
          onClick={() => onNavigate('ingestion')}
          className="bg-slate-900 border border-slate-800 hover:border-amber-500/50 cursor-pointer p-4 rounded-xl transition"
        >
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Evidence Files</span>
            <FileText className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-mono font-bold text-slate-100 mt-2">
            {counts.documents ?? 0}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            {counts.evidenceRecords ?? 0} Evidence records
          </div>
        </div>

        <div 
          onClick={() => onNavigate('network')}
          className="bg-slate-900 border border-slate-800 hover:border-purple-500/50 cursor-pointer p-4 rounded-xl transition"
        >
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Bridges</span>
            <Activity className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-mono font-bold text-slate-100 mt-2">
            {analytics?.bridgeCount ?? 0}
          </div>
          <div className="text-[10px] text-purple-400 mt-1">
            High-betweenness hubs
          </div>
        </div>

        <div 
          onClick={() => onNavigate('network')}
          className="bg-slate-900 border border-slate-800 hover:border-cyan-500/50 cursor-pointer p-4 rounded-xl transition"
        >
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Communities</span>
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-mono font-bold text-slate-100 mt-2">
            {analytics?.communityCount ?? 0}
          </div>
          <div className="text-[10px] text-cyan-400 mt-1">
            Louvain clusters
          </div>
        </div>
      </div>

      {/* Analytics Highlights / Summary Table */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Priority Network Bridges */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-200 flex items-center space-x-2">
              <Activity className="w-4 h-4 text-blue-400" />
              <span>Key Bridge Entities (High Centrality)</span>
            </h2>
            <button 
              onClick={() => onNavigate('network')}
              className="text-xs text-blue-400 hover:underline"
            >
              View on Canvas →
            </button>
          </div>

          <div className="divide-y divide-slate-800/80">
            {analytics?.topCentralNodes && analytics.topCentralNodes.length > 0 ? (
              analytics.topCentralNodes.slice(0, 5).map((node: any, idx: number) => (
                <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-semibold text-slate-200">{node.canonicalValue}</div>
                    <div className="text-[11px] text-slate-400">{node.entityType}</div>
                  </div>
                  <div className="text-right font-mono">
                    <div className="text-blue-400 font-bold">Score: {node.networkRelevanceScore}/100</div>
                    <div className="text-[10px] text-slate-400">Degree: {node.degreeCentrality} | Betw: {node.betweennessCentrality}</div>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-6 text-center text-xs text-slate-400">
                Run Network Intelligence to calculate centrality and score bridges.
              </div>
            )}
          </div>
        </div>

        {/* Rapid Actions & Quick Navigation */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-bold text-slate-200 flex items-center space-x-2">
            <Database className="w-4 h-4 text-emerald-400" />
            <span>Investigative Workflow Actions</span>
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => onNavigate('ingestion')}
              className="p-3 bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-lg text-left transition space-y-1"
            >
              <div className="font-semibold text-xs text-slate-200 flex items-center space-x-1.5">
                <FileText className="w-3.5 h-3.5 text-amber-400" />
                <span>Ingest Evidence</span>
              </div>
              <p className="text-[11px] text-slate-400">Upload CDRs, FIRs, bank statements</p>
            </button>

            <button
              onClick={() => onNavigate('network')}
              className="p-3 bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-lg text-left transition space-y-1"
            >
              <div className="font-semibold text-xs text-slate-200 flex items-center space-x-1.5">
                <Share2 className="w-3.5 h-3.5 text-blue-400" />
                <span>Interactive Graph</span>
              </div>
              <p className="text-[11px] text-slate-400">Filter, cluster, and trace evidence</p>
            </button>

            <button
              onClick={() => onNavigate('timeline')}
              className="p-3 bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-lg text-left transition space-y-1"
            >
              <div className="font-semibold text-xs text-slate-200 flex items-center space-x-1.5">
                <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                <span>Temporal Timeline</span>
              </div>
              <p className="text-[11px] text-slate-400">Chronological communication & cash flow</p>
            </button>

            <button
              onClick={() => onNavigate('reports')}
              className="p-3 bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-lg text-left transition space-y-1"
            >
              <div className="font-semibold text-xs text-slate-200 flex items-center space-x-1.5">
                <FileText className="w-3.5 h-3.5 text-emerald-400" />
                <span>Export Dossier</span>
              </div>
              <p className="text-[11px] text-slate-400">Publication-quality PDF dossier</p>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
\;

fs.writeFileSync('d:/proto/frontend/src/pages/CaseOverview.tsx', caseOverviewCode, 'utf8');
console.log('CaseOverview.tsx created');
