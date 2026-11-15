import React, { useEffect, useMemo, useState } from 'react';
import {
  X,
  Plus,
  BookOpen,
  Trash2,
  Lock,
  ShieldCheck,
  Search,
  Pencil,
  Check,
  AlertTriangle,
} from 'lucide-react';
import { MemoryCategory, MemoryItem } from '../types';
import { audioService } from '../services/audioService';
import { formatMemoryAgeBadge } from '../services/scheduleAndMemoryService';
import {
  OwnerAuthSnapshot,
  getOwnerAuthSnapshot,
  signInOwnerWithGoogle,
  subscribeOwnerAuth,
} from '../services/ownerAuthService';

interface MemoriesModalProps {
  isOpen: boolean;
  onClose: () => void;
  memories: MemoryItem[];
  onAddMemory: (memory: Omit<MemoryItem, 'id'>) => void;
  onUpdateMemory?: (id: string, updates: Partial<MemoryItem>) => void;
  onDeleteMemory: (id: string) => void;
}

export const MemoriesModal: React.FC<MemoriesModalProps> = ({
  isOpen,
  onClose,
  memories,
  onAddMemory,
  onUpdateMemory,
  onDeleteMemory,
}) => {
  const [ownerAuth, setOwnerAuth] = useState<OwnerAuthSnapshot>(() => getOwnerAuthSnapshot());
  const [newTitle, setNewTitle] = useState('');
  const [newDetails, setNewDetails] = useState('');
  const [category, setCategory] = useState<MemoryCategory>('memory');
  const [showAddForm, setShowAddForm] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | MemoryCategory>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDetails, setEditDetails] = useState('');
  const [editCategory, setEditCategory] = useState<MemoryCategory>('memory');
  const [confirmDeleteItem, setConfirmDeleteItem] = useState<MemoryItem | null>(null);

  useEffect(() => {
    return subscribeOwnerAuth(setOwnerAuth);
  }, []);

  const filteredMemories = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return memories.filter((m) => {
      if (categoryFilter !== 'all' && m.category !== categoryFilter) return false;
      if (!q) return true;
      return (
        m.title.toLowerCase().includes(q) ||
        m.details.toLowerCase().includes(q) ||
        m.category.toLowerCase().includes(q) ||
        m.date.toLowerCase().includes(q)
      );
    });
  }, [memories, searchQuery, categoryFilter]);

  if (!isOpen) return null;

  const isOwnerVerified = ownerAuth.isOwnerVerified;

  const handleVerifyOwner = async () => {
    setAuthError(null);
    setIsVerifying(true);
    audioService.playChime('tap');
    const res = await signInOwnerWithGoogle();
    setIsVerifying(false);
    if (!res.ok && res.error) {
      setAuthError(res.error);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isOwnerVerified || !newTitle.trim() || !newDetails.trim()) return;

    audioService.playChime('heart');
    onAddMemory({
      title: newTitle.trim(),
      details: newDetails.trim(),
      category,
      date: new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
      createdAtMs: Date.now(),
    });

    setNewTitle('');
    setNewDetails('');
    setShowAddForm(false);
  };

  const startEdit = (m: MemoryItem) => {
    setConfirmDeleteItem(null);
    setEditingId(m.id);
    setEditTitle(m.title);
    setEditDetails(m.details);
    setEditCategory(m.category);
  };

  const saveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId || !editTitle.trim() || !editDetails.trim() || !onUpdateMemory) return;
    audioService.playChime('tap');
    onUpdateMemory(editingId, {
      title: editTitle.trim(),
      details: editDetails.trim(),
      category: editCategory,
    });
    setEditingId(null);
  };

  const formatCategory = (cat: MemoryItem['category']) => {
    if (cat === 'promise') return 'Promise';
    if (cat === 'secret') return 'Secret';
    if (cat === 'preference') return 'Preference';
    if (cat === 'romantic') return 'Personal';
    if (cat === 'routine') return 'Routine';
    return 'Memory';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-lg bg-gradient-to-b from-[#160d2b] to-[#0a0618] border border-pink-500/40 rounded-3xl p-5 shadow-[0_0_40px_rgba(236,72,153,0.3)] max-h-[88vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-purple-900/50 gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-pink-500/20 border border-pink-500/40 flex items-center justify-center text-pink-400 shrink-0">
              <BookOpen className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-1.5 font-cyber truncate">
                Long-Term Memory Vault
              </h2>
              <p className="text-xs text-slate-400 truncate">
                {isOwnerVerified
                  ? `${memories.length} saved memories · Explicit confirmation required to delete`
                  : 'Encrypted & locked to verified App Owner only'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[40px] min-w-[40px] flex items-center justify-center p-2 rounded-full text-slate-400 hover:text-white bg-slate-800/50 hover:bg-slate-800 cursor-pointer shrink-0"
            aria-label="Close Memories"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Filter Bar (Owner verified) */}
        {isOwnerVerified && (
          <div className="pt-3 space-y-2">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search memories, preferences, dates, or past events..."
                className="w-full min-h-[40px] pl-9 pr-3 rounded-xl bg-slate-900/90 border border-purple-500/30 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-pink-400"
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  { id: 'all', label: 'All' },
                  { id: 'preference', label: 'Preferences' },
                  { id: 'memory', label: 'Memories' },
                  { id: 'routine', label: 'Routines' },
                  { id: 'promise', label: 'Promises' },
                  { id: 'secret', label: 'Private' },
                ] as const
              ).map((chip) => (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => setCategoryFilter(chip.id)}
                  className={`min-h-[30px] px-2.5 rounded-lg text-[11px] font-semibold border cursor-pointer whitespace-nowrap ${
                    categoryFilter === chip.id
                      ? 'bg-pink-600 border-pink-400 text-white'
                      : 'bg-slate-900/80 border-white/10 text-slate-300 hover:text-white'
                  }`}
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Content list */}
        <div className="flex-1 overflow-y-auto py-3 space-y-3">
          {!isOwnerVerified ? (
            <div className="p-5 rounded-2xl bg-slate-900/90 border border-amber-500/40 text-center space-y-3">
              <div className="w-12 h-12 mx-auto rounded-full bg-amber-500/15 border border-amber-500/40 flex items-center justify-center text-amber-300">
                <Lock className="w-6 h-6" />
              </div>
              <div className="text-sm font-bold text-white">
                Guest-Safe Lock Active — Private Vault Hidden
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                The App Owner&apos;s private memories and personal preferences are strictly
                protected and inaccessible to other users.
              </p>
              <button
                type="button"
                disabled={isVerifying}
                onClick={handleVerifyOwner}
                className="min-h-[44px] w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white text-xs font-bold flex items-center justify-center gap-2 cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>
                  {isVerifying ? 'Verifying Owner...' : 'Verify Owner with Google to Unlock Vault'}
                </span>
              </button>
              {authError && (
                <div className="text-[11px] text-amber-300 bg-slate-950/80 border border-amber-500/30 rounded-xl p-2">
                  {authError}
                </div>
              )}
            </div>
          ) : (
            <>
              {confirmDeleteItem && (
                <div className="p-3.5 rounded-2xl bg-rose-950/90 border border-rose-400/70 space-y-2.5">
                  <div className="flex items-start gap-2 text-rose-100">
                    <AlertTriangle className="w-4 h-4 text-rose-300 shrink-0 mt-0.5" />
                    <div className="text-xs leading-relaxed">
                      <span className="font-bold">Confirm Memory Deletion:</span> Are you sure you
                      want to permanently delete{' '}
                      <span className="font-semibold text-white">
                        &ldquo;{confirmDeleteItem.title}&rdquo;
                      </span>
                      ? This cannot be undone.
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteItem(null)}
                      className="min-h-[36px] px-3 rounded-xl bg-slate-900 border border-white/15 text-xs font-semibold text-slate-200 cursor-pointer"
                    >
                      Keep Memory
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        audioService.playChime('tap');
                        onDeleteMemory(confirmDeleteItem.id);
                        setConfirmDeleteItem(null);
                      }}
                      className="min-h-[36px] px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-bold text-white cursor-pointer"
                    >
                      Confirm Delete
                    </button>
                  </div>
                </div>
              )}

              {filteredMemories.length === 0 ? (
                <div className="p-6 rounded-2xl bg-slate-900/50 border border-white/10 text-center text-xs text-slate-400">
                  {searchQuery
                    ? `No memories matching "${searchQuery}".`
                    : 'No saved memories in this category yet.'}
                </div>
              ) : (
                filteredMemories.map((m) =>
                  editingId === m.id ? (
                    <form
                      key={m.id}
                      onSubmit={saveEdit}
                      className="p-3.5 rounded-2xl bg-slate-900 border border-sky-400/50 space-y-2"
                    >
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/15 text-white text-xs focus:outline-none focus:border-sky-400"
                      />
                      <textarea
                        rows={2}
                        value={editDetails}
                        onChange={(e) => setEditDetails(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/15 text-white text-xs focus:outline-none focus:border-sky-400 resize-none"
                      />
                      <div className="flex items-center justify-between gap-2">
                        <select
                          value={editCategory}
                          onChange={(e) => setEditCategory(e.target.value as MemoryCategory)}
                          className="px-2 py-1.5 rounded-lg bg-slate-950 text-slate-200 text-xs border border-white/15"
                        >
                          <option value="memory">Memory</option>
                          <option value="preference">Preference</option>
                          <option value="routine">Work / Routine</option>
                          <option value="promise">Promise</option>
                          <option value="romantic">Personal</option>
                          <option value="secret">Secret</option>
                        </select>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            className="min-h-[34px] px-3 rounded-lg text-xs text-slate-300 hover:text-white cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            className="min-h-[34px] px-3 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Save</span>
                          </button>
                        </div>
                      </div>
                    </form>
                  ) : (
                    <div
                      key={m.id}
                      className="p-3.5 rounded-2xl bg-slate-900/70 border border-purple-500/20 hover:border-pink-500/40 transition-all flex items-start justify-between group gap-2"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center flex-wrap gap-2 mb-1">
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${
                              m.category === 'promise' || m.category === 'romantic'
                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                : m.category === 'secret'
                                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                            }`}
                          >
                            {formatCategory(m.category)}
                          </span>
                          <span className="text-xs font-semibold text-pink-200">{m.title}</span>
                          <span className="text-[10px] text-emerald-400 font-mono">
                            {formatMemoryAgeBadge(m.createdAtMs, m.date)}
                          </span>
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed">{m.details}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {onUpdateMemory && (
                          <button
                            type="button"
                            onClick={() => startEdit(m)}
                            className="p-1.5 text-slate-400 hover:text-sky-300 transition-colors cursor-pointer"
                            title="Edit memory"
                            aria-label="Edit memory"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteItem(m)}
                          className="p-1.5 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                          title="Delete memory (requires confirmation)"
                          aria-label="Delete memory"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )
                )
              )}

              {showAddForm ? (
                <form
                  onSubmit={handleSubmit}
                  className="p-3.5 rounded-2xl bg-purple-950/40 border border-pink-500/40 space-y-2.5"
                >
                  <input
                    type="text"
                    placeholder="Title (e.g. Coffee Preference / Project Deadline)"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900/80 border border-purple-500/30 text-white text-xs focus:outline-none focus:border-pink-500"
                  />
                  <textarea
                    placeholder="Write anything important you want Zara to remember long-term..."
                    rows={2}
                    value={newDetails}
                    onChange={(e) => setNewDetails(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900/80 border border-purple-500/30 text-white text-xs focus:outline-none focus:border-pink-500 resize-none"
                  />
                  <div className="flex items-center justify-between gap-2">
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value as MemoryCategory)}
                      className="px-2 py-1.5 rounded-lg bg-slate-900 text-slate-300 text-xs border border-purple-500/30"
                    >
                      <option value="memory">Memory</option>
                      <option value="preference">Preference</option>
                      <option value="routine">Work / Routine</option>
                      <option value="promise">Promise</option>
                      <option value="romantic">Personal</option>
                      <option value="secret">Secret</option>
                    </select>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setShowAddForm(false)}
                        className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-3 py-1.5 rounded-lg text-xs bg-pink-600 hover:bg-pink-500 text-white font-semibold shadow-[0_0_10px_#ec4899] cursor-pointer"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                </form>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    audioService.playChime('tap');
                    setShowAddForm(true);
                  }}
                  className="min-h-[44px] w-full py-2.5 rounded-2xl border border-dashed border-pink-500/40 text-pink-400 hover:bg-pink-500/10 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Save New Long-Term Memory</span>
                </button>
              )}
            </>
          )}
        </div>

        {/* Footer status */}
        <div className="pt-3 border-t border-purple-900/50 flex items-center justify-between text-xs text-slate-400">
          <span className="flex items-center gap-1.5 text-emerald-400">
            <ShieldCheck className="w-3.5 h-3.5" />
            {isOwnerVerified ? '365-Day Owner Vault Active' : 'Guest-Safe Isolation Active'}
          </span>
          <span className="text-[11px] text-pink-400/80 font-mono">
            {isOwnerVerified ? 'OWNER VERIFIED' : 'LOCKED'}
          </span>
        </div>
      </div>
    </div>
  );
};
