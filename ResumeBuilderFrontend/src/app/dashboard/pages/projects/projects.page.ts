import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ProjectCardComponent } from '../../components/project-card/project-card.component';
import { ProjectModalComponent } from '../../components/project-modal/project-modal.component';
import { ProjectType, ResumeProject } from '../../models/project.model';
import { ProjectsStore } from '../../services/projects.store';

@Component({
  selector: 'app-projects-page',
  standalone: true,
  imports: [CommonModule, ProjectCardComponent, ProjectModalComponent],
  templateUrl: './projects.page.html',
  styleUrl: './projects.page.css'
})
export class ProjectsPage {
  private readonly projectsStore = inject(ProjectsStore);
  private readonly router = inject(Router);

  readonly projects = computed(() => this.projectsStore.projects());

  isModalOpen = false;
  selectedType: ProjectType | null = null;

  openCreateProjectModal(type: ProjectType): void {
    this.selectedType = type;
    this.isModalOpen = true;
  }

  closeCreateProjectModal(): void {
    this.isModalOpen = false;
    this.selectedType = null;
  }

  onCreateProject(payload: { name: string; type: ProjectType }): void {
    this.projectsStore.createProject(payload.name, payload.type);
    this.closeCreateProjectModal();
    this.navigateToType(payload.type);
  }

  openProject(project: ResumeProject): void {
    this.navigateToType(project.type);
  }

  trackByProjectId(_index: number, project: ResumeProject): string {
    return project.id;
  }

  private navigateToType(type: ProjectType): void {
    if (type === 'ATS') {
      this.router.navigate(['/dashboard/ats']);
      return;
    }

    if (type === 'Resume') {
      this.router.navigate(['/dashboard/resume']);
      return;
    }

    this.router.navigate(['/dashboard/templates']);
  }
}
