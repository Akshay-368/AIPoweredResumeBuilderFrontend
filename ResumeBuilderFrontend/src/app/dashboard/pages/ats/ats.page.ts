import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, ElementRef, OnDestroy, OnInit, PLATFORM_ID, ViewChild, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';
import { ProjectsStore } from '../../services/projects.store';

interface AtsWizardSnapshot {
  currentStep: number;
  projectId: string;
  projectName: string;
  resumeText: string;
  resumeFileName: string;
  jobRole: string;
  customRole: string;
  jobDescriptionText: string;
  jobDescriptionFileName: string;
}

@Component({
  selector: 'app-ats-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './ats.page.html',
  styleUrl: './ats.page.css'
})
export class AtsPage implements OnInit, OnDestroy {
  private readonly storageKey = 'atsWizardState';
  private readonly allowedExtensions = ['pdf', 'doc', 'docx'];
  private readonly subscriptions = new Subscription();
  private readonly formBuilder = inject(FormBuilder);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly projectsStore = inject(ProjectsStore);

  @ViewChild('resumeFileInput') resumeFileInput?: ElementRef<HTMLInputElement>;
  @ViewChild('jdFileInput') jdFileInput?: ElementRef<HTMLInputElement>;

  readonly stepLabels = ['Step 1', 'Step 2', 'Step 3', 'Step 4'];
  readonly jobRoles = [
    'Data Scientist',
    'Graphics Designer',
    'Full Stack Developer',
    'Research Developer',
    'Consultant',
    'Receptionist',
    'Teacher',
    'Software Developer',
    'Other'
  ];

  currentStep = 1;
  currentProjectId = '';
  resumeFileName = '';
  jobDescriptionFileName = '';
  resumeFileError = '';
  jobDescriptionFileError = '';

  readonly wizardForm = this.formBuilder.group({
    projectName: ['', [Validators.required]],
    resumeText: [''],
    jobRole: ['', [Validators.required]],
    customRole: [''],
    jobDescriptionText: ['']
  });

  get isOtherRoleSelected(): boolean {
    return this.wizardForm.controls.jobRole.value === 'Other';
  }

