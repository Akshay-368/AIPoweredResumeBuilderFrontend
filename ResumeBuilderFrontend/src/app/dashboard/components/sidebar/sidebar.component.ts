import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { DashboardNavItem } from '../../models/project.model';

@Component({
  selector: 'app-dashboard-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css'
})
export class SidebarComponent {
  @Input({ required: true }) navItems: DashboardNavItem[] = [];
  @Input() secondaryNavItems: DashboardNavItem[] = []; // secondary navigation items like account settings, subscription, etc.
  @Input() collapsed = false; // whether the sidebar is collapsed or not
  // Parent (dashboard) will handle the actual toggling of the sidebar and logging out, this component just emits events when the user interacts with the sidebar
  // and also what items to show and whether sidebar is collapsed or not are handled by dashboard.
  
  @Output() toggleSidebar = new EventEmitter<void>();
  @Output() logout = new EventEmitter<void>();
  // This component is only responsible for rendering the sidebar and emitting events when user interacts with it, the actual logic of toggling sidebar and logging out is handled by the parent (dashboard) component.
  // so we can say it doesn't control the state of the sidebar itself.

  onToggleSidebar(): void {
    this.toggleSidebar.emit();
  } // this is an event flow from child (sidebar) to parent (dashboard), when user clicks on the toggle button in the sidebar, it emits an event to the parent (dashboard) component to toggle the sidebar.
  // button clicked -> sidebar component emits toggleSidebar event -> dashboard component listens to this event and toggles the sidebar state -> sidebar component receives the new state of the sidebar through the collapsed input and re-renders accordingly.

  onLogout(): void {
    this.logout.emit();
  }
}
