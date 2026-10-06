import React from 'react';
import { 
  Plus, 
  Github, 
  Sun, 
  Moon, 
  RefreshCw, 
  Check, 
  AlertCircle,
  Globe
} from 'lucide-react';
import { SyncStatus } from '../types';
import { useTranslation } from '../context/LanguageContext';
import { MichaelShaoLogo } from './MichaelShaoLogo';

export type TabType = 'overview' | 'journals' | 'projects' | 'reports';

interface HeaderProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  syncStatus: SyncStatus;
  onOpenGitHubSettings: () => void;
  onTriggerSync: () => void;
  onOpenNewJournal: () => void;
  isDark: boolean;
  onToggleTheme: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onTabChange,
  syncStatus,
  onOpenGitHubSettings,
  onTriggerSync,
  onOpenNewJournal,
  isDark,
  onToggleTheme,
}) => {
  const { lang, setLang, t } = useTranslation();

  const getSyncBadge = () => {
    switch (syncStatus.state) {
      case 'syncing':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 font-medium">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            <span className="hidden md:inline">{t.syncing}</span>
          </span>
        );
      case 'success':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
            <Check className="w-3.5 h-3.5" />
            <span className="hidden md:inline">{t.synced}</span>
          </span>
        );
      case 'error':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs text-rose-600 dark:text-rose-400 font-medium">
            <AlertCircle className="w-3.5 h-3.5" />
            <span className="hidden md:inline">{t.syncError}</span>
          </span>
        );
      case 'unconfigured':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400 font-medium">
            <Github className="w-3.5 h-3.5" />
            <span className="hidden md:inline">{t.unconfigured}</span>
          </span>
        );
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-white/80 dark:bg-[#0c0d0e]/80 backdrop-blur-xl border-b border-neutral-200/80 dark:border-neutral-800/80 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-15 flex items-center justify-between gap-4">
        {/* Zone 1: Brand Logo & Title */}
        <div className="flex items-center gap-3">
          <button 
            onClick={() => onTabChange('overview')}
            className="flex items-center gap-2.5 text-left focus:outline-none group py-0.5 cursor-pointer"
            title="Overview"
          >
            <MichaelShaoLogo className="h-7 sm:h-8 w-auto text-neutral-900 dark:text-white transition-opacity group-hover:opacity-85" size={30} />
            <div className="hidden sm:flex items-center pl-2 border-l border-neutral-300 dark:border-neutral-700">
              <span className="font-display text-sm font-semibold tracking-tight text-neutral-600 dark:text-neutral-300">
                {t.brandName}
              </span>
            </div>
          </button>
        </div>

        {/* Zone 2: Navigation Links (Clean, unboxed, subtle hover states) */}
        <nav className="flex items-center gap-1 sm:gap-1.5">
          <button
            onClick={() => onTabChange('overview')}
            className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-all whitespace-nowrap ${
              activeTab === 'overview'
                ? 'bg-neutral-100 dark:bg-neutral-800/90 text-neutral-950 dark:text-white shadow-xs'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-50 dark:hover:bg-neutral-800/40'
            }`}
          >
            {t.overview}
          </button>
          <button
            onClick={() => onTabChange('journals')}
            className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-all whitespace-nowrap ${
              activeTab === 'journals'
                ? 'bg-neutral-100 dark:bg-neutral-800/90 text-neutral-950 dark:text-white shadow-xs'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-50 dark:hover:bg-neutral-800/40'
            }`}
          >
            {t.journals}
          </button>
          <button
            onClick={() => onTabChange('projects')}
            className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-all whitespace-nowrap ${
              activeTab === 'projects'
                ? 'bg-neutral-100 dark:bg-neutral-800/90 text-neutral-950 dark:text-white shadow-xs'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-50 dark:hover:bg-neutral-800/40'
            }`}
          >
            {t.projects}
          </button>
          <button
            onClick={() => onTabChange('reports')}
            className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-all whitespace-nowrap ${
              activeTab === 'reports'
                ? 'bg-neutral-100 dark:bg-neutral-800/90 text-neutral-950 dark:text-white shadow-xs'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-50 dark:hover:bg-neutral-800/40'
            }`}
          >
            {t.reports}
          </button>
        </nav>

        {/* Zone 3: Primary Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* GitHub Status & Config trigger */}
          <button
            onClick={onOpenGitHubSettings}
            title={syncStatus.message || 'GitHub Sync Settings'}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-neutral-200/90 dark:border-neutral-800 bg-neutral-50/90 dark:bg-neutral-800/60 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 transition-colors"
          >
            {getSyncBadge()}
          </button>

          {/* Sync Trigger button if configured */}
          {syncStatus.state !== 'unconfigured' && (
            <button
              onClick={onTriggerSync}
              disabled={syncStatus.state === 'syncing'}
              title="Sync latest GitHub data"
              className="p-1.5 text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncStatus.state === 'syncing' ? 'animate-spin' : ''}`} />
            </button>
          )}

          {/* Language Switcher Button (中 / EN) */}
          <button
            onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')}
            className="px-2 py-1 text-xs font-mono font-medium rounded-lg border border-neutral-200/80 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 transition-colors flex items-center gap-1"
            title="切换语言 / Switch Language"
          >
            <Globe className="w-3 h-3 text-neutral-400" />
            <span>{lang === 'zh' ? 'EN' : '中文'}</span>
          </button>

          {/* Theme Toggle */}
          <button
            onClick={onToggleTheme}
            aria-label="Toggle theme"
            className="p-1.5 text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
          </button>

          {/* Quick Punch Button */}
          <button
            onClick={onOpenNewJournal}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 hover:bg-neutral-800 dark:hover:bg-neutral-100 rounded-lg text-xs sm:text-sm font-medium transition-colors shadow-xs shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t.newLog}</span>
            <span className="sm:hidden">{t.quickPunch}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
