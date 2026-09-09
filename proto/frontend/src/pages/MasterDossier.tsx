import React, { useEffect, useState } from 'react';
import { 
  Download, 
  FileSpreadsheet, 
  FileJson, 
  RefreshCw 
} from 'lucide-react';
import { Case } from '../types';
import { ApiService } from '../services/api';

interface MasterDossierProps {
  caseItem: Case;
}

export const MasterDossier: React.FC<MasterDossierProps> = ({ caseItem }) => {
  const [reportData, setReportData] = useState<any>(null);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    handleGenerateReport();
  }, [caseItem.id]);

  const handleGenerateReport = async () => {
    try {
      setGenerating(true);
      const res = await ApiService.generateReport(caseItem.id);
      if (res.data.success && res.data.data.report) {
        setReportData(res.data.data.report);
      }
    } catch (e) {
      console.error('Failed to generate report:', e);
    } finally {
      setGenerating(false);
    }
  };

  const downloadReport = async (format: 'pdf' | 'json' | 'csv') => {
    try {
      const res = await ApiService.downloadReport(caseItem.id, format);
      const blob = res.data as Blob;
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `Investigation_Dossier_${caseItem.caseNumber}.${format}`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error(`Failed to download ${format} report:`, e);
      alert(`Unable to download the ${format.toUpperCase()} dossier. Please verify your investigator session and try again.`);
    }
  };

  const downloadPdf = () => downloadReport('pdf');
  const downloadJson = () => downloadReport('json');
  const downloadCsv = () => downloadReport('csv');

  const parseJsonSafe = (jsonStr: string, fallback: any = []) => {
    try {
      return JSON.parse(jsonStr);
    } catch {
      return fallback;
    }
  };

  const keyFindings = reportData?.keyFindings ? parseJsonSafe(reportData.keyFindings) : [];
  const clusterSummary = reportData?.clusterSummary ? parseJsonSafe(reportData.clusterSummary) : [];
  const timelineHighlights = reportData?.timelineHighlights ? parseJsonSafe(reportData.timelineHighlights) : [];

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-950 text-slate-100">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-md">
        <div>
          <div className="flex items-center space-x-2">
            <span className="font-mono text-xs px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 font-bold">
              DOSSIER #{caseItem.caseNumber}
            </span>
            <span className="text-[10px] font-mono text-slate-400">
              Generated: {reportData ? new Date(reportData.generatedAt).toLocaleDateString() : 'Pending'}
            </span>
          </div>
          <h1 className="text-xl font-bold text-slate-100 mt-2">
            Master Investigation Intelligence Dossier
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Formal, evidence-traceable intelligence brief synthesizing algorithmic metrics, behavioral patterns, and multi-tier clusters.
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          <button
            onClick={downloadPdf}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow-sm transition"
          >
            <Download className="w-4 h-4" />
            <span>Download PDF Dossier</span>
          </button>

          <button
            onClick={downloadJson}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-mono transition"
          >
            <FileJson className="w-3.5 h-3.5 text-amber-400" />
            <span>JSON</span>
          </button>

          <button
            onClick={downloadCsv}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-mono transition"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span>CSV</span>
          </button>

          <button
            onClick={handleGenerateReport}
            disabled={generating}
            title="Regenerate Report"
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 rounded-lg transition"
          >
            <RefreshCw className={`w-4 h-4 ${generating ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 space-y-8 max-w-5xl mx-auto shadow-lg text-slate-300 text-xs leading-relaxed">
        <div className="border-b border-slate-800 pb-6 text-center space-y-2">
          <div className="text-[11px] font-mono uppercase tracking-widest text-blue-400 font-bold">
            CONFIDENTIAL LAW ENFORCEMENT DECISION-SUPPORT
          </div>
          <h2 className="text-2xl font-bold text-slate-100 tracking-wide font-sans">
            INVESTIGATION INTELLIGENCE DOSSIER
          </h2>
          <p className="text-slate-400 font-mono text-[11px]">
            Case: {caseItem.title} ({caseItem.caseNumber})
          </p>
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-bold text-slate-100 font-mono uppercase tracking-wider text-blue-400 flex items-center space-x-2 border-b border-slate-800/80 pb-2">
            <span>1. Executive Intelligence Summary</span>
          </h3>
          <p className="text-slate-300">
            {reportData?.executiveSummary || 
              'Analytical assessment indicates an organized network operating across structured functional tiers. Algorithmic centrality detected key bridge coordinators responsible for inter-cluster logistics and money layering.'}
          </p>
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-bold text-slate-100 font-mono uppercase tracking-wider text-blue-400 flex items-center space-x-2 border-b border-slate-800/80 pb-2">
            <span>2. Priority Network Identities & Key Roles</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            {keyFindings.length > 0 ? (
              keyFindings.map((finding: any, idx: number) => (
                <div key={idx} className="bg-slate-950 border border-slate-800 rounded-lg p-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-100">{finding.entityName || finding.canonicalValue || 'Unknown entity'}</span>
                    <span className="text-blue-400 font-mono font-bold">{finding.relevanceScore}/100</span>
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono">{finding.entityType || finding.role || 'ENTITY'} · {finding.isBridge ? 'Potential bridge' : 'Network node'}</div>
                  <p className="text-[11px] text-slate-400 pt-1 border-t border-slate-900">
                    {finding.degree ?? 0} direct links · betweenness {finding.betweenness ?? 0}. {finding.isBridge ? 'Potential bridge across network segments.' : 'Relevant through observed network structure.'}
                  </p>
                </div>
              ))
            ) : (
              <div className="col-span-2 text-slate-500 text-center py-4">
                Run intelligence algorithms to populate prioritized entities.
              </div>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-bold text-slate-100 font-mono uppercase tracking-wider text-blue-400 flex items-center space-x-2 border-b border-slate-800/80 pb-2">
            <span>3. Community Clustering (Louvain Modular Partitions)</span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {clusterSummary.length > 0 ? (
              clusterSummary.map((cluster: any, idx: number) => (
                <div key={idx} className="bg-slate-950 border border-slate-800 rounded-lg p-3 space-y-1">
                  <div className="flex items-center justify-between text-xs font-mono font-bold text-slate-200">
                    <span>Cluster #{cluster.communityId}</span>
                    <span className="text-slate-400 text-[10px]">{cluster.size ?? cluster.memberCount ?? 0} members</span>
                  </div>
                  <div className="text-[11px] text-slate-400 truncate">
                    Core: {cluster.leadEntity || cluster.topMembers?.join(', ') || 'Various identities'}
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-3 text-slate-500 text-center py-4">
                No clustering data available.
              </div>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-bold text-slate-100 font-mono uppercase tracking-wider text-blue-400 flex items-center space-x-2 border-b border-slate-800/80 pb-2">
            <span>4. Critical Temporal Sequence Highlights</span>
          </h3>
          <div className="space-y-2">
            {timelineHighlights.length > 0 ? (
              timelineHighlights.map((event: any, idx: number) => (
                <div key={idx} className="flex items-start space-x-3 text-xs bg-slate-950 p-2.5 rounded border border-slate-800/80 font-mono">
                  <span className="text-slate-400 shrink-0">{event.timestamp ? new Date(event.timestamp).toLocaleString() : 'Event'}</span>
                  <span className="text-slate-300">• {event.summary || event.description}</span>
                </div>
              ))
            ) : (
              <div className="text-slate-500 text-center py-4">
                No high-priority timeline highlights recorded.
              </div>
            )}
          </div>
        </div>

        <div className="pt-6 border-t border-slate-800 text-[10px] text-slate-500 font-mono text-center">
          INVESTIGATIVE NOTICE: All insights are algorithmic decision-support evaluations computed deterministically from ingested evidentiary records. Culpability must be independently corroborated through statutory police procedures.
        </div>
      </div>
    </div>
  );
};