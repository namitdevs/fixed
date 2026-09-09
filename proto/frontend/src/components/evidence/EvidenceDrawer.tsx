import React, { useEffect, useState } from 'react';
import { X, FileText, ShieldAlert, Award, ExternalLink, Activity } from 'lucide-react';
import { ApiService } from '../../services/api';

interface EvidenceDrawerProps {
  caseId: string;
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  onClose: () => void;
  onSelectConnectedNode?: (nodeId: string) => void;
}

export const EvidenceDrawer: React.FC<EvidenceDrawerProps> = ({
  caseId,
  selectedNodeId,
  selectedEdgeId,
  onClose,
  onSelectConnectedNode,
}) => {
  const [nodeData, setNodeData] = useState<any>(null);
  const [edgeData, setEdgeData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchDetails = async () => {
      if (!caseId) return;

      if (selectedNodeId) {
        setLoading(true);
        setEdgeData(null);
        try {
          const res = await ApiService.getNode(caseId, selectedNodeId);
          setNodeData(res.data.data.node);
        } catch (e) {
          console.error(e);
        } finally {
          setLoading(false);
        }
      } else if (selectedEdgeId) {
        setLoading(true);
        setNodeData(null);
        try {
          const res = await ApiService.getEdge(caseId, selectedEdgeId);
          setEdgeData(res.data.data.edge);
        } catch (e) {
          console.error(e);
        } finally {
          setLoading(false);
        }
      } else {
        setNodeData(null);
        setEdgeData(null);
      }
    };

    fetchDetails();
  }, [caseId, selectedNodeId, selectedEdgeId]);

  if (!selectedNodeId && !selectedEdgeId) return null;

  const safeJson = <T,>(value: string | null | undefined, fallback: T): T => {
    if (!value) return fallback;
    try { return JSON.parse(value) as T; } catch { return fallback; }
  };

  const metric = nodeData?.metrics?.[0];
  const factors: any[] = safeJson(metric?.relevanceFactors, []);
  const rawValues: string[] = safeJson(nodeData?.rawValues, []);
  const edgeMeta = safeJson<Record<string, any>>(edgeData?.metadata, {});

  return (
    <div className="w-96 border-l border-slate-800 bg-slate-900/95 backdrop-blur-md h-full flex flex-col z-20 shrink-0 shadow-2xl transition-all">
      {/* Header */}
      <div className="h-14 border-b border-slate-800 px-4 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Activity className="w-4 h-4 text-blue-400" />
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-200 font-mono">
            {selectedNodeId ? 'Entity Profile & Evidence' : 'Relationship Traceability'}
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5 text-xs">
        {loading ? (
          <div className="flex justify-center py-10">
            <span className="text-slate-400 font-mono">Retrieving Evidence Records...</span>
          </div>
        ) : selectedNodeId && nodeData ? (
          <>
            {/* Identity Banner */}
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  {nodeData.entityType}
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  Conf: {(nodeData.confidence * 100).toFixed(0)}%
                </span>
              </div>
              <div className="text-base font-bold text-slate-100 font-mono">{nodeData.canonicalValue}</div>
              {rawValues.length > 1 && (
                <div className="text-[11px] text-slate-400">
                  Aliases: <span className="text-slate-300 font-medium">{rawValues.join(', ')}</span>
                </div>
              )}
            </div>

            {/* Relevance Score Gauge */}
            {metric && (
              <div className="p-3 bg-gradient-to-br from-slate-950 to-slate-900 border border-slate-800 rounded-lg space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5 text-amber-400">
                    <Award className="w-4 h-4" />
                    <span className="text-xs font-semibold">Network Relevance Score</span>
                  </div>
                  <span className="text-sm font-bold text-amber-300 font-mono">
                    {metric.networkRelevanceScore} / 100
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-amber-500 to-red-500 rounded-full"
                    style={{ width: `${metric.networkRelevanceScore}%` }}
                  />
                </div>

                {/* Score Contributing Factors */}
                <div className="space-y-1.5 pt-1">
                  <div className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">
                    Contributing Factors:
                  </div>
                  {factors.map((f: any, i: number) => (
                    <div key={i} className="flex justify-between items-start text-[11px] text-slate-300">
                      <span>• {f.description}</span>
                      <span className="text-amber-400 font-mono font-semibold ml-2">+{f.contribution}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Connections Summary */}
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg space-y-2">
              <div className="text-xs font-semibold text-slate-200">Observed Direct Connections</div>
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="p-2 bg-slate-900 rounded border border-slate-800/80">
                  <div className="text-sm font-bold text-blue-400 font-mono">{nodeData.outEdges.length}</div>
                  <div className="text-[10px] text-slate-400">Outgoing Links</div>
                </div>
                <div className="p-2 bg-slate-900 rounded border border-slate-800/80">
                  <div className="text-sm font-bold text-emerald-400 font-mono">{nodeData.inEdges.length}</div>
                  <div className="text-[10px] text-slate-400">Incoming Links</div>
                </div>
              </div>

              {/* Immediate Neighbor List */}
              <div className="space-y-1 pt-1">
                {nodeData.outEdges.slice(0, 5).map((e: any) => (
                  <div
                    key={e.id}
                    onClick={() => onSelectConnectedNode?.(e.targetNode.id)}
                    className="p-1.5 bg-slate-900/60 hover:bg-slate-800 rounded flex items-center justify-between cursor-pointer transition"
                  >
                    <span className="text-[11px] text-slate-300 font-mono">
                      {e.relationshipType} → {e.targetNode.canonicalValue}
                    </span>
                    <ExternalLink className="w-3 h-3 text-slate-400" />
                  </div>
                ))}
              </div>
            </div>

            {/* Source Provenance Box */}
            {nodeData.evidenceRecord && (
              <div className="p-3 bg-slate-950 border border-blue-900/40 rounded-lg space-y-2">
                <div className="flex items-center space-x-1.5 text-blue-400 font-medium">
                  <FileText className="w-3.5 h-3.5" />
                  <span className="text-xs">Underlying Source Evidence</span>
                </div>
                <div className="text-[11px] text-slate-400">
                  Document: <span className="text-slate-200 font-semibold">{nodeData.evidenceRecord.document.originalFilename}</span>
                </div>
                <div className="p-2 bg-slate-900 rounded border border-slate-800 text-[11px] font-mono text-slate-300 leading-relaxed">
                  "{nodeData.evidenceRecord.rawSnippet}"
                </div>
              </div>
            )}
          </>
        ) : selectedEdgeId && edgeData ? (
          <>
            {/* Edge Detail Banner */}
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg space-y-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                {edgeData.relationshipType}
              </span>
              <div className="text-xs text-slate-300 space-y-1 font-mono pt-1">
                <div>Source: <span className="text-blue-400 font-semibold">{edgeData.sourceNode.canonicalValue}</span></div>
                <div>Target: <span className="text-emerald-400 font-semibold">{edgeData.targetNode.canonicalValue}</span></div>
              </div>
            </div>

            {/* Event Metrics */}
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg space-y-2">
              <div className="text-xs font-semibold text-slate-200">Event Parameters</div>
              {edgeData.eventTimestamp && (
                <div className="flex justify-between text-slate-400">
                  <span>Timestamp:</span>
                  <span className="text-slate-200 font-mono">
                    {new Date(edgeData.eventTimestamp).toLocaleString()}
                  </span>
                </div>
              )}
              {edgeMeta.amount && (
                <div className="flex justify-between text-slate-400">
                  <span>Amount Transferred:</span>
                  <span className="text-emerald-400 font-mono font-bold">
                    {edgeMeta.currency || 'INR'} {edgeMeta.amount.toLocaleString()}
                  </span>
                </div>
              )}
              {edgeMeta.durationSec && (
                <div className="flex justify-between text-slate-400">
                  <span>Call Duration:</span>
                  <span className="text-slate-200 font-mono">{edgeMeta.durationSec} seconds</span>
                </div>
              )}
              {edgeMeta.location && (
                <div className="flex justify-between text-slate-400">
                  <span>Location:</span>
                  <span className="text-slate-200">{edgeMeta.location}</span>
                </div>
              )}
            </div>

            {/* Edge Evidence Provenance */}
            {edgeData.evidenceRecord ? (
              <div className="p-3 bg-slate-950 border border-blue-900/40 rounded-lg space-y-2">
                <div className="flex items-center space-x-1.5 text-blue-400 font-medium">
                  <FileText className="w-3.5 h-3.5" />
                  <span className="text-xs">Direct Evidentiary Source</span>
                </div>
                <div className="text-[11px] text-slate-400">
                  Document: <span className="text-slate-200 font-semibold">{edgeData.evidenceRecord.document.originalFilename}</span>
                </div>
                <div className="p-2 bg-slate-900 rounded border border-slate-800 text-[11px] font-mono text-slate-300 leading-relaxed">
                  "{edgeData.evidenceRecord.rawSnippet}"
                </div>
              </div>
            ) : (
              <div className="p-3 bg-slate-950 border border-slate-800 rounded text-slate-400 text-[11px]">
                Inferred across multi-source operational interaction logs.
              </div>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
};
