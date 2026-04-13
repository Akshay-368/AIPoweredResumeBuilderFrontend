import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export interface JobDescriptionData {
  jobTitle: string;
  summary: string;
  responsibilities: string[];
  requiredSkills: string[];
  preferredSkills: string[];
  technologies: string[];
  minimumExperienceYears: number | null;
  keywords: string[];
}

export interface RawTextRequest {
  rawText: string;
}

@Injectable({
  providedIn: 'root'
})
export class JobDescriptionParserApiService {
  private readonly http = inject(HttpClient);

  /**
   * Parse a job description file (PDF or DOCX) into structured JSON.
   * @param file The JD file to parse
   * @returns Observable of parsed JobDescriptionData
   */
  parseJobDescription(file: File, projectId?: string): Observable<JobDescriptionData> {
    const formData = new FormData();
    formData.append('file', file);

    const url = projectId
      ? `/api/parser/job-description?projectId=${encodeURIComponent(projectId)}`
      : '/api/parser/job-description';

    return this.http.post<JobDescriptionData>(url, formData);
  }

  parseJobDescriptionText(rawText: string, projectId?: string): Observable<JobDescriptionData> {
    const url = projectId
      ? `/api/parser/job-description-text?projectId=${encodeURIComponent(projectId)}`
      : '/api/parser/job-description-text';

    return this.http.post<JobDescriptionData>(url, { rawText } as RawTextRequest);
  }
}
