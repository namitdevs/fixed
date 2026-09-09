import React from 'react';
import {
  LayoutDashboard,
  FolderKanban,
  FileUp,
  Share2,
  AlertTriangle,
  Clock,
  Bot,
  FileText,
} from 'lucide-react';

export type NavTab =
  | 'dashboard'
  | 'cases'
  | 'ingestion'
  | 'network'
  | 'alerts'
  | 'timeline'
  | 'copilot'
  | 'reports';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  alertCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, onSelectTab, alertCount }) => {
  const navItems = [
    { id: 'dashboard' as NavTab, label: 'Case Overview', icon: LayoutDashboard },
    { id: 'cases' as NavTab, label: 'Case Registry', icon: FolderKanban },
    { id: 'ingestion' as NavTab, label: 'Ingestion Vault', icon: FileUp },
    { id: 'network' as NavTab, label: 'Network Canvas', icon: Share2 },
    { id: 'alerts' as NavTab, label: 'Alerts Triage', icon: AlertTriangle, badge: alertCount },
    { id: 'timeline' as NavTab, label: 'Temporal Timeline', icon: Clock },
    { id: 'copilot' as NavTab, label: 'AI Copilot', icon: Bot },
    { id: 'reports' as NavTab, label: 'Master Dossier', icon: FileText },
  ];

  return (
    <aside className="w-64 border-r border-slate-800 bg-slate-900/60 backdrop-blur-md flex flex-col justify-between p-4 shrink-0">
      <div className="space-y-1">
        <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400 font-mono">
          Investigation Modules
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition ${
                isActive
                  ? 'bg-blue-600 text-white font-semibold shadow-sm'
                  : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
              }`}
            >
              <div className="flex items-center space-x-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge !== undefined && item.badge > 0 && (
                <span
                  className={`px-1.5 py-0.5 text-[10px] rounded-full font-bold ${
                    isActive ? 'bg-white text-blue-600' : 'bg-red-500/20 text-red-400 border border-red-500/30'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Footer Info */}
      <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-lg text-center">
        <div className="text-[11px] text-slate-400 font-medium">Smart India Hackathon 2026</div>
        <div className="text-[10px] text-slate-400 font-mono mt-0.5">Decision-Support Sandbox</div>
      </div>
    </aside>
  );
};
