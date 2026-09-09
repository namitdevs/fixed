import React, { useEffect, useState } from 'react';
import { 
  Clock, 
  Filter, 
  Calendar, 
  PhoneCall, 
  ArrowRightLeft, 
  Users, 
  MapPin, 
  FileText 
} from 'lucide-react';
import { TimelineEventItem } from '../types';
import { ApiService } from '../services/api';

interface TemporalTimelineProps {
  caseId: string;
  onFocusEntity?: (entityValue: string) => void;
}

export const TemporalTimeline: React.FC<TemporalTimelineProps> = ({
  caseId,
  onFocusEntity,
}) => {
  const [events, setEvents] = useState<TimelineEventItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [eventTypeFilter, setEventTypeFilter] = useState('ALL');

  useEffect(() => {
    fetchTimeline();
  }, [caseId]);

  const fetchTimeline = async () => {
    try {
      setLoading(true);
      const res = await ApiService.getTimeline(caseId);
      if (res.data.success && Array.isArray(res.data.data?.timeline)) {
        setEvents(res.data.data.timeline);
      }
    } catch (e) {
      console.error('Failed to load timeline:', e);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredEvents = events.filter((e) => {
    if (eventTypeFilter !== 'ALL' && e.eventType !== eventTypeFilter) return false;
    return true;
  });

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-950 text-slate-100">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-slate-100 flex items-center space-x-2">
            <Clock className="w-5 h-5 text-cyan-400" />
            <span>Temporal Event Chronology</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Chronologically sequenced evidentiary events (calls, financial transfers, and incidents).
          </p>
        </div>

        <div className="flex items-center space-x-2 bg-slate-900 p-1.5 rounded-xl border border-slate-800">
          <Filter className="w-3.5 h-3.5 text-slate-400 ml-2" />
          {['ALL', 'CALL', 'TRANSACTION', 'INCIDENT'].map((type) => (
            <button
              key={type}
              onClick={() => setEventTypeFilter(type)}
              className={`px-3 py-1 rounded text-xs font-semibold font-mono transition ${
                eventTypeFilter === type ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      <div className="relative pl-6 border-l-2 border-slate-800 space-y-6 ml-4">
        {filteredEvents.length === 0 ? (
          <div className="py-8 text-center text-slate-500 text-xs">
            No temporal events recorded for this case.
          </div>
        ) : (
          filteredEvents.map((event, idx) => (
            <div key={event.id || idx} className="relative group">
              <div className={`absolute -left-[31px] top-1.5 w-3.5 h-3.5 rounded-full border-2 border-slate-950 transition ${
                event.eventType === 'TRANSACTION' ? 'bg-emerald-400' :
                event.eventType === 'CALL' ? 'bg-blue-400' :
                event.eventType === 'INCIDENT' ? 'bg-red-400' : 'bg-cyan-400'
              }`} />

              <div className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl p-4 shadow-sm transition space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <div className="flex items-center space-x-2">
                    {event.eventType === 'CALL' && <PhoneCall className="w-3.5 h-3.5 text-blue-400" />}
                    {event.eventType === 'TRANSACTION' && <ArrowRightLeft className="w-3.5 h-3.5 text-emerald-400" />}
                    {event.eventType === 'INCIDENT' && <FileText className="w-3.5 h-3.5 text-red-400" />}
                    
                    <span className="font-semibold text-xs text-slate-200">{event.title}</span>
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-mono uppercase bg-slate-800 text-slate-400 border border-slate-700">
                      {event.eventType}
                    </span>
                  </div>

                  <div className="text-[11px] font-mono text-slate-400 flex items-center space-x-1">
                    <Calendar className="w-3 h-3" />
                    <span>{new Date(event.timestamp).toLocaleString()}</span>
                  </div>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  {event.description}
                </p>

                <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-800/80 text-[11px] text-slate-400 font-mono">
                  {event.amount !== undefined && (
                    <span className="text-emerald-400 font-bold">
                      Amount: ₹{event.amount.toLocaleString()}
                    </span>
                  )}
                  {event.durationSec !== undefined && (
                    <span>
                      Duration: {event.durationSec}s
                    </span>
                  )}
                  {event.location && (
                    <span className="flex items-center space-x-1">
                      <MapPin className="w-3 h-3 text-purple-400" />
                      <span>{event.location}</span>
                    </span>
                  )}
                  {event.involvedEntities && event.involvedEntities.length > 0 && (
                    <div className="flex items-center space-x-1.5">
                      <Users className="w-3 h-3 text-slate-500" />
                      <div className="flex flex-wrap gap-1">
                        {event.involvedEntities.map((ent, i) => (
                          <span 
                            key={i}
                            onClick={() => onFocusEntity && onFocusEntity(ent)}
                            className="bg-slate-800 hover:bg-slate-700 text-blue-300 px-1.5 py-0.5 rounded cursor-pointer transition text-[10px]"
                          >
                            {ent}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};