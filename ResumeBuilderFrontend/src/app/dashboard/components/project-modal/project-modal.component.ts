import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ProjectType } from '../../models/project.model';

@Component({
  selector: 'app-project-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './project-modal.component.html',
  styleUrl: './project-modal.component.css'
})
export class ProjectModalComponent {
  @Input() isOpen = false;
  @Input() selectedType: ProjectType | null = null;

  @Output() close = new EventEmitter<void>();
  @Output() submitProject = new EventEmitter<{ name: string; type: ProjectType }>();

  projectName = '';

  onClose(): void {
    this.projectName = '';
    this.close.emit();
  }

  onSubmit(): void {
    if (!this.selectedType) {
      return;
    }

    const normalizedName = this.projectName.trim();
    if (!normalizedName) {
      return;
    }

    this.submitProject.emit({
      name: normalizedName,
      type: this.selectedType
    });

    this.projectName = '';
  }
}
