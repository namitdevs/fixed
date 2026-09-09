import React, { useEffect, useState } from 'react';
import { 
  FolderKanban, 
  Plus, 
  Search, 
  Shield, 
  ChevronRight
} from 'lucide-react';
import { Case } from '../types';
import { ApiService } from '../services/api';

interface CaseRegistryProps {
  onSelectCase: (c: Case) => void;
  onRefreshCases: () => void;
}

export const CaseRegistry: React.FC<CaseRegistryProps> = ({ onSelectCase, onRefreshCases }) => {
  const [cases, setCases] = useState<Case[]>([]);
  const [search, setSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCaseNumber, setNewCaseNumber] = useState('');
  const [newPriority, setNewPriority] = useState('MEDIUM');
  const [newDesc, setNewDesc] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchCases();
  }, [search]);

  const fetchCases = async () => {
    try {
      const res = await ApiService.listCases({ search });
      if (res.data.success && res.data.data.cases) {
        setCases(res.data.data.cases);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateCase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newCaseNumber.trim()) return;

    try {
      setCreating(true);
      const res = await ApiService.createCase({
        title: newTitle,
        caseNumber: newCaseNumber,
        priority: newPriority,
        description: newDesc,
      });

      if (res.data.success) {
        setShowCreateModal(false);
        setNewTitle('');
        setNewCaseNumber('');
        setNewDesc('');
        await fetchCases();
        onRefreshCases();
        onSelectCase(res.data.data.case);
      }
    } catch (err) {
      console.error('Case creation failed:', err);
      alert('Failed to create case. Ensure unique case number.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-950 text-slate-100">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-slate-100 flex items-center space-x-2">
            <FolderKanban className="w-5 h-5 text-blue-400" />
            <span>Investigation Case Registry</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Browse active syndicates, search case records, or initialize a new forensic workspace.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search case # or title..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono"
            />
          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            <span>New Case</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {cases.map((c) => (
          <div
            key={c.id}
            onClick={() => onSelectCase(c)}
            className="bg-slate-900 border border-slate-800 hover:border-blue-500/50 p-5 rounded-xl cursor-pointer transition shadow-sm space-y-3 group"
          >
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 font-bold">
                {c.caseNumber}
              </span>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded uppercase font-mono bg-blue-500/20 text-blue-400">
                {c.priority}
              </span>
            </div>

            <div>
              <h2 className="text-sm font-bold text-slate-100 group-hover:text-blue-300 transition">
                {c.title}
              </h2>
              <p className="text-xs text-slate-400 line-clamp-2 mt-1">
                {c.description || 'No description entered.'}
              </p>
            </div>

            <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400 font-mono">
              <span>{c._count?.graphNodes ?? 0} entities</span>
              <span>{c._count?.documents ?? 0} docs</span>
              <span className="flex items-center space-x-1 text-blue-400 group-hover:translate-x-0.5 transition">
                <span>Open</span>
                <ChevronRight className="w-3 h-3" />
              </span>
            </div>
          </div>
        ))}
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h2 className="text-base font-bold text-slate-100 flex items-center space-x-2">
              <Shield className="w-5 h-5 text-blue-400" />
              <span>Register Investigation Case</span>
            </h2>

            <form onSubmit={handleCreateCase} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Case Number</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. CASE-2026-002"
                  value={newCaseNumber}
                  onChange={(e) => setNewCaseNumber(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-100 font-mono focus:border-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Investigation Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Operation Sandstorm"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-100 focus:border-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Priority</label>
                <select
                  value={newPriority}
                  onChange={(e) => setNewPriority(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-100 font-mono focus:border-blue-500 outline-none"
                >
                  <option value="LOW">LOW</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="HIGH">HIGH</option>
                  <option value="CRITICAL">CRITICAL</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Description / Scope</label>
                <textarea
                  rows={3}
                  placeholder="Summary of evidentiary scope..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-100 focus:border-blue-500 outline-none"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg font-semibold transition"
                >
                  {creating ? 'Registering...' : 'Create Case'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};