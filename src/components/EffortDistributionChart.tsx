import React, { useState } from 'react';
import { Project, JournalEntry } from '../types';
import { useTranslation } from '../context/LanguageContext';

interface EffortDistributionChartProps {
  projects: Project[];
  journals: JournalEntry[];
}

export const EffortDistributionChart: React.FC<EffortDistributionChartProps> = ({
  projects,
  journals,
}) => {
  const { t } = useTranslation();
  const [metricMode, setMetricMode] = useState<'hours' | 'energy'>('hours');
  const [hoveredProjectId, setHoveredProjectId] = useState<string | null>(null);

  // Group by project
  const projectStats = projects.map((p) => {
    const relatedJournals = journals.filter((j) => j.projectId === p.id);
    const totalHours = relatedJournals.reduce((acc, cur) => acc + (cur.hours || 0), 0);
    const avgEnergy = relatedJournals.length > 0
      ? Math.round(relatedJournals.reduce((acc, cur) => acc + (cur.energyPercent || 50), 0) / relatedJournals.length)
      : 0;
    const count = relatedJournals.length;
    return {
      project: p,
      hours: Math.round(totalHours * 10) / 10,
      avgEnergy,
      count,
    };
  }).filter((stat) => stat.hours > 0 || stat.count > 0);

  const totalAllHours = Math.max(
    0.1,
    projectStats.reduce((acc, cur) => acc + cur.hours, 0)
  );

  // Donut chart math
  let cumulativeAngle = 0;
  const radius = 64;
  const cx = 80;
  const cy = 80;

  const donutSlices = projectStats.map((stat) => {
    const fraction = stat.hours / totalAllHours;
    const angle = fraction * 360;
    const startAngle = cumulativeAngle;
    const endAngle = cumulativeAngle + angle;
    cumulativeAngle += angle;

    // SVG arc coordinates
    const startRad = (startAngle - 90) * (Math.PI / 180);
    const endRad = (endAngle - 90) * (Math.PI / 180);

    const x1 = cx + radius * Math.cos(startRad);
    const y1 = cy + radius * Math.sin(startRad);
    const x2 = cx + radius * Math.cos(endRad);
    const y2 = cy + radius * Math.sin(endRad);

    const innerRadius = 42;
    const ix1 = cx + innerRadius * Math.cos(endRad);
    const iy1 = cy + innerRadius * Math.sin(endRad);
    const ix2 = cx + innerRadius * Math.cos(startRad);
    const iy2 = cy + innerRadius * Math.sin(startRad);

    const largeArcFlag = angle > 180 ? 1 : 0;

    const pathData = `
      M ${x1} ${y1}
      A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}
      L ${ix1} ${iy1}
      A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${ix2} ${iy2}
      Z
    `;

    return {
      ...stat,
      percentage: Math.round(fraction * 100),
      pathData,
      color: stat.project.color || '#3b82f6',
    };
  });

  // Group by department
  const deptMap = new Map<string, number>();
  for (const stat of projectStats) {
    const dept = stat.project.department || 'Other';
    deptMap.set(dept, (deptMap.get(dept) || 0) + stat.hours);
  }
  const deptList = Array.from(deptMap.entries()).map(([dept, hours]) => ({
    name: dept,
    hours: Math.round(hours * 10) / 10,
    pct: Math.round((hours / totalAllHours) * 100),
  })).sort((a, b) => b.hours - a.hours);

  return (
    <div className="bg-white dark:bg-[#121316] border border-neutral-200/80 dark:border-neutral-800/80 rounded-xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">
            {t.distributionTitle}
          </h3>
          <p className="text-xs text-neutral-500">
            {t.distributionSubtitle}
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 bg-neutral-100 dark:bg-neutral-800 rounded-lg">
          <button
            onClick={() => setMetricMode('hours')}
            className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
              metricMode === 'hours'
                ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-xs'
                : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            {t.byProject}
          </button>
          <button
            onClick={() => setMetricMode('energy')}
            className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
              metricMode === 'energy'
                ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-xs'
                : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            {t.byDept}
          </button>
        </div>
      </div>

      {projectStats.length === 0 ? (
        <div className="h-44 flex items-center justify-center text-xs text-neutral-400">
          {t.noChartData}
        </div>
      ) : metricMode === 'hours' ? (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
          {/* Donut Chart SVG */}
          <div className="md:col-span-5 flex justify-center items-center relative py-2">
            <svg width="160" height="160" viewBox="0 0 160 160" className="overflow-visible">
              {donutSlices.map((slice) => {
                const isHovered = hoveredProjectId === slice.project.id;
                return (
                  <path
                    key={slice.project.id}
                    d={slice.pathData}
                    fill={slice.color}
                    className="transition-all duration-200 cursor-pointer hover:opacity-90"
                    style={{
                      transform: isHovered ? 'scale(1.04)' : 'scale(1)',
                      transformOrigin: '80px 80px',
                      filter: isHovered ? 'drop-shadow(0 4px 6px rgba(0,0,0,0.15))' : 'none',
                    }}
                    onMouseEnter={() => setHoveredProjectId(slice.project.id)}
                    onMouseLeave={() => setHoveredProjectId(null)}
                  />
                );
              })}
              {/* Donut Center Info */}
              <text
                x="80"
                y="75"
                textAnchor="middle"
                className="fill-neutral-400 dark:fill-neutral-500 text-[10px] font-sans"
              >
                {t.totalWorkHours}
              </text>
              <text
                x="80"
                y="94"
                textAnchor="middle"
                className="fill-neutral-900 dark:fill-white text-base font-bold font-mono tabular-nums"
              >
                {Math.round(totalAllHours)}h
              </text>
            </svg>
          </div>

          {/* Project List Legend & Stats */}
          <div className="md:col-span-7 space-y-2.5">
            {donutSlices.map((slice) => {
              const isHovered = hoveredProjectId === slice.project.id;
              return (
                <div
                  key={slice.project.id}
                  onMouseEnter={() => setHoveredProjectId(slice.project.id)}
                  onMouseLeave={() => setHoveredProjectId(null)}
                  className={`p-2 rounded-lg transition-colors cursor-pointer border ${
                    isHovered
                      ? 'bg-neutral-50 dark:bg-neutral-800/80 border-neutral-300 dark:border-neutral-700'
                      : 'border-transparent hover:bg-neutral-50/60 dark:hover:bg-neutral-800/40'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs mb-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: slice.color }}
                      />
                      <span className="font-medium text-neutral-800 dark:text-neutral-200 truncate">
                        {slice.project.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 font-mono tabular-nums text-xs">
                      <span className="font-semibold text-neutral-900 dark:text-white">
                        {slice.percentage}%
                      </span>
                      <span className="text-neutral-400">
                        {slice.hours}h
                      </span>
                    </div>
                  </div>
                  {/* Progress bar */}
                  <div className="w-full h-1.5 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${slice.percentage}%`,
                        backgroundColor: slice.color,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Department / Team breakdown */
        <div className="space-y-3 py-1">
          {deptList.map((dept) => (
            <div key={dept.name} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-neutral-800 dark:text-neutral-200">
                  {dept.name}
                </span>
                <span className="font-mono tabular-nums text-neutral-500 dark:text-neutral-400">
                  {dept.hours}h ({dept.pct}%)
                </span>
              </div>
              <div className="w-full h-2 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-neutral-900 dark:bg-white rounded-full transition-all duration-300"
                  style={{ width: `${dept.pct}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
