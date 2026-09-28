import React, { useState } from 'react';
import {
  Calendar,
  Plus,
  Trash2,
  Edit3,
  Layers,
  CheckCircle,
  ExternalLink,
  Users
} from 'lucide-react';
import { QuizEvent, QuizGame } from '../types';

interface EventManagerProps {
  events: QuizEvent[];
  games: QuizGame[];
  onSaveEvent: (event: Partial<QuizEvent>) => Promise<void>;
  onDeleteEvent: (id: string) => Promise<void>;
  onSelectGame: (gameId: string) => void;
  onOpenCreateGameForEvent: (eventId: string) => void;
}

export const EventManager: React.FC<EventManagerProps> = ({
  events,
  games,
  onSaveEvent,
  onDeleteEvent,
  onSelectGame,
  onOpenCreateGameForEvent
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Partial<QuizEvent> | null>(null);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [eventDate, setEventDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState('');
  const [visibility, setVisibility] = useState<'PUBLIC' | 'PRIVATE' | 'UNLISTED'>('PUBLIC');
  const [status, setStatus] = useState<QuizEvent['status']>('ACTIVE');
  const [organizerName, setOrganizerName] = useState('Lead Host');
  const [organizerEmail, setOrganizerEmail] = useState('host@quizterm.app');
  const [isSaving, setIsSaving] = useState(false);

  const handleOpenCreate = () => {
    setEditingEvent(null);
    setName('');
    setDescription('');
    setEventDate(new Date().toISOString().split('T')[0]);
    setEndDate('');
    setVisibility('PUBLIC');
    setStatus('ACTIVE');
    setOrganizerName('Lead Host');
    setOrganizerEmail('host@quizterm.app');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (evt: QuizEvent) => {
    setEditingEvent(evt);
    setName(evt.name);
    setDescription(evt.description);
    setEventDate(evt.eventDate);
    setEndDate(evt.endDate || '');
    setVisibility(evt.visibility);
    setStatus(evt.status);
    setOrganizerName(evt.organizerInfo?.name || 'Lead Host');
    setOrganizerEmail(evt.organizerInfo?.email || 'host@quizterm.app');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSaving(true);
    try {
      await onSaveEvent({
        id: editingEvent?.id,
        name: name.trim(),
        description: description.trim(),
        eventDate,
        endDate: endDate || undefined,
        visibility,
        status,
        organizerInfo: {
          name: organizerName,
          email: organizerEmail
        }
      });
      setIsModalOpen(false);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="text-xs font-mono text-emerald-400 mb-1">MODULE // 02_EVENT_MANAGEMENT</div>
          <h2 className="text-xl font-bold text-white tracking-tight">Events Management</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Organize multi-game tournaments, bootcamps, and hackathon challenges under single unified events.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="flex items-center space-x-2 px-3.5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs transition-all shadow-md shadow-emerald-500/10 active:scale-95 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Event</span>
        </button>
      </div>

      {/* Events List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {events.map((event) => {
          const eventGames = games.filter(g => g.eventId === event.id);

          return (
            <div
              key={event.id}
              className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden flex flex-col justify-between hover:border-slate-700 transition-all"
            >
              <div>
                {/* Event Cover Banner */}
                {event.coverImage && (
                  <div className="h-28 w-full overflow-hidden relative border-b border-slate-800">
                    <img
                      src={event.coverImage}
                      alt={event.name}
                      className="w-full h-full object-cover opacity-70"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
                    <div className="absolute bottom-2.5 left-4 right-4 flex items-center justify-between">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900/80 backdrop-blur border border-slate-700 text-emerald-400">
                        {event.visibility}
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        {event.status}
                      </span>
                    </div>
                  </div>
                )}

                <div className="p-5 space-y-4">
                  <div>
                    <h3 className="text-base font-bold text-white tracking-tight">{event.name}</h3>
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                      {event.description || 'No description provided.'}
                    </p>
                  </div>

                  <div className="text-xs text-slate-400 font-mono space-y-1">
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>{event.eventDate} {event.endDate ? `to ${event.endDate}` : ''}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                      <span>Host: {event.organizerInfo?.name} ({event.organizerInfo?.email})</span>
                    </div>
                  </div>

                  {/* Associated Games */}
                  <div className="pt-2 border-t border-slate-800/80">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-mono text-slate-400 flex items-center space-x-1.5">
                        <Layers className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Games in this Event ({eventGames.length})</span>
                      </span>
                      <button
                        onClick={() => onOpenCreateGameForEvent(event.id)}
                        className="text-[11px] font-mono text-emerald-400 hover:text-emerald-300 flex items-center space-x-1"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Add Game</span>
                      </button>
                    </div>

                    <div className="space-y-1.5 max-h-36 overflow-y-auto">
                      {eventGames.length === 0 ? (
                        <div className="text-xs text-slate-400 italic py-2">No games created for this event yet.</div>
                      ) : (
                        eventGames.map((g) => (
                          <div
                            key={g.id}
                            onClick={() => onSelectGame(g.id)}
                            className="cursor-pointer p-2 rounded bg-slate-950/70 border border-slate-800/80 hover:border-slate-700 flex items-center justify-between text-xs transition-colors"
                          >
                            <span className="font-medium text-slate-200 truncate pr-2">{g.name}</span>
                            <div className="flex items-center space-x-2 font-mono">
                              <span className="text-emerald-400">{g.joinCode}</span>
                              <span className="text-[10px] text-slate-400 px-1 rounded bg-slate-800">{g.status}</span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Card Actions */}
              <div className="px-5 py-3 bg-slate-950/60 border-t border-slate-800 flex items-center justify-end space-x-2">
                <button
                  onClick={() => handleOpenEdit(event)}
                  className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
                  title="Edit event"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onDeleteEvent(event.id)}
                  className="p-1.5 rounded hover:bg-rose-950/50 text-slate-400 hover:text-rose-400 transition-colors"
                  title="Delete event"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-xl border border-slate-800 bg-[#0d131f] shadow-2xl overflow-hidden animate-in fade-in">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-base font-bold text-white font-mono">
                {editingEvent ? 'EDIT_EVENT' : 'CREATE_EVENT'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-200 text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1">Event Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. SKILL AFRICA 5.0"
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:border-emerald-500 font-sans"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1">Description</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Short description of the event, competition objectives, and audience..."
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:border-emerald-500 font-sans"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono text-slate-300 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-slate-300 mb-1">End Date (Optional)</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono text-slate-300 mb-1">Visibility</label>
                  <select
                    value={visibility}
                    onChange={(e: any) => setVisibility(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-emerald-500 font-mono"
                  >
                    <option value="PUBLIC">PUBLIC</option>
                    <option value="PRIVATE">PRIVATE</option>
                    <option value="UNLISTED">UNLISTED</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-mono text-slate-300 mb-1">Status</label>
                  <select
                    value={status}
                    onChange={(e: any) => setStatus(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-emerald-500 font-mono"
                  >
                    <option value="DRAFT">DRAFT</option>
                    <option value="PUBLISHED">PUBLISHED</option>
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="COMPLETED">COMPLETED</option>
                    <option value="ARCHIVED">ARCHIVED</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono text-slate-300 mb-1">Organizer Name</label>
                  <input
                    type="text"
                    value={organizerName}
                    onChange={(e) => setOrganizerName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-slate-300 mb-1">Organizer Email</label>
                  <input
                    type="email"
                    value={organizerEmail}
                    onChange={(e) => setOrganizerEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-700 text-slate-300 text-xs font-mono hover:bg-slate-800"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs font-mono transition-colors"
                >
                  {isSaving ? 'SAVING...' : 'SAVE_EVENT'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
