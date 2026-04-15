import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ChangeDetectorRef, Component, ElementRef, OnDestroy, OnInit, PLATFORM_ID, ViewChild, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription, debounceTime, distinctUntilChanged, firstValueFrom, take, timeout } from 'rxjs';
import { AtsScoreApiService, AtsScoreRequest, AtsScoreResponse } from '../../services/ats-score-api.service';
import { JobDescriptionData, JobDescriptionParserApiService } from '../../services/job-description-parser-api.service';
import { ProjectsApiService, ResolvedDefaultResume } from '../../services/projects-api.service';
import { ProjectsStore } from '../../services/projects.store';
import { ResumeParserApiService } from '../../services/resume-parser-api.service';

interface AtsWizardSnapshot {
  currentStep: number;
  projectId: string;
  projectName: string;
  resumeText: string;
  resumeFileName: string;
  parserResponseStatus: number | null;
  parsedResumeResponse: string;
  jobRole: string;
  customRole: string;
  jobDescriptionText: string;
  jobDescriptionFileName: string;
  jdParsingState: 'idle' | 'parsing' | 'success' | 'error';
  jdParsingError: string;
  parsedJdData: JobDescriptionData | null;
  jdParserResponseStatus: number | null;
  parsedJdResponse: string;
  atsScoreResult: AtsScoreResponse | null;
  useDefaultResume: boolean;
  defaultResumeResolved: boolean;
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
  private readonly allowedExtensions = ['pdf', 'docx'];
  private readonly subscriptions = new Subscription();
  private readonly formBuilder = inject(FormBuilder);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly projectsStore = inject(ProjectsStore);
  private readonly projectsApi = inject(ProjectsApiService);
  private readonly resumeParserApi = inject(ResumeParserApiService);
  private readonly jdParserApi = inject(JobDescriptionParserApiService);
  private readonly atsScoreApi = inject(AtsScoreApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);
  private isHydratingProject = false;

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
  isExistingProjectMode = false;
  hasLockedResumeArtifact = false;
  hasLockedJdArtifact = false;
  resumeFileName = '';
  jobDescriptionFileName = '';
  resumeFileError = '';
  jobDescriptionFileError = '';
  resumeParsing = false;
  resumeParsingError = '';
  parseResultState: 'idle' | 'success' | 'error' = 'idle';
  parserResponseStatus: number | null = null;
  parsedResumeResponse = '';
  isParserResponseExpanded = false;
  lastParsedResumeText = '';

  // JD parsing state
  jdParsing = false;
  jdParsingError = '';
  jdParsingState: 'idle' | 'parsing' | 'success' | 'error' = 'idle';
  parsedJdData: JobDescriptionData | null = null;
  jdParserResponseStatus: number | null = null;
  parsedJdResponse = '';
  isJdResponseExpanded = false;
  lastParsedJobDescriptionText = '';

  // ATS Score state
  atsScoring = false;
  atsScoringError = '';
  atsScoreResult: AtsScoreResponse | null = null;
  atsScoringStartTime: number = 0;
  useDefaultResume = false;
  defaultResumeResolved = false;
  defaultResumeAvailable = false;
  defaultResumeMessage = '';
  resolvedDefaultResume: ResolvedDefaultResume | null = null;

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
    void this.initializeFromProjectContext();
    void this.loadDefaultResumeAvailability();

    const resumeTextSubscription = this.wizardForm.controls.resumeText.valueChanges
      .pipe(debounceTime(700), distinctUntilChanged())
      .subscribe((resumeText) => {
        const normalizedText = (resumeText ?? '').trim();

        if (this.resumeFileName.length > 0) {
          return;
        }

        if (!normalizedText.length) {
          this.parsedResumeResponse = '';
          this.parseResultState = 'idle';
          this.parserResponseStatus = null;
          this.lastParsedResumeText = '';
          this.persistState();
          this.cdr.detectChanges();
          return;
        }

        if (normalizedText !== this.lastParsedResumeText && !this.resumeParsing) {
          void this.parseResumeText(normalizedText);
        }
      });

