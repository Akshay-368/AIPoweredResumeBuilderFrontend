import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export interface FeedbackItem {
  id: string;
  userId: number;
  rating: number;
  feedbackText: string;
  createdAt: string;
  updatedAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class FeedbackApiService {
  private readonly http = inject(HttpClient);

  submit(payload: { rating: number; feedbackText: string }): Observable<FeedbackItem> {
    return this.http.post<FeedbackItem>('/api/feedback', payload);
  }

  getAll(): Observable<FeedbackItem[]> {
    return this.http.get<FeedbackItem[]>('/api/feedback');
  }
}
