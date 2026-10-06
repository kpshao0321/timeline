/**
 * Date and analytics utility functions
 */

export function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-');
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

export function formatChineseDate(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  const month = d.getMonth() + 1;
  const date = d.getDate();
  const weekday = weekdays[d.getDay()];
  return `${month}月${date}日 ${weekday}`;
}

export function getTodayDateString(): string {
  // Use ISO date format YYYY-MM-DD based on local time
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getDaysDiff(targetDateStr: string, baseDateStr = getTodayDateString()): number {
  const target = new Date(targetDateStr + 'T00:00:00').getTime();
  const base = new Date(baseDateStr + 'T00:00:00').getTime();
  const diffTime = target - base;
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
}

export function getWeekRange(dateStr = getTodayDateString()): { start: string; end: string } {
  const d = new Date(dateStr + 'T00:00:00');
  const day = d.getDay(); // 0 is Sunday, 1 is Monday
  const diffToMonday = day === 0 ? -6 : 1 - day;
  
  const monday = new Date(d);
  monday.setDate(d.getDate() + diffToMonday);
  
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  
  const toStr = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const dayVal = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${dayVal}`;
  };

  return {
    start: toStr(monday),
    end: toStr(sunday),
  };
}

export function getLastWeekRange(dateStr = getTodayDateString()): { start: string; end: string } {
  const thisWeek = getWeekRange(dateStr);
  const prevMonday = new Date(thisWeek.start + 'T00:00:00');
  prevMonday.setDate(prevMonday.getDate() - 7);
  
  const prevSunday = new Date(prevMonday);
  prevSunday.setDate(prevMonday.getDate() + 6);

  const toStr = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const dayVal = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${dayVal}`;
  };

  return {
    start: toStr(prevMonday),
    end: toStr(prevSunday),
  };
}

export function getMonthRange(dateStr = getTodayDateString()): { start: string; end: string } {
  const d = new Date(dateStr + 'T00:00:00');
  const y = d.getFullYear();
  const m = d.getMonth();
  
  const start = new Date(y, m, 1);
  const end = new Date(y, m + 1, 0);

  const toStr = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const dayVal = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${dayVal}`;
  };

  return {
    start: toStr(start),
    end: toStr(end),
  };
}

/**
 * Generate heatmap grid data for the last N weeks ending at today
 */
export interface HeatmapDay {
  date: string;
  count: number;
  hours: number;
  level: number; // 0 to 4 intensity
  isToday: boolean;
}

export function generateHeatmapGrid(
  journals: { date: string; hours: number }[],
  numWeeks = 18,
  endDateStr = getTodayDateString()
): { columns: HeatmapDay[][]; monthLabels: { label: string; colIndex: number }[] } {
  const journalMap = new Map<string, { count: number; hours: number }>();
  for (const j of journals) {
    const cur = journalMap.get(j.date) || { count: 0, hours: 0 };
    cur.count += 1;
    cur.hours += j.hours || 0;
    journalMap.set(j.date, cur);
  }

  const end = new Date(endDateStr + 'T00:00:00');
  // Find current week Sunday
  const endDayOfWeek = end.getDay(); // 0 is Sunday
  const currentWeekEnd = new Date(end);
  currentWeekEnd.setDate(end.getDate() + (6 - (endDayOfWeek === 0 ? 6 : endDayOfWeek - 1)));

  // Start date: numWeeks * 7 days before
  const totalDays = numWeeks * 7;
  const startDate = new Date(currentWeekEnd);
  startDate.setDate(currentWeekEnd.getDate() - totalDays + 1);

  const columns: HeatmapDay[][] = [];
  const monthLabels: { label: string; colIndex: number }[] = [];
  let lastMonth = -1;

  let curDate = new Date(startDate);
  for (let w = 0; w < numWeeks; w++) {
    const col: HeatmapDay[] = [];
    for (let d = 0; d < 7; d++) {
      const y = curDate.getFullYear();
      const m = String(curDate.getMonth() + 1).padStart(2, '0');
      const dayVal = String(curDate.getDate()).padStart(2, '0');
      const dateStr = `${y}-${m}-${dayVal}`;

      if (d === 0) {
        const monthNum = curDate.getMonth();
        if (monthNum !== lastMonth) {
          const monthName = `${monthNum + 1}月`;
          monthLabels.push({ label: monthName, colIndex: w });
          lastMonth = monthNum;
        }
      }

      const stat = journalMap.get(dateStr) || { count: 0, hours: 0 };
      let level = 0;
      if (stat.hours > 0 || stat.count > 0) {
        if (stat.hours <= 3) level = 1;
        else if (stat.hours <= 6) level = 2;
        else if (stat.hours <= 8) level = 3;
        else level = 4;
      }

      col.push({
        date: dateStr,
        count: stat.count,
        hours: Math.round(stat.hours * 10) / 10,
        level,
        isToday: dateStr === endDateStr,
      });

      curDate.setDate(curDate.getDate() + 1);
    }
    columns.push(col);
  }

  return { columns, monthLabels };
}