    const jobDescriptionTextSubscription = this.wizardForm.controls.jobDescriptionText.valueChanges
      .pipe(debounceTime(700), distinctUntilChanged())
      .subscribe((jobDescriptionText) => {
        const normalizedText = (jobDescriptionText ?? '').trim();

        if (this.jobDescriptionFileName.length > 0) {
          return;
        }

        if (!normalizedText.length) {
          this.parsedJdResponse = '';
          this.jdParsingState = 'idle';
          this.jdParserResponseStatus = null;
          this.lastParsedJobDescriptionText = '';
          this.parsedJdData = null;
          this.persistState();
          this.cdr.detectChanges();
          return;
        }

        if (normalizedText !== this.lastParsedJobDescriptionText && !this.jdParsing) {
          void this.parseJobDescriptionText(normalizedText);
        }
      });

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
    this.subscriptions.add(resumeTextSubscription);
    this.subscriptions.add(jobDescriptionTextSubscription);
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  openResumeFilePicker(): void {
    if (this.hasLockedResumeArtifact) {
      return;
    }

    this.resumeFileInput?.nativeElement.click();
  }

  openJobDescriptionFilePicker(): void {
    if (this.hasLockedJdArtifact) {
      return;
    }

    this.jdFileInput?.nativeElement.click();
  }

  onResumeTextBlur(): void {
    if (this.hasLockedResumeArtifact) {
      return;
    }

    if (this.resumeFileName.length > 0 || this.resumeParsing) {
      return;
    }

    const resumeText = this.wizardForm.controls.resumeText.value?.trim() ?? '';
    if (resumeText.length > 0 && resumeText !== this.lastParsedResumeText) {
      void this.parseResumeText(resumeText);
    }
  }

  onJobDescriptionTextBlur(): void {
    if (this.hasLockedJdArtifact) {
      return;
    }

    if (this.jobDescriptionFileName.length > 0 || this.jdParsing) {
      return;
    }

    const jobDescriptionText = this.wizardForm.controls.jobDescriptionText.value?.trim() ?? '';
    if (jobDescriptionText.length > 0 && jobDescriptionText !== this.lastParsedJobDescriptionText) {
      void this.parseJobDescriptionText(jobDescriptionText);
    }
  }

  onResumeFileChange(event: Event): void {
    if (this.hasLockedResumeArtifact) {
      return;
    }

    const fileInput = event.target as HTMLInputElement;
    const selectedFile = fileInput.files?.[0];

    if (!selectedFile) {
      return;
    }

    if (!this.isSupportedFile(selectedFile.name)) {
      this.resumeFileName = '';
      this.resumeFileError = 'Unsupported file type. Please upload PDF or DOCX only.';
      fileInput.value = '';
      this.persistState();
      return;
    }

    this.resumeFileName = selectedFile.name;
    this.resumeFileError = '';
    this.resumeParsingError = '';
    this.resumeParsing = true;
    this.parseResultState = 'idle';
    this.parserResponseStatus = null;
    this.parsedResumeResponse = '';
    this.isParserResponseExpanded = false;
    this.lastParsedResumeText = '';
    this.cdr.detectChanges();

    const parseSubscription = this.resumeParserApi.parseResume(selectedFile, this.currentProjectId || undefined).pipe(timeout(90000)).subscribe({
      next: (structuredResume) => {
        this.parseResultState = 'success';
        this.parserResponseStatus = 200;
        this.parsedResumeResponse = JSON.stringify(structuredResume, null, 2);
        this.isParserResponseExpanded = false;
        this.resumeParsing = false;

        if (this.currentProjectId) {
          this.projectsApi.upsertResumeArtifact(this.currentProjectId, {
            parsedResumeJson: structuredResume,
            sourceType: 'upload'
          }).subscribe({
            error: () => {
              // Best-effort persistence: do not block local flow.
            }
          });
        }

        this.persistState();
        this.cdr.detectChanges();
      },
      error: (errorResponse) => {
        console.error('Resume parsing request failed', errorResponse);

        this.parseResultState = 'error';
        this.parserResponseStatus = typeof errorResponse?.status === 'number' ? errorResponse.status : null;

        if (errorResponse?.status === 0) {
          this.resumeParsingError = 'Unable to reach API gateway. Ensure Gateway and FileParser services are running.';
        } else if (errorResponse?.status === 401) {
          this.resumeParsingError = 'Session expired or invalid token. Please sign in again.';
        } else if (errorResponse?.status === 403) {
          this.resumeParsingError = 'You are authenticated but not authorized to parse resumes.';
        } else {
          const message = errorResponse?.error?.message ?? 'Unable to parse resume at the moment.';
          this.resumeParsingError = String(message);
        }

        const errorPayload = errorResponse?.error ?? { message: this.resumeParsingError };
        this.parsedResumeResponse = typeof errorPayload === 'string'
          ? errorPayload
          : JSON.stringify(errorPayload, null, 2);
        this.isParserResponseExpanded = false;

        this.resumeParsing = false;
        this.persistState();
        this.cdr.detectChanges();
      }
    });

    this.subscriptions.add(parseSubscription);
    this.persistState();
  }

