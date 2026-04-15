import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export interface AdminOverview {
  totalUsers: number;
  activeUsers: number;
  totalAdmins: number;
  atsContext?: any;
}

export interface AdminUser {
  userId: number;
  fullName: string;
  email: string;
  phoneNumber: string;
  role: string;
  subscriptionPlan: string;
  isActive: boolean;
  provider: string;
  createdAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class AdminApiService {
  private readonly http = inject(HttpClient);

  getOverview(): Observable<AdminOverview> {
    return this.http.get<AdminOverview>('/api/admin/overview');
  }

  getUsers(): Observable<AdminUser[]> {
    return this.http.get<AdminUser[]>('/api/admin/users');
  }

  getUserActivity(userId: number): Observable<any> {
    return this.http.get<any>(`/api/admin/users/${userId}/activity`);
  }

  deleteUser(userId: number): Observable<{ userId: number; deleted: boolean }> {
    return this.http.delete<{ userId: number; deleted: boolean }>(`/api/admin/users/${userId}`);
  }
}
