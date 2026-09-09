import React, { useState } from 'react';
import { AlertTriangle, CheckCircle, Eye, ShieldAlert } from 'lucide-react';
import { AlertItem } from '../../types';
import { ApiService } from '../../services/api';

interface AlertsPanelProps {
  caseId: string;
  alerts: AlertItem[];
  onRefreshAlerts: () => void;
  onFocusNode?: (nodeId: string) => void;
}

export const AlertsPanel: React.FC<AlertsPanelProps> = ({
  caseId,
  alerts,
  onRefreshAlerts,
  onFocusNode,
}) => {
  const [severityFilter, setSeverityFilter] = useState('ALL');

  const handleUpdateStatus = async (alertId: string, status: string) => {
    try {
      await ApiService.updateAlertStatus(caseId, alertId, status);
      onRefreshAlerts();
    } catch (e) {
      console.error(e);
    }
  };

  const filtered = alerts.filter((a) => {
    if (severityFilter !== 'ALL' && a.severity !== severityFilter) return false;
    return true;
  });

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 p-6 overflow-y-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-100 flex items-center space-x-2">
            <ShieldAlert className="w-5 h-5 text-amber-400" />
            <span>Automated Investigation Alerts</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Algorithmic anomaly indicators, transaction layering patterns, and communication surges.
          </p>
        </div>

        {/* Severity Filter */}
        <div className="flex items-center space-x-2">
          {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM'].map((sev) => (
            <button
              key={sev}
              onClick={() => setSeverityFilter(sev)}
              className={`px-3 py-1 rounded text-xs font-semibold font-mono transition ${
                severityFilter === sev
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-900 text-slate-400 hover:bg-slate-800 border border-slate-800'
              }`}
            >
              {sev}
            </button>
          ))}
        </div>
      </div>

      {/* Alert List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="p-8 border border-slate-800 rounded-lg text-center bg-slate-900/40">
            <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto mb-2 opacity-80" />
            <div className="text-sm font-semibold text-slate-300">No Active Alerts Found</div>
            <p className="text-xs text-slate-500 mt-1">
              All detected patterns have been triaged or no anomalies match the current filter.
            </p>
          </div>
        ) : (
          filtered.map((alert) => {
            const isCrit = alert.severity === 'CRITICAL';
            const isHigh = alert.severity === 'HIGH';

            return (
              <div
                key={alert.id}
                className={`p-4 rounded-lg border transition ${
                  isCrit
                    ? 'bg-red-950/20 border-red-900/50 hover:border-red-700/60'
                    : isHigh
                    ? 'bg-amber-950/20 border-amber-900/50 hover:border-amber-700/60'
                    : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1.5 flex-1 pr-4">
                    <div className="flex items-center space-x-2">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider font-mono ${
                          isCrit
                            ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                            : isHigh
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                        }`}
                      >
                        {alert.severity}
                      </span>
                      <span className="text-[11px] font-mono text-slate-400">
                        {alert.alertType}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        • {new Date(alert.createdAt).toLocaleString()}
                      </span>
                    </div>

                    <h4 className="text-sm font-semibold text-slate-100">{alert.title}</h4>
                    <p className="text-xs text-slate-300 leading-relaxed">{alert.description}</p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-2 shrink-0">
                    {alert.involvedNodeIds && alert.involvedNodeIds.length > 0 && (
                      <button
                        onClick={() => onFocusNode?.(alert.involvedNodeIds![0])}
                        className="flex items-center space-x-1 px-2.5 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition"
                        title="Locate on Network Canvas"
                      >
                        <Eye className="w-3.5 h-3.5 text-blue-400" />
                        <span>Inspect</span>
                      </button>
                    )}

                    {alert.status === 'ACTIVE' ? (
                      <button
                        onClick={() => handleUpdateStatus(alert.id, 'ACKNOWLEDGED')}
                        className="px-2.5 py-1.5 rounded bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 text-xs font-medium transition"
                      >
                        Acknowledge
                      </button>
                    ) : (
                      <span className="text-[10px] font-mono text-emerald-400 px-2 py-1 bg-emerald-950/50 rounded border border-emerald-800">
                        ACKNOWLEDGED
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
