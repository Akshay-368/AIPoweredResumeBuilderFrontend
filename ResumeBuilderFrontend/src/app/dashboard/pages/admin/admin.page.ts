import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AdminApiService, AdminOverview, AdminUser } from '../../services/admin-api.service';

@Component({
  selector: 'app-admin-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin.page.html',
  styleUrl: './admin.page.css'
})
export class AdminPage implements OnInit {
  private readonly adminApi = inject(AdminApiService);
  private readonly cdr = inject(ChangeDetectorRef);

  overview: AdminOverview | null = null;
  users: AdminUser[] = [];
  selectedUserActivity: any = null;
  selectedUserId: number | null = null;
  message = '';
  loading = false;

  async ngOnInit(): Promise<void> {
    await this.reload();
  }

  async reload(): Promise<void> {
    this.loading = true;
    this.message = '';

    try {
      const [overview, users] = await Promise.all([
        firstValueFrom(this.adminApi.getOverview()),
        firstValueFrom(this.adminApi.getUsers())
      ]);

      this.overview = overview;
      this.users = users;
    } catch (error: any) {
      this.message = error?.error?.message ?? 'Unable to load admin data.';
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  async loadActivity(userId: number): Promise<void> {
    this.message = '';
    this.selectedUserId = userId;

    try {
      this.selectedUserActivity = await firstValueFrom(this.adminApi.getUserActivity(userId));
    } catch (error: any) {
      this.selectedUserActivity = null;
      this.message = error?.error?.message ?? 'Unable to load user activity.';
    } finally {
      this.cdr.detectChanges();
    }
  }

  async deleteUser(userId: number): Promise<void> {
    const confirmed = window.confirm(`Delete user ${userId} permanently?`);
    if (!confirmed) {
      return;
    }

    this.message = '';

    try {
      await firstValueFrom(this.adminApi.deleteUser(userId));
      this.message = `User ${userId} deleted.`;
      if (this.selectedUserId === userId) {
        this.selectedUserId = null;
        this.selectedUserActivity = null;
      }
      await this.reload();
    } catch (error: any) {
      this.message = error?.error?.message ?? 'Unable to delete user.';
      this.cdr.detectChanges();
    }
  }
}
