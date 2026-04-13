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

@Injectable({
  providedIn: 'root'
})
export class ProjectsApiService {
  private readonly http = inject(HttpClient);

  getProjects(): Observable<PersistedProject[]> {
    return this.http.get<PersistedProject[]>('/api/projects');
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
}
