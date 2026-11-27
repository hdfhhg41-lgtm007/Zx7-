import React, { useState, useEffect, useCallback } from 'react';
import {
  FolderKanban,
  Upload,
  Plus,
  Code2,
  Wand2,
  Server,
  Play,
  RotateCcw,
  Download,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Loader2,
  ListChecks,
  Save,
  Trash2,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import { getOwnerAuthHeaders } from '../../services/ownerAuthService';
import { fetchWithContainerWakeup } from '../../services/chatVaultPersistence';
import type {
  ApiVaultProviderId,
  ApiVaultProviderStatus,
  AutonomousTaskPlan,
  DevBackupSnapshot,
  DevPipelineRunResult,
  DevProjectSummary,
  Language,
} from '../../types';

interface UnifiedAppBuilderPanelProps {
  isOwnerVerified: boolean;
  language: Language;
  onSyncExternalProjectId?: (projectId: string) => void;
}

type BuilderSectionId = 'builder' | 'apis' | 'pipeline' | 'keys' | 'tasks';

export const UnifiedAppBuilderPanel: React.FC<UnifiedAppBuilderPanelProps> = ({
  isOwnerVerified,
  language,
  onSyncExternalProjectId,
}) => {
  const [section, setSection] = useState<BuilderSectionId>('builder');
  const [projects, setProjects] = useState<DevProjectSummary[]>([]);
  const [activeProject, setActiveProject] = useState<DevProjectSummary | null>(null);
  const [selectedFilePath, setSelectedFilePath] = useState<string>('');
  const [fileContent, setFileContent] = useState<string>('');
  const [backups, setBackups] = useState<DevBackupSnapshot[]>([]);
  const [notice, setNotice] = useState<{ kind: 'ok' | 'err' | 'warn'; text: string } | null>(null);

  // Create / ZIP state
  const [newProjectName, setNewProjectName] = useState('Zara Custom App');
  const [newTemplate, setNewTemplate] = useState<
    'android_kotlin' | 'flutter' | 'react_ts' | 'node_api' | 'python_api'
  >('react_ts');
  const [busy, setBusy] = useState(false);

  // AI coding state
  const [aiCodePrompt, setAiCodePrompt] = useState('');
  const [aiCodingBusy, setAiCodingBusy] = useState(false);

  // Auto API creator state
  const [apiEndpointPath, setApiEndpointPath] = useState('/api/tasks');
  const [apiMethod, setApiMethod] = useState<'GET' | 'POST' | 'PUT' | 'DELETE'>('POST');
  const [apiBackend, setApiBackend] = useState<'node_express' | 'python_fastapi'>('node_express');
  const [apiDb, setApiDb] = useState<'sqlite' | 'postgres' | 'firestore' | 'none'>('sqlite');
  const [apiDesc, setApiDesc] = useState('Validate request payload, store records, and return JSON summary');
  const [apiCreatorResult, setApiCreatorResult] = useState<string>('');

  // 10-Stage Build & Self-Heal Pipeline state
  const [pipelineResult, setPipelineResult] = useState<DevPipelineRunResult | null>(null);
  const [pipelineBusy, setPipelineBusy] = useState(false);
  const [confirmRollbackId, setConfirmRollbackId] = useState<string | null>(null);

  // Encrypted Key Vault state
  const [providers, setProviders] = useState<ApiVaultProviderStatus[]>([]);
  const [editingProvider, setEditingProvider] = useState<ApiVaultProviderId | null>(null);
  const [secretInput, setSecretInput] = useState('');
  const [confirmRemoveProvider, setConfirmRemoveProvider] = useState<ApiVaultProviderId | null>(null);
  const [keyBusyProvider, setKeyBusyProvider] = useState<string | null>(null);

  // Multi-Step Autonomous Task Engine state
  const [taskGoal, setTaskGoal] = useState(
    'Create a React app, generate /api/profile endpoint, and run self-test & build check'
  );
  const [taskPlan, setTaskPlan] = useState<AutonomousTaskPlan | null>(null);
  const [taskBusy, setTaskBusy] = useState(false);

  const loadProjects = useCallback(async () => {
    try {
      const res = await fetch('/api/dev-studio/projects');
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data.projects)) {
        setProjects(data.projects);
        setActiveProject((prev) => {
          if (prev) {
            const match = data.projects.find((p: DevProjectSummary) => p.id === prev.id);
            if (match) return match;
          }
          return data.projects[0] || null;
        });
      }
    } catch {}
  }, []);

  const loadProviders = useCallback(async () => {
    try {
      const res = await fetch('/api/dev-studio/keys');
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data.providers)) setProviders(data.providers);
    } catch {}
  }, []);

  const loadBackups = useCallback(async (projectId: string) => {
    try {
      const res = await fetch(`/api/dev-studio/projects/${encodeURIComponent(projectId)}/backups`);
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data.backups)) setBackups(data.backups);
    } catch {}
  }, []);

  const openProjectFile = useCallback(async (projectId: string, relPath: string) => {
    try {
      const res = await fetch(
        `/api/dev-studio/projects/${encodeURIComponent(projectId)}/file?path=${encodeURIComponent(relPath)}`
      );
      const data = await res.json();
      if (data.ok && typeof data.content === 'string') {
        setSelectedFilePath(relPath);
        setFileContent(data.content);
      }
    } catch {}
  }, []);

  useEffect(() => {
    loadProjects();
    loadProviders();
  }, [loadProjects, loadProviders]);

  useEffect(() => {
    if (!activeProject) return;
    onSyncExternalProjectId?.(activeProject.id);
    loadBackups(activeProject.id);
    const firstFile =
      activeProject.files.find((f) => !f.isBinary && f.path === selectedFilePath) ||
      activeProject.files.find((f) => !f.isBinary);
    if (firstFile && firstFile.path !== selectedFilePath) {
      openProjectFile(activeProject.id, firstFile.path);
    }
  }, [activeProject, loadBackups, openProjectFile, selectedFilePath, onSyncExternalProjectId]);

  const handleCreateTemplate = async () => {
    if (!isOwnerVerified) {
      setNotice({ kind: 'warn', text: 'Owner verification in Settings is required to create or modify projects.' });
      return;
    }
    setBusy(true);
    setNotice(null);
    try {
      const authHeaders = await getOwnerAuthHeaders();
      const res = await fetchWithContainerWakeup('/api/dev-studio/projects/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({ name: newProjectName, template: newTemplate }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setNotice({ kind: 'err', text: data.error || 'Could not create project.' });
      } else {
        setActiveProject(data.project);
        setSelectedFilePath('');
        await loadProjects();
        setNotice({ kind: 'ok', text: `Created "${data.project.name}" (${data.project.totalFiles} files).` });
      }
    } catch (e: any) {
      setNotice({ kind: 'err', text: e?.message || 'Project creation failed.' });
    } finally {
      setBusy(false);
    }
  };

  const handleUploadZip = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!isOwnerVerified) {
      setNotice({ kind: 'warn', text: 'Owner verification is required to import ZIP projects.' });
      return;
    }
    setBusy(true);
    setNotice(null);
    try {
      const buf = await file.arrayBuffer();
      const bytes = new Uint8Array(buf);
      let binary = '';
      const chunk = 8192;
      for (let i = 0; i < bytes.length; i += chunk) {
        binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
      }
      const zipBase64 = btoa(binary);
      const authHeaders = await getOwnerAuthHeaders();
      const res = await fetchWithContainerWakeup('/api/dev-studio/projects/upload-zip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({
          projectName: file.name.replace(/\.zip$/i, ''),
          zipBase64,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setNotice({ kind: 'err', text: data.error || 'ZIP extraction failed.' });
      } else {
        setActiveProject(data.project);
        setSelectedFilePath('');
        await loadProjects();
        setNotice({
          kind: 'ok',
          text: `Extracted "${data.project.name}": ${data.project.detectedLanguages.join(', ') || 'Generic'} (${data.project.totalFiles} files).`,
        });
      }
    } catch (err: any) {
      setNotice({ kind: 'err', text: err?.message || 'Failed to upload ZIP.' });
    } finally {
      setBusy(false);
    }
  };

  const handleSaveCurrentFile = async () => {
    if (!activeProject || !selectedFilePath || !isOwnerVerified) return;
    setBusy(true);
    try {
      const authHeaders = await getOwnerAuthHeaders();
      const res = await fetchWithContainerWakeup(
        `/api/dev-studio/projects/${encodeURIComponent(activeProject.id)}/file`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authHeaders },
          body: JSON.stringify({ relPath: selectedFilePath, content: fileContent, createBackup: true }),
        }
      );
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setNotice({ kind: 'err', text: data.error || 'Save failed.' });
      } else {
        setActiveProject(data.project);
        await loadBackups(activeProject.id);
        setNotice({ kind: 'ok', text: `Saved ${selectedFilePath} (backup snapshot stored).` });
      }
    } catch (e: any) {
      setNotice({ kind: 'err', text: e?.message || 'Save failed.' });
    } finally {
      setBusy(false);
    }
  };

  const handleAiEditCode = async () => {
    if (!activeProject || !aiCodePrompt.trim()) return;
    if (!isOwnerVerified) {
      setNotice({ kind: 'warn', text: 'Owner verification required to apply AI edits to project files.' });
      return;
    }
    setAiCodingBusy(true);
    setNotice(null);
    try {
      const authHeaders = await getOwnerAuthHeaders();
      const res = await fetchWithContainerWakeup(
        `/api/dev-studio/projects/${encodeURIComponent(activeProject.id)}/ai-code`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authHeaders },
          body: JSON.stringify({ instruction: aiCodePrompt.trim(), targetPath: selectedFilePath }),
        }
      );
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setNotice({ kind: 'err', text: data.error || 'AI code edit failed.' });
      } else {
        setActiveProject(data.project);
        await loadBackups(activeProject.id);
        if (Array.isArray(data.modifiedFiles) && data.modifiedFiles.length > 0) {
          await openProjectFile(activeProject.id, data.modifiedFiles[0]);
        }
        setNotice({
          kind: 'ok',
          text: `${data.note || 'AI code edits applied'} (${data.modifiedFiles?.length || 0} files updated, backup ${data.backup?.backupId || 'ok'}).`,
        });
      }
    } catch (e: any) {
      setNotice({ kind: 'err', text: e?.message || 'AI coding error.' });
    } finally {
      setAiCodingBusy(false);
    }
  };

  const handleGenerateApi = async () => {
    if (!activeProject) {
      setNotice({ kind: 'warn', text: 'Create or select a project first in App Builder.' });
      return;
    }
    if (!isOwnerVerified) {
      setNotice({ kind: 'warn', text: 'Owner verification required to write API files.' });
      return;
    }
    setBusy(true);
    setApiCreatorResult('');
    try {
      const authHeaders = await getOwnerAuthHeaders();
      const res = await fetchWithContainerWakeup(
        `/api/dev-studio/projects/${encodeURIComponent(activeProject.id)}/create-api`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authHeaders },
          body: JSON.stringify({
            endpointPath: apiEndpointPath,
            method: apiMethod,
            backend: apiBackend,
            database: apiDb,
            description: apiDesc,
          }),
        }
      );
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setNotice({ kind: 'err', text: data.error || 'API creation failed.' });
      } else {
        setActiveProject(data.project);
        setApiCreatorResult(
          `Generated files:\n- ${(data.createdFiles || []).join('\n- ')}\n\nLive Syntax/Verification Check:\n${data.verificationOutput || 'Verified OK'}`
        );
        setNotice({ kind: 'ok', text: `API endpoint ${apiMethod} ${apiEndpointPath} created & verified.` });
      }
    } catch (e: any) {
      setNotice({ kind: 'err', text: e?.message || 'API creation error.' });
    } finally {
      setBusy(false);
    }
  };

  const handleRunPipeline = async () => {
    if (!activeProject) return;
    if (!isOwnerVerified) {
      setNotice({ kind: 'warn', text: 'Owner verification required to run build & self-heal pipeline.' });
      return;
    }
    setPipelineBusy(true);
    setNotice(null);
    try {
      const authHeaders = await getOwnerAuthHeaders();
      const res = await fetchWithContainerWakeup(
        `/api/dev-studio/projects/${encodeURIComponent(activeProject.id)}/pipeline`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authHeaders },
          body: JSON.stringify({ autoRepair: true, goal: `Verify & build ${activeProject.name}` }),
        }
      );
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setNotice({ kind: 'err', text: data.error || 'Pipeline failed.' });
      } else {
        setPipelineResult(data.pipeline);
        await loadProjects();
        await loadBackups(activeProject.id);
      }
    } catch (e: any) {
      setNotice({ kind: 'err', text: e?.message || 'Pipeline request failed.' });
    } finally {
      setPipelineBusy(false);
    }
  };

  const handleRollback = async (backupId: string) => {
    if (!activeProject || !isOwnerVerified) return;
    setBusy(true);
    try {
      const authHeaders = await getOwnerAuthHeaders();
      const res = await fetchWithContainerWakeup(
        `/api/dev-studio/projects/${encodeURIComponent(activeProject.id)}/rollback`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authHeaders },
          body: JSON.stringify({ backupId, confirmed: true }),
        }
      );
      const data = await res.json();
      if (data.ok && data.project) {
        setActiveProject(data.project);
        setConfirmRollbackId(null);
        setSelectedFilePath('');
        setNotice({ kind: 'ok', text: `Rolled back cleanly to backup ${backupId}.` });
      } else {
        setNotice({ kind: 'err', text: data.error || 'Rollback failed.' });
      }
    } catch (e: any) {
      setNotice({ kind: 'err', text: e?.message || 'Rollback error.' });
    } finally {
      setBusy(false);
    }
  };

  const handleSaveVaultKey = async (provider: ApiVaultProviderId) => {
    if (!secretInput.trim() || !isOwnerVerified) return;
    setKeyBusyProvider(provider);
    try {
      const authHeaders = await getOwnerAuthHeaders();
      const res = await fetchWithContainerWakeup('/api/dev-studio/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({ provider, secret: secretInput.trim() }),
      });
      const data = await res.json();
      if (data.ok && Array.isArray(data.providers)) {
        setProviders(data.providers);
        setEditingProvider(null);
        setSecretInput('');
        setNotice({ kind: 'ok', text: `Encrypted ${provider} key stored safely in server AES-256-GCM vault.` });
      } else {
        setNotice({ kind: 'err', text: data.error || 'Could not save key.' });
      }
    } finally {
      setKeyBusyProvider(null);
    }
  };

  const handleTestVaultKey = async (provider: ApiVaultProviderId) => {
    if (!isOwnerVerified) {
      setNotice({ kind: 'warn', text: 'Owner login required to test API keys.' });
      return;
    }
    setKeyBusyProvider(provider);
    try {
      const authHeaders = await getOwnerAuthHeaders();
      const res = await fetchWithContainerWakeup('/api/dev-studio/keys/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({ provider }),
      });
      const data = await res.json();
      if (Array.isArray(data.providers)) setProviders(data.providers);
      setNotice({ kind: data.ok ? 'ok' : 'warn', text: `${provider}: ${data.message || 'Tested'}` });
    } finally {
      setKeyBusyProvider(null);
    }
  };

  const handleRemoveVaultKey = async (provider: ApiVaultProviderId) => {
    if (!isOwnerVerified) return;
    setKeyBusyProvider(provider);
    try {
      const authHeaders = await getOwnerAuthHeaders();
      const res = await fetchWithContainerWakeup(
        `/api/dev-studio/keys/${encodeURIComponent(provider)}?confirmed=true`,
        { method: 'DELETE', headers: { ...authHeaders } }
      );
      const data = await res.json();
      if (data.ok && Array.isArray(data.providers)) {
        setProviders(data.providers);
        setConfirmRemoveProvider(null);
        setNotice({ kind: 'ok', text: `Removed ${provider} key from encrypted vault.` });
      }
    } finally {
      setKeyBusyProvider(null);
    }
  };

  const handleRunTaskGoal = async () => {
    if (!taskGoal.trim()) return;
    setTaskBusy(true);
    setTaskPlan(null);
    try {
      const authHeaders = await getOwnerAuthHeaders();
      const res = await fetchWithContainerWakeup('/api/tasks/plan-execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({
          goal: taskGoal.trim(),
          projectId: activeProject?.id || '',
        }),
      });
      const data = await res.json();
      if (data.ok && data.plan) {
        setTaskPlan(data.plan);
        await loadProjects();
      } else {
        setNotice({ kind: 'err', text: data.error || 'Task planning failed.' });
      }
    } catch (e: any) {
      setNotice({ kind: 'err', text: e?.message || 'Task engine error.' });
    } finally {
      setTaskBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Sub-Navigation Bar */}
      <div className="flex flex-wrap gap-1.5 p-2 rounded-2xl bg-slate-900/90 border border-white/10">
        {[
          { id: 'builder' as BuilderSectionId, label: 'App Builder & IDE', icon: FolderKanban },
          { id: 'apis' as BuilderSectionId, label: 'Auto API Creator', icon: Server },
          { id: 'pipeline' as BuilderSectionId, label: 'Build & Self-Heal', icon: Play },
          { id: 'keys' as BuilderSectionId, label: 'API Vault & AI Tools', icon: KeyRound },
          { id: 'tasks' as BuilderSectionId, label: 'Auto Task Engine', icon: ListChecks },
        ].map((item) => {
          const Icon = item.icon;
          const active = section === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setSection(item.id)}
              className={`min-h-[36px] px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border cursor-pointer transition-colors ${
                active
                  ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                  : 'bg-slate-950 text-slate-300 border-white/10 hover:bg-slate-800'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {!isOwnerVerified && (
        <div className="p-3 rounded-xl bg-amber-950/60 border border-amber-500/40 text-xs text-amber-100 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
          <span>
            Guest Read-Only Mode active ({language}). Sign in as Owner in Settings to upload ZIPs, write code, store encrypted API keys, or trigger builds.
          </span>
        </div>
      )}

      {notice && (
        <div
          className={`p-3 rounded-xl text-xs border flex items-start gap-2 ${
            notice.kind === 'ok'
              ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-100'
              : notice.kind === 'warn'
              ? 'bg-amber-950/50 border-amber-500/40 text-amber-100'
              : 'bg-rose-950/50 border-rose-500/40 text-rose-100'
          }`}
        >
          {notice.kind === 'ok' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          )}
          <span>{notice.text}</span>
        </div>
      )}

      {/* ================= SECTION 1: APP BUILDER & UNIVERSAL IDE ================= */}
      {section === 'builder' && (
        <div className="space-y-4">
          {/* Project Switcher + ZIP Upload + Template Creator */}
          <div className="p-4 rounded-2xl bg-slate-900/85 border border-emerald-500/30 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs font-bold text-white">
                Sandbox Projects ({projects.length})
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <label className="min-h-[36px] px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload ZIP Project</span>
                  <input type="file" accept=".zip" onChange={handleUploadZip} className="hidden" />
                </label>
                {activeProject && (
                  <a
                    href={`/api/dev-studio/projects/${encodeURIComponent(activeProject.id)}/download-zip`}
                    className="min-h-[36px] px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/15 text-xs font-bold text-emerald-300 flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download ZIP</span>
                  </a>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
              <input
                type="text"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder="New project name..."
                className="sm:col-span-2 min-h-[38px] px-3 rounded-xl bg-slate-950 border border-white/15 text-xs text-white"
              />
              <select
                value={newTemplate}
                onChange={(e) => setNewTemplate(e.target.value as any)}
                className="min-h-[38px] px-3 rounded-xl bg-slate-950 border border-white/15 text-xs text-white"
              >
                <option value="react_ts">React + TypeScript</option>
                <option value="android_kotlin">Android (Kotlin)</option>
                <option value="flutter">Flutter (Dart)</option>
                <option value="node_api">Node.js Express API</option>
                <option value="python_api">Python FastAPI</option>
              </select>
              <button
                type="button"
                disabled={busy || !isOwnerVerified}
                onClick={handleCreateTemplate}
                className="min-h-[38px] px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Create Project</span>
              </button>
            </div>

            {projects.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {projects.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setActiveProject(p);
                      setSelectedFilePath('');
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border cursor-pointer ${
                      activeProject?.id === p.id
                        ? 'bg-emerald-600/25 border-emerald-400 text-white'
                        : 'bg-slate-950 border-white/10 text-slate-300'
                    }`}
                  >
                    {p.name} · {p.totalFiles} files
                  </button>
                ))}
              </div>
            )}
          </div>

          {activeProject && (
            <>
              {/* Project Structure Analysis Summary */}
              <div className="p-3.5 rounded-2xl bg-slate-900/75 border border-white/10 text-xs space-y-1.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-bold text-white">{activeProject.name}</span>
                  <span className="text-[11px] font-mono text-cyan-300">
                    Languages: {activeProject.detectedLanguages.join(', ') || 'Text'} · Frameworks:{' '}
                    {activeProject.detectedFrameworks.join(', ') || 'Vanilla'}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400">
                  Toolchain on this server: Node Check {activeProject.toolchainSupport.localNodeCheck ? 'OK' : 'No'} ·
                  Python Check {activeProject.toolchainSupport.localPythonCheck ? 'OK' : 'No'} ·
                  Gradle/Flutter SDK {activeProject.toolchainSupport.localGradleSdk ? 'Installed' : 'Not Installed (Termux & GitHub Actions scripts bundled)'}
                </div>
              </div>

              {/* AI Code / Debug Assistant Prompt */}
              <div className="p-3.5 rounded-2xl bg-slate-900/85 border border-sky-500/30 space-y-2">
                <div className="text-xs font-bold text-sky-300 flex items-center gap-1.5">
                  <Wand2 className="w-3.5 h-3.5" />
                  <span>Universal AI Coding Studio (Write, Edit, Create Missing Files, Debug)</span>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={aiCodePrompt}
                    onChange={(e) => setAiCodePrompt(e.target.value)}
                    placeholder="e.g. Add a dark-mode login screen, fix bugs in MainActivity.kt, or create utils/auth.ts..."
                    className="flex-1 min-h-[40px] px-3 rounded-xl bg-slate-950 border border-white/15 text-xs text-white"
                  />
                  <button
                    type="button"
                    disabled={aiCodingBusy || !isOwnerVerified}
                    onClick={handleAiEditCode}
                    className="min-h-[40px] px-4 rounded-xl bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {aiCodingBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Code2 className="w-4 h-4" />}
                    <span>AI Write / Edit</span>
                  </button>
                </div>
              </div>

              {/* Split File Explorer + Code Editor */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-3 rounded-2xl bg-slate-950 border border-white/10 space-y-1 max-h-80 overflow-y-auto">
                  <div className="text-[11px] font-bold text-slate-400 uppercase pb-1">
                    Project Files ({activeProject.files.length})
                  </div>
                  {activeProject.files.map((f) => (
                    <button
                      key={f.path}
                      type="button"
                      disabled={Boolean(f.isBinary)}
                      onClick={() => openProjectFile(activeProject.id, f.path)}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg text-[11px] font-mono truncate cursor-pointer ${
                        selectedFilePath === f.path
                          ? 'bg-emerald-500/25 text-emerald-200 border border-emerald-500/40'
                          : 'text-slate-300 hover:bg-slate-900'
                      }`}
                    >
                      {f.path}
                    </button>
                  ))}
                </div>

                <div className="md:col-span-2 p-3 rounded-2xl bg-slate-950 border border-white/10 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-mono text-emerald-300 truncate">
                      {selectedFilePath || 'Select a file'}
                    </span>
                    <button
                      type="button"
                      disabled={!selectedFilePath || busy || !isOwnerVerified}
                      onClick={handleSaveCurrentFile}
                      className="min-h-[32px] px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>Save File</span>
                    </button>
                  </div>
                  <textarea
                    rows={12}
                    value={fileContent}
                    onChange={(e) => setFileContent(e.target.value)}
                    className="w-full p-3 rounded-xl bg-slate-900 border border-white/10 font-mono text-[11px] text-slate-100 leading-relaxed"
                  />
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ================= SECTION 2: AUTOMATIC API CREATOR ================= */}
      {section === 'apis' && (
        <div className="p-4 rounded-2xl bg-slate-900/85 border border-sky-500/35 space-y-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Server className="w-4 h-4 text-sky-400" />
            <span>Automatic API, Database Config &amp; Client Hook Generator</span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <input
              type="text"
              value={apiEndpointPath}
              onChange={(e) => setApiEndpointPath(e.target.value)}
              placeholder="/api/orders"
              className="min-h-[38px] px-3 rounded-xl bg-slate-950 border border-white/15 text-xs font-mono text-white"
            />
            <select
              value={apiMethod}
              onChange={(e) => setApiMethod(e.target.value as any)}
              className="min-h-[38px] px-3 rounded-xl bg-slate-950 border border-white/15 text-xs text-white"
            >
              <option value="GET">GET</option>
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
              <option value="DELETE">DELETE</option>
            </select>
            <select
              value={apiBackend}
              onChange={(e) => setApiBackend(e.target.value as any)}
              className="min-h-[38px] px-3 rounded-xl bg-slate-950 border border-white/15 text-xs text-white"
            >
              <option value="node_express">Node.js (Express Router + Client Hook)</option>
              <option value="python_fastapi">Python (FastAPI Router + Client Hook)</option>
            </select>
            <select
              value={apiDb}
              onChange={(e) => setApiDb(e.target.value as any)}
              className="min-h-[38px] px-3 rounded-xl bg-slate-950 border border-white/15 text-xs text-white"
            >
              <option value="sqlite">Database: SQLite Adapter + .env.example</option>
              <option value="postgres">Database: PostgreSQL Adapter + .env.example</option>
              <option value="firestore">Database: Firebase Firestore Config</option>
              <option value="none">In-Memory / Stateless</option>
            </select>
          </div>
          <textarea
            rows={2}
            value={apiDesc}
            onChange={(e) => setApiDesc(e.target.value)}
            placeholder="Describe input validation, response fields, and auth requirements..."
            className="w-full p-3 rounded-xl bg-slate-950 border border-white/15 text-xs text-white"
          />
          <button
            type="button"
            disabled={busy || !isOwnerVerified || !activeProject}
            onClick={handleGenerateApi}
            className="min-h-[40px] px-4 rounded-xl bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Server className="w-4 h-4" />}
            <span>Generate &amp; Live-Verify API</span>
          </button>
          {apiCreatorResult && (
            <pre className="p-3 rounded-xl bg-slate-950 border border-emerald-500/30 text-[11px] font-mono text-emerald-200 whitespace-pre-wrap">
              {apiCreatorResult}
            </pre>
          )}
        </div>
      )}

      {/* ================= SECTION 3: 10-STAGE AUTO PIPELINE, SELF-HEAL & ROLLBACK ================= */}
      {section === 'pipeline' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-slate-900/85 border border-emerald-500/35 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-white">
                  10-Stage Automated Build, Self-Test &amp; Self-Healing Pipeline
                </h3>
                <p className="text-[11px] text-slate-300 mt-0.5">
                  UPLOAD → ANALYZE → CODE → APIs → DEPS → TEST → FIX ERRORS → BUILD → VERIFY → DOWNLOAD
                </p>
              </div>
              <button
                type="button"
                disabled={pipelineBusy || !activeProject || !isOwnerVerified}
                onClick={handleRunPipeline}
                className="min-h-[40px] px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
              >
                {pipelineBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                <span>Run Full Pipeline</span>
              </button>
            </div>

            {pipelineResult && (
              <div className="space-y-2.5 pt-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {pipelineResult.stages.map((st, idx) => (
                    <div
                      key={st.stage}
                      className={`p-2.5 rounded-xl border text-xs ${
                        st.status === 'passed' || st.status === 'repaired'
                          ? 'bg-emerald-950/35 border-emerald-500/30'
                          : st.status === 'blocked'
                          ? 'bg-amber-950/40 border-amber-500/35'
                          : 'bg-slate-950 border-white/10'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 font-bold">
                        <span>
                          {idx + 1}. {st.label}
                        </span>
                        <span className="text-[10px] uppercase font-mono">{st.status}</span>
                      </div>
                      <div className="text-[11px] text-slate-300 mt-1">{st.detail}</div>
                    </div>
                  ))}
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-sky-500/30 text-xs text-sky-100 space-y-2">
                  <div>{pipelineResult.honestBuildNote}</div>
                  {pipelineResult.repairedFiles.length > 0 && (
                    <div className="text-emerald-300">
                      Auto-repaired files ({pipelineResult.healAttempts} passes): {pipelineResult.repairedFiles.join(', ')}
                    </div>
                  )}
                  <a
                    href={pipelineResult.downloadZipUrl}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Verified Build Bundle (Termux + GitHub Actions CI Ready)</span>
                  </a>
                </div>
              </div>
            )}
          </div>

          {/* Backups & Rollback */}
          <div className="p-4 rounded-2xl bg-slate-900/85 border border-white/10 space-y-2.5">
            <div className="text-xs font-bold text-white flex items-center gap-1.5">
              <RotateCcw className="w-4 h-4 text-amber-400" />
              <span>Automatic Backups &amp; 1-Click Rollback ({backups.length})</span>
            </div>
            {backups.length === 0 ? (
              <div className="text-xs text-slate-400">Backups are created automatically before every AI edit or self-heal pass.</div>
            ) : (
              <div className="space-y-1.5">
                {backups.map((b) => (
                  <div
                    key={b.backupId}
                    className="p-2.5 rounded-xl bg-slate-950 border border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs"
                  >
                    <div>
                      <div className="font-semibold text-white">{b.reason}</div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {b.backupId} · {b.fileCount} files · {new Date(b.createdAtIso).toLocaleString()}
                      </div>
                    </div>
                    {confirmRollbackId === b.backupId ? (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleRollback(b.backupId)}
                          className="px-2.5 py-1 rounded-lg bg-rose-600 text-white text-[11px] font-bold cursor-pointer"
                        >
                          Confirm Restore
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmRollbackId(null)}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 text-[11px] cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        disabled={!isOwnerVerified}
                        onClick={() => setConfirmRollbackId(b.backupId)}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-amber-300 text-[11px] font-bold cursor-pointer"
                      >
                        Rollback
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= SECTION 4: ENCRYPTED API KEY VAULT & UNIVERSAL AI TOOLS ================= */}
      {section === 'keys' && (
        <div className="space-y-3">
          <div className="p-3.5 rounded-2xl bg-slate-900/85 border border-sky-500/35 flex items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-white">
                Central Encrypted API Key Vault (AES-256-GCM Server-Side)
              </h3>
              <p className="text-[11px] text-slate-300">
                Keys are encrypted on the server and never stored in browser storage or returned in plaintext. Free &amp; open-source alternatives shown for every tool.
              </p>
            </div>
            <button
              type="button"
              onClick={loadProviders}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/10 text-slate-300 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {providers.map((p) => (
              <div
                key={p.provider}
                className="p-3.5 rounded-2xl bg-slate-900/85 border border-white/10 space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-white">{p.name}</span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          p.configured
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {p.configured ? `Active (${p.source})` : 'Not Set'}
                      </span>
                    </div>
                    <div className="text-[10px] text-cyan-300 mt-0.5">
                      Tier: {p.pricingTier.replace('_', ' ')} · {p.freeLimitsNote}
                    </div>
                    <div className="text-[10px] text-emerald-300 mt-0.5">
                      Free Alt: {p.freeAlternative}
                    </div>
                    {p.maskedPreview && (
                      <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                        Key: {p.maskedPreview}
                      </div>
                    )}
                    {p.lastTestMessage && (
                      <div className="text-[10px] text-amber-200 mt-0.5">{p.lastTestMessage}</div>
                    )}
                  </div>
                </div>

                {editingProvider === p.provider ? (
                  <div className="flex gap-1.5 pt-1">
                    <input
                      type="password"
                      value={secretInput}
                      onChange={(e) => setSecretInput(e.target.value)}
                      placeholder={`Paste ${p.name} key or URL...`}
                      className="flex-1 min-h-[34px] px-2.5 rounded-lg bg-slate-950 border border-white/15 text-xs text-white"
                    />
                    <button
                      type="button"
                      disabled={keyBusyProvider === p.provider}
                      onClick={() => handleSaveVaultKey(p.provider)}
                      className="px-3 rounded-lg bg-emerald-500 text-slate-950 text-xs font-bold cursor-pointer"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingProvider(null);
                        setSecretInput('');
                      }}
                      className="px-2 rounded-lg bg-slate-800 text-slate-300 text-xs cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    <button
                      type="button"
                      disabled={!isOwnerVerified}
                      onClick={() => {
                        setEditingProvider(p.provider);
                        setSecretInput('');
                      }}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-xs font-semibold text-white cursor-pointer"
                    >
                      {p.configured ? 'Update Key' : 'Add Key'}
                    </button>
                    <button
                      type="button"
                      disabled={!isOwnerVerified || !p.configured || keyBusyProvider === p.provider}
                      onClick={() => handleTestVaultKey(p.provider)}
                      className="px-2.5 py-1 rounded-lg bg-sky-600/30 hover:bg-sky-600/50 disabled:opacity-40 text-xs font-semibold text-sky-200 cursor-pointer"
                    >
                      {keyBusyProvider === p.provider ? 'Testing...' : 'Test Live'}
                    </button>
                    {p.source === 'vault' &&
                      (confirmRemoveProvider === p.provider ? (
                        <button
                          type="button"
                          onClick={() => handleRemoveVaultKey(p.provider)}
                          className="px-2.5 py-1 rounded-lg bg-rose-600 text-white text-xs font-bold cursor-pointer"
                        >
                          Confirm Remove
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={!isOwnerVerified}
                          onClick={() => setConfirmRemoveProvider(p.provider)}
                          className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-rose-900/60 text-rose-300 text-xs cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ================= SECTION 5: AUTONOMOUS MULTI-STEP TASK ENGINE ================= */}
      {section === 'tasks' && (
        <div className="p-4 rounded-2xl bg-slate-900/85 border border-fuchsia-500/35 space-y-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <ListChecks className="w-4 h-4 text-fuchsia-400" />
            <span>Automatic Multi-Step Task Planner &amp; Executor</span>
          </h3>
          <p className="text-[11px] text-slate-300">
            Breaks complex requests into concrete tool steps, runs server coding/design/API tasks with automatic retry, and honestly flags steps needing Android device action or confirmation.
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={taskGoal}
              onChange={(e) => setTaskGoal(e.target.value)}
              placeholder="Describe a multi-step workflow..."
              className="flex-1 min-h-[40px] px-3 rounded-xl bg-slate-950 border border-white/15 text-xs text-white"
            />
            <button
              type="button"
              disabled={taskBusy}
              onClick={handleRunTaskGoal}
              className="min-h-[40px] px-4 rounded-xl bg-fuchsia-500 hover:bg-fuchsia-400 disabled:opacity-50 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {taskBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              <span>Plan &amp; Execute</span>
            </button>
          </div>

          {taskPlan && (
            <div className="space-y-2 pt-2">
              <div className="p-3 rounded-xl bg-slate-950 border border-white/15 text-xs text-white font-semibold">
                {taskPlan.summary} ({taskPlan.completedCount} completed · {taskPlan.blockedOrPendingCount} pending/blocked)
              </div>
              {taskPlan.steps.map((st) => (
                <div
                  key={st.id}
                  className="p-3 rounded-xl bg-slate-950 border border-white/10 text-xs flex items-start justify-between gap-2"
                >
                  <div>
                    <div className="font-bold text-white">
                      Step {st.stepNumber}: {st.title}{' '}
                      <span className="text-[10px] font-mono text-sky-300">[{st.tool}]</span>
                    </div>
                    <div className="text-[11px] text-slate-300 mt-0.5">{st.detail}</div>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                      st.status === 'completed'
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : st.status === 'needs_device_or_confirm'
                        ? 'bg-amber-500/20 text-amber-200'
                        : 'bg-rose-500/20 text-rose-300'
                    }`}
                  >
                    {st.status === 'needs_device_or_confirm' ? (
                      <span className="inline-flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> Confirm/Device
                      </span>
                    ) : (
                      st.status
                    )}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
