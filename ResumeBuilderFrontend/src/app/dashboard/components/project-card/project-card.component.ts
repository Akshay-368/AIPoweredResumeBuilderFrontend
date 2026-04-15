import { CommonModule, DatePipe } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ResumeProject } from '../../models/project.model';

@Component({
  selector: 'app-project-card',
  standalone: true,
  imports: [CommonModule, DatePipe],
  templateUrl: './project-card.component.html',
  styleUrl: './project-card.component.css'
})
export class ProjectCardComponent {
  @Input({ required: true }) project!: ResumeProject;

  @Output() open = new EventEmitter<ResumeProject>();
  @Output() delete = new EventEmitter<ResumeProject>();

  openProject(): void {
    this.open.emit(this.project);
  }

  deleteProject(event: Event): void {
    event.stopPropagation();
    this.delete.emit(this.project);
  }
}
