import React, { useState } from 'react';
import {
  Check,
  Code2,
  Copy,
  Download,
  ExternalLink,
  Play,
  X,
} from 'lucide-react';
import { BuiltAppItem } from '../types';
import { audioService } from '../services/audioService';

interface BuiltAppPreviewModalProps {
  app: BuiltAppItem | null;
  onClose: () => void;
}

export const BuiltAppPreviewModal: React.FC<BuiltAppPreviewModalProps> = ({
  app,
  onClose,
}) => {
  const [viewMode, setViewMode] = useState<'preview' | 'code'>('preview');
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  if (!app) return null;

  const handleCopyUrl = async () => {
    audioService.playChime('tap');
    try {
      await navigator.clipboard.writeText(app.url);
      setCopiedLink(true);
      window.setTimeout(() => setCopiedLink(false), 2200);
    } catch {}
  };

  const handleCopyCode = async () => {
    audioService.playChime('tap');
    try {
      await navigator.clipboard.writeText(app.htmlCode);
      setCopiedCode(true);
      window.setTimeout(() => setCopiedCode(false), 2200);
    } catch {}
  };

  const handleDownloadHtml = () => {
    audioService.playChime('activate');
    const blob = new Blob([app.htmlCode], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${app.slug}.html`;
    document.body.appendChild(a);
    a.click();
    window.setTimeout(() => {
      a.remove();
      URL.revokeObjectURL(url);
    }, 300);
  };

  return (
    <div className="fixed inset-0 z-[75] flex items-center justify-center p-2 sm:p-4 bg-black/90 backdrop-blur-md">
      <div className="w-full max-w-lg h-[92vh] bg-[#0b061a] border border-cyan-500/45 rounded-3xl p-3.5 sm:p-4 flex flex-col justify-between overflow-hidden shadow-[0_0_50px_rgba(6,182,212,0.3)]">
        {/* Top Bar */}
        <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-800">
          <div className="min-w-0">
            <h2 className="text-sm sm:text-base font-bold text-white truncate">{app.title}</h2>
            <p className="text-[11px] text-cyan-300 truncate">{app.url}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-full bg-slate-800/80 text-slate-300 hover:text-white cursor-pointer shrink-0"
            aria-label="Close Preview"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Action Toolbar: Live Preview / Full Code / Open in Browser / Copy Link */}
        <div className="flex flex-wrap items-center justify-between gap-1.5 py-2">
          <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-950 border border-slate-800">
            <button
              type="button"
              onClick={() => setViewMode('preview')}
              className={`min-h-[34px] px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer ${
                viewMode === 'preview' ? 'bg-pink-600 text-white' : 'text-slate-300'
              }`}
            >
              <Play className="w-3.5 h-3.5" />
              <span>Run Live</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('code')}
              className={`min-h-[34px] px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer ${
                viewMode === 'code' ? 'bg-cyan-600 text-white' : 'text-slate-300'
              }`}
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>Code</span>
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleCopyUrl}
              className="min-h-[34px] px-2.5 py-1 rounded-xl bg-slate-900 border border-slate-700 text-cyan-200 text-xs font-semibold flex items-center gap-1 cursor-pointer"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedLink ? 'Copied!' : 'Copy Link'}</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadHtml}
              className="min-h-[34px] px-2.5 py-1 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1 cursor-pointer"
              title="Download App HTML"
            >
              <Download className="w-3.5 h-3.5" />
            </button>

            <a
              href={app.url}
              target="_blank"
              rel="noopener noreferrer"
              className="min-h-[34px] px-3 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1 no-underline"
            >
              <span>Open Browser</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        {/* Viewport: Live Sandboxed App/Game/Station OR Full Source Code */}
        <div className="flex-1 min-h-0 rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 relative">
          {viewMode === 'preview' ? (
            <iframe
              title={app.title}
              srcDoc={app.htmlCode}
              sandbox="allow-scripts allow-forms allow-modals allow-popups"
              className="w-full h-full border-0 bg-slate-950"
            />
          ) : (
            <div className="w-full h-full flex flex-col">
              <div className="flex items-center justify-between px-3 py-2 bg-slate-900 border-b border-slate-800">
                <span className="text-xs text-slate-300 font-mono">
                  {app.slug}.html ({app.htmlCode.length} chars)
                </span>
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="px-2.5 py-1 rounded-lg bg-cyan-600 text-white text-xs font-bold cursor-pointer"
                >
                  {copiedCode ? 'Copied Code!' : 'Copy Full Code'}
                </button>
              </div>
              <pre className="flex-1 p-3 overflow-auto text-[11px] leading-relaxed font-mono text-emerald-200 whitespace-pre-wrap">
                {app.htmlCode}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
