import React, { useState, useMemo } from 'react';
import { Project, Milestone, JournalEntry, EventType } from '../types';
import { 
  Check, 
  Clock, 
  AlertTriangle, 
  Circle, 
  Plane, 
  Users, 
  MapPin, 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  Filter, 
  Copy, 
  FileText,
  Briefcase
} from 'lucide-react';
import { getDaysDiff, formatChineseDate } from '../utils/dateUtils';
import { useTranslation } from '../context/LanguageContext';

export type GanttScale = 'year' | 'month' | 'week';

interface GanttTimelineViewProps {
  projects: Project[];
  milestones: Milestone[];
  journals?: JournalEntry[];
  onSelectMilestone?: (milestone: Milestone) => void;
}

export const GanttTimelineView: React.FC<GanttTimelineViewProps> = ({
  projects,
  milestones,
  journals = [],
  onSelectMilestone,
}) => {
  const { lang, t } = useTranslation();

  // Scale: 'year' | 'month' | 'week'
  const [scale, setScale] = useState<GanttScale>('month');

  // Highlight / Filter special events
  const [filterSpecialOnly, setFilterSpecialOnly] = useState<boolean>(false);

  // Time navigation state
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [selectedMonth, setSelectedMonth] = useState<number>(10); // 1-12
  const [selectedWeekOffset, setSelectedWeekOffset] = useState<number>(0); // 0 = current week (Oct 5 - Oct 11, 2026)

  // Selected period interval for summary panel
  const [activeInterval, setActiveInterval] = useState<{
    label: string;
    startDate: string;
    endDate: string;
  }>({
    label: '2026年10月',
    startDate: '2026-10-01',
    endDate: '2026-10-31',
  });

  const [copiedSummary, setCopiedSummary] = useState(false);

  // Today is fixed around 2026-10-06 in local demo context
  const todayStr = '2026-10-06';
  const todayTime = new Date('2026-10-06T00:00:00').getTime();

  // Calculate Week range based on offset (base week: 2026-10-05 to 2026-10-11)
  const currentWeekDays = useMemo(() => {
    const baseMonday = new Date('2026-10-05T00:00:00');
    baseMonday.setDate(baseMonday.getDate() + selectedWeekOffset * 7);

    const days: { dateStr: string; dayName: string; dayNum: number; isToday: boolean }[] = [];
    const weekdaysZh = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
    const weekdaysEn = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    for (let i = 0; i < 7; i++) {
      const d = new Date(baseMonday);
      d.setDate(baseMonday.getDate() + i);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const dayVal = String(d.getDate()).padStart(2, '0');
      const dateStr = `${y}-${m}-${dayVal}`;

      days.push({
        dateStr,
        dayName: lang === 'zh' ? weekdaysZh[i] : weekdaysEn[i],
        dayNum: d.getDate(),
        isToday: dateStr === todayStr,
      });
    }
    return days;
  }, [selectedWeekOffset, lang]);

  // Synchronize active interval on scale/navigation change
  React.useEffect(() => {
    if (scale === 'year') {
      setActiveInterval({
        label: `${selectedYear}${lang === 'zh' ? '年全年' : ' Full Year'}`,
        startDate: `${selectedYear}-01-01`,
        endDate: `${selectedYear}-12-31`,
      });
    } else if (scale === 'month') {
      const monthPadded = String(selectedMonth).padStart(2, '0');
      const lastDay = new Date(selectedYear, selectedMonth, 0).getDate();
      setActiveInterval({
        label: lang === 'zh' ? `${selectedYear}年${selectedMonth}月` : `${new Date(selectedYear, selectedMonth - 1).toLocaleString('en', { month: 'short' })} ${selectedYear}`,
        startDate: `${selectedYear}-${monthPadded}-01`,
        endDate: `${selectedYear}-${monthPadded}-${lastDay}`,
      });
    } else {
      const start = currentWeekDays[0]?.dateStr || '2026-10-05';
      const end = currentWeekDays[6]?.dateStr || '2026-10-11';
      setActiveInterval({
        label: lang === 'zh' ? `第 41 周 (${start.slice(5)} ~ ${end.slice(5)})` : `Week (${start.slice(5)} to ${end.slice(5)})`,
        startDate: start,
        endDate: end,
      });
    }
  }, [scale, selectedYear, selectedMonth, selectedWeekOffset, currentWeekDays, lang]);

  // Combined special items (Milestones + Journals)
  const specialEvents = useMemo(() => {
    const list: {
      id: string;
      title: string;
      date: string;
      endDate?: string;
      projectId: string;
      eventType: EventType;
      location?: string;
      source: 'milestone' | 'journal';
      notes?: string;
    }[] = [];

    // From milestones
    milestones.forEach((m) => {
      if (m.eventType === 'business_trip' || m.eventType === 'client_meeting') {
        list.push({
          id: 'ms-' + m.id,
          title: m.title,
          date: m.dueDate,
          projectId: m.projectId,
          eventType: m.eventType,
          location: m.location,
          source: 'milestone',
          notes: m.notes,
        });
      }
    });

    // From journals
    journals.forEach((j) => {
      if (j.eventType === 'business_trip' || j.eventType === 'client_meeting') {
        list.push({
          id: 'j-' + j.id,
          title: j.content.split('\n')[0]?.replace(/^[-*]\s+/, '') || (j.eventType === 'business_trip' ? '出差' : '客户会面'),
          date: j.date,
          endDate: j.endDate,
          projectId: j.projectId,
          eventType: j.eventType,
          location: j.location,
          source: 'journal',
          notes: j.content,
        });
      }
    });

    return list;
  }, [milestones, journals]);

  // Filtered milestones based on toggle
  const getFilteredMilestones = (projectMilestones: Milestone[]) => {
    if (!filterSpecialOnly) return projectMilestones;
    return projectMilestones.filter(
      (m) => m.eventType === 'business_trip' || m.eventType === 'client_meeting'
    );
  };

  // Filtered journals for interval summary
  const intervalSummaryData = useMemo(() => {
    const { startDate, endDate } = activeInterval;

    const inRangeJournals = journals.filter(
      (j) => j.date >= startDate && j.date <= endDate
    );

    const inRangeMilestones = milestones.filter(
      (m) => m.dueDate >= startDate && m.dueDate <= endDate
    );

    const trips = specialEvents.filter(
      (e) => e.eventType === 'business_trip' && e.date >= startDate && e.date <= endDate
    );

    const clientMeetings = specialEvents.filter(
      (e) => e.eventType === 'client_meeting' && e.date >= startDate && e.date <= endDate
    );

    const totalHours = Math.round(inRangeJournals.reduce((acc, cur) => acc + (cur.hours || 0), 0) * 10) / 10;

    return {
      journals: inRangeJournals,
      milestones: inRangeMilestones,
      trips,
      clientMeetings,
      totalHours,
    };
  }, [activeInterval, journals, milestones, specialEvents]);

  // Copy period summary text
  const handleCopySummary = () => {
    let text = `【${activeInterval.label} 工作总结】(${activeInterval.startDate} ~ ${activeInterval.endDate})\n`;
    text += `总投入工时: ${intervalSummaryData.totalHours}h\n\n`;

    if (intervalSummaryData.trips.length > 0) {
      text += `🛫 出差行程:\n`;
      intervalSummaryData.trips.forEach((tItem) => {
        text += `- [${tItem.date}] ${tItem.title} ${tItem.location ? `(@ ${tItem.location})` : ''}\n`;
      });
      text += `\n`;
    }

    if (intervalSummaryData.clientMeetings.length > 0) {
      text += `🤝 客户会面 / 关键交付:\n`;
      intervalSummaryData.clientMeetings.forEach((mItem) => {
        text += `- [${mItem.date}] ${mItem.title} ${mItem.location ? `(@ ${mItem.location})` : ''}\n`;
      });
      text += `\n`;
    }

    text += `📋 重点任务与产出:\n`;
    projects.forEach((p) => {
      const pJournals = intervalSummaryData.journals.filter((j) => j.projectId === p.id);
      if (pJournals.length > 0) {
        text += `\n🔹 ${p.name}:\n`;
        pJournals.forEach((j) => {
          text += `  · ${j.date}: ${j.content.split('\n')[0]}\n`;
        });
      }
    });

    navigator.clipboard.writeText(text);
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 2000);
  };

  // Render node icon with special highlight for trips and client meetings
  const renderEventNode = (m: Milestone | typeof specialEvents[0]) => {
    if (m.eventType === 'business_trip') {
      return (
        <div className="w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center ring-4 ring-amber-100 dark:ring-amber-950/80 shadow-md transform hover:scale-125 transition-transform" title={lang === 'zh' ? '出差事件' : 'Business Trip'}>
          <Plane className="w-3.5 h-3.5" />
        </div>
      );
    }
    if (m.eventType === 'client_meeting') {
      return (
        <div className="w-6 h-6 rounded-full bg-purple-600 text-white flex items-center justify-center ring-4 ring-purple-100 dark:ring-purple-950/80 shadow-md transform hover:scale-125 transition-transform" title={lang === 'zh' ? '客户会面 / 现场交付' : 'Client Meeting'}>
          <Users className="w-3.5 h-3.5" />
        </div>
      );
    }
    if ('status' in m) {
      switch (m.status) {
        case 'completed':
          return (
            <div className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-xs">
              <Check className="w-3 h-3 stroke-3" />
            </div>
          );
        case 'in_progress':
          return (
            <div className="w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center ring-4 ring-blue-100 dark:ring-blue-950 shadow-xs">
              <Clock className="w-3 h-3" />
            </div>
          );
        case 'delayed':
          return (
            <div className="w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center ring-4 ring-rose-100 dark:ring-rose-950 shadow-xs">
              <AlertTriangle className="w-3 h-3" />
            </div>
          );
        default:
          return (
            <div className="w-5 h-5 rounded-full bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 flex items-center justify-center border border-neutral-300 dark:border-neutral-600">
              <Circle className="w-2 h-2 fill-current" />
            </div>
          );
      }
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Timescale Selector */}
      <div className="bg-white dark:bg-[#121316] border border-neutral-200/80 dark:border-neutral-800/80 rounded-xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.03)] space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-semibold text-neutral-900 dark:text-white font-display flex items-center gap-2">
              <Calendar className="w-4.5 h-4.5 text-neutral-500" />
              <span>{t.timelineTitle}</span>
            </h3>
            <p className="text-xs text-neutral-500 mt-0.5">
              {t.timelineSubtitle}
            </p>
          </div>

          {/* Controls Right */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Filter Special Events Toggle */}
            <button
              onClick={() => setFilterSpecialOnly(!filterSpecialOnly)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors flex items-center gap-1.5 ${
                filterSpecialOnly
                  ? 'bg-amber-500/10 border-amber-500 text-amber-700 dark:text-amber-300 font-semibold'
                  : 'border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800'
              }`}
            >
              <Plane className="w-3.5 h-3.5 text-amber-500" />
              <span>{t.filterSpecialEvents}</span>
            </button>

            {/* Timescale Switcher: Year / Month / Week */}
            <div className="flex items-center gap-1 p-1 bg-neutral-100 dark:bg-neutral-800 rounded-lg">
              <button
                onClick={() => setScale('year')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  scale === 'year'
                    ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-xs'
                    : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                }`}
              >
                {t.scaleYear}
              </button>
              <button
                onClick={() => setScale('month')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  scale === 'month'
                    ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-xs'
                    : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                }`}
              >
                {t.scaleMonth}
              </button>
              <button
                onClick={() => setScale('week')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  scale === 'week'
                    ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-xs'
                    : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                }`}
              >
                {t.scaleWeek}
              </button>
            </div>
          </div>
        </div>

        {/* Timescale Navigation & Legend Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-neutral-100 dark:border-neutral-800/80 text-xs">
          {/* Navigator based on scale */}
          <div className="flex items-center gap-2">
            {scale === 'year' && (
              <div className="flex items-center gap-2 font-mono font-semibold text-neutral-800 dark:text-neutral-200">
                <button
                  onClick={() => setSelectedYear((y) => y - 1)}
                  className="p-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span>{selectedYear}年</span>
                <button
                  onClick={() => setSelectedYear((y) => y + 1)}
                  className="p-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {scale === 'month' && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    if (selectedMonth === 1) {
                      setSelectedYear((y) => y - 1);
                      setSelectedMonth(12);
                    } else {
                      setSelectedMonth((m) => m - 1);
                    }
                  }}
                  className="p-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="font-semibold text-neutral-800 dark:text-neutral-200 font-mono">
                  {selectedYear}年 {selectedMonth}月
                </span>
                <button
                  onClick={() => {
                    if (selectedMonth === 12) {
                      setSelectedYear((y) => y + 1);
                      setSelectedMonth(1);
                    } else {
                      setSelectedMonth((m) => m + 1);
                    }
                  }}
                  className="p-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    setSelectedYear(2026);
                    setSelectedMonth(10);
                  }}
                  className="ml-1 text-[11px] text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 underline"
                >
                  {t.todayBtn}
                </button>
              </div>
            )}

            {scale === 'week' && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedWeekOffset((o) => o - 1)}
                  className="p-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="font-semibold text-neutral-800 dark:text-neutral-200 font-mono">
                  {currentWeekDays[0]?.dateStr} ~ {currentWeekDays[6]?.dateStr}
                </span>
                <button
                  onClick={() => setSelectedWeekOffset((o) => o + 1)}
                  className="p-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setSelectedWeekOffset(0)}
                  className="ml-1 text-[11px] text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 underline"
                >
                  {t.todayBtn}
                </button>
              </div>
            )}
          </div>

          {/* Special Event Legends */}
          <div className="flex items-center gap-3.5 flex-wrap">
            <div className="flex items-center gap-1.5 font-medium text-amber-700 dark:text-amber-400">
              <div className="w-3.5 h-3.5 rounded-full bg-amber-500 flex items-center justify-center text-white">
                <Plane className="w-2.5 h-2.5" />
              </div>
              <span>{t.eventBusinessTrip}</span>
            </div>

            <div className="flex items-center gap-1.5 font-medium text-purple-700 dark:text-purple-400">
              <div className="w-3.5 h-3.5 rounded-full bg-purple-600 flex items-center justify-center text-white">
                <Users className="w-2.5 h-2.5" />
              </div>
              <span>{t.eventClientMeeting}</span>
            </div>

            <div className="flex items-center gap-1.5 text-neutral-500">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>{t.delivered}</span>
            </div>

            <div className="flex items-center gap-1.5 text-neutral-500">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              <span>{t.inProgress}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Gantt Timeline Visual Matrix */}
      <div className="bg-white dark:bg-[#121316] border border-neutral-200/80 dark:border-neutral-800/80 rounded-xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.03)] overflow-x-auto">
        <div className="min-w-[840px] space-y-6">
          {/* Header Axis by Scale */}
          {scale === 'year' && (
            <div className="relative h-8 border-b border-neutral-200 dark:border-neutral-800 ml-48 flex justify-between text-xs text-neutral-400 font-mono">
              {Array.from({ length: 12 }, (_, i) => i + 1).map((mNum) => {
                const isCur = mNum === 10;
                return (
                  <button
                    key={mNum}
                    onClick={() => {
                      setScale('month');
                      setSelectedMonth(mNum);
                    }}
                    className={`flex-1 text-center hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer ${
                      isCur ? 'font-bold text-neutral-900 dark:text-white' : ''
                    }`}
                  >
                    <span>{mNum}月</span>
                    {isCur && <span className="block w-1.5 h-1.5 rounded-full bg-rose-500 mx-auto mt-0.5" />}
                  </button>
                );
              })}
            </div>
          )}

          {scale === 'month' && (
            <div className="relative h-8 border-b border-neutral-200 dark:border-neutral-800 ml-48 flex justify-between text-xs text-neutral-400 font-mono">
              {[1, 5, 10, 15, 20, 25, 30].map((dayNum) => (
                <div key={dayNum} className="flex-1 text-left pl-1">
                  <span>{selectedMonth}月{dayNum}日</span>
                </div>
              ))}
              {/* Today line if within this month */}
              {selectedMonth === 10 && (
                <div
                  className="absolute top-0 bottom-[-320px] w-px bg-rose-500 z-20 pointer-events-none opacity-80"
                  style={{ left: `${(6 / 31) * 100}%` }}
                >
                  <div className="absolute -top-5 -translate-x-1/2 bg-rose-500 text-white text-[10px] font-mono px-1.5 py-0.5 rounded shadow-xs whitespace-nowrap">
                    {t.todayMarker} (10-06)
                  </div>
                </div>
              )}
            </div>
          )}

          {scale === 'week' && (
            <div className="relative h-10 border-b border-neutral-200 dark:border-neutral-800 ml-48 flex justify-between text-xs font-mono">
              {currentWeekDays.map((d) => (
                <div
                  key={d.dateStr}
                  className={`flex-1 text-center py-0.5 border-r border-neutral-100 dark:border-neutral-800/60 last:border-0 ${
                    d.isToday ? 'bg-rose-50/60 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 font-bold rounded-t' : 'text-neutral-500'
                  }`}
                >
                  <div>{d.dayName}</div>
                  <div className="text-[11px]">{d.dayNum}日</div>
                </div>
              ))}
            </div>
          )}

          {/* Project Rows */}
          {projects.map((project) => {
            const projectMilestones = getFilteredMilestones(
              milestones.filter((m) => m.projectId === project.id)
            );
            const projectJournals = journals.filter((j) => j.projectId === project.id);
            const projectTrips = specialEvents.filter((e) => e.projectId === project.id);

            return (
              <div key={project.id} className="flex items-center group relative min-h-[48px]">
                {/* Project Info Column */}
                <div className="w-48 shrink-0 pr-4">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: project.color }}
                    />
                    <span className="text-xs font-semibold text-neutral-900 dark:text-white truncate font-display">
                      {project.name}
                    </span>
                  </div>
                  <div className="text-[11px] text-neutral-400 mt-0.5 flex items-center gap-1 font-mono">
                    <span>{project.department}</span>
                    <span>·</span>
                    <span>{projectMilestones.length} {t.nodesCount.replace('{count}', '')}</span>
                  </div>
                </div>

                {/* Track Axis */}
                <div className="flex-1 relative h-12 flex items-center">
                  {/* Subtle track bar */}
                  <div className="w-full h-2 bg-neutral-100 dark:bg-neutral-800/70 rounded-full" />

                  {/* Render based on Scale */}
                  {scale === 'year' && (
                    <>
                      {projectMilestones.map((m) => {
                        const mMonth = parseInt(m.dueDate.slice(5, 7), 10);
                        const posPct = Math.max(2, Math.min(98, ((mMonth - 0.5) / 12) * 100));
                        return (
                          <div
                            key={m.id}
                            className="absolute -translate-x-1/2 cursor-pointer z-10"
                            style={{ left: `${posPct}%` }}
                            onClick={() => onSelectMilestone && onSelectMilestone(m)}
                          >
                            {renderEventNode(m)}
                          </div>
                        );
                      })}
                    </>
                  )}

                  {scale === 'month' && (
                    <>
                      {projectMilestones.map((m) => {
                        const isThisMonth = parseInt(m.dueDate.slice(5, 7), 10) === selectedMonth;
                        if (!isThisMonth) return null;
                        const dayNum = parseInt(m.dueDate.slice(8, 10), 10);
                        const posPct = Math.max(2, Math.min(98, (dayNum / 31) * 100));
                        const isSpecial = m.eventType === 'business_trip' || m.eventType === 'client_meeting';

                        return (
                          <div
                            key={m.id}
                            className="absolute -translate-x-1/2 cursor-pointer z-10"
                            style={{ left: `${posPct}%` }}
                            onClick={() => onSelectMilestone && onSelectMilestone(m)}
                          >
                            {renderEventNode(m)}

                            {/* Label for special events */}
                            {isSpecial && (
                              <div className="absolute top-7 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-medium px-1.5 py-0.5 rounded shadow-xs bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700">
                                <span>{m.eventType === 'business_trip' ? '🛫 ' : '🤝 '}</span>
                                <span className="font-sans">{m.title.slice(0, 10)}...</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </>
                  )}

                  {scale === 'week' && (
                    <div className="w-full h-full flex items-center">
                      {currentWeekDays.map((d, dIdx) => {
                        const dayMilestones = projectMilestones.filter((m) => m.dueDate === d.dateStr);
                        const dayJournals = projectJournals.filter((j) => j.date === d.dateStr);
                        const daySpecial = dayJournals.filter((j) => j.eventType === 'business_trip' || j.eventType === 'client_meeting');

                        return (
                          <div
                            key={d.dateStr}
                            className="flex-1 h-full border-r border-neutral-100 dark:border-neutral-800/60 last:border-0 flex items-center justify-center relative p-1"
                          >
                            {dayMilestones.map((m) => (
                              <div
                                key={m.id}
                                className="cursor-pointer mx-0.5"
                                onClick={() => onSelectMilestone && onSelectMilestone(m)}
                              >
                                {renderEventNode(m)}
                              </div>
                            ))}

                            {daySpecial.map((s) => (
                              <div
                                key={s.id}
                                className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md flex items-center gap-1 shadow-xs ${
                                  s.eventType === 'business_trip'
                                    ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-700'
                                    : 'bg-purple-100 dark:bg-purple-950/80 text-purple-800 dark:text-purple-200 border border-purple-300 dark:border-purple-700'
                                }`}
                              >
                                {s.eventType === 'business_trip' ? <Plane className="w-3 h-3 shrink-0" /> : <Users className="w-3 h-3 shrink-0" />}
                                <span className="truncate max-w-[80px]">{s.location || s.content.slice(0, 6)}</span>
                              </div>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Period Work Content Summary Drawer / Card (重点：总结各个时间段的工作内容) */}
      <div className="bg-white dark:bg-[#121316] border border-neutral-200/80 dark:border-neutral-800/80 rounded-xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.03)] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h4 className="text-sm font-semibold text-neutral-900 dark:text-white flex items-center gap-2 font-display">
              <Briefcase className="w-4 h-4 text-neutral-500" />
              <span>{t.currentSelectedPeriod}: {activeInterval.label}</span>
              <span className="text-xs text-neutral-400 font-mono font-normal">
                ({activeInterval.startDate} ~ {activeInterval.endDate})
              </span>
            </h4>
            <p className="text-xs text-neutral-500 mt-0.5">
              {t.clickPeriodToView} · 累计记录工时 <strong className="font-mono text-neutral-800 dark:text-neutral-200">{intervalSummaryData.totalHours}h</strong>
            </p>
          </div>

          <button
            onClick={handleCopySummary}
            className="px-3 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 text-xs font-medium text-neutral-800 dark:text-neutral-200 transition-colors flex items-center gap-1.5 self-start sm:self-auto"
          >
            {copiedSummary ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedSummary ? t.copied : '复制此时段总结'}</span>
          </button>
        </div>

        {/* Highlights: Trips & Meetings in this period */}
        {(intervalSummaryData.trips.length > 0 || intervalSummaryData.clientMeetings.length > 0) && (
          <div className="p-3.5 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/70 dark:border-amber-800/50 space-y-2.5">
            <div className="text-xs font-semibold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
              <span>🌟 本时段关键外勤、出差与客户交付</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {intervalSummaryData.trips.map((trip) => (
                <div
                  key={trip.id}
                  className="p-2.5 rounded-lg bg-white/80 dark:bg-neutral-900/80 border border-amber-200 dark:border-amber-900 text-xs space-y-1 shadow-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-400 font-semibold">
                      <Plane className="w-3.5 h-3.5" />
                      {t.eventBusinessTrip}
                    </span>
                    <span className="font-mono text-[11px] text-neutral-400">{trip.date}</span>
                  </div>
                  <div className="font-medium text-neutral-800 dark:text-neutral-200">{trip.title}</div>
                  {trip.location && (
                    <div className="text-[11px] text-neutral-500 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-neutral-400" />
                      <span>{trip.location}</span>
                    </div>
                  )}
                </div>
              ))}

              {intervalSummaryData.clientMeetings.map((cm) => (
                <div
                  key={cm.id}
                  className="p-2.5 rounded-lg bg-white/80 dark:bg-neutral-900/80 border border-purple-200 dark:border-purple-900 text-xs space-y-1 shadow-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1 text-purple-700 dark:text-purple-400 font-semibold">
                      <Users className="w-3.5 h-3.5" />
                      {t.eventClientMeeting}
                    </span>
                    <span className="font-mono text-[11px] text-neutral-400">{cm.date}</span>
                  </div>
                  <div className="font-medium text-neutral-800 dark:text-neutral-200">{cm.title}</div>
                  {cm.location && (
                    <div className="text-[11px] text-neutral-500 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-neutral-400" />
                      <span>{cm.location}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Deliverables and Tasks by Project */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          {projects.map((p) => {
            const pJournals = intervalSummaryData.journals.filter((j) => j.projectId === p.id);
            const pMilestones = intervalSummaryData.milestones.filter((m) => m.projectId === p.id);
            if (pJournals.length === 0 && pMilestones.length === 0) return null;

            return (
              <div
                key={p.id}
                className="p-3.5 rounded-xl border border-neutral-100 dark:border-neutral-800 bg-neutral-50/40 dark:bg-neutral-800/20 space-y-2"
              >
                <div className="flex items-center justify-between text-xs pb-1.5 border-b border-neutral-100 dark:border-neutral-800">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: p.color }}
                    />
                    <span className="font-semibold text-neutral-900 dark:text-white font-display">
                      {p.name}
                    </span>
                  </div>
                  <span className="text-neutral-400 text-[11px] font-mono">
                    {pJournals.length} logs
                  </span>
                </div>

                {/* Milestones in this period */}
                {pMilestones.length > 0 && (
                  <div className="space-y-1">
                    {pMilestones.map((m) => (
                      <div key={m.id} className="text-xs text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                        <span className="font-medium">{m.title}</span>
                        <span className="text-[10px] text-neutral-400 font-mono">({m.dueDate})</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Journal bullets */}
                <div className="space-y-1 text-xs text-neutral-600 dark:text-neutral-400">
                  {pJournals.slice(0, 3).map((j) => (
                    <div key={j.id} className="line-clamp-1">
                      · <span className="font-mono text-neutral-500 text-[11px]">{j.date.slice(5)}</span>: {j.content.split('\n')[0]?.replace(/^[-*]\s+/, '')}
                    </div>
                  ))}
                  {pJournals.length > 3 && (
                    <div className="text-[11px] text-neutral-400 pl-2">
                      ... 等共 {pJournals.length} 条记录
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
