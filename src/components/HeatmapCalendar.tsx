import React, { useState } from 'react';
import { JournalEntry } from '../types';
import { generateHeatmapGrid, formatChineseDate } from '../utils/dateUtils';
import { Flame } from 'lucide-react';
import { useTranslation } from '../context/LanguageContext';

interface HeatmapCalendarProps {
  journals: JournalEntry[];
  onSelectDate: (date: string) => void;
  selectedDate?: string;
}

export const HeatmapCalendar: React.FC<HeatmapCalendarProps> = ({
  journals,
  onSelectDate,
  selectedDate,
}) => {
  const { lang, t } = useTranslation();
  const [hoveredDay, setHoveredDay] = useState<{
    date: string;
    hours: number;
    count: number;
    x: number;
    y: number;
  } | null>(null);

  // Generate 20 weeks of activity (approx 5 months)
  const { columns, monthLabels } = generateHeatmapGrid(journals, 20);

  // Calculate streak and active days
  const activeDaysSet = new Set(journals.map((j) => j.date));
  const totalLoggedHours = Math.round(journals.reduce((acc, j) => acc + (j.hours || 0), 0) * 10) / 10;
  
  // Calculate current streak
  const calculateStreak = () => {
    let streak = 0;
    const now = new Date();
    for (let i = 0; i < 365; i++) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const dayVal = String(d.getDate()).padStart(2, '0');
      const dateStr = `${y}-${m}-${dayVal}`;
      if (activeDaysSet.has(dateStr)) {
        streak++;
      } else if (i > 0) {
        break;
      }
    }
    return streak;
  };

  const streak = calculateStreak();

  const getCellColor = (level: number, isSelected: boolean) => {
    if (isSelected) {
      return 'ring-2 ring-neutral-900 dark:ring-white bg-emerald-500 scale-110 z-10';
    }
    switch (level) {
      case 1:
        return 'bg-emerald-200/90 dark:bg-emerald-950/80 hover:bg-emerald-300 dark:hover:bg-emerald-900';
      case 2:
        return 'bg-emerald-300 dark:bg-emerald-800/80 hover:bg-emerald-400 dark:hover:bg-emerald-700';
      case 3:
        return 'bg-emerald-500 dark:bg-emerald-600 hover:bg-emerald-600 dark:hover:bg-emerald-500';
      case 4:
        return 'bg-emerald-600 dark:bg-emerald-500 hover:bg-emerald-700 dark:hover:bg-emerald-400';
      case 0:
      default:
        return 'bg-neutral-100 dark:bg-neutral-800/70 hover:bg-neutral-200 dark:hover:bg-neutral-700/80';
    }
  };

  const formatTooltipDate = (dateStr: string) => {
    if (lang === 'zh') return formatChineseDate(dateStr);
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', weekday: 'short', year: 'numeric' });
  };

  const formatMonthLabel = (label: string) => {
    if (lang === 'zh') return label;
    const monthNum = parseInt(label.replace('月', ''), 10);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months[monthNum - 1] || label;
  };

  return (
    <div className="bg-white dark:bg-[#121316] border border-neutral-200/80 dark:border-neutral-800/80 rounded-xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.03)] relative">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-white flex items-center gap-2">
            <span>{t.heatmapTitle}</span>
            <span className="text-xs font-normal text-neutral-400">({t.heatmapSubtitle})</span>
          </h3>
          <p className="text-xs text-neutral-500 mt-0.5">
            {t.totalLoggedDays} <span className="font-mono tabular-nums text-neutral-800 dark:text-neutral-200 font-medium">{activeDaysSet.size}</span> {lang === 'zh' ? '天' : 'days'} · {t.totalLoggedHours} <span className="font-mono tabular-nums text-neutral-800 dark:text-neutral-200 font-medium">{totalLoggedHours}h</span>
          </p>
        </div>

        {streak > 0 && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-800 dark:text-amber-300 text-xs">
            <Flame className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 fill-amber-500" />
            <span className="font-medium">{t.streakPrefix} <span className="font-mono font-bold">{streak}</span> {t.streakSuffix}</span>
          </div>
        )}
      </div>

      {/* Heatmap Grid container */}
      <div className="overflow-x-auto pb-2 -mx-2 px-2">
        <div className="inline-block min-w-[580px]">
          {/* Month labels */}
          <div className="flex text-[11px] text-neutral-400 mb-1.5 h-4 relative">
            <div className="w-7 shrink-0" />
            <div className="flex-1 flex gap-1.25">
              {columns.map((_, colIdx) => {
                const labelObj = monthLabels.find((m) => m.colIndex === colIdx);
                return (
                  <div key={colIdx} className="w-3.5 text-center shrink-0">
                    {labelObj ? (
                      <span className="font-medium whitespace-nowrap -ml-2 text-neutral-500 dark:text-neutral-400 font-mono text-[10px]">
                        {formatMonthLabel(labelObj.label)}
                      </span>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Grid rows */}
          <div className="flex gap-1.5">
            {/* Weekday labels */}
            <div className="flex flex-col justify-between py-0.5 text-[10px] text-neutral-400 w-6 shrink-0 font-medium">
              <span>{t.mon}</span>
              <span>{t.wed}</span>
              <span>{t.fri}</span>
              <span>{t.sun}</span>
            </div>

            {/* Squares */}
            <div className="flex gap-1.25">
              {columns.map((col, colIdx) => (
                <div key={colIdx} className="flex flex-col gap-1.25">
                  {col.map((day) => {
                    const isSelected = selectedDate === day.date;
                    return (
                      <button
                        key={day.date}
                        type="button"
                        onClick={() => onSelectDate(day.date)}
                        onMouseEnter={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          setHoveredDay({
                            date: day.date,
                            hours: day.hours,
                            count: day.count,
                            x: rect.left + rect.width / 2,
                            y: rect.top,
                          });
                        }}
                        onMouseLeave={() => setHoveredDay(null)}
                        className={`w-3.5 h-3.5 rounded-[3px] transition-all duration-150 cursor-pointer ${getCellColor(
                          day.level,
                          isSelected
                        )}`}
                        aria-label={`${day.date}: ${day.hours}h`}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Legend & Hint */}
      <div className="flex items-center justify-between text-[11px] text-neutral-400 pt-3 border-t border-neutral-100 dark:border-neutral-800/80 mt-2">
        <span className="text-neutral-500">
          {selectedDate ? (
            <span>
              {t.selectedDate}: <strong className="text-neutral-800 dark:text-neutral-200 font-mono">{selectedDate}</strong>
            </span>
          ) : (
            t.heatmapHint
          )}
        </span>

        <div className="flex items-center gap-1.5">
          <span>{t.less}</span>
          <div className="w-2.5 h-2.5 rounded-xs bg-neutral-100 dark:bg-neutral-800" />
          <div className="w-2.5 h-2.5 rounded-xs bg-emerald-200 dark:bg-emerald-950" />
          <div className="w-2.5 h-2.5 rounded-xs bg-emerald-300 dark:bg-emerald-800" />
          <div className="w-2.5 h-2.5 rounded-xs bg-emerald-500 dark:bg-emerald-600" />
          <div className="w-2.5 h-2.5 rounded-xs bg-emerald-600 dark:bg-emerald-500" />
          <span>{t.more}</span>
        </div>
      </div>

      {/* Hover Floating Tooltip */}
      {hoveredDay && (
        <div
          className="fixed z-50 pointer-events-none transform -translate-x-1/2 -translate-y-full mb-2 px-2.5 py-1.5 rounded-lg bg-neutral-900/95 text-white text-xs shadow-xl border border-neutral-700 whitespace-nowrap backdrop-blur-xs"
          style={{ left: hoveredDay.x, top: hoveredDay.y - 8 }}
        >
          <div className="font-medium text-neutral-200">{formatTooltipDate(hoveredDay.date)}</div>
          <div className="text-[11px] text-neutral-400 font-mono tabular-nums">
            {hoveredDay.count > 0 ? (
              <span>{t.hoursSlider}: {hoveredDay.hours}h ({hoveredDay.count} logs)</span>
            ) : (
              <span>{lang === 'zh' ? '当日无打卡记录' : 'No logs recorded'}</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
