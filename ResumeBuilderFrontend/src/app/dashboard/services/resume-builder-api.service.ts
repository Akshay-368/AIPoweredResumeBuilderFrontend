import { HttpClient, HttpResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export interface ResumeBuilderTemplate {
  templateId: string;
  title: string;
  description: string;
  styleGuideJson: any;
  isDefault: boolean;
}

export interface ResumeBuilderBasicInfo {
  fullName: string;
  professionalRole: string;
  email: string;
  phone?: string | null;
  linkedInUrl?: string | null;
  portfolioUrl?: string | null;
  location?: string | null;
  summary?: string | null;
}

export interface ResumeBuilderTargetJob {
  role?: string | null;
  customRole?: string | null;
  jobDescriptionText?: string | null;
}

export interface ResumeBuilderEducation {
  institution: string;
  degree: string;
  fieldOfStudy?: string | null;
  startYear?: string | null;
  endYear?: string | null;
  isPresent: boolean;
  marks?: string | null;
}

export interface ResumeBuilderExperience {
  company: string;
  role: string;
  startDate?: string | null;
  endDate?: string | null;
  isPresent: boolean;
  description?: string | null;
}

export interface ResumeBuilderProject {
  name: string;
  techStack: string;
  description?: string | null;
}

export interface ResumeBuilderWizardSnapshot {
  basicInfo: ResumeBuilderBasicInfo;
  targetJob: ResumeBuilderTargetJob;
  education: ResumeBuilderEducation[];
  experience: ResumeBuilderExperience[];
  projects: ResumeBuilderProject[];
  noPriorExperience: boolean;
}

export interface ResumeBuilderRevisionContext {
  currentPreviewJson: any;
  userChangeRequest: string;
}

export interface ResumeBuilderGenerateRequest {
  projectId: string;
  templateId: string;
  wizardSnapshot: ResumeBuilderWizardSnapshot;
  prefilledResumeJson?: any;
  targetRole?: string | null;
  tone?: string | null;
  lengthPolicy?: string | null;
  revisionContext?: ResumeBuilderRevisionContext | null;
}

export interface ResumeBuilderArtifactResponse {
  artifactId: string;
  projectId: string;
  templateId: string;
  builderSnapshotJson: any;
  generatedResumeJson: any;
  generationModel: string;
  revisionCount: number;
  isFinalized: boolean;
  finalizedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ResumeBuilderPdfExportResponse {
  exportId: string;
  projectId: string;
  artifactId?: string | null;
  templateId: string;
  fileName: string;
  createdAt: string;
}

export interface ResumeBuilderPdfExportRequest {
  projectId: string;
  templateId: string;
  resumeJson?: any;
  renderOptions?: any;
}

export interface ResumeBuilderPdfPreviewRequest {
  projectId: string;
  templateId: string;
  resumeJson: any;
  renderOptions?: any;
}

@Injectable({
  providedIn: 'root'
})
export class ResumeBuilderApiService {
  private readonly http = inject(HttpClient);

  getTemplates(): Observable<ResumeBuilderTemplate[]> {
    return this.http.get<ResumeBuilderTemplate[]>('/api/projects/resume-builder/templates');
  }

  getArtifact(projectId: string): Observable<ResumeBuilderArtifactResponse> {
    return this.http.get<ResumeBuilderArtifactResponse>(`/api/projects/${projectId}/resume-builder/artifact`);
  }

  generatePreview(projectId: string, payload: ResumeBuilderGenerateRequest): Observable<ResumeBuilderArtifactResponse> {
    return this.http.post<ResumeBuilderArtifactResponse>(`/api/projects/${projectId}/resume-builder/generate`, payload);
  }

  revisePreview(projectId: string, payload: ResumeBuilderGenerateRequest): Observable<ResumeBuilderArtifactResponse> {
    return this.http.post<ResumeBuilderArtifactResponse>(`/api/projects/${projectId}/resume-builder/revise`, payload);
  }

  getLatestPdfMetadata(projectId: string): Observable<ResumeBuilderPdfExportResponse> {
    return this.http.get<ResumeBuilderPdfExportResponse>(`/api/projects/${projectId}/resume-builder/pdf/latest/metadata`);
  }

  exportPdf(projectId: string, payload: ResumeBuilderPdfExportRequest): Observable<HttpResponse<Blob>> {
    return this.http.post(`/api/projects/${projectId}/resume-builder/export-pdf`, payload, {
      observe: 'response',
      responseType: 'blob'
    });
  }

  previewPdf(projectId: string, payload: ResumeBuilderPdfPreviewRequest): Observable<HttpResponse<Blob>> {
    return this.http.post(`/api/projects/${projectId}/resume-builder/preview-pdf`, payload, {
      observe: 'response',
      responseType: 'blob'
    });
  }

  downloadLatestPdf(projectId: string): Observable<HttpResponse<Blob>> {
    return this.http.get(`/api/projects/${projectId}/resume-builder/pdf/latest`, {
      observe: 'response',
      responseType: 'blob'
    });
  }
}