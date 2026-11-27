import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  FolderOpen,
  FileText,
  Upload,
  FolderPlus,
  Search,
  Sparkles,
  Trash2,
  X,
  HardDrive,
  AlertTriangle,
  Volume2,
  Loader2,
  Plus,
} from 'lucide-react';
import { AuthorizedFileFolder, AuthorizedFileItem, Language, MemoryItem } from '../types';
import {
  deleteAuthorizedFileById,
  explainAuthorizedFileWithZara,
  formatBytes,
  getRealStorageQuotaSummary,
  importDirectoryWithFileSystemApi,
  ingestBrowserFileToAuthorizedVault,
  loadAuthorizedFiles,
  saveAuthorizedFile,
  searchAuthorizedFilesAndMemories,
} from '../services/fileStorageService';
import { audioService } from '../services/audioService';

interface FileManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  memories: MemoryItem[];
  language: Language;
  voiceName?: string;
}

const FOLDERS: Array<'All' | AuthorizedFileFolder> = [
  'All',
  'Work',
  'Documents',
  'Notes',
  'Code',
  'Media',
];

export const FileManagerModal: React.FC<FileManagerModalProps> = ({
  isOpen,
  onClose,
  memories,
  language,
  voiceName,
}) => {
  const [files, setFiles] = useState<AuthorizedFileItem[]>([]);
  const [activeFolder, setActiveFolder] = useState<'All' | AuthorizedFileFolder>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFile, setSelectedFile] = useState<AuthorizedFileItem | null>(null);
  const [explainQuestion, setExplainQuestion] = useState('');
  const [isExplaining, setIsExplaining] = useState(false);
  const [storageInfo, setStorageInfo] = useState<{
    usedBytes: number;
    quotaBytes: number;
    persisted: boolean;
  } | null>(null);
  const [statusNote, setStatusNote] = useState<string | null>(null);
  const [pendingDeleteFile, setPendingDeleteFile] = useState<AuthorizedFileItem | null>(null);

  const [showNewNote, setShowNewNote] = useState(false);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteBody, setNoteBody] = useState('');
  const [noteFolder, setNoteFolder] = useState<AuthorizedFileFolder>('Notes');

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const refreshFiles = async () => {
    const loaded = await loadAuthorizedFiles();
    setFiles(loaded);
    const quota = await getRealStorageQuotaSummary();
    setStorageInfo(quota);
  };

  useEffect(() => {
    if (isOpen) {
      refreshFiles();
      setStatusNote(null);
      setPendingDeleteFile(null);
    }
  }, [isOpen]);

  const unifiedHits = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return searchAuthorizedFilesAndMemories(searchQuery, files, memories);
  }, [searchQuery, files, memories]);

  const visibleFiles = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return files.filter((f) => {
      if (activeFolder !== 'All' && f.folder !== activeFolder) return false;
      if (!q) return true;
      return (
        f.name.toLowerCase().includes(q) ||
        f.folder.toLowerCase().includes(q) ||
        (f.textContent || '').toLowerCase().includes(q) ||
        (f.aiSummary || '').toLowerCase().includes(q)
      );
    });
  }, [files, activeFolder, searchQuery]);

  if (!isOpen) return null;

  const handleUploadFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = e.target.files;
    if (!list || list.length === 0) return;
    let count = 0;
    for (let i = 0; i < list.length; i++) {
      const item = await ingestBrowserFileToAuthorizedVault(
        list[i],
        activeFolder === 'All' ? undefined : activeFolder
      );
      count += 1;
      if (i === 0) setSelectedFile(item);
    }
    e.target.value = '';
    await refreshFiles();
    setStatusNote(`Added ${count} authorized file(s) to Zara Vault.`);
  };

  const handleAuthorizeDirectory = async () => {
    const res = await importDirectoryWithFileSystemApi();
    if (res.cancelled) return;
    if (!res.supported || res.error) {
      setStatusNote(res.error || 'Could not open folder picker.');
      return;
    }
    await refreshFiles();
    if (res.added[0]) setSelectedFile(res.added[0]);
    setStatusNote(`Imported ${res.added.length} authorized file(s) from selected folder.`);
  };

  const handleSaveNewNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteTitle.trim() || !noteBody.trim()) return;
    const cleanName = noteTitle.trim().endsWith('.txt') || noteTitle.trim().endsWith('.md')
      ? noteTitle.trim()
      : `${noteTitle.trim()}.md`;
    const now = Date.now();
    const item: AuthorizedFileItem = {
      id: `note-${now}-${Math.random().toString(36).slice(2, 6)}`,
      name: cleanName,
      folder: noteFolder,
      mimeType: 'text/markdown',
      sizeBytes: new Blob([noteBody]).size,
      textContent: noteBody,
      sourceKind: 'created_note',
      addedAtMs: now,
      updatedAtMs: now,
    };
    await saveAuthorizedFile(item);
    await refreshFiles();
    setSelectedFile(item);
    setNoteTitle('');
    setNoteBody('');
    setShowNewNote(false);
    setStatusNote(`Saved "${item.name}" inside ${item.folder}.`);
  };

  const handleExplainSelected = async () => {
    if (!selectedFile || isExplaining) return;
    setIsExplaining(true);
    try {
      const res = await explainAuthorizedFileWithZara(
        selectedFile,
        language,
        explainQuestion.trim() || undefined
      );
      if (res.ok) {
        const updated: AuthorizedFileItem = {
          ...selectedFile,
          aiSummary: res.explanation,
          updatedAtMs: Date.now(),
        };
        await saveAuthorizedFile(updated);
        setSelectedFile(updated);
        await refreshFiles();
      } else {
        setStatusNote(res.explanation);
      }
    } finally {
      setIsExplaining(false);
    }
  };

  const handleMoveFolder = async (file: AuthorizedFileItem, nextFolder: AuthorizedFileFolder) => {
    const updated: AuthorizedFileItem = {
      ...file,
      folder: nextFolder,
      updatedAtMs: Date.now(),
    };
    await saveAuthorizedFile(updated);
    setSelectedFile(updated);
    await refreshFiles();
    setStatusNote(`Moved "${file.name}" to ${nextFolder}.`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-black/85 backdrop-blur-md">
      <div className="w-full max-w-4xl max-h-[92vh] bg-[#070b14] border border-sky-500/35 rounded-3xl shadow-[0_24px_80px_rgba(2,132,199,0.28)] flex flex-col overflow-hidden text-slate-100">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleUploadFiles}
          className="hidden"
        />

        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-white/10 bg-slate-950/90 gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-sky-500/15 border border-sky-400/40 flex items-center justify-center shrink-0">
              <FolderOpen className="w-4 h-4 text-sky-400" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-bold text-white truncate">
                Smart File &amp; Storage Manager
              </h2>
              <p className="text-[11px] text-slate-400 truncate">
                Authorized Files · Folder Organization · Unified Search · AI File Explainer
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/10 text-slate-300 flex items-center justify-center cursor-pointer shrink-0"
            aria-label="Close File Manager"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Storage Quota & Action Toolbar */}
        <div className="px-4 sm:px-6 py-3 border-b border-white/10 bg-slate-950/60 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs text-slate-300">
              <HardDrive className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="tabular-nums">
                Browser Storage:{' '}
                <strong className="text-white">
                  {storageInfo ? formatBytes(storageInfo.usedBytes) : 'Checking...'}
                </strong>
                {storageInfo && storageInfo.quotaBytes > 0
                  ? ` / ${formatBytes(storageInfo.quotaBytes)}`
                  : ''}
              </span>
              <span className="text-slate-500">·</span>
              <span>{files.length} authorized file(s)</span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="min-h-[38px] px-3 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Add Authorized Files</span>
              </button>
              <button
                type="button"
                onClick={handleAuthorizeDirectory}
                className="min-h-[38px] px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/15 text-slate-100 font-semibold text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <FolderPlus className="w-3.5 h-3.5 text-emerald-400" />
                <span>Authorize Folder</span>
              </button>
              <button
                type="button"
                onClick={() => setShowNewNote((v) => !v)}
                className="min-h-[38px] px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/15 text-slate-100 font-semibold text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-sky-400" />
                <span>New Note</span>
              </button>
            </div>
          </div>

          {/* Search & Folder Tabs */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search across all authorized files AND saved memories..."
                className="w-full min-h-[40px] pl-9 pr-3 rounded-xl bg-slate-900 border border-white/15 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-400"
              />
            </div>
            <div className="flex flex-wrap gap-1">
              {FOLDERS.map((folder) => (
                <button
                  key={folder}
                  type="button"
                  onClick={() => setActiveFolder(folder)}
                  className={`min-h-[36px] px-2.5 rounded-lg text-xs font-semibold border cursor-pointer ${
                    activeFolder === folder
                      ? 'bg-sky-500 text-slate-950 border-sky-400'
                      : 'bg-slate-900 text-slate-300 border-white/10 hover:text-white'
                  }`}
                >
                  {folder}
                </button>
              ))}
            </div>
          </div>

          {statusNote && (
            <div className="px-3 py-2 rounded-xl bg-sky-950/70 border border-sky-400/40 text-xs text-sky-100">
              {statusNote}
            </div>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {showNewNote && (
            <form
              onSubmit={handleSaveNewNote}
              className="p-4 rounded-2xl bg-slate-900 border border-sky-500/40 space-y-2.5"
            >
              <div className="text-xs font-bold text-white">Create Authorized Text / Markdown Note</div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <input
                  type="text"
                  value={noteTitle}
                  onChange={(e) => setNoteTitle(e.target.value)}
                  placeholder="File name (e.g. meeting-notes.md)"
                  className="sm:col-span-2 min-h-[38px] px-3 rounded-xl bg-slate-950 border border-white/15 text-xs text-white"
                />
                <select
                  value={noteFolder}
                  onChange={(e) => setNoteFolder(e.target.value as AuthorizedFileFolder)}
                  className="min-h-[38px] px-2.5 rounded-xl bg-slate-950 border border-white/15 text-xs text-white"
                >
                  <option value="Notes">Notes</option>
                  <option value="Work">Work</option>
                  <option value="Documents">Documents</option>
                  <option value="Code">Code</option>
                </select>
              </div>
              <textarea
                rows={3}
                value={noteBody}
                onChange={(e) => setNoteBody(e.target.value)}
                placeholder="Write content..."
                className="w-full p-3 rounded-xl bg-slate-950 border border-white/15 text-xs text-white resize-none"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewNote(false)}
                  className="min-h-[36px] px-3 rounded-xl text-xs text-slate-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="min-h-[36px] px-4 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs cursor-pointer"
                >
                  Save Note
                </button>
              </div>
            </form>
          )}

          {pendingDeleteFile && (
            <div className="p-4 rounded-2xl bg-rose-950/90 border border-rose-400/70 space-y-2.5">
              <div className="flex items-start gap-2.5 text-rose-100">
                <AlertTriangle className="w-5 h-5 text-rose-300 shrink-0 mt-0.5" />
                <div className="text-xs sm:text-sm leading-relaxed">
                  <strong>Explicit Confirmation Required:</strong> Remove{' '}
                  <span className="font-bold text-white">&ldquo;{pendingDeleteFile.name}&rdquo;</span>{' '}
                  from Zara&apos;s authorized storage vault?
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setPendingDeleteFile(null)}
                  className="min-h-[38px] px-3.5 rounded-xl bg-slate-900 border border-white/15 text-xs font-semibold text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await deleteAuthorizedFileById(pendingDeleteFile.id);
                    if (selectedFile?.id === pendingDeleteFile.id) {
                      setSelectedFile(null);
                    }
                    setPendingDeleteFile(null);
                    await refreshFiles();
                    setStatusNote('File removed after confirmation.');
                  }}
                  className="min-h-[38px] px-3.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-bold text-white cursor-pointer"
                >
                  Confirm Delete File
                </button>
              </div>
            </div>
          )}

          {/* Unified Memory + File Search Results when searching */}
          {searchQuery.trim() && unifiedHits.length > 0 && (
            <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-indigo-400/35 space-y-2">
              <div className="text-xs font-bold text-indigo-300">
                Unified Search Matches (Files &amp; Memories)
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {unifiedHits.slice(0, 6).map((hit) => (
                  <div
                    key={`${hit.kind}-${hit.id}`}
                    className="p-2.5 rounded-xl bg-slate-950 border border-white/10 text-xs"
                  >
                    <div className="font-bold text-white truncate">{hit.title}</div>
                    <div className="text-[10px] text-sky-300">{hit.subtitle}</div>
                    <p className="text-[11px] text-slate-300 mt-1 line-clamp-2">{hit.snippet}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Two-column File List + Inspector */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div className="lg:col-span-5 space-y-2 max-h-[380px] overflow-y-auto pr-1">
              {visibleFiles.length === 0 ? (
                <div className="p-6 rounded-2xl bg-slate-900/60 border border-white/10 text-center space-y-2">
                  <FileText className="w-7 h-7 text-slate-500 mx-auto" />
                  <p className="text-xs text-slate-300 font-semibold">No authorized files yet</p>
                  <p className="text-[11px] text-slate-400">
                    Click &ldquo;Add Authorized Files&rdquo; or &ldquo;New Note&rdquo; so Zara can
                    organize, search, and explain your files safely.
                  </p>
                </div>
              ) : (
                visibleFiles.map((file) => {
                  const active = selectedFile?.id === file.id;
                  return (
                    <div
                      key={file.id}
                      onClick={() => setSelectedFile(file)}
                      className={`p-3 rounded-2xl border flex items-center justify-between gap-2 cursor-pointer transition-colors ${
                        active
                          ? 'bg-sky-950/60 border-sky-400/70'
                          : 'bg-slate-900/75 border-white/10 hover:border-white/25'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-white truncate">{file.name}</div>
                        <div className="text-[10px] text-slate-400">
                          {file.folder} · {formatBytes(file.sizeBytes)}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPendingDeleteFile(file);
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 cursor-pointer shrink-0"
                        title="Delete file (requires confirmation)"
                        aria-label={`Delete ${file.name}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            <div className="lg:col-span-7 p-4 rounded-2xl bg-slate-900/75 border border-white/10 space-y-3">
              {!selectedFile ? (
                <div className="h-full min-h-[220px] flex flex-col items-center justify-center text-center text-slate-400 space-y-1.5">
                  <Sparkles className="w-6 h-6 text-sky-400" />
                  <p className="text-xs font-semibold text-slate-200">
                    Select a file to inspect, organize, or ask Zara to explain it
                  </p>
                </div>
              ) : (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-white/10">
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-white truncate">{selectedFile.name}</h3>
                      <p className="text-[11px] text-slate-400">
                        {selectedFile.mimeType} · {formatBytes(selectedFile.sizeBytes)}
                      </p>
                    </div>
                    <select
                      value={selectedFile.folder}
                      onChange={(e) =>
                        handleMoveFolder(selectedFile, e.target.value as AuthorizedFileFolder)
                      }
                      className="min-h-[34px] px-2.5 rounded-xl bg-slate-950 border border-white/15 text-xs text-white"
                      aria-label="Organize into folder"
                    >
                      <option value="Work">Folder: Work</option>
                      <option value="Documents">Folder: Documents</option>
                      <option value="Notes">Folder: Notes</option>
                      <option value="Code">Folder: Code</option>
                      <option value="Media">Folder: Media</option>
                    </select>
                  </div>

                  {selectedFile.imagePreviewDataUrl && (
                    <img
                      src={selectedFile.imagePreviewDataUrl}
                      alt={selectedFile.name}
                      className="w-full max-h-48 object-contain rounded-xl bg-slate-950 border border-white/10"
                    />
                  )}

                  {selectedFile.textContent && (
                    <pre className="p-3 rounded-xl bg-slate-950 border border-white/10 text-[11px] text-slate-200 max-h-40 overflow-y-auto whitespace-pre-wrap font-mono">
                      {selectedFile.textContent.slice(0, 4000)}
                    </pre>
                  )}

                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      value={explainQuestion}
                      onChange={(e) => setExplainQuestion(e.target.value)}
                      placeholder="Optional question about this file..."
                      className="flex-1 min-h-[40px] px-3 rounded-xl bg-slate-950 border border-white/15 text-xs text-white"
                    />
                    <button
                      type="button"
                      disabled={isExplaining}
                      onClick={handleExplainSelected}
                      className="min-h-[40px] px-4 rounded-xl bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                    >
                      {isExplaining ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Sparkles className="w-4 h-4" />
                      )}
                      <span>Explain with Zara</span>
                    </button>
                  </div>

                  {selectedFile.aiSummary && (
                    <div className="p-3 rounded-xl bg-sky-950/50 border border-sky-400/35 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-sky-300">
                          Zara File Explanation
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            audioService.unlock();
                            audioService.speakText(selectedFile.aiSummary!, {
                              language,
                              voiceName: voiceName || 'Zephyr',
                            });
                          }}
                          className="min-h-[30px] px-2.5 rounded-lg bg-slate-900 border border-white/15 text-[11px] text-sky-200 flex items-center gap-1 cursor-pointer"
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                          <span>Read Aloud</span>
                        </button>
                      </div>
                      <p className="text-xs text-slate-100 leading-relaxed whitespace-pre-wrap">
                        {selectedFile.aiSummary}
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
