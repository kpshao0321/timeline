import React, { useState, useMemo } from 'react';
import { 
  Project, 
  JournalEntry 
} from '../types';
import { 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  Calendar, 
  Clock, 
  Zap, 
  Tag, 
  X,
  FileText,
  Check,
  FolderKanban
} from 'lucide-react';
import { formatChineseDate, getTodayDateString } from '../utils/dateUtils';
import { useTranslation } from '../context/LanguageContext';

interface JournalViewProps {
  journals: JournalEntry[];
  projects: Project[];
  departments?: string[];
  onSaveJournal: (entry: JournalEntry) => void;
  onDeleteJournal: (id: string) => void;
  onSaveProject?: (project: Project) => void;
  onAddDepartment?: (name: string) => void;
  selectedDateFilter?: string;
  onClearDateFilter?: () => void;
}

export const JournalView: React.FC<JournalViewProps> = ({
  journals,
  projects,
  departments: propDepartments = [],
  onSaveJournal,
  onDeleteJournal,
  onSaveProject,
  onAddDepartment,
  selectedDateFilter,
  onClearDateFilter,
}) => {
  const { lang, t } = useTranslation();
  const [selectedDept, setSelectedDept] = useState<string>('all');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const [editingEntry, setEditingEntry] = useState<JournalEntry | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Quick project & category creation state
  const [quickProjectMode, setQuickProjectMode] = useState<'none' | 'create' | 'edit'>('none');
  const [quickProjName, setQuickProjName] = useState('');
  const [quickProjDept, setQuickProjDept] = useState('');
  const [quickProjCustomDept, setQuickProjCustomDept] = useState('');
  const [quickProjColor, setQuickProjColor] = useState('#3B82F6');

  // Unified departments list
  const departments = useMemo(() => {
    const set = new Set<string>(propDepartments);
    projects.forEach((p) => {
      if (p.department) set.add(p.department);
    });
    return Array.from(set);
  }, [propDepartments, projects]);

  // Filtered journals
  const filteredJournals = useMemo(() => {
    return journals.filter((j) => {
      // Date filter
      if (selectedDateFilter && j.date !== selectedDateFilter) {
        return false;
      }
      // Project filter
      if (selectedProjectId !== 'all' && j.projectId !== selectedProjectId) {
        return false;
      }
      // Department filter
      if (selectedDept !== 'all') {
        const p = projects.find((proj) => proj.id === j.projectId);
        if (p?.department !== selectedDept) return false;
      }
      // Search keyword
      if (searchKeyword.trim()) {
        const query = searchKeyword.toLowerCase();
        const matchContent = j.content.toLowerCase().includes(query);
        const matchTags = j.tags?.some((t) => t.toLowerCase().includes(query));
        const proj = projects.find((p) => p.id === j.projectId);
        const matchProj = proj?.name.toLowerCase().includes(query);
        if (!matchContent && !matchTags && !matchProj) return false;
      }
      return true;
    }).sort((a, b) => b.date.localeCompare(a.date));
  }, [journals, projects, selectedDateFilter, selectedProjectId, selectedDept, searchKeyword]);

  // Group by date
  const groupedJournals = useMemo(() => {
    const groups: { date: string; entries: JournalEntry[]; totalHours: number }[] = [];
    filteredJournals.forEach((j) => {
      let g = groups.find((item) => item.date === j.date);
      if (!g) {
        g = { date: j.date, entries: [], totalHours: 0 };
        groups.push(g);
      }
      g.entries.push(j);
      g.totalHours += j.hours || 0;
    });
    return groups;
  }, [filteredJournals]);

  const handleOpenAdd = () => {
    setEditingEntry({
      id: 'j-' + Date.now(),
      date: selectedDateFilter || getTodayDateString(),
      projectId: projects[0]?.id || '',
      content: '',
      hours: 6.0,
      energyPercent: 80,
      tags: [lang === 'zh' ? '需求推进' : 'FeatureDev'],
      updatedAt: new Date().toISOString(),
    });
    setIsModalOpen(true);
  };

  const handleEdit = (entry: JournalEntry) => {
    setEditingEntry({ ...entry });
    setIsModalOpen(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEntry || !editingEntry.content.trim()) return;
    onSaveJournal({
      ...editingEntry,
      updatedAt: new Date().toISOString(),
    });
    setIsModalOpen(false);
    setEditingEntry(null);
  };

  // Quick project & category helpers
  const handleOpenQuickCreateProj = () => {
    setQuickProjName('');
    setQuickProjDept(departments[0] || (lang === 'zh' ? '研发部' : 'Engineering'));
    setQuickProjCustomDept('');
    setQuickProjColor('#3B82F6');
    setQuickProjectMode('create');
  };

  const handleOpenQuickEditProj = () => {
    if (!editingEntry) return;
    const cur = projects.find((p) => p.id === editingEntry.projectId);
    if (!cur) return;
    setQuickProjName(cur.name);
    setQuickProjDept(cur.department);
    setQuickProjCustomDept('');
    setQuickProjColor(cur.color);
    setQuickProjectMode('edit');
  };

  const handleSaveQuickProj = () => {
    if (!quickProjName.trim()) return;
    const finalDept = quickProjCustomDept.trim() || quickProjDept.trim() || (lang === 'zh' ? '通用业务' : 'General');
    if (finalDept && onAddDepartment) {
      onAddDepartment(finalDept);
    }
    const currentProj = editingEntry ? projects.find((p) => p.id === editingEntry.projectId) : undefined;
    const projId = quickProjectMode === 'edit' && currentProj ? currentProj.id : 'proj-' + Date.now();
    const projToSave: Project = {
      id: projId,
      name: quickProjName.trim(),
      department: finalDept,
      description: quickProjectMode === 'edit' && currentProj ? currentProj.description : '',
      status: 'active',
      color: quickProjColor,
      createdAt: quickProjectMode === 'edit' && currentProj ? currentProj.createdAt : new Date().toISOString().slice(0, 10),
    };
    if (onSaveProject) {
      onSaveProject(projToSave);
    }
    if (editingEntry) {
      setEditingEntry({ ...editingEntry, projectId: projId });
    }
    setQuickProjectMode('none');
  };

  // Quick template insertion
  const insertTemplate = (template: string) => {
    if (!editingEntry) return;
    setEditingEntry({
      ...editingEntry,
      content: editingEntry.content ? `${editingEntry.content}\n${template}` : template,
    });
  };

  const formatDateLabel = (dateStr: string) => {
    if (lang === 'zh') return formatChineseDate(dateStr);
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', weekday: 'short' });
  };

  const renderSimpleMarkdown = (text: string) => {
    const lines = text.split('\n');
    return (
      <div className="space-y-1 text-xs text-neutral-700 dark:text-neutral-300 leading-relaxed font-sans">
        {lines.map((line, idx) => {
          if (line.startsWith('- ') || line.startsWith('* ')) {
            return (
              <div key={idx} className="flex items-start gap-2 pl-1">
                <span className="text-neutral-400 mt-1 select-none">·</span>
                <span>{line.replace(/^[-*]\s+/, '')}</span>
              </div>
            );
          }
          if (line.trim().startsWith('### ')) {
            return (
              <h4 key={idx} className="font-semibold text-neutral-900 dark:text-neutral-100 pt-1">
                {line.replace(/^###\s+/, '')}
              </h4>
            );
          }
          return <p key={idx}>{line}</p>;
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Filter and Search Bar */}
      <div className="bg-white dark:bg-[#121316] border border-neutral-200/80 dark:border-neutral-800/80 rounded-xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Search bar */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              placeholder={t.searchPlaceholder}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-neutral-200 dark:border-neutral-700/80 bg-neutral-50/50 dark:bg-neutral-800/40 text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-400"
            />
          </div>

          {/* Filter Dropdowns */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Department */}
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              aria-label={t.allDepartments}
              className="px-2.5 py-1.5 text-xs rounded-lg border border-neutral-200 dark:border-neutral-700/80 bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 focus:outline-none"
            >
              <option value="all">{t.allDepartments}</option>
              {departments.map((dept) => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>

            {/* Project */}
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              aria-label={t.allProjects}
              className="px-2.5 py-1.5 text-xs rounded-lg border border-neutral-200 dark:border-neutral-700/80 bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 focus:outline-none"
            >
              <option value="all">{t.allProjects}</option>
              {projects.map((proj) => (
                <option key={proj.id} value={proj.id}>{proj.name}</option>
              ))}
            </select>

            {/* Add Punch Button */}
            <button
              onClick={handleOpenAdd}
              className="px-3 py-1.5 bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 hover:bg-neutral-800 dark:hover:bg-neutral-100 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 shrink-0 shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t.addPunch}</span>
            </button>
          </div>
        </div>

        {/* Date Filter Badge if active */}
        {selectedDateFilter && (
          <div className="mt-3 pt-3 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-xs text-neutral-600 dark:text-neutral-300">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-neutral-400" />
              {t.filteringDate}: <strong className="font-mono text-neutral-900 dark:text-white">{selectedDateFilter}</strong>
            </span>
            <button
              onClick={onClearDateFilter}
              className="text-xs text-neutral-400 hover:text-neutral-900 dark:hover:text-white flex items-center gap-1 transition-colors"
            >
              <X className="w-3 h-3" />
              {t.clearFilter}
            </button>
          </div>
        )}
      </div>

      {/* Journals List grouped by date */}
      {groupedJournals.length === 0 ? (
        <div className="bg-white dark:bg-[#121316] border border-neutral-200/80 dark:border-neutral-800/80 rounded-xl p-12 text-center shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
          <FileText className="w-8 h-8 text-neutral-300 dark:text-neutral-700 mx-auto mb-2" />
          <h4 className="text-sm font-semibold text-neutral-900 dark:text-white">{t.noLogsFound}</h4>
          <p className="text-xs text-neutral-500 mt-1 max-w-sm mx-auto">
            {t.noLogsHint}
          </p>
          <button
            onClick={handleOpenAdd}
            className="mt-4 px-3.5 py-1.5 bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 text-xs font-medium rounded-lg inline-flex items-center gap-1.5 shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            {t.newLog}
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          {groupedJournals.map((group) => (
            <div key={group.date} className="space-y-3">
              {/* Date Header */}
              <div className="flex items-center justify-between text-xs text-neutral-500 px-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-neutral-900 dark:text-white">
                    {formatDateLabel(group.date)}
                  </span>
                  <span className="font-mono text-neutral-400">({group.date})</span>
                </div>
                <div className="flex items-center gap-1 font-mono text-[11px] text-neutral-500">
                  <span>{t.dailyTotal}</span>
                  <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                    {Math.round(group.totalHours * 10) / 10}h
                  </span>
                </div>
              </div>

              {/* Day's entries */}
              <div className="space-y-2.5">
                {group.entries.map((entry) => {
                  const proj = projects.find((p) => p.id === entry.projectId);
                  return (
                    <div
                      key={entry.id}
                      className="bg-white dark:bg-[#121316] border border-neutral-200/80 dark:border-neutral-800/80 rounded-xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.03)] hover:border-neutral-300 dark:hover:border-neutral-700 transition-colors"
                    >
                      {/* Card Header */}
                      <div className="flex items-start justify-between gap-3 mb-2.5">
                        <div className="flex items-center gap-2 flex-wrap text-xs">
                          {/* Project Tag */}
                          <div className="flex items-center gap-1.5 font-medium text-neutral-900 dark:text-white">
                            <span
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: proj?.color || '#3b82f6' }}
                            />
                            <span>{proj?.name || t.unlinkedProject}</span>
                          </div>

                          <span className="text-neutral-300 dark:text-neutral-700">·</span>
                          <span className="text-neutral-500">{proj?.department}</span>

                          {/* Event Type badge */}
                          {entry.eventType === 'business_trip' && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-800">
                              🛫 {t.eventBusinessTrip} {entry.location ? `· ${entry.location}` : ''}
                            </span>
                          )}

                          {entry.eventType === 'client_meeting' && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-purple-100 dark:bg-purple-950/80 text-purple-800 dark:text-purple-200 border border-purple-300 dark:border-purple-800">
                              🤝 {t.eventClientMeeting} {entry.location ? `· ${entry.location}` : ''}
                            </span>
                          )}

                          <span className="text-neutral-300 dark:text-neutral-700">·</span>
                          <span className="font-mono tabular-nums text-neutral-600 dark:text-neutral-400">
                            {entry.hours}h ({entry.energyPercent}% {t.energySlider})
                          </span>
                        </div>

                        {/* Card Actions */}
                        <div className="flex items-center gap-1 opacity-70 hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleEdit(entry)}
                            className="p-1 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors"
                            title="Edit"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(t.confirmDeleteJournal)) {
                                onDeleteJournal(entry.id);
                              }
                            }}
                            className="p-1 text-neutral-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Content Markdown rendering */}
                      <div className="py-1">
                        {renderSimpleMarkdown(entry.content)}
                      </div>

                      {/* Tags */}
                      {entry.tags && entry.tags.length > 0 && (
                        <div className="flex items-center gap-1.5 mt-3 pt-2 border-t border-neutral-100 dark:border-neutral-800/80 text-[11px] text-neutral-500 font-mono">
                          <Tag className="w-3 h-3 text-neutral-400" />
                          {entry.tags.map((tagItem, idx) => (
                            <span key={idx} className="hover:text-neutral-800 dark:hover:text-neutral-200">
                              #{tagItem}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Journal Modal */}
      {isModalOpen && editingEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-[#121316] rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-2xl max-w-lg w-full max-h-[92vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100 dark:border-neutral-800">
              <h3 className="text-sm font-semibold text-neutral-900 dark:text-white font-display">
                {editingEntry.id.startsWith('j-') && !journals.some(j => j.id === editingEntry.id)
                  ? t.newJournalModalTitle
                  : t.editJournalModalTitle}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-6 overflow-y-auto space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    {t.journalDate}
                  </label>
                  <input
                    type="date"
                    value={editingEntry.date}
                    onChange={(e) => setEditingEntry({ ...editingEntry, date: e.target.value })}
                    required
                    className="w-full px-3 py-1.5 text-xs font-mono rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-neutral-400"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300">
                      {t.belongProject}
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleOpenQuickCreateProj}
                        className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5 cursor-pointer font-medium"
                      >
                        <Plus className="w-3 h-3" />
                        {t.quickNewProject}
                      </button>
                      {projects.length > 0 && (
                        <button
                          type="button"
                          onClick={handleOpenQuickEditProj}
                          className="text-[11px] text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 flex items-center gap-0.5 cursor-pointer"
                        >
                          <Edit3 className="w-3 h-3" />
                          {t.quickEditProject}
                        </button>
                      )}
                    </div>
                  </div>
                  <select
                    value={editingEntry.projectId}
                    onChange={(e) => setEditingEntry({ ...editingEntry, projectId: e.target.value })}
                    required
                    aria-label={t.belongProject}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-neutral-400"
                  >
                    {projects.map((proj) => (
                      <option key={proj.id} value={proj.id}>
                        {proj.name} ({proj.department})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Inline Quick Project & Category Creator / Editor */}
              {quickProjectMode !== 'none' && (
                <div className="p-3.5 rounded-lg border border-blue-200 dark:border-blue-900/60 bg-blue-50/50 dark:bg-blue-950/20 space-y-3 animate-in fade-in">
                  <div className="flex items-center justify-between text-xs font-semibold text-blue-900 dark:text-blue-300">
                    <span className="flex items-center gap-1.5">
                      <FolderKanban className="w-3.5 h-3.5" />
                      {quickProjectMode === 'create' ? t.createProject : t.editProject}
                    </span>
                    <button
                      type="button"
                      onClick={() => setQuickProjectMode('none')}
                      className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="space-y-2">
                    <div>
                      <label className="block text-[11px] font-medium text-neutral-600 dark:text-neutral-300 mb-1">
                        {t.projectName}
                      </label>
                      <input
                        type="text"
                        value={quickProjName}
                        onChange={(e) => setQuickProjName(e.target.value)}
                        placeholder={lang === 'zh' ? '输入项目名称，例如: 国际化支付重构' : 'e.g. Payment Gateway V2'}
                        className="w-full px-2.5 py-1.5 text-xs rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-neutral-600 dark:text-neutral-300 mb-1">
                        {t.projectDept} ({lang === 'zh' ? '点击选用或输入新类别' : 'Click or type new'})
                      </label>
                      {/* Existing categories badges */}
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {departments.map((dept) => (
                          <button
                            key={dept}
                            type="button"
                            onClick={() => {
                              setQuickProjDept(dept);
                              setQuickProjCustomDept('');
                            }}
                            className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                              quickProjDept === dept && !quickProjCustomDept
                                ? 'bg-blue-600 text-white'
                                : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-300'
                            }`}
                          >
                            {dept}
                          </button>
                        ))}
                      </div>
                      <input
                        type="text"
                        value={quickProjCustomDept}
                        onChange={(e) => setQuickProjCustomDept(e.target.value)}
                        placeholder={t.customCategoryPlaceholder}
                        className="w-full px-2.5 py-1.5 text-xs rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-sans"
                      />
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-center gap-2">
                        <label className="text-[11px] text-neutral-600 dark:text-neutral-400">
                          {t.projectColor}:
                        </label>
                        <input
                          type="color"
                          value={quickProjColor}
                          onChange={(e) => setQuickProjColor(e.target.value)}
                          className="w-6 h-6 rounded border-0 cursor-pointer bg-transparent"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setQuickProjectMode('none')}
                          className="px-2.5 py-1 text-xs text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
                        >
                          {t.cancel}
                        </button>
                        <button
                          type="button"
                          onClick={handleSaveQuickProj}
                          disabled={!quickProjName.trim()}
                          className="px-3 py-1 text-xs font-medium rounded-md bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-50 cursor-pointer"
                        >
                          {quickProjectMode === 'create' ? (lang === 'zh' ? '创建并选用' : 'Create & Select') : t.saveProject}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Event Type & Location for Business Trip / Client Meeting */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    {lang === 'zh' ? '事件类别' : 'Event Type'}
                  </label>
                  <select
                    value={editingEntry.eventType || 'regular'}
                    onChange={(e) => setEditingEntry({ ...editingEntry, eventType: e.target.value as any })}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-neutral-400"
                  >
                    <option value="regular">{t.eventRegular}</option>
                    <option value="business_trip">🛫 {t.eventBusinessTrip}</option>
                    <option value="client_meeting">🤝 {t.eventClientMeeting}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    {t.location}
                  </label>
                  <input
                    type="text"
                    value={editingEntry.location || ''}
                    onChange={(e) => setEditingEntry({ ...editingEntry, location: e.target.value })}
                    placeholder={lang === 'zh' ? '例如: 上海 / 客户现场' : 'e.g. Shanghai / Client Site'}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-neutral-400"
                  />
                </div>
              </div>

              {/* Work Content */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                    {t.summaryLabel}
                  </label>
                </div>
                
                {/* Quick Templates */}
                <div className="flex flex-wrap gap-1.5 mb-2">
                  <button
                    type="button"
                    onClick={() => insertTemplate(lang === 'zh' ? '- [需求推进] ' : '- [Feature] ')}
                    className="px-2 py-0.5 text-[11px] rounded bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 transition-colors"
                  >
                    {t.templateReq}
                  </button>
                  <button
                    type="button"
                    onClick={() => insertTemplate(lang === 'zh' ? '- [Bug修复] 排查解决 ' : '- [Bugfix] Fixed issue ')}
                    className="px-2 py-0.5 text-[11px] rounded bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 transition-colors"
                  >
                    {t.templateBug}
                  </button>
                  <button
                    type="button"
                    onClick={() => insertTemplate(lang === 'zh' ? '- [跨组协同] 对接联调 ' : '- [Collab] Team sync on ')}
                    className="px-2 py-0.5 text-[11px] rounded bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 transition-colors"
                  >
                    {t.templateCollab}
                  </button>
                  <button
                    type="button"
                    onClick={() => insertTemplate(lang === 'zh' ? '- [Code Review] 审查并输出反馈' : '- [Review] Reviewed PR feedback')}
                    className="px-2 py-0.5 text-[11px] rounded bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 transition-colors"
                  >
                    {t.templateReview}
                  </button>
                </div>

                <textarea
                  rows={4}
                  value={editingEntry.content}
                  onChange={(e) => setEditingEntry({ ...editingEntry, content: e.target.value })}
                  placeholder={t.summaryPlaceholder}
                  required
                  className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-400 font-sans"
                />
              </div>

              {/* Hours and Energy sliders */}
              <div className="grid grid-cols-2 gap-4 pt-1">
                <div>
                  <div className="flex items-center justify-between text-xs text-neutral-700 dark:text-neutral-300 mb-1">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-neutral-400" />
                      {t.hoursSlider}
                    </span>
                    <span className="font-mono font-semibold">{editingEntry.hours}h</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="14"
                    step="0.5"
                    value={editingEntry.hours}
                    onChange={(e) => setEditingEntry({ ...editingEntry, hours: parseFloat(e.target.value) })}
                    className="w-full accent-neutral-900 dark:accent-white"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs text-neutral-700 dark:text-neutral-300 mb-1">
                    <span className="flex items-center gap-1">
                      <Zap className="w-3.5 h-3.5 text-amber-500" />
                      {t.energySlider}
                    </span>
                    <span className="font-mono font-semibold">{editingEntry.energyPercent}%</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    step="5"
                    value={editingEntry.energyPercent}
                    onChange={(e) => setEditingEntry({ ...editingEntry, energyPercent: parseInt(e.target.value) })}
                    className="w-full accent-neutral-900 dark:accent-white"
                  />
                </div>
              </div>

              {/* Tags */}
              <div>
                <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  {t.tagsLabel}
                </label>
                <input
                  type="text"
                  value={editingEntry.tags?.join(', ') || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    const tags = val.split(',').map((item) => item.trim()).filter(Boolean);
                    setEditingEntry({ ...editingEntry, tags });
                  }}
                  placeholder={lang === 'zh' ? '技术攻坚, 接口设计, 联调' : 'TechSpike, API, Refactor'}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-neutral-400"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3.5 py-1.5 text-xs font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-medium rounded-lg bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-colors shadow-xs"
                >
                  {t.saveLog}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
