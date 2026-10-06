import React, { useState, useMemo } from 'react';
import { Project, Milestone, JournalEntry } from '../types';
import { 
  getWeekRange, 
  getLastWeekRange, 
  getMonthRange, 
  getTodayDateString 
} from '../utils/dateUtils';
import { 
  Copy, 
  Download, 
  Sparkles, 
  Check
} from 'lucide-react';
import { useTranslation } from '../context/LanguageContext';

interface ReportGeneratorViewProps {
  projects: Project[];
  milestones: Milestone[];
  journals: JournalEntry[];
  onNotify: (text: string) => void;
}

export const ReportGeneratorView: React.FC<ReportGeneratorViewProps> = ({
  projects,
  milestones,
  journals,
  onNotify,
}) => {
  const { lang, t } = useTranslation();
  const [rangePreset, setRangePreset] = useState<'thisWeek' | 'lastWeek' | 'thisMonth' | 'custom'>('thisWeek');
  const [customStart, setCustomStart] = useState<string>('2026-10-01');
  const [customEnd, setCustomEnd] = useState<string>(getTodayDateString());
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>(projects.map((p) => p.id));
  const [includeHours, setIncludeHours] = useState<boolean>(true);
  const [includeMilestones, setIncludeMilestones] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);
  const [editedText, setEditedText] = useState<string>('');
  const [isEditingCustom, setIsEditingCustom] = useState<boolean>(false);

  // Determine current active date range
  const activeRange = useMemo(() => {
    if (rangePreset === 'thisWeek') return getWeekRange();
    if (rangePreset === 'lastWeek') return getLastWeekRange();
    if (rangePreset === 'thisMonth') return getMonthRange();
    return { start: customStart, end: customEnd };
  }, [rangePreset, customStart, customEnd]);

  // Generate the report markdown (Bilingual)
  const generatedMarkdown = useMemo(() => {
    const { start, end } = activeRange;
    
    // Filter journals in date range and selected projects
    const targetJournals = journals.filter((j) => {
      const inDate = j.date >= start && j.date <= end;
      const inProject = selectedProjectIds.includes(j.projectId);
      return inDate && inProject;
    });

    if (lang === 'en') {
      const reportTitle = rangePreset === 'thisMonth' ? 'Monthly Work Summary Report' : 'Weekly Work Summary Report';
      let md = `# 📋 ${reportTitle} (${start} ~ ${end})\n\n`;

      // 1. Key Accomplishments
      md += `## 1. Key Accomplishments & Deliverables\n`;
      if (targetJournals.length === 0) {
        md += `*No work logs recorded in the selected date range.*\n\n`;
      } else {
        selectedProjectIds.forEach((pId) => {
          const proj = projects.find((p) => p.id === pId);
          if (!proj) return;
          const pJournals = targetJournals.filter((j) => j.projectId === pId);
          if (pJournals.length === 0) return;

          const projHours = pJournals.reduce((acc, cur) => acc + (cur.hours || 0), 0);
          md += `\n### 🔹 [${proj.department}] ${proj.name} ${includeHours ? `*(Approx. ${Math.round(projHours * 10) / 10}h)*` : ''}\n`;

          pJournals.forEach((j) => {
            const lines = j.content.split('\n').filter((l) => l.trim().length > 0);
            lines.forEach((line) => {
              const cleanLine = line.replace(/^[-*]\s+/, '').trim();
              md += `- **[${j.date.slice(5)}]** ${cleanLine}\n`;
            });
          });
        });
        md += `\n`;
      }

      // 2. Milestones progress
      if (includeMilestones) {
        // Special events in this period
        const periodTrips = targetJournals.filter((j) => j.eventType === 'business_trip');
        const periodMeetings = targetJournals.filter((j) => j.eventType === 'client_meeting');

        if (periodTrips.length > 0 || periodMeetings.length > 0) {
          md += `## 🌟 Key Business Trips & Client Deliveries\n`;
          if (periodTrips.length > 0) {
            md += `#### 🛫 Business Trips:\n`;
            periodTrips.forEach((tItem) => {
              md += `- **[${tItem.date}]** ${tItem.location ? `@${tItem.location}: ` : ''}${tItem.content.split('\n')[0]}\n`;
            });
          }
          if (periodMeetings.length > 0) {
            md += `#### 🤝 Client Meetings & On-site Syncs:\n`;
            periodMeetings.forEach((mItem) => {
              md += `- **[${mItem.date}]** ${mItem.location ? `@${mItem.location}: ` : ''}${mItem.content.split('\n')[0]}\n`;
            });
          }
          md += `\n`;
        }

        md += `## 2. Milestones & Delivery Status\n`;
        const relevantMilestones = milestones.filter((m) => selectedProjectIds.includes(m.projectId));
        
        const completedList = relevantMilestones.filter((m) => m.status === 'completed');
        const inProgressList = relevantMilestones.filter((m) => m.status === 'in_progress');
        const delayedList = relevantMilestones.filter((m) => m.status === 'delayed');

        if (completedList.length > 0) {
          md += `#### ✅ Completed Milestones:\n`;
          completedList.forEach((m) => {
            const p = projects.find((proj) => proj.id === m.projectId);
            md += `- **${m.title}** (${p?.name}) · Completed: ${m.completedDate || m.dueDate}\n`;
          });
        }

        if (inProgressList.length > 0) {
          md += `\n#### ⏳ In Progress Milestones:\n`;
          inProgressList.forEach((m) => {
            const p = projects.find((proj) => proj.id === m.projectId);
            md += `- **${m.title}** (${p?.name}) · Due: ${m.dueDate} ${m.notes ? `(${m.notes})` : ''}\n`;
          });
        }

        if (delayedList.length > 0) {
          md += `\n#### ⚠️ At Risk / Delayed Milestones:\n`;
          delayedList.forEach((m) => {
            const p = projects.find((proj) => proj.id === m.projectId);
            md += `- **${m.title}** (${p?.name}) · Due: ${m.dueDate} (Attention required)\n`;
          });
        }

        if (relevantMilestones.length === 0) {
          md += `*No linked milestones.*\n`;
        }
        md += `\n`;
      }

      // 3. Work hours statistics
      if (includeHours) {
        const totalHours = targetJournals.reduce((acc, cur) => acc + (cur.hours || 0), 0);
        md += `## 3. Effort & Hours Breakdown\n`;
        md += `- **Total Logged Hours**: **${Math.round(totalHours * 10) / 10} hours**\n`;
        
        selectedProjectIds.forEach((pId) => {
          const proj = projects.find((p) => p.id === pId);
          const pHours = targetJournals
            .filter((j) => j.projectId === pId)
            .reduce((acc, cur) => acc + (cur.hours || 0), 0);
          if (pHours > 0 && totalHours > 0) {
            const pct = Math.round((pHours / totalHours) * 100);
            md += `  - ${proj?.name}: ${Math.round(pHours * 10) / 10}h (${pct}%)\n`;
          }
        });
        md += `\n`;
      }

      // 4. Next period planned goals
      md += `## 4. Next Period Priorities & Action Items\n`;
      const upcoming = milestones
        .filter((m) => (m.status === 'in_progress' || m.status === 'todo') && selectedProjectIds.includes(m.projectId))
        .slice(0, 4);

      if (upcoming.length > 0) {
        upcoming.forEach((m, idx) => {
          const p = projects.find((proj) => proj.id === m.projectId);
          md += `${idx + 1}. Advance [${p?.name}]: ${m.title} (Target due: ${m.dueDate})\n`;
        });
        md += `${upcoming.length + 1}. Maintain production stability monitors and peer code review practices.\n`;
      } else {
        md += `1. Continue roadmap feature iterations and cross-team dependencies;\n2. Focus on architecture hardening and test automation coverage.\n`;
      }

      return md;
    }

    // Chinese formatting
    const reportTitle = rangePreset === 'thisMonth' ? '工作月度汇报总结' : '工作周度汇报总结';
    let md = `# 📋 ${reportTitle} (${start} ~ ${end})\n\n`;

    // 1. Core Progress by Project
    md += `## 一、重点工作进展与交付成果\n`;
    if (targetJournals.length === 0) {
      md += `*所选周期内暂无打卡记录*\n\n`;
    } else {
      selectedProjectIds.forEach((pId) => {
        const proj = projects.find((p) => p.id === pId);
        if (!proj) return;
        const pJournals = targetJournals.filter((j) => j.projectId === pId);
        if (pJournals.length === 0) return;

        const projHours = pJournals.reduce((acc, cur) => acc + (cur.hours || 0), 0);
        md += `\n### 🔹 【${proj.department}】${proj.name} ${includeHours ? `*(投入约 ${Math.round(projHours * 10) / 10}h)*` : ''}\n`;

        pJournals.forEach((j) => {
          const lines = j.content.split('\n').filter((l) => l.trim().length > 0);
          lines.forEach((line) => {
            const cleanLine = line.replace(/^[-*]\s+/, '').trim();
            md += `- **[${j.date.slice(5)}]** ${cleanLine}\n`;
          });
        });
      });
      md += `\n`;
    }

    // 2. Milestones progress
    if (includeMilestones) {
      // Check for business trips and client meetings in this period
      const periodTrips = targetJournals.filter((j) => j.eventType === 'business_trip');
      const periodMeetings = targetJournals.filter((j) => j.eventType === 'client_meeting');

      if (periodTrips.length > 0 || periodMeetings.length > 0) {
        md += `## 🌟 关键出差与客户交付事项\n`;
        if (periodTrips.length > 0) {
          md += `#### 🛫 出差行程记录：\n`;
          periodTrips.forEach((tItem) => {
            md += `- **[${tItem.date}]** ${tItem.location ? `@${tItem.location}：` : ''}${tItem.content.split('\n')[0]}\n`;
          });
        }
        if (periodMeetings.length > 0) {
          md += `#### 🤝 客户现场会面与交付：\n`;
          periodMeetings.forEach((mItem) => {
            md += `- **[${mItem.date}]** ${mItem.location ? `@${mItem.location}：` : ''}${mItem.content.split('\n')[0]}\n`;
          });
        }
        md += `\n`;
      }

      md += `## 二、里程碑及交付节点进展\n`;
      const relevantMilestones = milestones.filter((m) => selectedProjectIds.includes(m.projectId));
      
      const completedList = relevantMilestones.filter((m) => m.status === 'completed');
      const inProgressList = relevantMilestones.filter((m) => m.status === 'in_progress');
      const delayedList = relevantMilestones.filter((m) => m.status === 'delayed');

      if (completedList.length > 0) {
        md += `#### ✅ 本阶段已完成节点：\n`;
        completedList.forEach((m) => {
          const p = projects.find((proj) => proj.id === m.projectId);
          md += `- **${m.title}** (${p?.name}) · 完成日期: ${m.completedDate || m.dueDate}\n`;
        });
      }

      if (inProgressList.length > 0) {
        md += `\n#### ⏳ 推进中节点：\n`;
        inProgressList.forEach((m) => {
          const p = projects.find((proj) => proj.id === m.projectId);
          md += `- **${m.title}** (${p?.name}) · 预计排期: ${m.dueDate} ${m.notes ? `(${m.notes})` : ''}\n`;
        });
      }

      if (delayedList.length > 0) {
        md += `\n#### ⚠️ 需关注/风险节点：\n`;
        delayedList.forEach((m) => {
          const p = projects.find((proj) => proj.id === m.projectId);
          md += `- **${m.title}** (${p?.name}) · 排期: ${m.dueDate} (存在延期风险)\n`;
        });
      }

      if (relevantMilestones.length === 0) {
        md += `*暂无关联里程碑*\n`;
      }
      md += `\n`;
    }

    // 3. Work hours statistics
    if (includeHours) {
      const totalHours = targetJournals.reduce((acc, cur) => acc + (cur.hours || 0), 0);
      md += `## 三、工时与精力分布概览\n`;
      md += `- **本期记录总工时**：约 **${Math.round(totalHours * 10) / 10} 小时**\n`;
      
      selectedProjectIds.forEach((pId) => {
        const proj = projects.find((p) => p.id === pId);
        const pHours = targetJournals
          .filter((j) => j.projectId === pId)
          .reduce((acc, cur) => acc + (cur.hours || 0), 0);
        if (pHours > 0 && totalHours > 0) {
          const pct = Math.round((pHours / totalHours) * 100);
          md += `  - ${proj?.name}: ${Math.round(pHours * 10) / 10}h (${pct}%)\n`;
        }
      });
      md += `\n`;
    }

    // 4. Next period planned goals
    md += `## 四、下阶段规划与重点待办\n`;
    const upcoming = milestones
      .filter((m) => (m.status === 'in_progress' || m.status === 'todo') && selectedProjectIds.includes(m.projectId))
      .slice(0, 4);

    if (upcoming.length > 0) {
      upcoming.forEach((m, idx) => {
        const p = projects.find((proj) => proj.id === m.projectId);
        md += `${idx + 1}. 继续推进【${p?.name}】: ${m.title} (目标于 ${m.dueDate} 前完成联调交付)\n`;
      });
      md += `${upcoming.length + 1}. 持续跟进系统稳定性指标监控与 Code Review 规范。\n`;
    } else {
      md += `1. 持续推进日常业务需求迭代与跨组协同联调；\n2. 开展技术架构优化与代码质量审查。\n`;
    }

    return md;
  }, [activeRange, journals, projects, milestones, selectedProjectIds, includeHours, includeMilestones, rangePreset, lang]);

  // Actual display text
  const currentText = isEditingCustom ? editedText : generatedMarkdown;

  const handleCopy = () => {
    navigator.clipboard.writeText(currentText);
    setCopied(true);
    onNotify(lang === 'zh' ? '总结报告已复制到剪贴板！' : 'Report copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([currentText], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `WorkReport-${activeRange.start}_to_${activeRange.end}.md`;
    link.click();
    URL.revokeObjectURL(url);
    onNotify(lang === 'zh' ? '已导出 Markdown 报告文件' : 'Markdown report exported');
  };

  const toggleProject = (pId: string) => {
    if (selectedProjectIds.includes(pId)) {
      if (selectedProjectIds.length > 1) {
        setSelectedProjectIds(selectedProjectIds.filter((id) => id !== pId));
      }
    } else {
      setSelectedProjectIds([...selectedProjectIds, pId]);
    }
  };

  return (
    <div className="space-y-6">
      {/* Configuration & Preset Selector */}
      <div className="bg-white dark:bg-[#121316] border border-neutral-200/80 dark:border-neutral-800/80 rounded-xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.03)] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              {t.reportTitle}
            </h3>
            <p className="text-xs text-neutral-500 mt-0.5">
              {t.reportSubtitle}
            </p>
          </div>

          {/* Time range preset tabs */}
          <div className="flex items-center gap-1 p-1 bg-neutral-100 dark:bg-neutral-800 rounded-lg">
            <button
              onClick={() => {
                setRangePreset('thisWeek');
                setIsEditingCustom(false);
              }}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                rangePreset === 'thisWeek'
                  ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-xs'
                  : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              {t.thisWeek}
            </button>
            <button
              onClick={() => {
                setRangePreset('lastWeek');
                setIsEditingCustom(false);
              }}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                rangePreset === 'lastWeek'
                  ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-xs'
                  : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              {t.lastWeek}
            </button>
            <button
              onClick={() => {
                setRangePreset('thisMonth');
                setIsEditingCustom(false);
              }}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                rangePreset === 'thisMonth'
                  ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-xs'
                  : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              {t.thisMonth}
            </button>
            <button
              onClick={() => {
                setRangePreset('custom');
                setIsEditingCustom(false);
              }}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                rangePreset === 'custom'
                  ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-xs'
                  : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              {t.customRange}
            </button>
          </div>
        </div>

        {/* Custom Date Pickers */}
        {rangePreset === 'custom' && (
          <div className="flex items-center gap-3 pt-2 border-t border-neutral-100 dark:border-neutral-800 text-xs">
            <span className="text-neutral-500">{t.rangeLabel}</span>
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="px-2.5 py-1 rounded border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 font-mono text-neutral-800 dark:text-neutral-200"
            />
            <span className="text-neutral-400">{t.to}</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="px-2.5 py-1 rounded border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 font-mono text-neutral-800 dark:text-neutral-200"
            />
          </div>
        )}

        {/* Filters and Options */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-neutral-100 dark:border-neutral-800 text-xs">
          {/* Projects to include */}
          <div>
            <span className="font-medium text-neutral-700 dark:text-neutral-300 block mb-2">
              {t.scopeProjects}
            </span>
            <div className="flex flex-wrap gap-2">
              {projects.map((p) => {
                const isSelected = selectedProjectIds.includes(p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => toggleProject(p.id)}
                    className={`px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1.5 border text-xs ${
                      isSelected
                        ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 border-transparent shadow-xs'
                        : 'bg-neutral-50 dark:bg-neutral-800/40 text-neutral-600 dark:text-neutral-400 border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100'
                    }`}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: p.color }}
                    />
                    <span>{p.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section Toggles */}
          <div>
            <span className="font-medium text-neutral-700 dark:text-neutral-300 block mb-2">
              {t.genOptions}
            </span>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-1.5 cursor-pointer text-neutral-700 dark:text-neutral-300">
                <input
                  type="checkbox"
                  checked={includeHours}
                  onChange={(e) => setIncludeHours(e.target.checked)}
                  className="rounded border-neutral-300 text-neutral-900 focus:ring-0"
                />
                <span>{t.optHours}</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer text-neutral-700 dark:text-neutral-300">
                <input
                  type="checkbox"
                  checked={includeMilestones}
                  onChange={(e) => setIncludeMilestones(e.target.checked)}
                  className="rounded border-neutral-300 text-neutral-900 focus:ring-0"
                />
                <span>{t.optMilestones}</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Generated Report Editor & Preview */}
      <div className="bg-white dark:bg-[#121316] border border-neutral-200/80 dark:border-neutral-800/80 rounded-xl overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
        {/* Editor Toolbar */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950/40">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-neutral-900 dark:text-white font-display">
              {t.draftTitle}
            </span>
            <span className="text-[11px] text-neutral-400 font-mono">
              {activeRange.start} ~ {activeRange.end}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="px-3 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-700 text-xs font-medium text-neutral-800 dark:text-neutral-200 transition-colors flex items-center gap-1.5"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? t.copied : t.copyAll}</span>
            </button>

            <button
              onClick={handleDownload}
              className="px-3 py-1.5 rounded-lg bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 hover:bg-neutral-800 dark:hover:bg-neutral-100 text-xs font-medium transition-colors flex items-center gap-1.5 shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{t.exportMd}</span>
            </button>
          </div>
        </div>

        {/* Text Area */}
        <div className="p-5">
          <textarea
            rows={18}
            value={currentText}
            onChange={(e) => {
              setIsEditingCustom(true);
              setEditedText(e.target.value);
            }}
            className="w-full p-4 rounded-lg border border-neutral-200/80 dark:border-neutral-800 bg-neutral-50/30 dark:bg-neutral-950/30 font-mono text-xs leading-relaxed text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-1 focus:ring-neutral-400 resize-y"
            placeholder={lang === 'zh' ? '生成的汇报文本将显示在此处...' : 'Generated report will appear here...'}
          />
          <div className="flex items-center justify-between text-[11px] text-neutral-400 mt-2 px-1">
            <span>{t.draftHint}</span>
            {isEditingCustom && (
              <button
                onClick={() => setIsEditingCustom(false)}
                className="text-neutral-600 dark:text-neutral-400 hover:underline"
              >
                {t.resetDraft}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
