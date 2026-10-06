/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
  GitHubConfig, 
  SyncStatus, 
  AppData, 
  Project, 
  Milestone, 
  JournalEntry 
} from './types';
import { INITIAL_DATA } from './data/initialData';
import { GitHubService } from './services/github';
import { Header, TabType } from './components/Header';
import { GitHubSettingsModal } from './components/GitHubSettingsModal';
import { DashboardView } from './components/DashboardView';
import { JournalView } from './components/JournalView';
import { ProjectMilestonesView } from './components/ProjectMilestonesView';
import { ReportGeneratorView } from './components/ReportGeneratorView';
import { ToastContainer, ToastMessage } from './components/Toast';
import { LanguageProvider, useTranslation } from './context/LanguageContext';

const CONFIG_STORAGE_KEY = 'workpulse_github_config';
const DATA_STORAGE_KEY = 'workpulse_local_data';
const SHA_STORAGE_KEY = 'workpulse_file_sha';
const THEME_STORAGE_KEY = 'workpulse_theme';

function AppContent() {
  const { lang, t } = useTranslation();

  // Theme state
  const [isDark, setIsDark] = useState<boolean>(() => {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved) return saved === 'dark';
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  // Active Tab
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  // GitHub configuration
  const [githubConfig, setGithubConfig] = useState<GitHubConfig>(() => {
    try {
      const saved = localStorage.getItem(CONFIG_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      // fallback
    }
    return {
      token: '',
      owner: '',
      repo: '',
      branch: 'main',
      path: 'data.json',
    };
  });

  // App Data (Projects, Milestones, Journals)
  const [appData, setAppData] = useState<AppData>(() => {
    try {
      const saved = localStorage.getItem(DATA_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      // fallback
    }
    return INITIAL_DATA;
  });

  // GitHub File SHA
  const [fileSha, setFileSha] = useState<string>(() => {
    return localStorage.getItem(SHA_STORAGE_KEY) || '';
  });

  // Sync Status
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(() => {
    return {
      state: githubConfig.token ? 'idle' : 'unconfigured',
      message: githubConfig.token ? t.ready : t.unconfigured,
      fileSha: '',
    };
  });

  // Modals and filters
  const [isGitHubModalOpen, setIsGitHubModalOpen] = useState(false);
  const [selectedDateFilter, setSelectedDateFilter] = useState<string | undefined>(undefined);

  // Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((text: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = 'toast-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);
    setToasts((prev) => [...prev, { id, type, text }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((item) => item.id !== id));
    }, 4000);
  }, []);

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((item) => item.id !== id));
  };

  // Sync dark class on document element
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem(THEME_STORAGE_KEY, 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem(THEME_STORAGE_KEY, 'light');
    }
  }, [isDark]);

  // Persist local data to localStorage
  const saveToLocalStorage = useCallback((data: AppData, sha?: string) => {
    localStorage.setItem(DATA_STORAGE_KEY, JSON.stringify(data));
    if (sha !== undefined) {
      setFileSha(sha);
      localStorage.setItem(SHA_STORAGE_KEY, sha);
    }
  }, []);

  // Sync helper: Push data to GitHub
  const syncToGitHub = useCallback(async (data: AppData, currentSha: string, config: GitHubConfig) => {
    if (!config.token || !config.owner || !config.repo) {
      return;
    }
    setSyncStatus((prev) => ({ ...prev, state: 'syncing', message: t.syncing }));
    try {
      const res = await GitHubService.saveRemoteData(config, data, currentSha);
      setFileSha(res.sha);
      localStorage.setItem(SHA_STORAGE_KEY, res.sha);
      setSyncStatus({
        state: 'success',
        lastSyncedAt: new Date().toISOString(),
        message: t.synced,
        fileSha: res.sha,
      });
      addToast(lang === 'zh' ? '已自动同步最新数据至 GitHub 仓库' : 'Data synced with GitHub repository', 'success');
    } catch (err: any) {
      setSyncStatus({
        state: 'error',
        message: err.message || t.syncError,
        fileSha: currentSha,
      });
      addToast(`${lang === 'zh' ? 'GitHub 云同步未成功：' : 'Sync failed: '} ${err.message || 'Error'}`, 'error');
    }
  }, [addToast, lang, t]);

  // Pull data from GitHub
  const pullFromGitHub = useCallback(async (config = githubConfig) => {
    if (!config.token || !config.owner || !config.repo) {
      addToast(lang === 'zh' ? '请先在设置中填写 GitHub Token 和仓库信息' : 'Please configure your GitHub credentials in Settings', 'info');
      setIsGitHubModalOpen(true);
      return;
    }

    setSyncStatus((prev) => ({ ...prev, state: 'syncing', message: t.syncing }));
    try {
      const result = await GitHubService.fetchRemoteData(config);
      if (result.isNewFile || !result.data) {
        addToast(lang === 'zh' ? '检测到仓库尚未创建 data.json，正在自动创建并初始化...' : 'Initializing data.json on GitHub...', 'info');
        try {
          const initRes = await GitHubService.saveRemoteData(config, appData, undefined, 'Initialize data.json via Timeline');
          setFileSha(initRes.sha);
          localStorage.setItem(SHA_STORAGE_KEY, initRes.sha);
          setSyncStatus({
            state: 'success',
            lastSyncedAt: new Date().toISOString(),
            message: t.synced,
            fileSha: initRes.sha,
          });
          addToast(lang === 'zh' ? '🎉 已在 GitHub 仓库成功创建并初始化 data.json！' : '🎉 Initialized data.json on GitHub repository successfully!', 'success');
        } catch (initErr: any) {
          setSyncStatus({
            state: 'error',
            message: initErr.message || t.syncError,
          });
          addToast(`${lang === 'zh' ? '初始化 data.json 失败：' : 'Failed to create data.json: '} ${initErr.message || ''}`, 'error');
        }
      } else {
        const mergedData = result.data;
        setAppData(mergedData);
        saveToLocalStorage(mergedData, result.sha || '');
        setSyncStatus({
          state: 'success',
          lastSyncedAt: new Date().toISOString(),
          message: t.synced,
          fileSha: result.sha || '',
        });
        addToast(lang === 'zh' ? '成功从 GitHub 仓库拉取最新工作记录' : 'Successfully pulled latest data from GitHub', 'success');
      }
    } catch (err: any) {
      setSyncStatus({
        state: 'error',
        message: err.message || t.syncError,
      });
      addToast(`${lang === 'zh' ? '拉取失败：' : 'Pull failed: '} ${err.message || ''}`, 'error');
    }
  }, [appData, githubConfig, saveToLocalStorage, addToast, lang, t]);

  // Initial pull on mount if configured
  useEffect(() => {
    if (githubConfig.token && githubConfig.owner && githubConfig.repo) {
      pullFromGitHub(githubConfig);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Save new GitHub config
  const handleSaveConfig = (newConfig: GitHubConfig) => {
    setGithubConfig(newConfig);
    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(newConfig));
    addToast(lang === 'zh' ? 'GitHub 配置已保存至本地' : 'GitHub config saved locally', 'success');
    if (newConfig.token && newConfig.owner && newConfig.repo) {
      pullFromGitHub(newConfig);
    } else {
      setSyncStatus({ state: 'unconfigured', message: t.unconfigured });
    }
  };

  // Manual Push trigger
  const handleManualPush = async () => {
    if (!githubConfig.token) {
      addToast(lang === 'zh' ? '请先配置 GitHub Token' : 'Please configure GitHub Token first', 'error');
      return;
    }
    await syncToGitHub(appData, fileSha, githubConfig);
  };

  // Generic data updater with local persistence + cloud sync
  const updateDataAndSync = useCallback((updater: (prev: AppData) => AppData) => {
    setAppData((prev) => {
      const updated = updater(prev);
      updated.updatedAt = new Date().toISOString();
      saveToLocalStorage(updated);
      if (githubConfig.token && githubConfig.owner && githubConfig.repo) {
        syncToGitHub(updated, fileSha, githubConfig);
      }
      return updated;
    });
  }, [fileSha, githubConfig, saveToLocalStorage, syncToGitHub]);

  // Journal operations
  const handleSaveJournal = (entry: JournalEntry) => {
    updateDataAndSync((prev) => {
      const exists = prev.journals.some((j) => j.id === entry.id);
      const journals = exists
        ? prev.journals.map((j) => (j.id === entry.id ? entry : j))
        : [entry, ...prev.journals];
      return { ...prev, journals };
    });
    addToast(lang === 'zh' ? '打卡记录已保存' : 'Work log saved');
  };

  const handleDeleteJournal = (id: string) => {
    updateDataAndSync((prev) => ({
      ...prev,
      journals: prev.journals.filter((j) => j.id !== id),
    }));
    addToast(lang === 'zh' ? '打卡记录已删除' : 'Work log deleted');
  };

  // Project operations
  const handleSaveProject = (project: Project) => {
    updateDataAndSync((prev) => {
      const exists = prev.projects.some((p) => p.id === project.id);
      const projects = exists
        ? prev.projects.map((p) => (p.id === project.id ? project : p))
        : [...prev.projects, project];

      const departments = prev.departments.includes(project.department)
        ? prev.departments
        : [...prev.departments, project.department];

      return { ...prev, projects, departments };
    });
    addToast(lang === 'zh' ? `项目 "${project.name}" 已保存` : `Project "${project.name}" saved`);
  };

  const handleDeleteProject = (id: string) => {
    updateDataAndSync((prev) => ({
      ...prev,
      projects: prev.projects.filter((p) => p.id !== id),
      milestones: prev.milestones.filter((m) => m.projectId !== id),
    }));
    addToast(lang === 'zh' ? '项目及关联里程碑已删除' : 'Project and milestones deleted');
  };

  // Department / Category operations
  const handleAddDepartment = (deptName: string) => {
    const trimmed = deptName.trim();
    if (!trimmed) return;
    updateDataAndSync((prev) => {
      if (prev.departments.includes(trimmed)) return prev;
      return { ...prev, departments: [...prev.departments, trimmed] };
    });
    addToast(lang === 'zh' ? `已添加类别 "${trimmed}"，全站已永久记住` : `Category "${trimmed}" added and remembered`);
  };

  const handleEditDepartment = (oldName: string, newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed || trimmed === oldName) return;
    updateDataAndSync((prev) => {
      const departments = prev.departments.map((d) => (d === oldName ? trimmed : d));
      const projects = prev.projects.map((p) => (p.department === oldName ? { ...p, department: trimmed } : p));
      return { ...prev, departments, projects };
    });
    addToast(lang === 'zh' ? `类别已重命名为 "${trimmed}"` : `Category renamed to "${trimmed}"`);
  };

  const handleDeleteDepartment = (deptName: string) => {
    updateDataAndSync((prev) => ({
      ...prev,
      departments: prev.departments.filter((d) => d !== deptName),
    }));
    addToast(lang === 'zh' ? `类别 "${deptName}" 已删除` : `Category "${deptName}" deleted`);
  };

  // Milestone operations
  const handleSaveMilestone = (milestone: Milestone) => {
    updateDataAndSync((prev) => {
      const exists = prev.milestones.some((m) => m.id === milestone.id);
      const milestones = exists
        ? prev.milestones.map((m) => (m.id === milestone.id ? milestone : m))
        : [...prev.milestones, milestone];
      return { ...prev, milestones };
    });
    addToast(lang === 'zh' ? `里程碑 "${milestone.title}" 已保存` : `Milestone "${milestone.title}" saved`);
  };

  const handleDeleteMilestone = (id: string) => {
    updateDataAndSync((prev) => ({
      ...prev,
      milestones: prev.milestones.filter((m) => m.id !== id),
    }));
    addToast(lang === 'zh' ? '里程碑已删除' : 'Milestone deleted');
  };

  // Import JSON backup
  const handleImportData = (newData: AppData) => {
    setAppData(newData);
    saveToLocalStorage(newData);
    addToast(lang === 'zh' ? '数据已恢复，即将同步至云端' : 'Data restored, syncing with cloud');
    if (githubConfig.token) {
      syncToGitHub(newData, fileSha, githubConfig);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-[#0c0d0e] text-neutral-900 dark:text-neutral-100 flex flex-col transition-colors">
      {/* Top Header */}
      <Header
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          if (tab !== 'journals') setSelectedDateFilter(undefined);
        }}
        syncStatus={syncStatus}
        onOpenGitHubSettings={() => setIsGitHubModalOpen(true)}
        onTriggerSync={() => pullFromGitHub(githubConfig)}
        onOpenNewJournal={() => {
          setActiveTab('journals');
        }}
        isDark={isDark}
        onToggleTheme={() => setIsDark(!isDark)}
      />

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 md:py-8">
        {activeTab === 'overview' && (
          <DashboardView
            projects={appData.projects}
            milestones={appData.milestones}
            journals={appData.journals}
            onSelectDate={(date) => {
              setSelectedDateFilter(date);
              setActiveTab('journals');
            }}
            onNavigateToTab={(tab) => setActiveTab(tab)}
            onOpenNewJournal={() => {
              setActiveTab('journals');
            }}
          />
        )}

        {activeTab === 'journals' && (
          <JournalView
            journals={appData.journals}
            projects={appData.projects}
            departments={appData.departments}
            onSaveJournal={handleSaveJournal}
            onDeleteJournal={handleDeleteJournal}
            onSaveProject={handleSaveProject}
            onAddDepartment={handleAddDepartment}
            selectedDateFilter={selectedDateFilter}
            onClearDateFilter={() => setSelectedDateFilter(undefined)}
          />
        )}

        {activeTab === 'projects' && (
          <ProjectMilestonesView
            projects={appData.projects}
            milestones={appData.milestones}
            journals={appData.journals}
            departments={appData.departments}
            onSaveProject={handleSaveProject}
            onDeleteProject={handleDeleteProject}
            onSaveMilestone={handleSaveMilestone}
            onDeleteMilestone={handleDeleteMilestone}
            onAddDepartment={handleAddDepartment}
            onEditDepartment={handleEditDepartment}
            onDeleteDepartment={handleDeleteDepartment}
          />
        )}

        {activeTab === 'reports' && (
          <ReportGeneratorView
            projects={appData.projects}
            milestones={appData.milestones}
            journals={appData.journals}
            onNotify={(msg) => addToast(msg)}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-200/80 dark:border-neutral-800/80 py-6 text-center text-xs text-neutral-400">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-neutral-800 dark:text-neutral-200 font-display">{t.brandName}</span>
            <span>·</span>
            <span>{t.brandTagline}</span>
          </div>

          <div className="flex items-center gap-4 text-[11px]">
            <button
              onClick={() => setIsGitHubModalOpen(true)}
              className="hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors"
            >
              {t.ghModalTitle}
            </button>
            <span>·</span>
            <span>{lang === 'zh' ? '数据私有存储于 GitHub 个人仓库' : 'Data securely stored in private GitHub repository'}</span>
          </div>
        </div>
      </footer>

      {/* GitHub Settings Modal */}
      <GitHubSettingsModal
        isOpen={isGitHubModalOpen}
        onClose={() => setIsGitHubModalOpen(false)}
        config={githubConfig}
        onSaveConfig={handleSaveConfig}
        syncStatus={syncStatus}
        onPullData={() => pullFromGitHub(githubConfig)}
        onPushData={handleManualPush}
        appData={appData}
        onImportData={handleImportData}
      />

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <AppContent />
    </LanguageProvider>
  );
}
