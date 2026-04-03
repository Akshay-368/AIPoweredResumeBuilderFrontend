export type ProjectType = 'ATS' | 'Resume' | 'Template';

export interface ResumeProject {
  id: string;
  name: string;
  type: ProjectType;
  lastModifiedIso: string;
}

export interface DashboardNavItem {
  label: string;
  route: string;
  exact?: boolean;
}
