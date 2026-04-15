import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export interface PersistedProject {
  projectId: string;
  userId: number;
  name: string;
  type: 'ATS' | 'Resume' | 'Template';
  status: 'draft' | 'in_progress' | 'completed';
  currentStep: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectHistoryItem extends PersistedProject {
  isDeleted: boolean;
}

export interface ResumeLibraryItem {
  resumeId: string;
  resumeType: 'parser_artifact' | 'resume_builder_artifact' | 'resume_pdf_export';
  projectId: string;
  projectName: string;
  sourceType?: string;
  templateId?: string;
  fileName?: string;
  createdAt: string;
  updatedAt: string;
  isDeleted: boolean;
}

export interface DefaultResumePreference {
  resumeType: 'parser_artifact' | 'resume_builder_artifact' | 'resume_pdf_export';
  resumeId: string;
  updatedAt: string;
}

export interface ResolvedDefaultResume {
  module: 'ats' | 'resume_builder';
  resumeType: 'parser_artifact' | 'resume_builder_artifact' | 'resume_pdf_export';
  resumeId: string;
  projectId: string;
  sourceType: string;
  parsedResumeJson: any;
  resolvedAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class ProjectsApiService {
  private readonly http = inject(HttpClient);

  getProjects(): Observable<PersistedProject[]> {
    return this.http.get<PersistedProject[]>('/api/projects');
  }

  getProjectHistory(includeDeleted = true): Observable<ProjectHistoryItem[]> {
    return this.http.get<ProjectHistoryItem[]>(`/api/projects/history?includeDeleted=${includeDeleted}`);
  }

  createProject(payload: { name: string; type: 'ATS' | 'Resume' | 'Template'; status?: string; currentStep?: number }): Observable<PersistedProject> {
    return this.http.post<PersistedProject>('/api/projects', payload);
  }

  getProject(projectId: string): Observable<PersistedProject> {
    return this.http.get<PersistedProject>(`/api/projects/${projectId}`);
  }

  updateProject(projectId: string, payload: { name?: string; type?: 'ATS' | 'Resume' | 'Template'; status?: string; currentStep?: number }): Observable<PersistedProject> {
    return this.http.patch<PersistedProject>(`/api/projects/${projectId}`, payload);
  }

  deleteProject(projectId: string): Observable<{ projectId: string; isDeleted: boolean }> {
    return this.http.delete<{ projectId: string; isDeleted: boolean }>(`/api/projects/${projectId}`);
  }

  restoreProject(projectId: string): Observable<{ projectId: string; isDeleted: boolean }> {
    return this.http.post<{ projectId: string; isDeleted: boolean }>(`/api/projects/${projectId}/restore`, {});
  }

  permanentDeleteProject(projectId: string): Observable<{ projectId: string; permanentlyDeleted: boolean }> {
    return this.http.delete<{ projectId: string; permanentlyDeleted: boolean }>(`/api/projects/${projectId}/permanent`);
  }

  purgeCurrentUserProjects(): Observable<{ userId: number; deletedProjects: number }> {
    return this.http.delete<{ userId: number; deletedProjects: number }>('/api/projects/account/purge');
  }

  getResumeArtifact(projectId: string): Observable<{ parsedResumeJson: any; rawText?: string }> {
    return this.http.get<{ parsedResumeJson: any; rawText?: string }>(`/api/projects/${projectId}/resume-artifact`);
  }

  getJdArtifact(projectId: string): Observable<{ parsedJdJson: any; rawText?: string }> {
    return this.http.get<{ parsedJdJson: any; rawText?: string }>(`/api/projects/${projectId}/jd-artifact`);
  }

  upsertResumeArtifact(projectId: string, payload: { parsedResumeJson: any; rawText?: string; sourceType?: string }): Observable<any> {
    return this.http.put(`/api/projects/${projectId}/resume-artifact`, payload);
  }

  upsertJdArtifact(projectId: string, payload: { parsedJdJson: any; rawText?: string; sourceType?: string }): Observable<any> {
    return this.http.put(`/api/projects/${projectId}/jd-artifact`, payload);
  }

  getLatestAtsResult(projectId: string): Observable<{ atsResultJson: any }> {
    return this.http.get<{ atsResultJson: any }>(`/api/projects/${projectId}/ats-results/latest`);
  }

  upsertWizardState(projectId: string, module: 'ats' | 'resume_builder', payload: { currentStep: number; stateJson: any }): Observable<any> {
    return this.http.put(`/api/projects/${projectId}/wizard-state/${module}`, payload);
  }

  getWizardState(projectId: string, module: 'ats' | 'resume_builder'): Observable<{ currentStep: number; stateJson: any }> {
    return this.http.get<{ currentStep: number; stateJson: any }>(`/api/projects/${projectId}/wizard-state/${module}`);
  }

  getResumeLibrary(): Observable<{ items: ResumeLibraryItem[]; defaultResume: DefaultResumePreference | null }> {
    return this.http.get<{ items: ResumeLibraryItem[]; defaultResume: DefaultResumePreference | null }>('/api/projects/resume-library');
  }

  setDefaultResume(resumeId: string): Observable<DefaultResumePreference> {
    return this.http.post<DefaultResumePreference>(`/api/projects/resume-library/default/${encodeURIComponent(resumeId)}`, {});
  }

  getDefaultResume(): Observable<DefaultResumePreference> {
    return this.http.get<DefaultResumePreference>('/api/projects/resume-library/default');
  }

  resolveDefaultResume(module: 'ats' | 'resume_builder'): Observable<ResolvedDefaultResume> {
    return this.http.get<ResolvedDefaultResume>(`/api/projects/resume-library/default/resolve?module=${module}`);
  }
}
