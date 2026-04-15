import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../../auth/services/auth.service';
import { NotificationItem, NotificationsApiService, UserDirectoryItem } from '../../services/notifications-api.service';

@Component({
  selector: 'app-notifications-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './notifications.page.html',
  styleUrl: './notifications.page.css'
})
export class NotificationsPage implements OnInit {
  private readonly notificationsApi = inject(NotificationsApiService);
  private readonly authService = inject(AuthService);
  private readonly cdr = inject(ChangeDetectorRef);

  inbox: NotificationItem[] = [];
  sent: NotificationItem[] = [];
  activeTab: 'inbox' | 'sent' = 'inbox';
  recipientUsers: UserDirectoryItem[] = [];
  private userRoleLookup = new Map<number, string>();
  private readonly currentUserId = this.authService.getCurrentUserId();

  toUserId = '';
  subject = '';
  body = '';
  message = '';
  loading = false;

  readonly isAdmin = this.authService.isAdmin();

  async ngOnInit(): Promise<void> {
    await Promise.all([this.reload(), this.loadRecipientUsers()]);
  }

  private async loadRecipientUsers(): Promise<void> {
    try {
      const users = await firstValueFrom(this.notificationsApi.getUserDirectory());
      const filteredUsers = users.filter((user) => user.userId !== this.currentUserId);
      this.recipientUsers = filteredUsers;
      this.userRoleLookup = new Map(users.map((user) => [user.userId, (user.role ?? '').toUpperCase()]));
    } catch (error: any) {
      this.recipientUsers = [];
      this.message = error?.error?.message ?? 'Unable to load user directory.';
    } finally {
      this.cdr.detectChanges();
    }
  }

  async reload(): Promise<void> {
    this.loading = true;
    this.message = '';

    try {
      const [inbox, sent] = await Promise.all([
        firstValueFrom(this.notificationsApi.getInbox()),
        firstValueFrom(this.notificationsApi.getSent())
      ]);

      this.inbox = inbox;
      this.sent = sent;
    } catch (error: any) {
      this.message = error?.error?.message ?? 'Unable to load notifications.';
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  async send(): Promise<void> {
    this.message = '';

    const toUserId = Number(this.toUserId);
    if (!Number.isFinite(toUserId) || toUserId <= 0) {
      this.message = 'Recipient user id is required.';
      this.cdr.detectChanges();
      return;
    }

    if (!this.subject.trim() || !this.body.trim()) {
      this.message = 'Subject and body are required.';
      this.cdr.detectChanges();
      return;
    }

    try {
      await firstValueFrom(this.notificationsApi.create({
        toUserId,
        subject: this.subject.trim(),
        body: this.body.trim()
      }));

      this.subject = '';
      this.body = '';
      this.toUserId = '';
      this.message = 'Notification sent.';
      await this.reload();
    } catch (error: any) {
      this.message = error?.error?.message ?? 'Unable to send notification.';
      this.cdr.detectChanges();
    }
  }

  async markRead(item: NotificationItem): Promise<void> {
    try {
      await firstValueFrom(this.notificationsApi.markRead(item.id));
      await this.reload();
    } catch (error: any) {
      this.message = error?.error?.message ?? 'Unable to mark notification as read.';
      this.cdr.detectChanges();
    }
  }

  async softDelete(item: NotificationItem): Promise<void> {
    try {
      await firstValueFrom(this.notificationsApi.softDelete(item.id));
      await this.reload();
    } catch (error: any) {
      this.message = error?.error?.message ?? 'Unable to delete notification from your view.';
      this.cdr.detectChanges();
    }
  }

  async hardDelete(item: NotificationItem): Promise<void> {
    if (!this.isAdmin) {
      return;
    }

    try {
      await firstValueFrom(this.notificationsApi.hardDeleteAsAdmin(item.id));
      await this.reload();
    } catch (error: any) {
      this.message = error?.error?.message ?? 'Unable to hard delete notification.';
      this.cdr.detectChanges();
    }
  }

  getUserLabel(userId: number): string {
    const role = this.userRoleLookup.get(userId);
    return role === 'ADMIN' ? `${userId} (ADMIN)` : `${userId}`;
  }
}
