import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export interface CreateNotificationRequest {
  toUserId: number;
  subject: string;
  body: string;
}

export interface NotificationItem {
  id: string;
  fromUserId: number;
  toUserId: number;
  subject: string;
  body: string;
  createdAt: string;
  isRead?: boolean;
  readAt?: string | null;
  recipientRead?: boolean;
  recipientReadAt?: string | null;
}

export interface UserDirectoryItem {
  userId: number;
  role: string;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationsApiService {
  private readonly http = inject(HttpClient);

  create(payload: CreateNotificationRequest): Observable<NotificationItem> {
    return this.http.post<NotificationItem>('/api/notifications', payload);
  }

  getInbox(): Observable<NotificationItem[]> {
    return this.http.get<NotificationItem[]>('/api/notifications/inbox');
  }

  getSent(): Observable<NotificationItem[]> {
    return this.http.get<NotificationItem[]>('/api/notifications/sent');
  }

  getUserDirectory(): Observable<UserDirectoryItem[]> {
    return this.http.get<UserDirectoryItem[]>('/api/users/directory');
  }

  markRead(id: string): Observable<{ id: string; isRead: boolean; readAt: string | null }> {
    return this.http.post<{ id: string; isRead: boolean; readAt: string | null }>(`/api/notifications/${id}/read`, {});
  }

  softDelete(id: string): Observable<{ id: string; deletedForUser: boolean }> {
    return this.http.delete<{ id: string; deletedForUser: boolean }>(`/api/notifications/${id}`);
  }

  hardDeleteAsAdmin(id: string): Observable<{ id: string; deleted: boolean }> {
    return this.http.delete<{ id: string; deleted: boolean }>(`/api/admin/notifications/${id}`);
  }
}
