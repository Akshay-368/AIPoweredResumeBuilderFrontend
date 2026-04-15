import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ProjectCardComponent } from '../../components/project-card/project-card.component';
import { ProjectModalComponent } from '../../components/project-modal/project-modal.component';
import { ProjectType, ResumeProject } from '../../models/project.model';
import { ProjectsApiService } from '../../services/projects-api.service';
import { ProjectsStore } from '../../services/projects.store';

@Component({
  selector: 'app-projects-page',
  standalone: true,
  imports: [CommonModule, ProjectCardComponent, ProjectModalComponent],
  templateUrl: './projects.page.html',
  styleUrl: './projects.page.css'
})
export class ProjectsPage implements OnInit {
  private readonly projectsStore = inject(ProjectsStore);
  private readonly projectsApi = inject(ProjectsApiService);
  private readonly router = inject(Router);

  readonly projects = computed(() => this.projectsStore.projects());

  isModalOpen = false;
  selectedType: ProjectType | null = null;

  async ngOnInit(): Promise<void> {
    try {
      const backendProjects = await firstValueFrom(this.projectsApi.getProjects());
      const mapped: ResumeProject[] = backendProjects.map((project) => ({
        id: project.projectId,
        name: project.name,
        type: project.type,
        lastModifiedIso: project.updatedAt
      }));

      this.projectsStore.setProjects(mapped);
    } catch {
      // Keep existing local cache when backend list is unavailable.
    }
  }

  openCreateProjectModal(type: ProjectType): void {
    this.selectedType = type;
    this.isModalOpen = true;
  }

  closeCreateProjectModal(): void {
    this.isModalOpen = false;
    this.selectedType = null;
  }

  async onCreateProject(payload: { name: string; type: ProjectType }): Promise<void> {
    let projectId: string | undefined;

    try {
      const backendProject = await firstValueFrom(this.projectsApi.createProject({
        name: payload.name,
        type: payload.type,
        status: 'draft',
        currentStep: 1
      }));

      projectId = backendProject?.projectId;
    } catch {
      projectId = undefined;
    }

    const project = this.projectsStore.createProject(payload.name, payload.type, projectId);

    this.closeCreateProjectModal();
    this.navigateToType(project.type, project.id);
  }

  openProject(project: ResumeProject): void {
    this.navigateToType(project.type, project.id);
  }

  async deleteProject(project: ResumeProject): Promise<void> {
    try {
      await firstValueFrom(this.projectsApi.deleteProject(project.id));
    } catch {
      return;
    }

    this.projectsStore.deleteProject(project.id);
  }

  trackByProjectId(_index: number, project: ResumeProject): string {
    return project.id;
  }

  private navigateToType(type: ProjectType, projectId?: string): void {
    const queryParams = projectId ? { projectId } : {};

    if (type === 'ATS') {
      this.router.navigate(['/dashboard/ats'], { queryParams });
      return;
    }

    if (type === 'Resume') {
      this.router.navigate(['/dashboard/resume'], { queryParams });
      return;
    }

    this.router.navigate(['/dashboard/templates'], { queryParams });
  }
}
