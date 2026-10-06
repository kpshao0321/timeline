export interface GitHubConfig {
  token: string;
  owner: string;
  repo: string;
  branch: string;
  path: string;
}

export type SyncState = 'idle' | 'syncing' | 'success' | 'error' | 'unconfigured';

export interface SyncStatus {
  state: SyncState;
  lastSyncedAt?: string;
  message?: string;
  fileSha?: string;
}

export type ProjectStatus = 'active' | 'planning' | 'completed' | 'paused';

export interface Project {
  id: string;
  name: string;
  department: string; // 组别/部门
  description: string;
  status: ProjectStatus;
  color: string;
  createdAt: string;
}

export type MilestoneStatus = 'todo' | 'in_progress' | 'completed' | 'delayed';
export type EventType = 'regular' | 'business_trip' | 'client_meeting';

export interface Milestone {
  id: string;
  projectId: string;
  title: string;
  dueDate: string; // YYYY-MM-DD
  completedDate?: string;
  status: MilestoneStatus;
  eventType?: EventType;
  location?: string;
  notes?: string;
}

export interface JournalEntry {
  id: string;
  date: string; // YYYY-MM-DD
  endDate?: string; // Optional for multi-day trips
  projectId: string;
  content: string; // Markdown supported
  hours: number; // e.g. 1.0 - 12.0
  energyPercent: number; // 10% - 100% 精力/关注度
  eventType?: EventType;
  location?: string;
  tags: string[];
  updatedAt: string;
}

export interface AppData {
  version: number;
  updatedAt: string;
  projects: Project[];
  milestones: Milestone[];
  journals: JournalEntry[];
  departments: string[];
}
