import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Check,
  Code2,
  Copy,
  Download,
  FileArchive,
  FileCode2,
  FileText,
  FolderOpen,
  Layers,
  MessageCircle,
  Search,
  X,
} from 'lucide-react';
import { audioService } from '../services/audioService';

interface ExportFileItem {
  path: string;
  category: string;
  isBinary: boolean;
  bytes: number;
  lines: number;
  descriptionHi: string;
}

interface TechStackItem {
  id: string;
  title: string;
  tools: string;
  detailsHi: string;
}

interface ExportManifestResponse {
  appName: string;
  owner: string;
  generatedAt: string;
  totalFiles: number;
  totalCodeFiles: number;
  totalAssetFiles: number;
  totalLines: number;
  totalBytes: number;
  techStack: TechStackItem[];
  downloads: {
    zipUrl: string;
    txtUrl: string;
    htmlUrl: string;
  };
  files: ExportFileItem[];
}

interface ZaraProjectExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type ExportTab = 'download' | 'stack' | 'files';

export const ZaraProjectExportModal: React.FC<ZaraProjectExportModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<ExportTab>('download');
  const [manifest, setManifest] = useState<ExportManifestResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFile, setSelectedFile] = useState<ExportFileItem | null>(null);
  const [selectedFileContent, setSelectedFileContent] = useState<string | null>(null);
  const [loadingFile, setLoadingFile] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const isInIframe = useMemo(() => {
    try {
      return window.self !== window.top;
    } catch {
      return true;
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setLoading(true);
    setErrorMsg(null);

    fetch('/api/export/manifest')
      .then(async (res) => {
        if (!res.ok) throw new Error('Unable to load project file inventory');
        return (await res.json()) as ExportManifestResponse;
      })
      .then((data) => {
        if (!cancelled) {
          setManifest(data);
        }
      })
      .catch((err: any) => {
        if (!cancelled) {
          setErrorMsg(err?.message || 'Failed to load Zara project manifest');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  const baseOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  const zipFullUrl = `${baseOrigin}/api/export/zara-complete-project.zip`;
  const txtFullUrl = `${baseOrigin}/api/export/zara-all-code-a-to-z.txt`;
  const htmlFullUrl = `${baseOrigin}/api/export/zara-blueprint-report.html`;

  const whatsAppShareHref = useMemo(() => {
    const summaryText = [
      'Zara App — Complete A-to-Z Project Files & Source Code',
      `Total Files: ${manifest?.totalFiles ?? 43} | Code Lines: ${manifest?.totalLines?.toLocaleString('en-US') ?? '15,000+'}`,
      '',
      '1) Complete Project ZIP (All Code + Images + Config):',
      zipFullUrl,
      '',
      '2) Single Master File — All Code A to Z (.TXT):',
      txtFullUrl,
      '',
      '3) Offline Readable Blueprint Book (.HTML):',
      htmlFullUrl,
    ].join('\n');
    return `https://wa.me/?text=${encodeURIComponent(summaryText)}`;
  }, [manifest, zipFullUrl, txtFullUrl, htmlFullUrl]);

  const filteredFiles = useMemo(() => {
    const list = manifest?.files || [];
    const q = searchQuery.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (f) =>
        f.path.toLowerCase().includes(q) ||
        f.category.toLowerCase().includes(q) ||
        f.descriptionHi.toLowerCase().includes(q)
    );
  }, [manifest, searchQuery]);

  if (!isOpen) return null;

  const handleCopyText = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      audioService.playChime('tap');
      setTimeout(() => {
        setCopiedKey((prev) => (prev === key ? null : prev));
      }, 2200);
    } catch {
      // ignore clipboard errors on restricted contexts
    }
  };

  const handleOpenSingleFile = async (file: ExportFileItem) => {
    audioService.playChime('tap');
    setSelectedFile(file);
    setSelectedFileContent(null);
    if (file.isBinary) return;

    setLoadingFile(true);
    try {
      const res = await fetch(`/api/export/file?path=${encodeURIComponent(file.path)}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedFileContent(typeof data.content === 'string' ? data.content : '');
      } else {
        setSelectedFileContent('Unable to load file source.');
      }
    } catch {
      setSelectedFileContent('Network error while reading file.');
    } finally {
      setLoadingFile(false);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md">
      <div className="w-full max-w-2xl bg-slate-950 border border-white/15 rounded-3xl p-4 sm:p-5 shadow-2xl max-h-[90vh] flex flex-col gap-3.5 text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 pb-3 border-b border-white/10">
          <div className="min-w-0">
            <h2 className="text-base sm:text-lg font-bold text-white truncate">
              Zara A–Z Complete Files, Tools &amp; Source Code
            </h2>
            <p className="text-xs text-slate-400 tabular-nums mt-0.5 truncate">
              {manifest
                ? `${manifest.totalFiles} Files · ${manifest.totalLines.toLocaleString('en-US')} Lines of Code · ${formatSize(manifest.totalBytes)}`
                : 'शुरू से अब तक की सभी फाइलें, टूल्स और पूरा सोर्स कोड'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/10 text-slate-300 hover:text-white flex items-center justify-center shrink-0 cursor-pointer transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Clean Segmented Navigation Tabs */}
        <div className="grid grid-cols-3 gap-1.5 p-1 rounded-2xl bg-slate-900 border border-white/10">
          <button
            type="button"
            onClick={() => {
              audioService.playChime('tap');
              setSelectedFile(null);
              setActiveTab('download');
            }}
            className={`min-h-[44px] px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
              activeTab === 'download'
                ? 'bg-rose-600 text-white'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
            }`}
          >
            <Download className="w-3.5 h-3.5 shrink-0" />
            <span>पूरी फाइल डाउनलोड</span>
          </button>

          <button
            type="button"
            onClick={() => {
              audioService.playChime('tap');
              setSelectedFile(null);
              setActiveTab('stack');
            }}
            className={`min-h-[44px] px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
              activeTab === 'stack'
                ? 'bg-rose-600 text-white'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
            }`}
          >
            <Layers className="w-3.5 h-3.5 shrink-0" />
            <span>कौन सा टूल लगा है</span>
          </button>

          <button
            type="button"
            onClick={() => {
              audioService.playChime('tap');
              setActiveTab('files');
            }}
            className={`min-h-[44px] px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
              activeTab === 'files'
                ? 'bg-rose-600 text-white'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
            }`}
          >
            <FolderOpen className="w-3.5 h-3.5 shrink-0" />
            <span>सारी फाइलें ({manifest?.totalFiles ?? '...'})</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto pr-0.5 space-y-3">
          {loading && (
            <div className="p-6 rounded-2xl bg-slate-900/70 border border-white/10 text-center text-xs text-slate-300">
              ज़ारा की सभी फाइलें और सोर्स कोड स्कैन किया जा रहा है...
            </div>
          )}

          {errorMsg && (
            <div className="p-4 rounded-2xl bg-rose-950/60 border border-rose-500/40 text-xs text-rose-200">
              {errorMsg}
            </div>
          )}

          {/* TAB 1: DOWNLOAD & SHARE COMPLETE BUNDLE */}
          {!loading && activeTab === 'download' && (
            <div className="space-y-3">
              {/* Summary Metrics */}
              {manifest && (
                <div className="grid grid-cols-3 gap-2">
                  <div className="p-3 rounded-2xl bg-slate-900 border border-white/10">
                    <div className="text-lg font-bold text-white tabular-nums">
                      {manifest.totalFiles}
                    </div>
                    <div className="text-[11px] text-slate-400">कुल फाइलें (Code + Assets)</div>
                  </div>
                  <div className="p-3 rounded-2xl bg-slate-900 border border-white/10">
                    <div className="text-lg font-bold text-emerald-300 tabular-nums">
                      {manifest.totalLines.toLocaleString('en-US')}
                    </div>
                    <div className="text-[11px] text-slate-400">कुल कोड लाइन्स</div>
                  </div>
                  <div className="p-3 rounded-2xl bg-slate-900 border border-white/10">
                    <div className="text-lg font-bold text-sky-300 tabular-nums">
                      {formatSize(manifest.totalBytes)}
                    </div>
                    <div className="text-[11px] text-slate-400">कुल प्रोजेक्ट साइज़</div>
                  </div>
                </div>
              )}

              {/* Option 1: Complete ZIP Bundle */}
              <div className="p-4 rounded-2xl bg-slate-900 border border-white/10 space-y-2.5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-white">
                      1. Complete Zara Project Folder (.ZIP)
                    </h3>
                    <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
                      शुरू से अब तक की सभी सोर्स कोड फाइलें, सर्वर, कंपोनेंट्स, ज़ारा की तस्वीरें, आइकन और A-to-Z गाइड एक ही <strong>.ZIP</strong> फाइल में।
                    </p>
                  </div>
                  <FileArchive className="w-6 h-6 text-emerald-400 shrink-0" />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <a
                    href="/api/export/zara-complete-project.zip"
                    download="Zara-Complete-Project-A-to-Z.zip"
                    onClick={() => audioService.playChime('tap')}
                    className="min-h-[44px] flex-1 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-2 no-underline whitespace-nowrap shrink-0 transition-colors"
                  >
                    <Download className="w-4 h-4 shrink-0" />
                    <span>Download Complete Project (.ZIP)</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => handleCopyText(zipFullUrl, 'zip')}
                    className="min-h-[44px] px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/10 text-xs font-semibold text-slate-200 flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    {copiedKey === 'zip' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Link</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Option 2: Single Master TXT File (Opens directly on any mobile phone without Unzip!) */}
              <div className="p-4 rounded-2xl bg-slate-900 border border-white/10 space-y-2.5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-white">
                      2. Single Master File — All Code A to Z (.TXT)
                    </h3>
                    <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
                      बिना Unzip किए किसी भी मोबाइल में सीधा खुलने वाली एक मास्टर फाइल — इसमें सभी टूल्स की जानकारी + हर फाइल का 100% पूरा कोड एक साथ लिखा है।
                    </p>
                  </div>
                  <FileText className="w-6 h-6 text-rose-400 shrink-0" />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <a
                    href="/api/export/zara-all-code-a-to-z.txt"
                    download="Zara-All-Files-Code-A-to-Z.txt"
                    onClick={() => audioService.playChime('tap')}
                    className="min-h-[44px] flex-1 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center justify-center gap-2 no-underline whitespace-nowrap shrink-0 transition-colors"
                  >
                    <Download className="w-4 h-4 shrink-0" />
                    <span>Download All Code Master File (.TXT)</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => handleCopyText(txtFullUrl, 'txt')}
                    className="min-h-[44px] px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/10 text-xs font-semibold text-slate-200 flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    {copiedKey === 'txt' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Link</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Option 3: Offline Readable HTML Blueprint Book + WhatsApp Share */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <a
                  href="/api/export/zara-blueprint-report.html"
                  download="Zara-Complete-Blueprint-A-to-Z.html"
                  onClick={() => audioService.playChime('tap')}
                  className="min-h-[48px] px-4 py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-white/15 text-sky-200 text-xs font-semibold flex items-center justify-center gap-2 no-underline whitespace-nowrap transition-colors"
                >
                  <FileCode2 className="w-4 h-4 text-sky-400 shrink-0" />
                  <span>Download Offline Code Book (.HTML)</span>
                </a>

                <a
                  href={whatsAppShareHref}
                  target={isInIframe ? '_top' : '_self'}
                  rel="noopener noreferrer"
                  onClick={() => audioService.playChime('tap')}
                  className="min-h-[48px] px-4 py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-emerald-500/40 text-emerald-200 text-xs font-semibold flex items-center justify-center gap-2 no-underline whitespace-nowrap transition-colors"
                >
                  <MessageCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Send All File Links on WhatsApp</span>
                </a>
              </div>
            </div>
          )}

          {/* TAB 2: COMPLETE TOOLS & ARCHITECTURE A-TO-Z */}
          {!loading && activeTab === 'stack' && (
            <div className="space-y-2.5">
              {(manifest?.techStack || []).map((item) => (
                <div
                  key={item.id}
                  className="p-3.5 rounded-2xl bg-slate-900 border border-white/10 space-y-1.5"
                >
                  <h3 className="text-sm font-bold text-white">{item.title}</h3>
                  <div className="text-[11px] font-mono text-emerald-300 break-words">
                    {item.tools}
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">{item.detailsHi}</p>
                </div>
              ))}
            </div>
          )}

          {/* TAB 3: INTERACTIVE FILE & FULL SOURCE CODE BROWSER */}
          {!loading && activeTab === 'files' && !selectedFile && (
            <div className="space-y-2.5">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="फाइल खोजें (जैसे server.ts, App.tsx, audioService, ZaraLivingBackground)..."
                  className="w-full min-h-[44px] pl-10 pr-3 py-2 rounded-xl bg-slate-900 border border-white/15 text-xs text-white placeholder:text-slate-400 focus:outline-none focus:border-rose-400"
                />
              </div>

              <div className="space-y-1.5">
                {filteredFiles.map((file) => (
                  <button
                    key={file.path}
                    type="button"
                    onClick={() => handleOpenSingleFile(file)}
                    className="w-full text-left p-3 rounded-2xl bg-slate-900 hover:bg-slate-800/90 border border-white/10 flex items-center justify-between gap-3 cursor-pointer transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Code2 className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                        <span className="text-xs font-mono font-semibold text-white truncate">
                          {file.path}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">
                        {file.descriptionHi}
                      </p>
                    </div>
                    <div className="text-right text-[11px] text-slate-300 font-mono tabular-nums shrink-0">
                      <div>{file.isBinary ? 'Asset' : `${file.lines} lines`}</div>
                      <div className="text-slate-500">{formatSize(file.bytes)}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* SINGLE FILE SOURCE CODE VIEWER */}
          {!loading && activeTab === 'files' && selectedFile && (
            <div className="space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-2xl bg-slate-900 border border-white/10">
                <div className="flex items-center gap-2 min-w-0">
                  <button
                    type="button"
                    onClick={() => setSelectedFile(null)}
                    className="min-h-[40px] px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>All Files</span>
                  </button>
                  <div className="min-w-0">
                    <div className="text-xs font-mono font-bold text-white truncate">
                      {selectedFile.path}
                    </div>
                    <div className="text-[11px] text-slate-400 tabular-nums truncate">
                      {selectedFile.isBinary
                        ? `Binary Asset · ${formatSize(selectedFile.bytes)}`
                        : `${selectedFile.lines} lines · ${formatSize(selectedFile.bytes)}`}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {!selectedFile.isBinary && selectedFileContent !== null && (
                    <button
                      type="button"
                      onClick={() => handleCopyText(selectedFileContent, selectedFile.path)}
                      className="min-h-[40px] px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/10 text-xs font-semibold text-slate-100 flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                    >
                      {copiedKey === selectedFile.path ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Copied Code</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy Code</span>
                        </>
                      )}
                    </button>
                  )}

                  <a
                    href={`/api/export/file?path=${encodeURIComponent(selectedFile.path)}&download=1`}
                    download
                    className="min-h-[40px] px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-bold text-white flex items-center gap-1.5 no-underline whitespace-nowrap"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download</span>
                  </a>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-900/70 border border-white/10 text-xs text-slate-300">
                {selectedFile.descriptionHi}
              </div>

              {selectedFile.isBinary ? (
                <div className="p-5 rounded-2xl bg-slate-900 border border-white/10 text-center space-y-3">
                  <p className="text-xs text-slate-300">
                    यह एक इमेज / आइकन असेट फाइल है। ऊपर <strong>Download</strong> बटन दबाकर इसे सीधे सेव कर सकते हैं।
                  </p>
                </div>
              ) : loadingFile ? (
                <div className="p-6 rounded-2xl bg-slate-900 border border-white/10 text-center text-xs text-slate-300">
                  पूरा कोड लोड हो रहा है...
                </div>
              ) : (
                <pre className="p-3.5 rounded-2xl bg-slate-950 border border-white/15 text-[11px] leading-relaxed font-mono text-slate-200 overflow-x-auto max-h-[46vh]">
                  <code>{selectedFileContent}</code>
                </pre>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
