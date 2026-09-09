import React, { useEffect, useRef, useState } from 'react';
import cytoscape, { Core } from 'cytoscape';
// @ts-ignore
import coseBilkent from 'cytoscape-cose-bilkent';
import { ZoomIn, ZoomOut, Maximize2, RefreshCw, Filter, Search } from 'lucide-react';
import { ApiService } from '../../services/api';

try {
  cytoscape.use(coseBilkent);
} catch (e) {}

interface NetworkGraphProps {
  caseId: string;
  onSelectNode: (nodeId: string) => void;
  onSelectEdge: (edgeId: string) => void;
  highlightNodeId?: string | null;
}

export const NetworkGraph: React.FC<NetworkGraphProps> = ({
  caseId,
  onSelectNode,
  onSelectEdge,
  highlightNodeId,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<Core | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLayout, setSelectedLayout] = useState('cose-bilkent');
  const [activeFilters, setActiveFilters] = useState<string[]>([
    'PERSON',
    'PHONE',
    'VEHICLE',
    'ACCOUNT',
    'LOCATION',
  ]);

  const fetchAndRenderGraph = async () => {
    if (!caseId || !containerRef.current) return;
    setLoading(true);

    try {
      const res = await ApiService.getGraph(caseId, {
        entityTypes: activeFilters,
        limit: 250,
      });

      const elements = res.data.data.elements;

      if (cyRef.current) {
        cyRef.current.destroy();
      }

      const cy = cytoscape({
        container: containerRef.current,
        elements,
        boxSelectionEnabled: false,
        autounselectify: false,
        style: [
          // Base Node Style
          {
            selector: 'node',
            style: {
              label: 'data(label)',
              color: '#f8fafc',
              'font-size': '10px',
              'font-family': 'Inter, sans-serif',
              'text-valign': 'bottom',
              'text-margin-y': 4,
              width: (ele: any) => Math.min(48, Math.max(22, 22 + (ele.data('degree') || 0) * 2.5)),
              height: (ele: any) => Math.min(48, Math.max(22, 22 + (ele.data('degree') || 0) * 2.5)),
              'background-color': '#64748b',
              'border-width': 2,
              'border-color': '#0f172a',
            },
          },
          // Node Colors by EntityType
          {
            selector: 'node[entityType = "PERSON"]',
            style: {
              'background-color': '#3b82f6',
              'border-color': '#1d4ed8',
            },
          },
          {
            selector: 'node[entityType = "PHONE"]',
            style: {
              'background-color': '#10b981',
              'border-color': '#047857',
            },
          },
          {
            selector: 'node[entityType = "VEHICLE"]',
            style: {
              'background-color': '#f59e0b',
              'border-color': '#b45309',
            },
          },
          {
            selector: 'node[entityType = "ACCOUNT"]',
            style: {
              'background-color': '#8b5cf6',
              'border-color': '#6d28d9',
            },
          },
          {
            selector: 'node[entityType = "LOCATION"]',
            style: {
              'background-color': '#f43f5e',
              'border-color': '#be123c',
            },
          },
          // Potential Bridge Highlight
          {
            selector: 'node[?isPotentialBridge]',
            style: {
              'border-width': 4,
              'border-color': '#eab308',
            },
          },
          // Base Edge Style
          {
            selector: 'edge',
            style: {
              label: 'data(label)',
              'font-size': '8px',
              'font-family': 'JetBrains Mono, monospace',
              color: '#94a3b8',
              'text-rotation': 'autorotate',
              'text-margin-y': -4,
              'curve-style': 'bezier',
              'target-arrow-shape': 'triangle',
              'target-arrow-color': '#475569',
              'line-color': '#334155',
              width: (ele: any) => Math.min(6, Math.max(1.5, (ele.data('weight') || 1) > 1000 ? 4 : 1.5)),
            },
          },
          // Highlight Selected
          {
            selector: ':selected',
            style: {
              'border-width': 4,
              'border-color': '#38bdf8',
              'line-color': '#38bdf8',
              'target-arrow-color': '#38bdf8',
            },
          },
        ],
        layout: {
          name: selectedLayout === 'cose-bilkent' ? 'cose' : selectedLayout,
          animate: false,
          padding: 30,
        } as any,
      });

      cy.on('tap', 'node', (evt) => {
        const nodeId = evt.target.id();
        onSelectNode(nodeId);
      });

      cy.on('tap', 'edge', (evt) => {
        const edgeId = evt.target.id();
        onSelectEdge(edgeId);
      });

      cyRef.current = cy;
    } catch (err) {
      console.error('Graph render failed:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAndRenderGraph();
  }, [caseId, selectedLayout, activeFilters]);

  // Focus on highlighted node if set
  useEffect(() => {
    if (highlightNodeId && cyRef.current) {
      const ele = cyRef.current.$id(highlightNodeId);
      if (ele && ele.length > 0) {
        cyRef.current.animate({
          center: { eles: ele },
          zoom: 1.8,
          duration: 400,
        });
        ele.select();
      }
    }
  }, [highlightNodeId]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim() || !cyRef.current) return;

    const matched = cyRef.current.nodes().filter((n) =>
      n.data('label').toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (matched.length > 0) {
      cyRef.current.animate({
        center: { eles: matched[0] },
        zoom: 1.6,
        duration: 400,
      });
      matched[0].select();
      onSelectNode(matched[0].id());
    }
  };

  const toggleFilter = (type: string) => {
    setActiveFilters((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  return (
    <div className="relative w-full h-full bg-slate-950 flex flex-col overflow-hidden">
      {/* Top Controls Toolbar */}
      <div className="h-12 border-b border-slate-800/80 bg-slate-900/80 px-4 flex items-center justify-between z-10">
        {/* Entity Filters */}
        <div className="flex items-center space-x-2">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Show:</span>
          {[
            { type: 'PERSON', label: 'Persons', color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
            { type: 'PHONE', label: 'Phones', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
            { type: 'VEHICLE', label: 'Vehicles', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
            { type: 'ACCOUNT', label: 'Accounts', color: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
          ].map((f) => {
            const active = activeFilters.includes(f.type);
            return (
              <button
                key={f.type}
                onClick={() => toggleFilter(f.type)}
                className={`px-2 py-0.5 text-[10px] font-medium rounded-md border transition ${
                  active ? f.color : 'bg-slate-800 text-slate-400 border-slate-700 opacity-40'
                }`}
              >
                {f.label}
              </button>
            );
          })}
        </div>

        {/* Search & Layout Actions */}
        <div className="flex items-center space-x-3">
          <form onSubmit={handleSearch} className="flex items-center bg-slate-950 border border-slate-800 rounded px-2 py-1">
            <Search className="w-3.5 h-3.5 text-slate-400 mr-1.5" />
            <input
              type="text"
              placeholder="Find entity..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent text-xs text-slate-200 focus:outline-none w-28 font-mono"
            />
          </form>

          {/* Layout Selector */}
          <select
            value={selectedLayout}
            onChange={(e) => setSelectedLayout(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-slate-300 text-xs px-2 py-1 rounded focus:outline-none cursor-pointer font-mono"
          >
            <option value="cose-bilkent">Force-Directed</option>
            <option value="concentric">Concentric (Tiers)</option>
            <option value="circle">Circular</option>
            <option value="breadthfirst">Hierarchical</option>
          </select>

          {/* Canvas Controls */}
          <div className="flex items-center space-x-1 border-l border-slate-800 pl-2">
            <button
              onClick={() => cyRef.current?.zoom(cyRef.current.zoom() * 1.25)}
              className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => cyRef.current?.zoom(cyRef.current.zoom() * 0.8)}
              className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => cyRef.current?.fit(undefined, 30)}
              className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
              title="Fit to Screen"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={fetchAndRenderGraph}
              className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
              title="Re-run Graph Layout"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Cytoscape Container */}
      <div ref={containerRef} className="flex-1 w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Loading Overlay */}
      {loading && (
        <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center z-20">
          <div className="flex flex-col items-center space-y-2">
            <RefreshCw className="w-6 h-6 text-blue-400 animate-spin" />
            <span className="text-xs text-slate-300 font-mono">Computing Network Topology...</span>
          </div>
        </div>
      )}
    </div>
  );
};
