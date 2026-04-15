import { Component } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { AuthService } from '../auth/services/auth.service';
import { SidebarComponent } from './components/sidebar/sidebar.component';
import { DashboardNavItem } from './models/project.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterOutlet, SidebarComponent],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard {
  isSidebarCollapsed = false;

  private readonly isAdmin: boolean;

  readonly navItems: DashboardNavItem[];

  readonly secondaryNavItems: DashboardNavItem[];

  constructor(
    private readonly router: Router,
    private readonly authService: AuthService
  ) {
    this.isAdmin = this.authService.isAdmin();

    this.navItems = [
    { label: 'Projects', route: '/dashboard/projects' },
    { label: 'ATS Score', route: '/dashboard/ats' },
    { label: 'Resume Builder', route: '/dashboard/resume' },
    { label: 'Notifications', route: '/dashboard/notifications' },
    { label: 'Rate Us', route: '/dashboard/rate-us' },
    { label: 'Templates', route: '/dashboard/templates' }
    ];

    this.secondaryNavItems = [
    { label: 'Account Settings', route: '/dashboard/account-settings' },
    { label: 'Subscription', route: '/dashboard/subscription' },
    { label: 'Theme', route: '/dashboard/theme' },
    { label: 'Log out', route: '/', exact: true }
    ];

    if (this.isAdmin) {
      this.secondaryNavItems.splice(0, 0, { label: 'Admin', route: '/dashboard/admin' });
    }
  }

  toggleSidebar(): void {
    this.isSidebarCollapsed = !this.isSidebarCollapsed;
  }

  logout(): void {
    this.router.navigate(['/']);
  }
}
