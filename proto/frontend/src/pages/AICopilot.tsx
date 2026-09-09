import React, { useState } from 'react';
import {
  Bot,
  Sparkles,
  ShieldCheck,
  Terminal,
  CornerDownLeft,
} from 'lucide-react';
import { ApiService } from '../services/api';

interface AICopilotProps {
  caseId: string;
  onFocusEntity?: (entityValue: string) => void;
}

interface CitedEntity {
  id?: string;
  name?: string;
  type?: string;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  method?: string;
  citedEntities?: CitedEntity[];
}

export const AICopilot: React.FC<AICopilotProps> = ({
  caseId,
  onFocusEntity,
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content:
        'I am the AI Investigation Assistant grounded in validated case evidence records and network metrics. Ask questions regarding key entities, transaction patterns, communication surges, or bridge nodes.',
    },
  ]);

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const sampleQueries = [
    'Explain why RAVI SHARMA has high network relevance score',
    'Summarize detected transaction layering and hawala patterns',
    'List all key bridge entities coordinating across clusters',
    'Show communication anomalies and spikes for phone numbers',
  ];

  const handleSend = async (questionText?: string) => {
    const q = questionText || input;

    if (!q.trim() || loading) return;

    const userMsg: Message = {
      role: 'user',
      content: q,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');

    try {
      setLoading(true);

      const res = await ApiService.queryAssistant(caseId, q);
      const data = res.data?.data;

      if (res.data?.success && data) {
        /*
         * Backend may return citedEntities as objects:
         * { id, name, type }
         *
         * Normalize them here so React never attempts to
         * render an object directly.
         */
        const normalizedEntities: CitedEntity[] = Array.isArray(
          data.citedEntities
        )
          ? data.citedEntities.map((ent: unknown) => {
              if (typeof ent === 'string') {
                return {
                  name: ent,
                };
              }

              if (ent && typeof ent === 'object') {
                const entity = ent as {
                  id?: unknown;
                  name?: unknown;
                  type?: unknown;
                };

                return {
                  id:
                    typeof entity.id === 'string'
                      ? entity.id
                      : undefined,
                  name:
                    typeof entity.name === 'string'
                      ? entity.name
                      : typeof entity.id === 'string'
                        ? entity.id
                        : 'Unknown Entity',
                  type:
                    typeof entity.type === 'string'
                      ? entity.type
                      : undefined,
                };
              }

              return {
                name: 'Unknown Entity',
              };
            })
          : [];

        const assistantMsg: Message = {
          role: 'assistant',
          content:
            typeof data.answer === 'string'
              ? data.answer
              : 'The investigation engine returned no readable answer.',
          method:
            typeof data.method === 'string'
              ? data.method
              : typeof data.sourceMethod === 'string'
                ? data.sourceMethod
                : undefined,
          citedEntities: normalizedEntities,
        };

        setMessages((prev) => [...prev, assistantMsg]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content:
              'The investigation engine returned an empty response. Please retry the query.',
          },
        ]);
      }
    } catch (e) {
      console.error('Assistant query error:', e);

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content:
            'Error querying AI Copilot service. Please check network logs.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 text-slate-100 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 bg-slate-900/60 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-2">
          <div className="p-2 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30">
            <Bot className="w-5 h-5" />
          </div>

          <div>
            <h1 className="text-sm font-bold text-slate-100">
              AI Investigation Assistant
            </h1>

            <p className="text-[11px] text-slate-400">
              Deterministic Decision-Support & Evidence Citation Engine
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded bg-slate-800 border border-slate-700 text-[10px] font-mono text-emerald-400">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Strict Evidence Grounding</span>
        </div>
      </div>

      {/* Suggested Queries */}
      <div className="p-3 bg-slate-900/30 border-b border-slate-800/80 flex items-center gap-2 overflow-x-auto shrink-0">
        <span className="text-[10px] uppercase font-mono text-slate-500 shrink-0 flex items-center space-x-1">
          <Sparkles className="w-3 h-3 text-amber-400" />
          <span>Suggested:</span>
        </span>

        {sampleQueries.map((query, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(query)}
            disabled={loading}
            className="text-xs bg-slate-900 hover:bg-slate-800 disabled:opacity-50 border border-slate-800 text-slate-300 px-3 py-1 rounded-full whitespace-nowrap transition"
          >
            {query}
          </button>
        ))}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.map((m, idx) => (
          <div
            key={idx}
            className={`flex ${
              m.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            <div
              className={`max-w-2xl rounded-xl p-4 text-xs leading-relaxed space-y-2 shadow-sm ${
                m.role === 'user'
                  ? 'bg-blue-600 text-white font-medium'
                  : 'bg-slate-900 border border-slate-800 text-slate-200'
              }`}
            >
              {/* Assistant metadata */}
              {m.role === 'assistant' && (
                <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-[10px] font-mono text-slate-400">
                  <span className="flex items-center space-x-1 text-blue-400">
                    <Terminal className="w-3 h-3" />

                    <span>
                      ENGINE:{' '}
                      {m.method || 'VERIFIED_RECORD_EVALUATION'}
                    </span>
                  </span>

                  <span>CONFIDENTIAL</span>
                </div>
              )}

              {/* Message content */}
              <div className="whitespace-pre-wrap font-sans">
                {m.content}
              </div>

              {/* Cited entities */}
              {m.citedEntities &&
                m.citedEntities.length > 0 && (
                  <div className="pt-2 border-t border-slate-800 flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] text-slate-400 font-mono">
                      Cited Entities:
                    </span>

                    {m.citedEntities.map((ent, i) => {
                      const displayName =
                        ent.name || ent.id || 'Unknown Entity';

                      return (
                        <button
                          key={ent.id || `${displayName}-${i}`}
                          onClick={() => {
                            if (onFocusEntity) {
                              onFocusEntity(displayName);
                            }
                          }}
                          className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] font-mono hover:bg-blue-500/20 transition"
                        >
                          {displayName}

                          {ent.type && (
                            <span className="ml-1 text-slate-500">
                              ({ent.type})
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
            </div>
          </div>
        ))}

        {/* Loading */}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-xs text-slate-400 flex items-center space-x-2">
              <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />

              <span>
                Analyzing graph metrics and citing evidence records...
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-4 border-t border-slate-800 bg-slate-900/60 shrink-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask investigation question (e.g., 'What is the role of Ravi Sharma in this network?')..."
            className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
          />

          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition shadow-sm"
          >
            <span>Ask</span>
            <CornerDownLeft className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
};