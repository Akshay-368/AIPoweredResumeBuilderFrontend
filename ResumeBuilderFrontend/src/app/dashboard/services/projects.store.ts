import { isPlatformBrowser } from '@angular/common';
import { Inject, Injectable, PLATFORM_ID, computed, signal } from '@angular/core';
import { ProjectType, ResumeProject } from '../models/project.model';

@Injectable({
  providedIn: 'root'
})
export class ProjectsStore {
  private readonly storageKey = 'resume-builder.projects';
  private readonly isBrowser: boolean;
  private readonly projectsState = signal<ResumeProject[]>([]);

  readonly projects = computed(() => this.projectsState());

  constructor(@Inject(PLATFORM_ID) platformId: object) {
    this.isBrowser = isPlatformBrowser(platformId);
    this.load();
  }

  createProject(name: string, type: ProjectType): ResumeProject {
    const project: ResumeProject = {
      id: this.generateId(),
      name: name.trim(),
      type,
      lastModifiedIso: new Date().toISOString()
    };

    const updated = [project, ...this.projectsState()];
    this.projectsState.set(updated);
    this.persist(updated);

    return project;
  }

  updateProject(projectId: string, patch: Partial<Pick<ResumeProject, 'name' | 'type'>>): void {
    const updated = this.projectsState().map((project) => {
      if (project.id !== projectId) {
        return project;
      }

      return {
        ...project,
        ...(patch.name ? { name: patch.name.trim() } : {}),
        ...(patch.type ? { type: patch.type } : {}),
        lastModifiedIso: new Date().toISOString()
      };
    });

    this.projectsState.set(updated);
    this.persist(updated);
  }

  deleteProject(projectId: string): void {
    const updated = this.projectsState().filter((project) => project.id !== projectId);
    this.projectsState.set(updated);
    this.persist(updated);
  }

  getProjects(): ResumeProject[] {
    return this.projectsState();
  }

  private load(): void {
    if (!this.isBrowser) {
      return;
    }

    const raw = localStorage.getItem(this.storageKey);
    if (!raw) {
      return;
    }

    try {
      const parsed = JSON.parse(raw) as ResumeProject[];
      if (Array.isArray(parsed)) {
        this.projectsState.set(parsed);
      }
    } catch {
      this.projectsState.set([]);
    }
  }

  private persist(projects: ResumeProject[]): void {
    if (!this.isBrowser) {
      return;
    }

    localStorage.setItem(this.storageKey, JSON.stringify(projects));
  }

  private generateId(): string {
    if (this.isBrowser && 'crypto' in globalThis && 'randomUUID' in crypto) {
      return crypto.randomUUID();
    }

    return `project-${Date.now()}`;
  }
}