  onJobDescriptionFileChange(event: Event): void {
    if (this.hasLockedJdArtifact) {
      return;
    }

    const fileInput = event.target as HTMLInputElement;
    const selectedFile = fileInput.files?.[0];

    if (!selectedFile) {
      return;
    }

    if (!this.isSupportedFile(selectedFile.name)) {
      this.jobDescriptionFileName = '';
      this.jobDescriptionFileError = 'Unsupported file type. Please upload PDF or DOCX only.';
      fileInput.value = '';
      this.persistState();
      return;
    }

    this.jobDescriptionFileName = selectedFile.name;
    this.jobDescriptionFileError = '';
    this.jdParsingError = '';
    this.jdParsingState = 'parsing';
    this.parsedJdData = null;
    this.parsedJdResponse = '';
    this.jdParserResponseStatus = null;
    this.isJdResponseExpanded = false;
    this.lastParsedJobDescriptionText = '';
    this.jdParsing = true;
    this.cdr.detectChanges();

    const parseSubscription = this.jdParserApi.parseJobDescription(selectedFile, this.currentProjectId || undefined).pipe(timeout(90000)).subscribe({
      next: (parsedJd) => {
        this.parsedJdData = parsedJd;
        this.jdParsingState = 'success';
        this.jdParserResponseStatus = 200;
        this.parsedJdResponse = JSON.stringify(parsedJd, null, 2);
        // Populate form with parsed JD summary for ATS scoring
        const jdTextContent = `${parsedJd.jobTitle}\n\n${parsedJd.summary}\n\nResponsibilities:\n${parsedJd.responsibilities.join('\n')}\n\nRequired Skills: ${parsedJd.requiredSkills.join(', ')}`;
        this.wizardForm.controls.jobDescriptionText.setValue(jdTextContent, { emitEvent: false });
        this.lastParsedJobDescriptionText = jdTextContent.trim();
        this.jdParsing = false;

        if (this.currentProjectId) {
          this.projectsApi.upsertJdArtifact(this.currentProjectId, {
            parsedJdJson: parsedJd,
            sourceType: 'upload'
          }).subscribe({
            error: () => {
              // Best-effort persistence: do not block local flow.
            }
          });
        }

        this.persistState();
        this.cdr.detectChanges();
      },
      error: (errorResponse) => {
        console.error('Job description parsing request failed', errorResponse);

        this.jdParsingState = 'error';
        if (errorResponse?.status === 0) {
          this.jdParsingError = 'Unable to reach API gateway. Ensure Gateway and FileParser services are running.';
        } else if (errorResponse?.status === 401) {
          this.jdParsingError = 'Session expired or invalid token. Please sign in again.';
        } else if (errorResponse?.status === 403) {
          this.jdParsingError = 'You are authenticated but not authorized to parse files.';
        } else {
          const message = errorResponse?.error?.message ?? 'Unable to parse job description at the moment.';
          this.jdParsingError = String(message);
        }

        this.jdParsing = false;
        this.jobDescriptionFileName = '';
        this.parsedJdData = null;
        this.parsedJdResponse = '';
        this.persistState();
        this.cdr.detectChanges();
      }
    });

    this.subscriptions.add(parseSubscription);
    this.persistState();
  }

  async nextStep(): Promise<void> {
    if (!this.canProceedFromStep(this.currentStep)) {
      this.markCurrentStepTouched();
      return;
    }

    if (this.currentStep === 1) {
      const synced = await this.syncAtsProject();
      if (!synced) {
        return;
      }
    }

    if (this.currentStep === 3) {
      // Moving to step 4, trigger ATS scoring
      if (!this.atsScoreResult) {
        // If we don't have a score result yet, trigger scoring. If we already have a score result (e.g. from previous attempt), skip re-scoring to save time.
        this.triggerAtsScoring();
      }
    }

    if (this.currentStep < 4) {
      this.currentStep += 1;
      this.persistState();
    }
  }

