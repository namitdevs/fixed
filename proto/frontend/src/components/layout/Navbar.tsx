import React, { useState } from 'react';
import { Shield, Sparkles, Folder, UserCheck, RefreshCw } from 'lucide-react';
import { Case, User } from '../../types';
import { ApiService } from '../../services/api';

interface NavbarProps {
  cases: Case[];
  activeCase: Case | null;
  onSelectCase: (c: Case) => void;
  currentUser: User | null;
  onDemoLoaded: (demoCase: Case) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  cases,
  activeCase,
  onSelectCase,
  currentUser,
  onDemoLoaded,
}) => {
  const [loadingDemo, setLoadingDemo] = useState(false);

  const handleLoadDemo = async () => {
    try {
      setLoadingDemo(true);
      const res = await ApiService.loadTurnkeyDemo();
      if (res.data.success && res.data.data.case) {
        localStorage.setItem('sih_auth_token', res.data.data.token);
        onDemoLoaded(res.data.data.case);
      }
    } catch (err) {
      console.error('Failed to load turnkey demo:', err);
      alert('Error loading demo case. Check server logs.');
    } finally {
      setLoadingDemo(false);
    }
  };

  return (
    <header className="h-16 border-b border-slate-800 bg-slate-900 px-6 flex items-center justify-between sticky top-0 z-30 shadow-md">
      {/* Platform Title */}
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
          <Shield className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <span className="font-bold tracking-wider text-sm text-slate-100 uppercase font-mono">
              Investigation Intelligence Platform
            </span>
            <span className="px-2 py-0.5 text-[10px] font-semibold tracking-wider rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
              SIH 2026
            </span>
          </div>
          <p className="text-xs text-slate-400">Decision-Support & Criminal Network Analytics System</p>
        </div>
      </div>

      {/* Case Selector & Actions */}
      <div className="flex items-center space-x-4">
        {/* Case Switcher */}
        <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 space-x-2">
          <Folder className="w-4 h-4 text-slate-400" />
          <span className="text-xs text-slate-400 font-medium">Case:</span>
          <select
            value={activeCase?.id || ''}
            onChange={(e) => {
              const selected = cases.find((c) => c.id === e.target.value);
              if (selected) onSelectCase(selected);
            }}
            className="bg-transparent text-xs text-slate-200 font-mono focus:outline-none cursor-pointer"
          >
            {cases.length === 0 && <option value="">No Active Cases</option>}
            {cases.map((c) => (
              <option key={c.id} value={c.id} className="bg-slate-900 text-slate-100">
                {c.caseNumber} - {c.title.length > 30 ? c.title.substring(0, 30) + '...' : c.title}
              </option>
            ))}
          </select>
        </div>

        {/* Turnkey Demo Button */}
        <button
          onClick={handleLoadDemo}
          disabled={loadingDemo}
          className="flex items-center space-x-2 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-amber-500/20 to-amber-600/20 border border-amber-500/40 text-amber-300 hover:bg-amber-500/30 transition text-xs font-semibold shadow-sm disabled:opacity-50"
        >
          {loadingDemo ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          )}
          <span>{loadingDemo ? 'Initializing...' : '⚡ 1-Click Demo (Operation Nightfall)'}</span>
        </button>

        {/* User Badge */}
        <div className="flex items-center space-x-2 pl-2 border-l border-slate-800">
          <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300">
            <UserCheck className="w-3.5 h-3.5" />
          </div>
          <div className="text-left hidden md:block">
            <div className="text-xs font-medium text-slate-200">{currentUser?.name || 'Officer'}</div>
            <div className="text-[10px] text-slate-400 font-mono">{currentUser?.role || 'INVESTIGATOR'}</div>
          </div>
        </div>
      </div>
    </header>
  );
};