  ngOnInit(): void {
    this.startFreshWizard();

    const roleSubscription = this.wizardForm.controls.jobRole.valueChanges.subscribe((role) => {
      const customRoleControl = this.wizardForm.controls.customRole;

      if (role === 'Other') {
        customRoleControl.addValidators([Validators.required]);
      } else {
        customRoleControl.clearValidators();
      }

      customRoleControl.updateValueAndValidity({ emitEvent: false });
      this.persistState();
    });

    const formSubscription = this.wizardForm.valueChanges.subscribe(() => {
      this.persistState();
    });

    this.subscriptions.add(roleSubscription);
    this.subscriptions.add(formSubscription);
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  openResumeFilePicker(): void {
    this.resumeFileInput?.nativeElement.click();
  }

  openJobDescriptionFilePicker(): void {
    this.jdFileInput?.nativeElement.click();
  }

  onResumeFileChange(event: Event): void {
    const fileInput = event.target as HTMLInputElement;
    const selectedFile = fileInput.files?.[0];

    if (!selectedFile) {
      return;
    }

    if (!this.isSupportedFile(selectedFile.name)) {
      this.resumeFileName = '';
      this.resumeFileError = 'Unsupported file type. Please upload PDF, DOC, or DOCX.';
      fileInput.value = '';
      this.persistState();
      return;
    }

    this.resumeFileName = selectedFile.name;
    this.resumeFileError = '';
    this.persistState();
  }

  onJobDescriptionFileChange(event: Event): void {
    const fileInput = event.target as HTMLInputElement;
    const selectedFile = fileInput.files?.[0];

    if (!selectedFile) {
      return;
    }

    if (!this.isSupportedFile(selectedFile.name)) {
      this.jobDescriptionFileName = '';
      this.jobDescriptionFileError = 'Unsupported file type. Please upload PDF, DOC, or DOCX.';
      fileInput.value = '';
      this.persistState();
      return;
    }

    this.jobDescriptionFileName = selectedFile.name;
    this.jobDescriptionFileError = '';
    this.persistState();
  }

  nextStep(): void {
    if (!this.canProceedFromStep(this.currentStep)) {
      this.markCurrentStepTouched();
      return;
    }

    if (this.currentStep === 1) {
      this.syncAtsProject();
    }

    if (this.currentStep < 4) {
      this.currentStep += 1;
      this.persistState();
    }
  }

  previousStep(): void {
    if (this.currentStep > 1) {
      this.currentStep -= 1;
      this.persistState();
    }
  }

  isStepActive(step: number): boolean {
    return this.currentStep === step;
  }

  isStepCompleted(step: number): boolean {
    return step < this.currentStep;
  }

  canProceedFromStep(step: number): boolean {
    if (step === 1) {
      const projectName = this.wizardForm.controls.projectName.value?.trim() ?? '';
      return projectName.length > 0;
    }

    if (step === 2) {
      const resumeText = this.wizardForm.controls.resumeText.value?.trim() ?? '';
      return (this.resumeFileName.length > 0 || resumeText.length > 0) && !this.resumeFileError;
    }

    if (step === 3) {
      const selectedRole = this.wizardForm.controls.jobRole.value ?? '';
      const customRole = this.wizardForm.controls.customRole.value?.trim() ?? '';
      const jobDescriptionText = this.wizardForm.controls.jobDescriptionText.value?.trim() ?? '';
      const hasRole = selectedRole.length > 0 && (selectedRole !== 'Other' || customRole.length > 0);
      const hasJobDescriptionSource =
        (this.jobDescriptionFileName.length > 0 || jobDescriptionText.length > 0) && !this.jobDescriptionFileError;

      return hasRole && hasJobDescriptionSource;
    }

    return true;
  }

  private markCurrentStepTouched(): void {
    if (this.currentStep === 1) {
      this.wizardForm.controls.projectName.markAsTouched();
      return;
    }

    if (this.currentStep === 2) {
      this.wizardForm.controls.resumeText.markAsTouched();
      return;
    }

    if (this.currentStep === 3) {
      this.wizardForm.controls.jobRole.markAsTouched();
      this.wizardForm.controls.customRole.markAsTouched();
      this.wizardForm.controls.jobDescriptionText.markAsTouched();
    }
  }

  private isSupportedFile(fileName: string): boolean {
    const extension = fileName.split('.').pop()?.toLowerCase() ?? '';
    return this.allowedExtensions.includes(extension);
  }

  private persistState(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const snapshot: AtsWizardSnapshot = {
      currentStep: this.currentStep,
      projectId: this.currentProjectId,
      projectName: this.wizardForm.controls.projectName.value ?? '',
      resumeText: this.wizardForm.controls.resumeText.value ?? '',
      resumeFileName: this.resumeFileName,
      jobRole: this.wizardForm.controls.jobRole.value ?? '',
      customRole: this.wizardForm.controls.customRole.value ?? '',
      jobDescriptionText: this.wizardForm.controls.jobDescriptionText.value ?? '',
      jobDescriptionFileName: this.jobDescriptionFileName
    };

    localStorage.setItem(this.storageKey, JSON.stringify(snapshot));
  }

  private startFreshWizard(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.currentStep = 1;
    this.currentProjectId = '';
    this.resumeFileName = '';
    this.jobDescriptionFileName = '';
    this.resumeFileError = '';
    this.jobDescriptionFileError = '';

    this.wizardForm.reset(
      {
        projectName: '',
        resumeText: '',
        jobRole: '',
        customRole: '',
        jobDescriptionText: ''
      },
      { emitEvent: false }
    );

    this.wizardForm.controls.customRole.clearValidators();
    this.wizardForm.controls.customRole.updateValueAndValidity({ emitEvent: false });

    this.persistState();
  }

  private syncAtsProject(): void {
    const projectName = this.wizardForm.controls.projectName.value?.trim() ?? '';

    if (!projectName) {
      return;
    }

    if (!this.currentProjectId) {
      const project = this.projectsStore.createProject(projectName, 'ATS');
      this.currentProjectId = project.id;
      return;
    }

    this.projectsStore.updateProject(this.currentProjectId, { name: projectName, type: 'ATS' });
  }

  private clampStep(step: number): number {
    if (step < 1) {
      return 1;
    }

    if (step > 4) {
      return 4;
    }

    return step;
  }
}
