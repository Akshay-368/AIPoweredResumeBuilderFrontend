import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export interface ResumeData {
  personalInfo: Record<string, any>;
  education: any[];
  experience: any[];
  projects: any[];
  skills: string[];
  targetJobs: any[];
}

export interface SectionScores {
  experience: number;
  projects: number;
  education: number;
  skills: number;
  formatting: number;
}

export interface RecommendationItem {
  category: string;
  priority: 'high' | 'medium' | 'low';
  reason: string;
  action: string;
}

export interface BulletImprovement {
  original: string;
  improved: string;
}

export interface AtsScoreResponse {
  overallScore: number;
  keywordMatchScore: number;
  sectionScores: SectionScores;
  missingKeywords: string[];
  strongKeywords: string[];
  recommendations: RecommendationItem[];
  improvedBulletSuggestions: BulletImprovement[];
  summary: string;
}

export interface AtsScoreRequest {
  resumeData: ResumeData;
  jobDescriptionText: string;
  jobRole: string;
  customRole?: string | null;
  projectId?: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class AtsScoreApiService {
  private readonly http = inject(HttpClient);

  scoreResume(request: AtsScoreRequest): Observable<AtsScoreResponse> {
    return this.http.post<AtsScoreResponse>('/api/ats/score', request);
  }
}