  previousStep(): void {
    const minStep = this.isExistingProjectMode ? 2 : 1;
    if (this.currentStep > minStep) {
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

  hasParserResponse(): boolean {
    return this.parsedResumeResponse.trim().length > 0;
  }

  toggleParserResponse(): void {
    this.isParserResponseExpanded = !this.isParserResponseExpanded;
  }

  canProceedFromStep(step: number): boolean {
    if (step === 1) {
      const projectName = this.wizardForm.controls.projectName.value?.trim() ?? '';
      return projectName.length > 0;
    }

    if (step === 2) {
      const hasResumeData = this.hasLockedResumeArtifact || (this.parseResultState === 'success' && this.parsedResumeResponse.trim().length > 0);
      const hasDefaultReuseData = this.useDefaultResume && this.defaultResumeResolved && this.parsedResumeResponse.trim().length > 0;
      return !this.resumeFileError && (hasResumeData || hasDefaultReuseData);
    }

    if (step === 3) {
      if ( this.hasLockedJdArtifact){
        return !this.jobDescriptionFileError;
      }
      const selectedRole = this.wizardForm.controls.jobRole.value ?? '';
      const customRole = this.wizardForm.controls.customRole.value?.trim() ?? '';
      const jobDescriptionText = this.wizardForm.controls.jobDescriptionText.value?.trim() ?? '';
      const hasRole = selectedRole.length > 0 && (selectedRole !== 'Other' || customRole.length > 0);
      const hasValidJdData =
        
          this.jdParsingState === 'success' &&
          this.parsedJdResponse.trim().length > 0 &&
          jobDescriptionText.length > 0
        

      // If persisted JD artifact exists, role/jobDescription can come from restored state and should not block progression.
      // return !this.jobDescriptionFileError && (this.hasLockedJdArtifact ? hasValidJdData : (hasRole && hasValidJdData));
      return !this.jobDescriptionFileError && (hasRole && hasValidJdData);
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

    if (this.isHydratingProject) {
      return;
    }

    const snapshot: AtsWizardSnapshot = {
      currentStep: this.currentStep,
      projectId: this.currentProjectId,
      projectName: this.wizardForm.controls.projectName.value ?? '',
      resumeText: this.wizardForm.controls.resumeText.value ?? '',
      resumeFileName: this.resumeFileName,
      parserResponseStatus: this.parserResponseStatus,
      parsedResumeResponse: this.parsedResumeResponse,
      jobRole: this.wizardForm.controls.jobRole.value ?? '',
      customRole: this.wizardForm.controls.customRole.value ?? '',
      jobDescriptionText: this.wizardForm.controls.jobDescriptionText.value ?? '',
      jobDescriptionFileName: this.jobDescriptionFileName,
      jdParsingState: this.jdParsingState,
      jdParsingError: this.jdParsingError,
      parsedJdData: this.parsedJdData,
      jdParserResponseStatus: this.jdParserResponseStatus,
      parsedJdResponse: this.parsedJdResponse,
      atsScoreResult: this.atsScoreResult
      ,
      useDefaultResume: this.useDefaultResume,
      defaultResumeResolved: this.defaultResumeResolved
    };

    localStorage.setItem(this.storageKey, JSON.stringify(snapshot));

    if (this.currentProjectId) {
      this.projectsApi.upsertWizardState(this.currentProjectId, 'ats', {
        currentStep: this.currentStep,
        stateJson: snapshot
      }).subscribe({
        error: () => {
          // Best-effort persistence: do not block local flow.
        }
      });
    }
  }

  private startFreshWizard(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.currentStep = 1;
    this.currentProjectId = '';
    this.isExistingProjectMode = false;
    this.hasLockedResumeArtifact = false;
    this.hasLockedJdArtifact = false;
    this.jdParsingState = 'idle';
    this.jdParsingError = '';
    this.parsedJdData = null;
    this.jdParserResponseStatus = null;
    this.parsedJdResponse = '';
    this.isJdResponseExpanded = false;
    this.lastParsedJobDescriptionText = '';
    this.jdParsing = false;
    this.resumeFileName = '';
    this.jobDescriptionFileName = '';
    this.resumeFileError = '';
    this.jobDescriptionFileError = '';
    this.lastParsedResumeText = '';
    this.useDefaultResume = false;
    this.defaultResumeResolved = false;
    this.defaultResumeMessage = '';
    this.defaultResumeAvailable = false;
    this.resolvedDefaultResume = null;

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

  private async syncAtsProject(): Promise<boolean> {
    const projectName = this.wizardForm.controls.projectName.value?.trim() ?? '';
    
    if (!projectName) {
      return false;
    }

    if (!this.currentProjectId) {
      try {
        const created = await firstValueFrom(this.projectsApi.createProject({
          name: projectName,
          type: 'ATS',
          status: 'draft',
          currentStep: 1
        }));

        this.currentProjectId = created.projectId;
        this.projectsStore.createProject(projectName, 'ATS', created.projectId);

        this.router.navigate([], {
          relativeTo: this.route,
          queryParams: { projectId: created.projectId },
          queryParamsHandling: 'merge'
        });

        return true;
      } catch {
        return false;
      }
    }

    this.projectsStore.updateProject(this.currentProjectId, { name: projectName, type: 'ATS' });

    try {
      await firstValueFrom(this.projectsApi.updateProject(this.currentProjectId, {
        name: projectName,
        type: 'ATS',
        status: this.currentStep >= 4 ? 'completed' : 'in_progress',
        currentStep: this.currentStep
      }));
      return true;
    } catch {
      // Keep local flow uninterrupted when backend update fails.
      return false;
    }
  }

  private hasParsedResumeText(): boolean {
    const resumeText = this.wizardForm.controls.resumeText.value?.trim() ?? '';
    return resumeText.length > 0 && resumeText === this.lastParsedResumeText;
  }

  private hasParsedJobDescriptionText(): boolean {
    const jobDescriptionText = this.wizardForm.controls.jobDescriptionText.value?.trim() ?? '';
    return jobDescriptionText.length > 0 && jobDescriptionText === this.lastParsedJobDescriptionText;
  }

  private async parseResumeText(rawText: string): Promise<boolean> {
    if (this.hasLockedResumeArtifact) {
      return true;
    }

    if (!rawText.trim()) {
      return false;
    }

    this.resumeParsing = true;
    this.resumeParsingError = '';
    this.parseResultState = 'idle';
    this.parserResponseStatus = null;
    this.parsedResumeResponse = '';
    this.isParserResponseExpanded = false;
    this.cdr.detectChanges();

    try {
      const structuredResume = await firstValueFrom(
        this.resumeParserApi.parseResumeText(rawText, this.currentProjectId || undefined).pipe(timeout(90000))
      );

      this.parseResultState = 'success';
      this.parserResponseStatus = 200;
      this.parsedResumeResponse = JSON.stringify(structuredResume, null, 2);
      this.lastParsedResumeText = rawText.trim();
      this.resumeParsing = false;

      if (this.currentProjectId) {
        this.projectsApi.upsertResumeArtifact(this.currentProjectId, {
          parsedResumeJson: structuredResume,
          rawText,
          sourceType: 'paste'
        }).subscribe({
          error: () => {
            // Best-effort persistence: do not block local flow.
          }
        });
      }

      this.persistState();
      this.cdr.detectChanges();
      return true;
    } catch (errorResponse: any) {
      console.error('Resume text parsing request failed', errorResponse);

      this.parseResultState = 'error';
      this.parserResponseStatus = typeof errorResponse?.status === 'number' ? errorResponse.status : null;

      if (errorResponse?.status === 0) {
        this.resumeParsingError = 'Unable to reach API gateway. Ensure Gateway and FileParser services are running.';
      } else if (errorResponse?.status === 401) {
        this.resumeParsingError = 'Session expired or invalid token. Please sign in again.';
      } else if (errorResponse?.status === 403) {
        this.resumeParsingError = 'You are authenticated but not authorized to parse resumes.';
      } else {
        const message = errorResponse?.error?.message ?? 'Unable to parse resume text at the moment.';
        this.resumeParsingError = String(message);
      }

      const errorPayload = errorResponse?.error ?? { message: this.resumeParsingError };
      this.parsedResumeResponse = typeof errorPayload === 'string'
        ? errorPayload
        : JSON.stringify(errorPayload, null, 2);
      this.resumeParsing = false;
      this.persistState();
      this.cdr.detectChanges();
      return false;
    }
  }

  private async parseJobDescriptionText(rawText: string): Promise<boolean> {
    if (this.hasLockedJdArtifact) {
      return true;
    }

    if (!rawText.trim()) {
      return false;
    }

    this.jdParsing = true;
    this.jdParsingError = '';
    this.jdParsingState = 'parsing';
    this.jdParserResponseStatus = null;
    this.parsedJdResponse = '';
    this.parsedJdData = null;
    this.isJdResponseExpanded = false;
    this.cdr.detectChanges();

    try {
      const structuredJobDescription = await firstValueFrom(
        this.jdParserApi.parseJobDescriptionText(rawText, this.currentProjectId || undefined).pipe(timeout(90000))
      );

      this.parsedJdData = structuredJobDescription;
      this.jdParsingState = 'success';
      this.jdParserResponseStatus = 200;
      this.parsedJdResponse = JSON.stringify(structuredJobDescription, null, 2);
      this.lastParsedJobDescriptionText = rawText.trim();
      this.jdParsing = false;

      if (this.currentProjectId) {
        this.projectsApi.upsertJdArtifact(this.currentProjectId, {
          parsedJdJson: structuredJobDescription,
          rawText,
          sourceType: 'paste'
        }).subscribe({
          error: () => {
            // Best-effort persistence: do not block local flow.
          }
        });
      }

      this.persistState();
      this.cdr.detectChanges();
      return true;
    } catch (errorResponse: any) {
      console.error('Job description text parsing request failed', errorResponse);

      this.jdParsingState = 'error';
      this.jdParserResponseStatus = typeof errorResponse?.status === 'number' ? errorResponse.status : null;

      if (errorResponse?.status === 0) {
        this.jdParsingError = 'Unable to reach API gateway. Ensure Gateway and FileParser services are running.';
      } else if (errorResponse?.status === 401) {
        this.jdParsingError = 'Session expired or invalid token. Please sign in again.';
      } else if (errorResponse?.status === 403) {
        this.jdParsingError = 'You are authenticated but not authorized to parse files.';
      } else {
        const message = errorResponse?.error?.message ?? 'Unable to parse job description text at the moment.';
        this.jdParsingError = String(message);
      }

      const errorPayload = errorResponse?.error ?? { message: this.jdParsingError };
      this.parsedJdResponse = typeof errorPayload === 'string'
        ? errorPayload
        : JSON.stringify(errorPayload, null, 2);
      this.jdParsing = false;
      this.persistState();
      this.cdr.detectChanges();
      return false;
    }
  }

  private triggerAtsScoring(): void {
    // Validate that we have parsed resume data
    if (!this.parsedResumeResponse || this.parseResultState !== 'success') {
      this.atsScoringError = 'Please upload and parse a valid resume first.';
      this.cdr.detectChanges();
      return;
    }

    // Validate job description
    const jobDescriptionText = this.wizardForm.controls.jobDescriptionText.value?.trim() ?? '';
    if (!jobDescriptionText && !this.jobDescriptionFileName) {
      this.atsScoringError = 'Please provide a job description.';
      this.cdr.detectChanges();
      return;
    }

    // Parse the resume JSON
    let resumeData;
    try {
      resumeData = JSON.parse(this.parsedResumeResponse);
    } catch (e) {
      this.atsScoringError = 'Failed to parse resume data. Please re-upload the resume.';
      this.cdr.detectChanges();
      return;
    }

    // Build request
    const jobRole = this.wizardForm.controls.jobRole.value ?? '';
    const customRole = this.wizardForm.controls.customRole.value ?? undefined;

    const scoreRequest: AtsScoreRequest = {
      resumeData,
      jobDescriptionText,
      jobRole,
      customRole: customRole && customRole.trim().length > 0 ? customRole : undefined,
      projectId: this.currentProjectId || undefined
    };

    // Trigger scoring
    this.atsScoring = true;
    this.atsScoringError = '';
    this.atsScoreResult = null;
    this.atsScoringStartTime = Date.now();
    this.cdr.detectChanges();

    const scoringSubscription = this.atsScoreApi.scoreResume(scoreRequest)
      .pipe(timeout(90000))
      .subscribe({
        next: (result) => {
          this.atsScoreResult = result;
          this.atsScoring = false;
          this.atsScoringError = '';
          this.persistState();
          this.cdr.detectChanges();
        },
        error: (errorResponse) => {
          console.error('ATS scoring request failed', errorResponse);

          if (errorResponse?.status === 0) {
            this.atsScoringError = 'Unable to reach ATS scoring service. Ensure all services are running.';
          } else if (errorResponse?.status === 401) {
            this.atsScoringError = 'Session expired. Please sign in again.';
          } else if (errorResponse?.status === 400) {
            const message = errorResponse?.error?.message ?? 'Invalid request to ATS service.';
            this.atsScoringError = String(message);
          } else {
            const message = errorResponse?.error?.message ?? 'Unable to score resume at the moment.';
            this.atsScoringError = String(message);
          }

          this.atsScoring = false;
          this.atsScoreResult = null;
          this.persistState();
          this.cdr.detectChanges();
        }
      });

    this.subscriptions.add(scoringSubscription);
  }

  retryAtsScoring(): void {
    this.triggerAtsScoring();
  }

  hasJdParserResponse(): boolean {
    return this.parsedJdResponse.trim().length > 0;
  }

  toggleJdParserResponse(): void {
    this.isJdResponseExpanded = !this.isJdResponseExpanded;
  }

  private clampStep(step: number): number {
    const minStep = this.isExistingProjectMode ? 2 : 1;

    if (step < minStep) {
      return minStep;
    }

    if (step > 4) {
      return 4;
    }

    return step;
  }

  private async initializeFromProjectContext(): Promise<void> {
    this.isHydratingProject = true;
    if (!isPlatformBrowser(this.platformId)) {
      this.isHydratingProject = false;
      return;
    }
    const queryParams = await firstValueFrom(this.route.queryParamMap.pipe(take(1)));
    const requestedProjectId = (queryParams.get('projectId') ?? '').trim();

    if (!requestedProjectId) {
      this.isHydratingProject = false;
      this.startFreshWizard();
      return;
    }

    this.currentProjectId = requestedProjectId;
    this.isExistingProjectMode = true;
    this.currentStep = Math.max(2, this.clampStep(this.currentStep || 2));

    try {
      const project = await firstValueFrom(this.projectsApi.getProject(requestedProjectId));
      this.wizardForm.controls.projectName.setValue(project.name, { emitEvent: false });
      this.currentStep = Math.max(2, this.clampStep(project.currentStep || 2));

      try {
        const wizardState = await firstValueFrom(this.projectsApi.getWizardState(requestedProjectId, 'ats'));
        const snapshot = wizardState.stateJson as Partial<AtsWizardSnapshot>;

        if (snapshot.projectName) {
          this.wizardForm.controls.projectName.setValue(snapshot.projectName, { emitEvent: false });
        }

        this.wizardForm.controls.resumeText.setValue(snapshot.resumeText ?? '', { emitEvent: false });
        this.wizardForm.controls.jobRole.setValue(snapshot.jobRole ?? '', { emitEvent: false });
        this.wizardForm.controls.customRole.setValue(snapshot.customRole ?? '', { emitEvent: false });
        this.wizardForm.controls.jobDescriptionText.setValue(snapshot.jobDescriptionText ?? '', { emitEvent: false });

        if (typeof snapshot.currentStep === 'number') {
          this.currentStep = Math.max(2, this.clampStep(snapshot.currentStep));
        }

        this.useDefaultResume = !!snapshot.useDefaultResume;
        this.defaultResumeResolved = !!snapshot.defaultResumeResolved;

        if (snapshot.parsedResumeResponse?.trim().length) {
          this.parsedResumeResponse = snapshot.parsedResumeResponse;
          this.parseResultState = 'success';
          this.parserResponseStatus = snapshot.parserResponseStatus ?? 200;
          this.isParserResponseExpanded = true;
          this.hasLockedResumeArtifact = true;
          this.currentStep = Math.max(this.currentStep, 2);
        }

        if (snapshot.parsedJdResponse?.trim().length) {
          this.parsedJdResponse = snapshot.parsedJdResponse;
          this.jdParsingState = 'success';
          this.jdParserResponseStatus = snapshot.jdParserResponseStatus ?? 200;
          this.parsedJdData = snapshot.parsedJdData ?? null;
          this.isJdResponseExpanded = true;
          this.hasLockedJdArtifact = true;
          this.currentStep = Math.max(this.currentStep, 3);
        }

        if (snapshot.atsScoreResult) {
          this.atsScoreResult = snapshot.atsScoreResult;
          this.currentStep = Math.max(this.currentStep, 4);
        }
      } catch {
        this.currentStep = Math.max(2, this.clampStep(project.currentStep || 2));
      }

      try {
        const resumeArtifact = await firstValueFrom(this.projectsApi.getResumeArtifact(requestedProjectId));
        this.parsedResumeResponse = JSON.stringify(resumeArtifact.parsedResumeJson, null, 2);
        this.parseResultState = 'success';
        this.parserResponseStatus = 200;
        this.isParserResponseExpanded = true;
        this.hasLockedResumeArtifact = true;
        this.currentStep = Math.max(this.currentStep, 2);
      } catch {
        // Resume artifact may not exist yet. Keep lock only if restored from wizard state.
        if (this.parsedResumeResponse.trim().length > 0) {
          this.hasLockedResumeArtifact = true;
        } else {
          this.hasLockedResumeArtifact = false;
          this.parseResultState = 'idle';
          this.parserResponseStatus = null;
          this.isParserResponseExpanded = false;
        }
      }

      try {
        const jdArtifact = await firstValueFrom(this.projectsApi.getJdArtifact(requestedProjectId));
        this.parsedJdData = jdArtifact.parsedJdJson as JobDescriptionData;
        this.parsedJdResponse = JSON.stringify(jdArtifact.parsedJdJson, null, 2);
        this.jdParsingState = 'success';
        this.jdParserResponseStatus = 200;
        this.isJdResponseExpanded = true;
        this.hasLockedJdArtifact = true;
        this.currentStep = Math.max(this.currentStep, 3);
      } catch {
        // JD artifact may not exist yet. Keep lock only if restored from wizard state.
        this.hasLockedJdArtifact = this.parsedJdResponse.trim().length > 0;
      }

      try {
        const atsLatest = await firstValueFrom(this.projectsApi.getLatestAtsResult(requestedProjectId));
        this.atsScoreResult = atsLatest.atsResultJson as AtsScoreResponse;
      } catch {
        // ATS result may not exist yet.
      }

      this.cdr.detectChanges();
      this.isHydratingProject = false;
      this.persistState();
    } catch {
      // For existing project routes, never reset to a fresh wizard;
      // keep project context and prevent accidental duplicate project creation.
      this.isHydratingProject = false;
      this.isExistingProjectMode = true;
      this.currentStep = Math.max(2, this.clampStep(this.currentStep || 2));
      this.cdr.detectChanges();
    }
  }

  async onUseDefaultResumeToggle(event: Event): Promise<void> {
    const checked = (event.target as HTMLInputElement).checked;
    this.useDefaultResume = checked;
    this.defaultResumeMessage = '';

    if (!checked) {
      this.defaultResumeResolved = false;
      this.resolvedDefaultResume = null;
      this.hasLockedResumeArtifact = false;
      this.persistState();
      this.cdr.detectChanges();
      return;
    }

    if (!this.defaultResumeAvailable) {
      this.useDefaultResume = false;
      this.defaultResumeResolved = false;
      this.defaultResumeMessage = 'No default resume found. Set one in Account Settings first.';
      this.persistState();
      this.cdr.detectChanges();
      return;
    }

    await this.resolveDefaultResumeForAts();
  }

  private async loadDefaultResumeAvailability(): Promise<void> {
    try {
      await firstValueFrom(this.projectsApi.getDefaultResume());
      this.defaultResumeAvailable = true;
      this.defaultResumeMessage = '';
    } catch {
      this.defaultResumeAvailable = false;
      this.defaultResumeMessage = 'No default resume configured. You can continue with upload or text parsing.';
    } finally {
      this.cdr.detectChanges();
    }
  }

  private async resolveDefaultResumeForAts(): Promise<void> {
    this.resumeParsing = true;
    this.resumeParsingError = '';
    this.defaultResumeMessage = 'Resolving default resume...';
    this.cdr.detectChanges();

    try {
      const resolved = await firstValueFrom(this.projectsApi.resolveDefaultResume('ats'));
      this.resolvedDefaultResume = resolved;
      this.parsedResumeResponse = JSON.stringify(resolved.parsedResumeJson, null, 2);
      this.parseResultState = 'success';
      this.parserResponseStatus = 200;
      this.resumeFileName = '';
      this.wizardForm.controls.resumeText.setValue('', { emitEvent: false });
      this.defaultResumeResolved = true;
      this.hasLockedResumeArtifact = true;
      this.defaultResumeMessage = 'Default resume resolved and applied to this ATS project.';

      if (this.currentProjectId) {
        await firstValueFrom(this.projectsApi.upsertResumeArtifact(this.currentProjectId, {
          parsedResumeJson: resolved.parsedResumeJson,
          sourceType: 'default_reuse'
        }));
      }

      this.persistState();
      this.resumeParsing = false;

      if (this.currentStep === 2) {
        this.currentStep = 3;
      }

      this.cdr.detectChanges();
    } catch (errorResponse: any) {
      this.useDefaultResume = false;
      this.defaultResumeResolved = false;
      this.resolvedDefaultResume = null;
      this.resumeParsing = false;
      this.hasLockedResumeArtifact = false;

      if (errorResponse?.status === 404) {
        this.defaultResumeMessage = errorResponse?.error?.message ?? 'Default resume not found. Configure it in Account Settings.';
      } else {
        this.defaultResumeMessage = errorResponse?.error?.message ?? 'Unable to resolve default resume right now.';
      }

      this.persistState();
      this.cdr.detectChanges();
    }
  }
}
