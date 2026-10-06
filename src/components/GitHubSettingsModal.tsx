import React, { useState } from 'react';
import { 
  X, 
  Github, 
  KeyRound, 
  FolderGit2, 
  Check, 
  AlertCircle, 
  ExternalLink, 
  Download, 
  HelpCircle, 
  RefreshCw,
  Eye,
  EyeOff,
  Database,
  Upload
} from 'lucide-react';
import { GitHubConfig, SyncStatus, AppData } from '../types';
import { GitHubService } from '../services/github';
import { useTranslation } from '../context/LanguageContext';

interface GitHubSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: GitHubConfig;
  onSaveConfig: (newConfig: GitHubConfig) => void;
  syncStatus: SyncStatus;
  onPullData: () => Promise<void>;
  onPushData: () => Promise<void>;
  appData: AppData;
  onImportData: (data: AppData) => void;
}

export const GitHubSettingsModal: React.FC<GitHubSettingsModalProps> = ({
  isOpen,
  onClose,
  config,
  onSaveConfig,
  syncStatus,
  onPullData,
  onPushData,
  appData,
  onImportData,
}) => {
  const { lang, t } = useTranslation();
  const [formData, setFormData] = useState<GitHubConfig>({ ...config });
  const [showToken, setShowToken] = useState(false);
  const [testResult, setTestResult] = useState<{ 
    success?: boolean; 
    message?: string; 
    hasDataFile?: boolean;
  } | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [isInitializingFile, setIsInitializingFile] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const [isPushing, setIsPushing] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  if (!isOpen) return null;

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await GitHubService.verifyConnection(formData);
      if (res.success) {
        let msg = lang === 'zh' ? `连接成功！已验证仓库: ${res.repoName}` : `Connection successful! Verified repository: ${res.repoName}`;
        if (res.hasDataFile) {
          msg += lang === 'zh' ? ' (检测到 data.json 已就绪 ✅)' : ' (data.json found ✅)';
        } else {
          msg += lang === 'zh' ? ' (仓库中尚未创建 data.json，可点击下方一键初始化)' : ' (data.json not found yet, click below to initialize)';
        }
        setTestResult({
          success: true,
          message: msg,
          hasDataFile: res.hasDataFile,
        });
      } else {
        setTestResult({
          success: false,
          message: res.error || (lang === 'zh' ? '验证失败，请核对配置信息' : 'Verification failed, check credentials'),
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || (lang === 'zh' ? '网络连接失败' : 'Network failure'),
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleInitDataFile = async () => {
    setIsInitializingFile(true);
    try {
      await GitHubService.saveRemoteData(formData, appData, undefined, 'Initialize data.json via Timeline');
      setTestResult({
        success: true,
        message: lang === 'zh' ? '🎉 已成功在 GitHub 仓库创建并初始化 data.json！' : '🎉 Initialized data.json in repository successfully!',
        hasDataFile: true,
      });
      onSaveConfig(formData);
    } catch (err: any) {
      alert((lang === 'zh' ? '初始化失败: ' : 'Failed to initialize: ') + err.message);
    } finally {
      setIsInitializingFile(false);
    }
  };

  const handleSave = () => {
    onSaveConfig(formData);
    onClose();
  };

  const handlePull = async () => {
    setIsPulling(true);
    try {
      await onPullData();
    } finally {
      setIsPulling(false);
    }
  };

  const handlePush = async () => {
    setIsPushing(true);
    try {
      await onPushData();
    } finally {
      setIsPushing(false);
    }
  };

  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(appData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `workpulse-backup-${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed && Array.isArray(parsed.projects) && Array.isArray(parsed.journals)) {
          onImportData(parsed);
          alert(lang === 'zh' ? '数据备份已成功导入！' : 'Data backup imported successfully!');
        } else {
          alert(lang === 'zh' ? '导入失败：JSON 数据格式不符合规范' : 'Import failed: Invalid JSON schema');
        }
      } catch (err) {
        alert(lang === 'zh' ? '解析 JSON 文件失败，请确认文件完整有效' : 'Failed to parse JSON file');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white dark:bg-[#121316] rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-2xl max-w-xl w-full max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100 dark:border-neutral-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white">
              <Github className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-neutral-900 dark:text-white font-display">
                {t.ghModalTitle}
              </h2>
              <p className="text-xs text-neutral-500">
                {t.ghModalSubtitle}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body content */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Form Fields */}
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-neutral-500" />
                  {t.patLabel}
                </label>
                <button
                  type="button"
                  onClick={() => setShowGuide(!showGuide)}
                  className="text-xs text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200 flex items-center gap-1 transition-colors"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  {t.howToGetToken}
                </button>
              </div>
              <div className="relative">
                <input
                  type={showToken ? 'text' : 'password'}
                  value={formData.token}
                  onChange={(e) => setFormData({ ...formData, token: e.target.value })}
                  placeholder="ghp_xxxxxxxxxxxx / github_pat_xxxxxxxxxxxx"
                  className="w-full px-3 py-2 pr-10 text-sm font-mono rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-800/40 text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-neutral-400 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowToken(!showToken)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
                >
                  {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="mt-1 text-[11px] text-neutral-500">
                {t.patStorageHint}
              </p>
            </div>

            {/* Token Guide Accordion */}
            {showGuide && (
              <div className="p-3.5 rounded-lg bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700 text-xs text-neutral-600 dark:text-neutral-300 space-y-2 animate-in fade-in">
                <div className="font-semibold text-neutral-900 dark:text-white flex items-center justify-between">
                  <span>{lang === 'zh' ? '快速获取 Token 步骤说明:' : 'Step-by-step Token generation:'}</span>
                  <a
                    href="https://github.com/settings/tokens"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-sky-600 dark:text-sky-400 hover:underline"
                  >
                    {t.directLink} <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <ol className="list-decimal list-inside space-y-1 text-neutral-600 dark:text-neutral-400">
                  <li>{t.guideStep1}</li>
                  <li>{t.guideStep2}</li>
                  <li>{t.guideStep3}</li>
                  <li>{t.guideStep4}</li>
                </ol>
                <div className="text-[11px] text-neutral-500 pt-1 border-t border-neutral-200 dark:border-neutral-700">
                  {t.guideRepoTip}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                  {t.ownerLabel}
                </label>
                <input
                  type="text"
                  value={formData.owner}
                  onChange={(e) => setFormData({ ...formData, owner: e.target.value })}
                  placeholder="e.g. your-username"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-800/40 text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-neutral-400 transition-all font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                  {t.repoLabel}
                </label>
                <input
                  type="text"
                  value={formData.repo}
                  onChange={(e) => setFormData({ ...formData, repo: e.target.value })}
                  placeholder="e.g. work-pulse-logs"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-800/40 text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-neutral-400 transition-all font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                  {t.branchLabel}
                </label>
                <input
                  type="text"
                  value={formData.branch}
                  onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                  placeholder="main"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-800/40 text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-neutral-400 transition-all font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                  {t.pathLabel}
                </label>
                <input
                  type="text"
                  value={formData.path}
                  onChange={(e) => setFormData({ ...formData, path: e.target.value })}
                  placeholder="data.json"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-800/40 text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-neutral-400 transition-all font-mono"
                />
              </div>
            </div>
          </div>

          {/* Test connection & result feedback */}
          <div className="space-y-2">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={isTesting || !formData.token || !formData.owner || !formData.repo}
              className="w-full py-2 px-3 text-xs font-medium rounded-lg border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-200 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              {isTesting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  {t.testingConnection}
                </>
              ) : (
                <>
                  <FolderGit2 className="w-3.5 h-3.5" />
                  {t.testConnection}
                </>
              )}
            </button>

            {testResult && (
              <div className="space-y-2">
                <div
                  className={`p-3 rounded-lg text-xs flex items-start gap-2 ${
                    testResult.success
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                      : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                  }`}
                >
                  {testResult.success ? (
                    <Check className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
                  )}
                  <span className="flex-1">{testResult.message}</span>
                </div>

                {testResult.success && !testResult.hasDataFile && (
                  <button
                    type="button"
                    onClick={handleInitDataFile}
                    disabled={isInitializingFile}
                    className="w-full py-2 px-3 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    {isInitializingFile ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        {lang === 'zh' ? '正在在 GitHub 创建 data.json...' : 'Creating data.json on GitHub...'}
                      </>
                    ) : (
                      <>
                        <Database className="w-3.5 h-3.5" />
                        {t.initDataFileBtn}
                      </>
                    )}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Cloud Sync Operations */}
          <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800 space-y-2">
            <div className="text-xs font-medium text-neutral-700 dark:text-neutral-300 flex items-center justify-between">
              <span>{t.cloudSyncInstant}</span>
              {syncStatus.lastSyncedAt && (
                <span className="text-[11px] text-neutral-400 font-mono">
                  {t.lastSynced} {new Date(syncStatus.lastSyncedAt).toLocaleTimeString()}
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={handlePull}
                disabled={isPulling || !config.token}
                className="py-2 px-3 text-xs font-medium rounded-lg bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isPulling ? 'animate-spin' : ''}`} />
                {t.pullRemote}
              </button>

              <button
                type="button"
                onClick={handlePush}
                disabled={isPushing || !config.token}
                className="py-2 px-3 text-xs font-medium rounded-lg bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                <Upload className="w-3.5 h-3.5" />
                {t.pushLocal}
              </button>
            </div>
          </div>

          {/* Local Backup / Offline Disaster Recovery */}
          <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800 space-y-2">
            <div className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
              {t.localBackupTitle}
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={handleExportJson}
                className="py-2 px-3 text-xs font-medium rounded-lg border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 transition-colors flex items-center justify-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                {t.exportJsonBackup}
              </button>

              <label className="py-2 px-3 text-xs font-medium rounded-lg border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 transition-colors flex items-center justify-center gap-1.5 cursor-pointer">
                <Database className="w-3.5 h-3.5" />
                {t.importJsonBackup}
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-neutral-50 dark:bg-neutral-950/60 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
          >
            {t.cancel}
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-2 text-xs font-medium rounded-lg bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-colors shadow-xs"
          >
            {t.saveConfig}
          </button>
        </div>
      </div>
    </div>
  );
};
