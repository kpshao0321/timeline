import React from 'react';
import { Project, Milestone, JournalEntry } from '../types';
import { HeatmapCalendar } from './HeatmapCalendar';
import { EffortDistributionChart } from './EffortDistributionChart';
import { 
  FolderKanban, 
  Clock, 
  Flag, 
  Calendar, 
  ChevronRight, 
  Plus
} from 'lucide-react';
import { getDaysDiff, formatChineseDate } from '../utils/dateUtils';
import { useTranslation } from '../context/LanguageContext';

interface DashboardViewProps {
  projects: Project[];
  milestones: Milestone[];
  journals: JournalEntry[];
  onSelectDate: (date: string) => void;
  onNavigateToTab: (tab: 'journals' | 'projects' | 'reports') => void;
  onOpenNewJournal: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  projects,
  milestones,
  journals,
  onSelectDate,
  onNavigateToTab,
  onOpenNewJournal,
}) => {
  const { lang, t } = useTranslation();

  // Stats
  const activeDaysCount = new Set(journals.map((j) => j.date)).size;
  const activeProjectsCount = projects.filter((p) => p.status === 'active').length;
  const completedMilestones = milestones.filter((m) => m.status === 'completed').length;
  const inProgressMilestones = milestones.filter((m) => m.status === 'in_progress').length;
  const delayedMilestones = milestones.filter((m) => m.status === 'delayed').length;

  // Total hours this month (October 2026)
  const currentMonthPrefix = '2026-10';
  const thisMonthHours = journals
    .filter((j) => j.date.startsWith(currentMonthPrefix))
    .reduce((acc, cur) => acc + (cur.hours || 0), 0);

  // Recent 4 entries
  const recentEntries = [...journals]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 4);

  // Upcoming milestones (in_progress or todo or delayed) sorted by due date
  const upcomingMilestones = milestones
    .filter((m) => m.status !== 'completed')
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .slice(0, 5);

  const formatDateDisplay = (dateStr: string) => {
    if (lang === 'zh') return formatChineseDate(dateStr);
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', weekday: 'short' });
  };

  return (
    <div className="space-y-6">
      {/* 4 Metric Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="bg-white dark:bg-[#121316] border border-neutral-200/80 dark:border-neutral-800/80 rounded-xl p-4.5 shadow-[0_1px_3px_rgba(0,0,0,0.03)] hover:border-neutral-300 dark:hover:border-neutral-700 transition-colors">
          <div className="text-xs text-neutral-500 flex items-center justify-between">
            <span className="font-medium">{t.hoursThisMonth}</span>
            <Clock className="w-3.5 h-3.5 text-neutral-400" />
          </div>
          <div className="mt-2.5 flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-bold font-mono tabular-nums tracking-tight text-neutral-900 dark:text-white">
              {Math.round(thisMonthHours * 10) / 10}
            </span>
            <span className="text-xs font-mono text-neutral-400">{t.hoursSuffix}</span>
          </div>
          <div className="mt-1 text-[11px] text-neutral-400 truncate">
            {t.coveringProjects.replace('{count}', String(activeProjectsCount))}
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-white dark:bg-[#121316] border border-neutral-200/80 dark:border-neutral-800/80 rounded-xl p-4.5 shadow-[0_1px_3px_rgba(0,0,0,0.03)] hover:border-neutral-300 dark:hover:border-neutral-700 transition-colors">
          <div className="text-xs text-neutral-500 flex items-center justify-between">
            <span className="font-medium">{t.daysLogged}</span>
            <Calendar className="w-3.5 h-3.5 text-neutral-400" />
          </div>
          <div className="mt-2.5 flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-bold font-mono tabular-nums tracking-tight text-neutral-900 dark:text-white">
              {activeDaysCount}
            </span>
            <span className="text-xs text-neutral-400">{t.daysActiveSuffix}</span>
          </div>
          <div className="mt-1 text-[11px] text-neutral-400 truncate">
            {journals.length} {t.totalWorkLogs}
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-white dark:bg-[#121316] border border-neutral-200/80 dark:border-neutral-800/80 rounded-xl p-4.5 shadow-[0_1px_3px_rgba(0,0,0,0.03)] hover:border-neutral-300 dark:hover:border-neutral-700 transition-colors">
          <div className="text-xs text-neutral-500 flex items-center justify-between">
            <span className="font-medium">{t.activeProjects}</span>
            <FolderKanban className="w-3.5 h-3.5 text-neutral-400" />
          </div>
          <div className="mt-2.5 flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-bold font-mono tabular-nums tracking-tight text-neutral-900 dark:text-white">
              {activeProjectsCount}
            </span>
            <span className="text-xs text-neutral-400">/ {projects.length}</span>
          </div>
          <div className="mt-1 text-[11px] text-neutral-400 truncate">
            {t.crossTeam}
          </div>
        </div>

        {/* Metric 4 */}
        <div className="bg-white dark:bg-[#121316] border border-neutral-200/80 dark:border-neutral-800/80 rounded-xl p-4.5 shadow-[0_1px_3px_rgba(0,0,0,0.03)] hover:border-neutral-300 dark:hover:border-neutral-700 transition-colors">
          <div className="text-xs text-neutral-500 flex items-center justify-between">
            <span className="font-medium">{t.milestoneDeliveryRate}</span>
            <Flag className="w-3.5 h-3.5 text-neutral-400" />
          </div>
          <div className="mt-2.5 flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-bold font-mono tabular-nums tracking-tight text-neutral-900 dark:text-white">
              {milestones.length > 0 ? Math.round((completedMilestones / milestones.length) * 100) : 0}%
            </span>
            <span className="text-xs text-neutral-400 font-mono">
              ({completedMilestones}/{milestones.length} {t.achieved})
            </span>
          </div>
          <div className="mt-1 text-[11px] text-neutral-400 flex items-center gap-1.5 truncate">
            <span>{inProgressMilestones} {t.inProgressCount}</span>
            {delayedMilestones > 0 && (
              <span className="text-rose-500 font-medium">· {delayedMilestones} {t.riskCount}</span>
            )}
          </div>
        </div>
      </div>

      {/* Activity Heatmap Grid */}
      <HeatmapCalendar
        journals={journals}
        onSelectDate={(date) => {
          onSelectDate(date);
          onNavigateToTab('journals');
        }}
      />

      {/* Charts & Upcoming Milestones 2-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 7 cols: Effort distribution */}
        <div className="lg:col-span-7">
          <EffortDistributionChart projects={projects} journals={journals} />
        </div>

        {/* Right 5 cols: Upcoming Milestones */}
        <div className="lg:col-span-5 bg-white dark:bg-[#121316] border border-neutral-200/80 dark:border-neutral-800/80 rounded-xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.03)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3.5">
              <h3 className="text-sm font-semibold text-neutral-900 dark:text-white flex items-center gap-2">
                <Flag className="w-4 h-4 text-neutral-400" />
                {t.upcomingMilestones}
              </h3>
              <button
                onClick={() => onNavigateToTab('projects')}
                className="text-xs text-neutral-500 hover:text-neutral-900 dark:hover:text-white flex items-center gap-0.5 transition-colors"
              >
                {t.viewAll} <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            <div className="space-y-2.5">
              {upcomingMilestones.map((m) => {
                const p = projects.find((proj) => proj.id === m.projectId);
                const diff = getDaysDiff(m.dueDate);
                return (
                  <div
                    key={m.id}
                    className="p-3 rounded-lg border border-neutral-100 dark:border-neutral-800/80 bg-neutral-50/50 dark:bg-neutral-800/30 space-y-1 hover:border-neutral-300 dark:hover:border-neutral-700 transition-colors"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: p?.color || '#3b82f6' }}
                        />
                        {m.eventType === 'business_trip' && (
                          <span className="text-amber-500 text-xs shrink-0 font-bold" title="出差">🛫</span>
                        )}
                        {m.eventType === 'client_meeting' && (
                          <span className="text-purple-500 text-xs shrink-0 font-bold" title="客户会面">🤝</span>
                        )}
                        <span className="font-semibold text-neutral-800 dark:text-neutral-200 truncate">
                          {m.title}
                        </span>
                      </div>
                      <span className={`text-[11px] font-mono shrink-0 ${
                        diff < 0 
                          ? 'text-rose-600 dark:text-rose-400 font-semibold' 
                          : diff <= 3 
                          ? 'text-amber-600 dark:text-amber-400 font-semibold' 
                          : 'text-neutral-400'
                      }`}>
                        {diff < 0
                          ? t.daysOverdue.replace('{days}', String(Math.abs(diff)))
                          : t.daysLeft.replace('{days}', String(diff))}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-neutral-500">
                      <span>{p?.name}</span>
                      <span className="font-mono">{m.dueDate}</span>
                    </div>
                  </div>
                );
              })}

              {upcomingMilestones.length === 0 && (
                <div className="text-xs text-neutral-400 py-8 text-center font-medium">
                  {t.allMilestonesDone}
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-neutral-100 dark:border-neutral-800/80 flex items-center justify-between">
            <span className="text-xs text-neutral-500">
              {t.nodesCount.replace('{count}', String(milestones.length))}
            </span>
            <button
              onClick={() => onNavigateToTab('projects')}
              className="text-xs text-neutral-700 dark:text-neutral-300 font-medium hover:underline"
            >
              {t.ganttView} →
            </button>
          </div>
        </div>
      </div>

      {/* Recent Daily Punches list */}
      <div className="bg-white dark:bg-[#121316] border border-neutral-200/80 dark:border-neutral-800/80 rounded-xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">
              {lang === 'zh' ? '近期工作打卡精选' : 'Recent Work Logs'}
            </h3>
            <p className="text-xs text-neutral-500">
              {lang === 'zh' ? '最新提交的工作进展概览' : 'Overview of recently logged tasks and achievements'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onOpenNewJournal}
              className="px-3 py-1.5 rounded-lg bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 text-xs font-medium hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-colors flex items-center gap-1.5 shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              {t.newLog}
            </button>
            <button
              onClick={() => onNavigateToTab('journals')}
              className="px-3 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-800 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
            >
              {t.viewAll}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {recentEntries.map((entry) => {
            const p = projects.find((proj) => proj.id === entry.projectId);
            return (
              <div
                key={entry.id}
                className="p-3.5 rounded-lg border border-neutral-100 dark:border-neutral-800 bg-neutral-50/40 dark:bg-neutral-800/20 space-y-2 hover:border-neutral-300 dark:hover:border-neutral-700 transition-colors"
              >
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: p?.color || '#3b82f6' }}
                    />
                    <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                      {p?.name}
                    </span>
                  </div>
                  <span className="font-mono text-neutral-400">
                    {formatDateDisplay(entry.date)}
                  </span>
                </div>

                <div className="text-xs text-neutral-600 dark:text-neutral-300 line-clamp-2 leading-relaxed font-sans">
                  {entry.content}
                </div>

                <div className="flex items-center justify-between text-[11px] text-neutral-400 pt-1.5 border-t border-neutral-100 dark:border-neutral-800/60 font-mono">
                  <span>{t.hoursSlider}: {entry.hours}h</span>
                  <span>{t.energySlider}: {entry.energyPercent}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
