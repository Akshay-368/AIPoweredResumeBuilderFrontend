import { Component } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
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

  readonly navItems: DashboardNavItem[] = [
    { label: 'Projects', route: '/dashboard/projects' },
    { label: 'ATS Score', route: '/dashboard/ats' },
    { label: 'Resume Builder', route: '/dashboard/resume' },
    { label: 'Cover letter', route: '/dashboard/cover-letter'},
    { label: 'Templates', route: '/dashboard/templates' }
  ];

  readonly secondaryNavItems: DashboardNavItem[] = [
    { label: 'Account Settings', route: '/dashboard/account-settings' },
    { label: 'Subscription', route: '/dashboard/subscription' },
    { label: 'Theme', route: '/dashboard/theme' },
    { label: 'Log out', route: '/', exact: true }
  ];

  constructor(private readonly router: Router) {}

  toggleSidebar(): void {
    this.isSidebarCollapsed = !this.isSidebarCollapsed;
  }

  logout(): void {
    this.router.navigate(['/']);
  }
}
