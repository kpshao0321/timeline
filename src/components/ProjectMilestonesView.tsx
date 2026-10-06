import React, { useState } from 'react';
import { Project, Milestone, JournalEntry, MilestoneStatus, ProjectStatus, EventType } from '../types';
import { GanttTimelineView } from './GanttTimelineView';
import { 
  Plus, 
  Flag, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Circle, 
  Edit3, 
  Trash2, 
  X,
  Tag,
  Check
} from 'lucide-react';
import { getDaysDiff } from '../utils/dateUtils';
import { useTranslation } from '../context/LanguageContext';

interface ProjectMilestonesViewProps {
  projects: Project[];
  milestones: Milestone[];
  journals: JournalEntry[];
  departments: string[];
  onSaveProject: (project: Project) => void;
  onDeleteProject: (id: string) => void;
  onSaveMilestone: (milestone: Milestone) => void;
  onDeleteMilestone: (id: string) => void;
  onAddDepartment?: (name: string) => void;
  onEditDepartment?: (oldName: string, newName: string) => void;
  onDeleteDepartment?: (name: string) => void;
}

export const ProjectMilestonesView: React.FC<ProjectMilestonesViewProps> = ({
  projects,
  milestones,
  journals,
  departments,
  onSaveProject,
  onDeleteProject,
  onSaveMilestone,
  onDeleteMilestone,
  onAddDepartment,
  onEditDepartment,
  onDeleteDepartment,
}) => {
  const { lang, t } = useTranslation();
  const [selectedDept, setSelectedDept] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'cards' | 'gantt'>('cards');
  
  // Category management modal state
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingCategoryOldName, setEditingCategoryOldName] = useState<string | null>(null);
  const [editingCategoryNewName, setEditingCategoryNewName] = useState('');

  // Project modal state
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);

  // Milestone modal state
  const [editingMilestone, setEditingMilestone] = useState<Milestone | null>(null);
  const [isMilestoneModalOpen, setIsMilestoneModalOpen] = useState(false);

  const filteredProjects = projects.filter((p) => {
    if (selectedDept !== 'all' && p.department !== selectedDept) return false;
    return true;
  });

  const getStatusBadge = (status: MilestoneStatus) => {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5" />
            {t.delivered}
          </span>
        );
      case 'in_progress':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-600 dark:text-blue-400">
            <Clock className="w-3.5 h-3.5" />
            {t.inProgress}
          </span>
        );
      case 'delayed':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-600 dark:text-rose-400">
            <AlertTriangle className="w-3.5 h-3.5" />
            {t.delayed}
          </span>
        );
      case 'todo':
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-neutral-500">
            <Circle className="w-3.5 h-3.5" />
            {t.todo}
          </span>
        );
    }
  };

  const handleOpenNewProject = () => {
    const colors = ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EC4899', '#06B6D4'];
    setEditingProject({
      id: 'proj-' + Date.now(),
      name: '',
      department: departments[0] || (lang === 'zh' ? '研发部' : 'Engineering'),
      description: '',
      status: 'active',
      color: colors[Math.floor(Math.random() * colors.length)],
      createdAt: new Date().toISOString().slice(0, 10),
    });
    setIsProjectModalOpen(true);
  };

  const handleOpenNewMilestone = (projectId: string) => {
    setEditingMilestone({
      id: 'ms-' + Date.now(),
      projectId,
      title: '',
      dueDate: new Date().toISOString().slice(0, 10),
      status: 'todo',
      notes: '',
    });
    setIsMilestoneModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Control bar */}
      <div className="bg-white dark:bg-[#121316] border border-neutral-200/80 dark:border-neutral-800/80 rounded-xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.03)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {/* Department tabs / filter */}
          <div className="flex items-center gap-1 p-1 bg-neutral-100 dark:bg-neutral-800 rounded-lg overflow-x-auto">
            <button
              onClick={() => setSelectedDept('all')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                selectedDept === 'all'
                  ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-xs'
                  : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              {t.allGroups} ({projects.length})
            </button>
            {departments.map((dept) => {
              const count = projects.filter((p) => p.department === dept).length;
              return (
                <button
                  key={dept}
                  onClick={() => setSelectedDept(dept)}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                    selectedDept === dept
                      ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-xs'
                      : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                  }`}
                >
                  {dept} ({count})
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 p-1 bg-neutral-100 dark:bg-neutral-800 rounded-lg">
            <button
              onClick={() => setViewMode('cards')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                viewMode === 'cards'
                  ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-xs'
                  : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              {t.cardsView}
            </button>
            <button
              onClick={() => setViewMode('gantt')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                viewMode === 'gantt'
                  ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-xs'
                  : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              {t.ganttView}
            </button>
          </div>

          <button
            onClick={() => setIsCategoryModalOpen(true)}
            className="px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer"
          >
            <Tag className="w-3.5 h-3.5" />
            {t.manageCategories}
          </button>

          <button
            onClick={handleOpenNewProject}
            className="px-3 py-1.5 bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 hover:bg-neutral-800 dark:hover:bg-neutral-100 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 shrink-0 shadow-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            {t.createProject}
          </button>
        </div>
      </div>

      {/* Main View: Either Gantt or Project Cards */}
      {viewMode === 'gantt' ? (
        <GanttTimelineView 
          projects={filteredProjects} 
          milestones={milestones} 
          journals={journals}
          onSelectMilestone={(m) => {
            setEditingMilestone({ ...m });
            setIsMilestoneModalOpen(true);
          }}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {filteredProjects.map((project) => {
            const projectMilestones = milestones.filter((m) => m.projectId === project.id);
            const projectJournals = journals.filter((j) => j.projectId === project.id);
            const totalHours = projectJournals.reduce((acc, cur) => acc + (cur.hours || 0), 0);
            const completedCount = projectMilestones.filter((m) => m.status === 'completed').length;
            const progress = projectMilestones.length > 0 
              ? Math.round((completedCount / projectMilestones.length) * 100) 
              : 0;

            return (
              <div
                key={project.id}
                className="bg-white dark:bg-[#121316] border border-neutral-200/80 dark:border-neutral-800/80 rounded-xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.03)] flex flex-col justify-between"
              >
                <div>
                  {/* Top Bar of Project Card */}
                  <div className="flex items-start justify-between gap-3 mb-2.5">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: project.color }}
                      />
                      <div>
                        <h4 className="text-sm font-bold text-neutral-900 dark:text-white leading-tight font-display">
                          {project.name}
                        </h4>
                        <div className="flex items-center gap-2 text-xs text-neutral-500 mt-0.5">
                          <span>{project.department}</span>
                          <span>·</span>
                          <span className="font-mono tabular-nums">{Math.round(totalHours)}h {lang === 'zh' ? '累计投入' : 'logged'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setEditingProject({ ...project });
                          setIsProjectModalOpen(true);
                        }}
                        className="p-1 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors"
                        title="Edit Project"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(t.confirmDeleteProject.replace('{name}', project.name))) {
                            onDeleteProject(project.id);
                          }
                        }}
                        className="p-1 text-neutral-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                        title="Delete Project"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Description */}
                  {project.description && (
                    <p className="text-xs text-neutral-600 dark:text-neutral-400 mb-3.5 line-clamp-2 leading-relaxed">
                      {project.description}
                    </p>
                  )}

                  {/* Progress Bar */}
                  <div className="space-y-1 mb-4">
                    <div className="flex items-center justify-between text-[11px] text-neutral-500 font-mono">
                      <span>{t.progressLabel}</span>
                      <span>{completedCount} / {projectMilestones.length} ({progress}%)</span>
                    </div>
                    <div className="w-full h-1.5 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${progress}%`,
                          backgroundColor: project.color,
                        }}
                      />
                    </div>
                  </div>

                  {/* Milestones List */}
                  <div className="space-y-2 border-t border-neutral-100 dark:border-neutral-800/80 pt-3">
                    <div className="flex items-center justify-between text-xs text-neutral-500 mb-1">
                      <span className="font-medium flex items-center gap-1.5">
                        <Flag className="w-3 h-3 text-neutral-400" />
                        {t.projects}
                      </span>
                      <button
                        onClick={() => handleOpenNewMilestone(project.id)}
                        className="text-[11px] text-neutral-700 dark:text-neutral-300 hover:underline flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" />
                        {t.addMilestoneBtn}
                      </button>
                    </div>

                    {projectMilestones.length === 0 ? (
                      <div className="text-[11px] text-neutral-400 py-3 text-center border border-dashed border-neutral-200 dark:border-neutral-800 rounded-lg">
                        {t.noMilestonesYet}
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        {projectMilestones.map((m) => {
                          const diff = getDaysDiff(m.dueDate);
                          return (
                            <div
                              key={m.id}
                              className="group p-2 rounded-lg bg-neutral-50/70 dark:bg-neutral-800/40 hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center justify-between gap-2 text-xs transition-colors"
                            >
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  {getStatusBadge(m.status)}
                                  <span className={`font-medium truncate ${m.status === 'completed' ? 'line-through text-neutral-400' : 'text-neutral-800 dark:text-neutral-200'}`}>
                                    {m.title}
                                  </span>
                                </div>
                                <div className="text-[10px] text-neutral-400 font-mono mt-0.5 flex items-center gap-2">
                                  <span>{t.dueDate}: {m.dueDate}</span>
                                  {m.status !== 'completed' && (
                                    <span className={diff < 0 ? 'text-rose-500 font-semibold' : diff <= 3 ? 'text-amber-500' : ''}>
                                      {diff < 0 ? t.daysOverdue.replace('{days}', String(Math.abs(diff))) : t.daysLeft.replace('{days}', String(diff))}
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={() => {
                                    setEditingMilestone({ ...m });
                                    setIsMilestoneModalOpen(true);
                                  }}
                                  className="p-1 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
                                  title="Edit Milestone"
                                >
                                  <Edit3 className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() => {
                                    if (confirm(t.confirmDeleteMilestone.replace('{name}', m.title))) {
                                      onDeleteMilestone(m.id);
                                    }
                                  }}
                                  className="p-1 text-neutral-400 hover:text-rose-600 dark:hover:text-rose-400"
                                  title="Delete Milestone"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Project Modal */}
      {isProjectModalOpen && editingProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-[#121316] rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-neutral-900 dark:text-white font-display">
                {projects.some((p) => p.id === editingProject.id) ? t.editProject : t.createProject}
              </h3>
              <button
                onClick={() => setIsProjectModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!editingProject.name.trim()) return;
                const trimmedDept = editingProject.department.trim() || (lang === 'zh' ? '通用业务' : 'General');
                if (trimmedDept && onAddDepartment) {
                  onAddDepartment(trimmedDept);
                }
                onSaveProject({
                  ...editingProject,
                  department: trimmedDept,
                });
                setIsProjectModalOpen(false);
              }}
              className="space-y-3.5"
            >
              <div>
                <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  {t.projectName}
                </label>
                <input
                  type="text"
                  required
                  value={editingProject.name}
                  onChange={(e) => setEditingProject({ ...editingProject, name: e.target.value })}
                  placeholder={lang === 'zh' ? '例如: 核心网关优化' : 'e.g. Core Gateway V2'}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-neutral-400"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  {t.projectDept} ({lang === 'zh' ? '点击选用或输入新类别' : 'Click or type new'})
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {departments.map((dept) => (
                    <button
                      key={dept}
                      type="button"
                      onClick={() => setEditingProject({ ...editingProject, department: dept })}
                      className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                        editingProject.department === dept
                          ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 shadow-xs'
                          : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200'
                      }`}
                    >
                      {dept}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  required
                  value={editingProject.department}
                  onChange={(e) => setEditingProject({ ...editingProject, department: e.target.value })}
                  placeholder={t.customCategoryPlaceholder}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-neutral-400"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  {t.projectColor}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={editingProject.color}
                    onChange={(e) => setEditingProject({ ...editingProject, color: e.target.value })}
                    className="w-8 h-8 rounded border-0 cursor-pointer bg-transparent"
                  />
                  <span className="font-mono text-xs text-neutral-500">{editingProject.color}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  {t.projectDesc}
                </label>
                <textarea
                  rows={3}
                  value={editingProject.description}
                  onChange={(e) => setEditingProject({ ...editingProject, description: e.target.value })}
                  placeholder={lang === 'zh' ? '描述项目的核心业务价值与技术目标...' : 'Describe technical goals and deliverables...'}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-neutral-400"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  {t.projectStatus}
                </label>
                <select
                  value={editingProject.status}
                  onChange={(e) => setEditingProject({ ...editingProject, status: e.target.value as ProjectStatus })}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-neutral-400"
                >
                  <option value="active">{t.statusActive}</option>
                  <option value="planning">{t.statusPlanning}</option>
                  <option value="completed">{t.statusCompleted}</option>
                  <option value="paused">{t.statusPaused}</option>
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsProjectModalOpen(false)}
                  className="px-3.5 py-1.5 text-xs font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-medium rounded-lg bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-colors shadow-xs"
                >
                  {t.saveProject}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Milestone Modal */}
      {isMilestoneModalOpen && editingMilestone && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-[#121316] rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-neutral-900 dark:text-white font-display">
                {milestones.some((m) => m.id === editingMilestone.id) ? t.editMilestoneTitle : t.newMilestoneTitle}
              </h3>
              <button
                onClick={() => setIsMilestoneModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!editingMilestone.title.trim()) return;
                onSaveMilestone(editingMilestone);
                setIsMilestoneModalOpen(false);
              }}
              className="space-y-3.5"
            >
              <div>
                <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  {t.milestoneName}
                </label>
                <input
                  type="text"
                  required
                  value={editingMilestone.title}
                  onChange={(e) => setEditingMilestone({ ...editingMilestone, title: e.target.value })}
                  placeholder={lang === 'zh' ? '例如: 灰度切流 10% 验收' : 'e.g. Canary Deployment 10%'}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-neutral-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    {t.dueDate}
                  </label>
                  <input
                    type="date"
                    required
                    value={editingMilestone.dueDate}
                    onChange={(e) => setEditingMilestone({ ...editingMilestone, dueDate: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs font-mono rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-neutral-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    {t.milestoneStatus}
                  </label>
                  <select
                    value={editingMilestone.status}
                    onChange={(e) => setEditingMilestone({ ...editingMilestone, status: e.target.value as MilestoneStatus })}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-neutral-400"
                  >
                    <option value="todo">{t.todo}</option>
                    <option value="in_progress">{t.inProgress}</option>
                    <option value="completed">{t.delivered}</option>
                    <option value="delayed">{t.delayed}</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    {lang === 'zh' ? '事件类别' : 'Event Type'}
                  </label>
                  <select
                    value={editingMilestone.eventType || 'regular'}
                    onChange={(e) => setEditingMilestone({ ...editingMilestone, eventType: e.target.value as EventType })}
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
                    value={editingMilestone.location || ''}
                    onChange={(e) => setEditingMilestone({ ...editingMilestone, location: e.target.value })}
                    placeholder={lang === 'zh' ? '例如: 上海 / 客户现场' : 'e.g. Shanghai / Client Site'}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-neutral-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  {t.notesLabel}
                </label>
                <textarea
                  rows={3}
                  value={editingMilestone.notes || ''}
                  onChange={(e) => setEditingMilestone({ ...editingMilestone, notes: e.target.value })}
                  placeholder={lang === 'zh' ? '写下衡量交付达成的具体技术指标或联调依赖方...' : 'Specify measurable acceptance criteria or dependencies...'}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-neutral-400"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsMilestoneModalOpen(false)}
                  className="px-3.5 py-1.5 text-xs font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-medium rounded-lg bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-colors shadow-xs"
                >
                  {t.saveMilestone}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Category / Department Management Modal */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-[#121316] rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-neutral-900 dark:text-white font-display">
                  {t.categoriesTitle}
                </h3>
                <p className="text-[11px] text-neutral-500 mt-0.5">
                  {t.categoriesSubtitle}
                </p>
              </div>
              <button
                onClick={() => {
                  setIsCategoryModalOpen(false);
                  setEditingCategoryOldName(null);
                }}
                className="text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Add New Category Input */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!newCategoryName.trim()) return;
                if (onAddDepartment) {
                  onAddDepartment(newCategoryName.trim());
                }
                setNewCategoryName('');
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder={t.categoryNamePlaceholder}
                className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-neutral-400 font-sans"
              />
              <button
                type="submit"
                disabled={!newCategoryName.trim()}
                className="px-3.5 py-1.5 text-xs font-medium rounded-lg bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-colors disabled:opacity-50 shrink-0 shadow-xs cursor-pointer"
              >
                {t.addCategoryBtn}
              </button>
            </form>

            {/* List of current categories */}
            <div className="space-y-2 max-h-60 overflow-y-auto pt-1">
              <label className="block text-[11px] font-medium text-neutral-400 uppercase tracking-wider">
                {t.savedCategories} ({departments.length})
              </label>
              {departments.map((dept) => {
                const projCount = projects.filter((p) => p.department === dept).length;
                const isEditingThis = editingCategoryOldName === dept;

                return (
                  <div
                    key={dept}
                    className="flex items-center justify-between p-2 rounded-lg bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-100 dark:border-neutral-800/80 text-xs"
                  >
                    {isEditingThis ? (
                      <div className="flex items-center gap-1.5 flex-1 mr-2">
                        <input
                          type="text"
                          value={editingCategoryNewName}
                          onChange={(e) => setEditingCategoryNewName(e.target.value)}
                          className="flex-1 px-2 py-1 text-xs rounded border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (editingCategoryNewName.trim() && onEditDepartment) {
                              onEditDepartment(dept, editingCategoryNewName.trim());
                            }
                            setEditingCategoryOldName(null);
                          }}
                          className="p-1 text-emerald-600 hover:text-emerald-700"
                          title="Save"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingCategoryOldName(null)}
                          className="p-1 text-neutral-400 hover:text-neutral-600"
                          title="Cancel"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Tag className="w-3.5 h-3.5 text-neutral-400" />
                        <span className="font-medium text-neutral-800 dark:text-neutral-200">
                          {dept}
                        </span>
                        <span className="text-[11px] text-neutral-400">
                          ({projCount} {lang === 'zh' ? '个项目' : 'projects'})
                        </span>
                      </div>
                    )}

                    {!isEditingThis && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingCategoryOldName(dept);
                            setEditingCategoryNewName(dept);
                          }}
                          className="p-1 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors"
                          title="Edit"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(t.deleteCategoryConfirm.replace('{name}', dept))) {
                              if (onDeleteDepartment) onDeleteDepartment(dept);
                            }
                          }}
                          className="p-1 text-neutral-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setIsCategoryModalOpen(false);
                  setEditingCategoryOldName(null);
                }}
                className="px-4 py-1.5 text-xs font-medium rounded-lg bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-colors"
              >
                {t.cancel}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
