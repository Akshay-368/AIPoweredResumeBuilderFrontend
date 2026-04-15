import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export interface ResumeData {
  personalInfo: Record<string, unknown>;
  education: unknown[];
  experience: unknown[];
  projects: unknown[];
  skills: string[];
  targetJobs: unknown[];
}

export interface RawTextRequest {
  rawText: string;
}

@Injectable({
  providedIn: 'root'
})
export class ResumeParserApiService {
  private readonly http = inject(HttpClient);

  parseResume(file: File, projectId?: string): Observable<ResumeData> {
    const formData = new FormData();
    formData.append('file', file);

    const url = projectId ? `/api/parser/upload?projectId=${encodeURIComponent(projectId)}` : '/api/parser/upload';
    return this.http.post<ResumeData>(url, formData);
  }

  parseResumeText(rawText: string, projectId?: string): Observable<ResumeData> {
    const url = projectId ? `/api/parser/upload-text?projectId=${encodeURIComponent(projectId)}` : '/api/parser/upload-text';
    return this.http.post<ResumeData>(url, { rawText } as RawTextRequest);
  }
}
