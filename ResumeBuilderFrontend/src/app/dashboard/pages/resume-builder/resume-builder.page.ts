import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ChangeDetectorRef, Component, ElementRef, OnDestroy, OnInit, PLATFORM_ID, ViewChild, inject } from '@angular/core';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription, firstValueFrom } from 'rxjs';
import { JobDescriptionData, JobDescriptionParserApiService } from '../../services/job-description-parser-api.service';
import { ProjectsApiService, ResolvedDefaultResume } from '../../services/projects-api.service';
import { ResumeBuilderApiService, ResumeBuilderArtifactResponse } from '../../services/resume-builder-api.service';

interface ResumeTemplateOption {
  id: string;
  title: string;
  description: string;
}

interface ResumeBuilderWizardSnapshot {
  currentStep: number;
  jobDescriptionFileName: string;
  selectedTemplateId: string;
  templates: ResumeTemplateOption[];
  noPriorExperience: boolean;
  revisionRequest: string;
  previewJson: string;
  previewArtifactId: string;
  previewUpdatedAt: string;
  pdfExportFileName: string;
  useDefaultResume: boolean;
  defaultResumeResolved: boolean;
  form: {
    basicInfo: {
      fullName: string;
      professionalRole: string;
      email: string;
      phone: string;
      linkedInUrl: string;
      portfolioUrl: string;
      location: string;
      summary: string;
    };
    targetJob: {
      role: string;
      customRole: string;
      jobDescriptionText: string;
    };
    education: {
      institution: string;
      degree: string;
      fieldOfStudy: string;
      startYear: string;
      endYear: string;
      isPresent: boolean;
      marks: string;
    }[];
    experience: {
      company: string;
      role: string;
      startDate: string;
      endDate: string;
      isPresent: boolean;
      description: string;
    }[];
    projects: {
      name: string;
      techStack: string;
      description: string;
    }[];
  };
}

@Component({
  selector: 'app-resume-builder-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './resume-builder.page.html',
  styleUrl: './resume-builder.page.css'
})
export class ResumeBuilderPage implements OnInit, OnDestroy {
  private readonly storageKey = 'resumeBuilderWizardState';
  private readonly templatesStorageKey = 'resumeTemplates';
  private readonly allowedExtensions = ['pdf', 'docx'];
  private readonly subscriptions = new Subscription();
  private readonly formBuilder = inject(FormBuilder);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly projectsApi = inject(ProjectsApiService);
  private readonly resumeBuilderApi = inject(ResumeBuilderApiService);
  private readonly jobDescriptionParserApi = inject(JobDescriptionParserApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly sanitizer = inject(DomSanitizer);
  private wizardPersistInFlight = false;
  private pendingWizardPersistPayload: { currentStep: number; stateJson: ResumeBuilderWizardSnapshot } | null = null;

  @ViewChild('jobDescriptionFileInput') jobDescriptionFileInput?: ElementRef<HTMLInputElement>;

  readonly totalSteps = 7;
  readonly stepLabels = [
    'Basic Information',
    'Target Job',
    'Education',
    'Experience',
    'Projects',
    'Template',
    'Final Editor'
  ];

  readonly commonJobRoles = [
    'Software Engineer',
    'Frontend Developer',
    'Backend Developer',
    'Full Stack Developer',
    'Data Analyst',
    'Product Manager',
    'UI/UX Designer',
    'DevOps Engineer',
    'Other'
  ];

  currentStep = 1;
  currentProjectId = '';
  noPriorExperience = false;
  selectedTemplateId = 'deedy-one-page-two-column';
  jobDescriptionFileName = '';
  jobDescriptionFileError = '';
  jobDescriptionUploadState: 'idle' | 'parsing' | 'parsed' | 'error' = 'idle';
  jobDescriptionUploadMessage = '';
  revisionRequest = '';
  actionMessage = '';
  resumePreviewJson = '';
  resumePreviewState: 'idle' | 'generating' | 'ready' | 'error' = 'idle';
  resumePreviewError = '';
  resumeArtifactId = '';
  resumePreviewUpdatedAt = '';
  pdfExportFileName = '';
  pdfExportStatus: 'idle' | 'exporting' | 'ready' | 'error' = 'idle';
  pdfExportError = '';
  previewPdfState: 'idle' | 'generating' | 'ready' | 'error' = 'idle';
  previewPdfError = '';
  previewPdfUrl = '';
  previewPdfResourceUrl: SafeResourceUrl | null = null;
  showPreviewJsonDebug = false;
  useDefaultResume = false;
  defaultResumeResolved = false;
  defaultResumeAvailable = false;
  defaultResumeMessage = '';
  resolvedDefaultResume: ResolvedDefaultResume | null = null;

  availableTemplates: ResumeTemplateOption[] = [];
  readonly defaultTemplate: ResumeTemplateOption = {
    id: 'deedy-one-page-two-column',
    title: 'Deedy - One Page Two Column Resume',
    description: 'Balanced one-page layout with two-column structure for concise, high-signal resumes.'
  };

  readonly stepValidationAttempted: Record<number, boolean> = {
    1: false,
    2: false,
    3: false,
    4: false,
    5: false,
    6: false,
    7: false
  };

  readonly resumeForm = this.formBuilder.group({
    basicInfo: this.formBuilder.group({
      fullName: ['', [Validators.required]],
      professionalRole: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      phone: [''],
      linkedInUrl: [''],
      portfolioUrl: [''],
      location: [''],
      summary: ['']
    }),
    targetJob: this.formBuilder.group({
      role: [''],
      customRole: [''],
      jobDescriptionText: ['']
    }),
    revisionRequest: [''],
    education: this.formBuilder.array([this.createEducationGroup()]),
    experience: this.formBuilder.array([this.createExperienceGroup()]),
    projects: this.formBuilder.array([this.createProjectGroup(), this.createProjectGroup()])
  });

  get basicInfoGroup() {
    return this.resumeForm.controls.basicInfo;
  }

  get targetJobGroup() {
    return this.resumeForm.controls.targetJob;
  }

  get educationArray(): FormArray {
    return this.resumeForm.controls.education as FormArray;
  }

  get experienceArray(): FormArray {
    return this.resumeForm.controls.experience as FormArray;
  }

  get projectsArray(): FormArray {
    return this.resumeForm.controls.projects as FormArray;
  }

  get educationControls() {
    return this.educationArray.controls;
  }

  get experienceControls() {
    return this.experienceArray.controls;
  }

  get projectControls() {
    return this.projectsArray.controls;
  }

  get slideOffsetPercent(): number {
    return ((this.currentStep - 1) * 100) / this.totalSteps;
  }

  get isOtherRoleSelected(): boolean {
    return this.targetJobGroup.controls.role.value === 'Other';
  }

  ngOnInit(): void {
    void this.loadTemplates();
    void this.initializeFromProjectContext();
    void this.loadDefaultResumeAvailability();

    const roleSubscription = this.targetJobGroup.controls.role.valueChanges.subscribe((role) => {
      const customRoleControl = this.targetJobGroup.controls.customRole;

      if (role === 'Other') {
        customRoleControl.addValidators([Validators.required]);
      } else {
        customRoleControl.clearValidators();
      }

      customRoleControl.updateValueAndValidity({ emitEvent: false });
      this.persistState();
    });

    const formSubscription = this.resumeForm.valueChanges.subscribe(() => {
      this.persistState();
    });

    const revisionSubscription = this.resumeForm.controls.revisionRequest.valueChanges.subscribe((revisionRequest) => {
      this.revisionRequest = revisionRequest ?? '';
      this.persistState();
    });

    const jobDescriptionTextSubscription = this.targetJobGroup.controls.jobDescriptionText.valueChanges.subscribe((value) => {
      const hasPastedText = (value ?? '').trim().length > 0;
      if (hasPastedText && this.jobDescriptionFileError) {
        this.jobDescriptionFileError = '';
        this.jobDescriptionUploadState = 'parsed';
        this.jobDescriptionUploadMessage = 'Using pasted job description text.';
      }
      this.persistState();
    });

    this.subscriptions.add(roleSubscription);
    this.subscriptions.add(formSubscription);
    this.subscriptions.add(revisionSubscription);
    this.subscriptions.add(jobDescriptionTextSubscription);
  }

  ngOnDestroy(): void {
    this.revokePreviewPdfUrl();
    this.subscriptions.unsubscribe();
  }

  openJobDescriptionFilePicker(): void {
    this.jobDescriptionFileInput?.nativeElement.click();
  }

  onJobDescriptionFileChange(event: Event): void {
    void this.handleJobDescriptionFileChange(event);
  }

  private async handleJobDescriptionFileChange(event: Event): Promise<void> {
    const fileInput = event.target as HTMLInputElement;
    const selectedFile = fileInput.files?.[0];

    if (!selectedFile) {
      return;
    }

    if (!this.isSupportedFile(selectedFile.name)) {
      this.jobDescriptionFileName = '';
      this.jobDescriptionFileError = 'Unsupported file type. Please upload PDF or DOCX only.';
      this.jobDescriptionUploadState = 'error';
      this.jobDescriptionUploadMessage = '';
      fileInput.value = '';
      this.persistState();
      return;
    }

    this.jobDescriptionFileName = selectedFile.name;
    this.jobDescriptionFileError = '';
    this.jobDescriptionUploadState = 'parsing';
    this.jobDescriptionUploadMessage = 'Parsing file through JD parser service...';
    this.persistState();

    try {
      const projectId = await this.ensureResumeProject();
      const parsed = await firstValueFrom(this.jobDescriptionParserApi.parseJobDescription(selectedFile, projectId ?? undefined));

      const parsedText = this.buildJobDescriptionTextFromParsedData(parsed);
      const existingText = this.targetJobGroup.controls.jobDescriptionText.value?.trim() ?? '';
      if (!existingText && parsedText.trim().length > 0) {
        this.targetJobGroup.controls.jobDescriptionText.setValue(parsedText);
      }

      const existingRole = this.targetJobGroup.controls.role.value?.trim() ?? '';
      if (!existingRole && parsed.jobTitle?.trim()) {
        const normalizedRole = this.matchKnownRole(parsed.jobTitle);
        this.targetJobGroup.controls.role.setValue(normalizedRole);

        if (normalizedRole === 'Other') {
          this.targetJobGroup.controls.customRole.setValue(parsed.jobTitle.trim());
        }
      }

      this.jobDescriptionUploadState = 'parsed';
      this.jobDescriptionUploadMessage = 'JD file parsed successfully. You can review or edit the populated text.';
      this.jobDescriptionFileError = '';
    } catch (errorResponse: any) {
      this.jobDescriptionUploadState = 'error';
      this.jobDescriptionUploadMessage = '';
      this.jobDescriptionFileError = errorResponse?.error?.message
        ?? 'JD file upload was selected but parsing failed. You can continue by pasting JD text.';
    } finally {
      fileInput.value = '';
      this.persistState();
    }
  }

  private buildJobDescriptionTextFromParsedData(parsed: JobDescriptionData): string {
    const lines: string[] = [];

    if (parsed.jobTitle?.trim()) {
      lines.push(`Job Title: ${parsed.jobTitle.trim()}`);
    }

    if (parsed.summary?.trim()) {
      lines.push('', 'Summary:', parsed.summary.trim());
    }

    if (Array.isArray(parsed.responsibilities) && parsed.responsibilities.length > 0) {
      lines.push('', 'Responsibilities:');
      parsed.responsibilities
        .filter((item) => !!item?.trim())
        .forEach((item) => lines.push(`- ${item.trim()}`));
    }

    if (Array.isArray(parsed.requiredSkills) && parsed.requiredSkills.length > 0) {
      lines.push('', 'Required Skills:', parsed.requiredSkills.filter((item) => !!item?.trim()).join(', '));
    }

    if (Array.isArray(parsed.preferredSkills) && parsed.preferredSkills.length > 0) {
      lines.push('', 'Preferred Skills:', parsed.preferredSkills.filter((item) => !!item?.trim()).join(', '));
    }

    if (Array.isArray(parsed.technologies) && parsed.technologies.length > 0) {
      lines.push('', 'Technologies:', parsed.technologies.filter((item) => !!item?.trim()).join(', '));
    }

    if (typeof parsed.minimumExperienceYears === 'number') {
      lines.push('', `Minimum Experience: ${parsed.minimumExperienceYears} years`);
    }

    if (Array.isArray(parsed.keywords) && parsed.keywords.length > 0) {
      lines.push('', 'Keywords:', parsed.keywords.filter((item) => !!item?.trim()).join(', '));
    }

    return lines.join('\n').trim();
  }

  private matchKnownRole(jobTitle: string): string {
    const normalizedTitle = jobTitle.trim().toLowerCase();

    const matched = this.commonJobRoles.find((role) => {
      if (role === 'Other') {
        return false;
      }

      return normalizedTitle.includes(role.toLowerCase());
    });

    return matched ?? 'Other';
  }

  addEducation(): void {
    this.educationArray.push(this.createEducationGroup());
    this.persistState();
  }

  removeEducation(index: number): void {
    if (this.educationArray.length <= 1) {
      return;
    }

    this.educationArray.removeAt(index);
    this.persistState();
  }

  addExperience(): void {
    this.experienceArray.push(this.createExperienceGroup());
    this.persistState();
  }

  removeExperience(index: number): void {
    if (this.experienceArray.length <= 1) {
      return;
    }

    this.experienceArray.removeAt(index);
    this.persistState();
  }

  addProject(): void {
    this.projectsArray.push(this.createProjectGroup());
    this.persistState();
  }

  removeProject(index: number): void {
    if (this.projectsArray.length <= 1) {
      return;
    }

    this.projectsArray.removeAt(index);
    this.persistState();
  }

  onNoPriorExperienceChange(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.noPriorExperience = checked;
    this.persistState();
  }

  selectTemplate(templateId: string): void {
    this.selectedTemplateId = templateId;
    this.persistState();

    if (this.currentStep === this.totalSteps && this.currentProjectId && this.resumePreviewJson.trim().length > 0) {
      try {
        const parsed = JSON.parse(this.resumePreviewJson);
        void this.refreshPdfPreview(this.currentProjectId, parsed, this.selectedTemplateId);
      } catch {
        this.previewPdfState = 'error';
        this.previewPdfError = 'Unable to parse current resume JSON for template preview refresh.';
        this.triggerUiUpdate();
      }
    }
  }

  nextStep(): void {
    this.actionMessage = '';

    if (!this.canProceedFromStep(this.currentStep)) {
      this.stepValidationAttempted[this.currentStep] = true;
      this.markCurrentStepTouched();
      return;
    }

    if (this.currentStep < this.totalSteps) {
      this.currentStep += 1;
      this.persistState();
    }
  }

  previousStep(): void {
    this.actionMessage = '';

    if (this.currentStep > 1) {
      this.currentStep -= 1;
      this.persistState();
    }
  }

  saveResume(): void {
    void this.generateOrReviseResume();
  }

  exportResume(): void {
    void this.finalizeAndExportResume();
  }

  requestRevision(): void {
    void this.generateOrReviseResume(true);
  }

  isStepActive(step: number): boolean {
    return this.currentStep === step;
  }

  isStepCompleted(step: number): boolean {
    return step < this.currentStep;
  }

  canProceedFromStep(step: number): boolean {
    if (step === 1) {
      if (this.useDefaultResume && this.defaultResumeResolved) {
        return true;
      }

      return this.basicInfoGroup.valid;
    }

    if (step === 2) {
      const selectedRole = this.targetJobGroup.controls.role.value?.trim() ?? '';
      const customRole = this.targetJobGroup.controls.customRole.value?.trim() ?? '';
      const jobDescriptionText = this.targetJobGroup.controls.jobDescriptionText.value?.trim() ?? '';
      const hasSelectedRole = selectedRole.length > 0 && (selectedRole !== 'Other' || customRole.length > 0);
      const hasPastedJd = jobDescriptionText.length > 0;
      const hasUploadedJd = this.jobDescriptionFileName.length > 0 && !this.jobDescriptionFileError;
      const hasJobDescriptionSource = hasPastedJd || hasUploadedJd;

      return hasSelectedRole || hasJobDescriptionSource;
    }

    if (step === 3) {
      const educationGroups = this.educationArray.controls;
      return educationGroups.some((group) => {
        const institution = group.get('institution')?.value?.trim() ?? '';
        const degree = group.get('degree')?.value?.trim() ?? '';
        return institution.length > 0 && degree.length > 0;
      });
    }

    if (step === 4) {
      if (this.noPriorExperience) {
        return true;
      }

      const experienceGroups = this.experienceArray.controls;
      return experienceGroups.some((group) => {
        const company = group.get('company')?.value?.trim() ?? '';
        const role = group.get('role')?.value?.trim() ?? '';
        return company.length > 0 && role.length > 0;
      });
    }

    if (step === 5) {
      const projectGroups = this.projectsArray.controls;
      return projectGroups.some((group) => {
        const name = group.get('name')?.value?.trim() ?? '';
        const techStack = group.get('techStack')?.value?.trim() ?? '';
        const description = group.get('description')?.value?.trim() ?? '';
        return name.length > 0 && techStack.length > 0 && description.length > 0;
      });
    }

    return true;
  }

  hasStepError(step: number): boolean {
    return this.stepValidationAttempted[step] && !this.canProceedFromStep(step);
  }

  get selectedTemplate(): ResumeTemplateOption {
    return this.availableTemplates.find((template) => template.id === this.selectedTemplateId) ?? this.defaultTemplate;
  }

  private createEducationGroup() {
    return this.formBuilder.group({
      institution: ['', [Validators.required]],
      degree: ['', [Validators.required]],
      fieldOfStudy: [''],
      startYear: [''],
      endYear: [''],
      isPresent: [false],
      marks: ['']
    });
  }

  private createExperienceGroup() {
    return this.formBuilder.group({
      company: ['', [Validators.required]],
      role: ['', [Validators.required]],
      startDate: [''],
      endDate: [''],
      isPresent: [false],
      description: ['']
    });
  }

  private createProjectGroup() {
    return this.formBuilder.group({
      name: ['', [Validators.required]],
      techStack: ['', [Validators.required]],
      description: ['', [Validators.required]]
    });
  }

  private mergeTemplates(backendTemplates: ResumeTemplateOption[]): ResumeTemplateOption[] {
    const merged = new Map<string, ResumeTemplateOption>();

    [this.defaultTemplate, ...backendTemplates, ...this.availableTemplates].forEach((template) => {
      merged.set(template.id, template);
    });

    return [...merged.values()];
  }

  private buildResumeSnapshot() {
    const raw = this.resumeForm.getRawValue();

    return {
      basicInfo: {
        fullName: raw.basicInfo?.fullName ?? '',
        professionalRole: raw.basicInfo?.professionalRole ?? '',
        email: raw.basicInfo?.email ?? '',
        phone: raw.basicInfo?.phone ?? '',
        linkedInUrl: raw.basicInfo?.linkedInUrl ?? '',
        portfolioUrl: raw.basicInfo?.portfolioUrl ?? '',
        location: raw.basicInfo?.location ?? '',
        summary: raw.basicInfo?.summary ?? ''
      },
      targetJob: {
        role: raw.targetJob?.role ?? '',
        customRole: raw.targetJob?.customRole ?? '',
        jobDescriptionText: raw.targetJob?.jobDescriptionText ?? ''
      },
      education: (raw.education ?? []).map((item) => ({
        institution: item?.institution ?? '',
        degree: item?.degree ?? '',
        fieldOfStudy: item?.fieldOfStudy ?? '',
        startYear: item?.startYear ?? '',
        endYear: item?.endYear ?? '',
        isPresent: !!item?.isPresent,
        marks: item?.marks ?? ''
      })),
      experience: (raw.experience ?? []).map((item) => ({
        company: item?.company ?? '',
        role: item?.role ?? '',
        startDate: item?.startDate ?? '',
        endDate: item?.endDate ?? '',
        isPresent: !!item?.isPresent,
        description: item?.description ?? ''
      })),
      projects: (raw.projects ?? []).map((item) => ({
        name: item?.name ?? '',
        techStack: item?.techStack ?? '',
        description: item?.description ?? ''
      })),
      noPriorExperience: this.noPriorExperience
    };
  }

  private async ensureResumeProject(): Promise<string | null> {
    if (this.currentProjectId) {
      return this.currentProjectId;
    }

    const projectName = this.basicInfoGroup.controls.fullName.value?.trim()
      || this.basicInfoGroup.controls.professionalRole.value?.trim()
      || 'Resume Draft';

    try {
      const created = await firstValueFrom(this.projectsApi.createProject({
        name: projectName,
        type: 'Resume',
        status: 'draft',
        currentStep: 1
      }));

      this.currentProjectId = created.projectId;
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { projectId: created.projectId },
        queryParamsHandling: 'merge'
      });

      return created.projectId;
    } catch {
      return null;
    }
  }

  private restoreFormFromSnapshot(snapshot: any): void {
    if (!snapshot || typeof snapshot !== 'object') {
      return;
    }

    if (snapshot.basicInfo) {
      this.resumeForm.patchValue({ basicInfo: snapshot.basicInfo }, { emitEvent: false });
    }

    if (snapshot.targetJob) {
      this.resumeForm.patchValue({ targetJob: snapshot.targetJob }, { emitEvent: false });
    }

    if (typeof snapshot.noPriorExperience === 'boolean') {
      this.noPriorExperience = snapshot.noPriorExperience;
    }

    if (Array.isArray(snapshot.education)) {
      while (this.educationArray.length > snapshot.education.length) {
        this.educationArray.removeAt(this.educationArray.length - 1);
      }

      snapshot.education.forEach((item: any, index: number) => {
        if (!this.educationArray.at(index)) {
          this.educationArray.push(this.createEducationGroup());
        }

        this.educationArray.at(index).patchValue(item, { emitEvent: false });
      });
    }

    if (Array.isArray(snapshot.experience)) {
      while (this.experienceArray.length > snapshot.experience.length) {
        this.experienceArray.removeAt(this.experienceArray.length - 1);
      }

      snapshot.experience.forEach((item: any, index: number) => {
        if (!this.experienceArray.at(index)) {
          this.experienceArray.push(this.createExperienceGroup());
        }

        this.experienceArray.at(index).patchValue(item, { emitEvent: false });
      });
    }

    if (Array.isArray(snapshot.projects)) {
      while (this.projectsArray.length > snapshot.projects.length) {
        this.projectsArray.removeAt(this.projectsArray.length - 1);
      }

      while (this.projectsArray.length < snapshot.projects.length) {
        this.projectsArray.push(this.createProjectGroup());
      }

      snapshot.projects.forEach((item: any, index: number) => {
        if (!this.projectsArray.at(index)) {
          this.projectsArray.push(this.createProjectGroup());
        }

        this.projectsArray.at(index).patchValue(item, { emitEvent: false });
      });
    }
  }

  private applyArtifactResponse(artifact: ResumeBuilderArtifactResponse): void {
    this.resumeArtifactId = artifact.artifactId;
    this.resumePreviewJson = JSON.stringify(artifact.generatedResumeJson, null, 2);
    this.resumePreviewState = 'ready';
    this.resumePreviewError = '';
    this.resumePreviewUpdatedAt = artifact.updatedAt;

    if (artifact.builderSnapshotJson) {
      this.restoreFormFromSnapshot(artifact.builderSnapshotJson);
    }

    this.persistState();
    this.triggerUiUpdate();
  }

  private async loadBackendArtifact(projectId: string): Promise<void> {
    try {
      const artifact = await firstValueFrom(this.resumeBuilderApi.getArtifact(projectId));
      this.applyArtifactResponse(artifact);
      await this.refreshPdfPreview(projectId, artifact.generatedResumeJson, artifact.templateId);
    } catch {
      // No backend artifact yet.
      this.previewPdfState = 'idle';
      this.previewPdfError = '';
      this.triggerUiUpdate();
    }

    try {
      const metadata = await firstValueFrom(this.resumeBuilderApi.getLatestPdfMetadata(projectId));
      this.pdfExportFileName = metadata.fileName;
      this.pdfExportStatus = 'ready';
      this.triggerUiUpdate();
    } catch {
      this.pdfExportStatus = this.pdfExportFileName ? 'ready' : 'idle';
      this.triggerUiUpdate();
    }
  }

  private async refreshPdfPreview(projectId: string, resumeJson: any, templateId?: string): Promise<void> {
    if (!resumeJson) {
      this.previewPdfState = 'idle';
      this.previewPdfError = '';
      this.revokePreviewPdfUrl();
      this.triggerUiUpdate();
      return;
    }

    this.previewPdfState = 'generating';
    this.previewPdfError = '';
    this.triggerUiUpdate();

    try {
      const response = await firstValueFrom(this.resumeBuilderApi.previewPdf(projectId, {
        projectId,
        templateId: templateId || this.selectedTemplateId || this.defaultTemplate.id,
        resumeJson,
        renderOptions: {
          pageSize: 'A4',
          mode: 'preview'
        }
      }));

      if (!response.body) {
        throw new Error('Preview PDF response body was empty.');
      }

      const blobUrl = URL.createObjectURL(response.body);
      this.revokePreviewPdfUrl();
      this.previewPdfUrl = blobUrl;
      this.previewPdfResourceUrl = this.sanitizer.bypassSecurityTrustResourceUrl(blobUrl);
      this.previewPdfState = 'ready';
      this.previewPdfError = '';
      this.triggerUiUpdate();
    } catch (errorResponse: any) {
      this.previewPdfState = 'error';
      this.previewPdfError = errorResponse?.error?.message ?? 'Unable to generate in-app PDF preview.';
      this.revokePreviewPdfUrl();
      this.triggerUiUpdate();
    }
  }

  private async generateOrReviseResume(isRevision = false): Promise<void> {
    const projectId = await this.ensureResumeProject();
    if (!projectId) {
      this.resumePreviewState = 'error';
      this.resumePreviewError = 'Unable to create or resolve the resume project.';
      this.triggerUiUpdate();
      return;
    }

    if (isRevision && !this.revisionRequest.trim()) {
      this.resumePreviewState = 'error';
      this.resumePreviewError = 'Enter a revision request before asking for changes.';
      this.triggerUiUpdate();
      return;
    }

    if (isRevision && !this.resumePreviewJson.trim()) {
      this.resumePreviewState = 'error';
      this.resumePreviewError = 'Generate the initial preview before requesting revisions.';
      this.triggerUiUpdate();
      return;
    }

    const templateId = this.selectedTemplateId || this.defaultTemplate.id;
    const payload = {
      projectId,
      templateId,
      wizardSnapshot: this.buildResumeSnapshot(),
      prefilledResumeJson: !isRevision && this.useDefaultResume && this.defaultResumeResolved
        ? (this.resolvedDefaultResume?.parsedResumeJson ?? null)
        : null,
      targetRole: this.targetJobGroup.controls.customRole.value?.trim() || this.targetJobGroup.controls.role.value?.trim() || this.basicInfoGroup.controls.professionalRole.value?.trim() || null,
      tone: 'professional',
      lengthPolicy: 'one_page',
      revisionContext: isRevision && this.resumePreviewJson.trim().length > 0
        ? {
            currentPreviewJson: JSON.parse(this.resumePreviewJson),
            userChangeRequest: this.revisionRequest.trim()
          }
        : null
    };

    this.resumePreviewState = 'generating';
    this.resumePreviewError = '';
    this.actionMessage = '';
    this.triggerUiUpdate();

    try {
      const response = isRevision
        ? await firstValueFrom(this.resumeBuilderApi.revisePreview(projectId, payload))
        : await firstValueFrom(this.resumeBuilderApi.generatePreview(projectId, payload));

      this.applyArtifactResponse(response);
      await this.refreshPdfPreview(projectId, response.generatedResumeJson, response.templateId);
      this.revisionRequest = '';
      this.resumeForm.controls.revisionRequest.setValue('', { emitEvent: false });
      this.actionMessage = isRevision ? 'Resume preview revised.' : 'Resume preview generated.';
      this.resumePreviewState = 'ready';
      this.triggerUiUpdate();
    } catch (errorResponse: any) {
      this.resumePreviewState = 'error';
      this.resumePreviewError = errorResponse?.error?.message ?? 'Unable to generate the resume preview.';
      this.triggerUiUpdate();
    } finally {
      this.persistState();
      this.triggerUiUpdate();
    }
  }

  private async finalizeAndExportResume(): Promise<void> {
    const projectId = await this.ensureResumeProject();
    if (!projectId) {
      this.pdfExportStatus = 'error';
      this.pdfExportError = 'Unable to resolve the resume project.';
      this.triggerUiUpdate();
      return;
    }

    if (!this.resumePreviewJson.trim()) {
      this.pdfExportStatus = 'error';
      this.pdfExportError = 'Generate a preview before exporting the PDF.';
      this.triggerUiUpdate();
      return;
    }

    this.pdfExportStatus = 'exporting';
    this.pdfExportError = '';
    this.triggerUiUpdate();

    try {
      const response = await firstValueFrom(this.resumeBuilderApi.exportPdf(projectId, {
        projectId,
        templateId: this.selectedTemplateId || this.defaultTemplate.id,
        resumeJson: JSON.parse(this.resumePreviewJson),
        renderOptions: {
          pageSize: 'A4',
          layout: 'resume-builder-default'
        }
      }));

      this.downloadBlob(response.body, response.headers.get('content-disposition') ?? undefined, this.pdfExportFileName || 'resume.pdf');
      this.pdfExportStatus = 'ready';
      this.actionMessage = 'PDF export completed.';

      try {
        const metadata = await firstValueFrom(this.resumeBuilderApi.getLatestPdfMetadata(projectId));
        this.pdfExportFileName = metadata.fileName;
      } catch {
        this.pdfExportFileName = this.pdfExportFileName || 'resume.pdf';
      }
      this.triggerUiUpdate();
    } catch (errorResponse: any) {
      this.pdfExportStatus = 'error';
      this.pdfExportError = errorResponse?.error?.message ?? 'Unable to export the PDF.';
      this.triggerUiUpdate();
    } finally {
      this.persistState();
      this.triggerUiUpdate();
    }
  }

  private downloadBlob(blob: Blob | null, contentDisposition?: string | null, fallbackFileName = 'resume.pdf'): void {
    if (!blob) {
      return;
    }

    const fileName = this.extractFileName(contentDisposition) ?? fallbackFileName;
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  private extractFileName(contentDisposition?: string | null): string | null {
    if (!contentDisposition) {
      return null;
    }

    const utf8Match = /filename\*=UTF-8''([^;]+)/i.exec(contentDisposition);
    if (utf8Match?.[1]) {
      return decodeURIComponent(utf8Match[1]);
    }

    const asciiMatch = /filename="?([^";]+)"?/i.exec(contentDisposition);
    return asciiMatch?.[1] ?? null;
  }

  private async loadTemplates(): Promise<void> {
    try {
      const backendTemplates = await firstValueFrom(this.resumeBuilderApi.getTemplates());
      const mapped = backendTemplates.map((template) => ({
        id: template.templateId,
        title: template.title,
        description: template.description
      }));

      this.availableTemplates = this.mergeTemplates(mapped);
    } catch {
      this.availableTemplates = this.loadTemplatesFromStorage();
    }
  }

  private markCurrentStepTouched(): void {
    if (this.currentStep === 1) {
      this.basicInfoGroup.markAllAsTouched();
      return;
    }

    if (this.currentStep === 2) {
      this.targetJobGroup.markAllAsTouched();
      return;
    }

    if (this.currentStep === 3) {
      this.educationArray.controls.forEach((group) => group.markAllAsTouched());
      return;
    }

    if (this.currentStep === 4) {
      this.experienceArray.controls.forEach((group) => group.markAllAsTouched());
      return;
    }

    if (this.currentStep === 5) {
      this.projectsArray.controls.forEach((group) => group.markAllAsTouched());
    }
  }

  private isSupportedFile(fileName: string): boolean {
    const extension = fileName.split('.').pop()?.toLowerCase() ?? '';
    return this.allowedExtensions.includes(extension);
  }

  private loadTemplatesFromStorage(): ResumeTemplateOption[] {
    if (!isPlatformBrowser(this.platformId)) {
      return [this.defaultTemplate];
    }

    const raw = localStorage.getItem(this.templatesStorageKey);

    if (!raw) {
      return [this.defaultTemplate];
    }

    try {
      const parsed = JSON.parse(raw) as Partial<ResumeTemplateOption>[];
      const validTemplates = parsed
        .filter((template) => !!template?.id && !!template?.title)
        .map((template) => ({
          id: template.id as string,
          title: template.title as string,
          description: template.description ?? 'Template imported from local storage.'
        }));

      if (!validTemplates.length) {
        return [this.defaultTemplate];
      }

      if (!validTemplates.some((template) => template.id === this.defaultTemplate.id)) {
        return [this.defaultTemplate, ...validTemplates];
      }

      return validTemplates;
    } catch {
      return [this.defaultTemplate];
    }
  }

  private persistState(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const raw = this.resumeForm.getRawValue();
    this.revisionRequest = raw.revisionRequest ?? this.revisionRequest;
    const snapshot: ResumeBuilderWizardSnapshot = {
      currentStep: this.currentStep,
      jobDescriptionFileName: this.jobDescriptionFileName,
      selectedTemplateId: this.selectedTemplateId,
      templates: this.availableTemplates,
      noPriorExperience: this.noPriorExperience,
      revisionRequest: this.revisionRequest,
      previewJson: this.resumePreviewJson,
      previewArtifactId: this.resumeArtifactId,
      previewUpdatedAt: this.resumePreviewUpdatedAt,
      pdfExportFileName: this.pdfExportFileName,
      useDefaultResume: this.useDefaultResume,
      defaultResumeResolved: this.defaultResumeResolved,
      form: {
        basicInfo: {
          fullName: raw.basicInfo?.fullName ?? '',
          professionalRole: raw.basicInfo?.professionalRole ?? '',
          email: raw.basicInfo?.email ?? '',
          phone: raw.basicInfo?.phone ?? '',
          linkedInUrl: raw.basicInfo?.linkedInUrl ?? '',
          portfolioUrl: raw.basicInfo?.portfolioUrl ?? '',
          location: raw.basicInfo?.location ?? '',
          summary: raw.basicInfo?.summary ?? ''
        },
        targetJob: {
          role: raw.targetJob?.role ?? '',
          customRole: raw.targetJob?.customRole ?? '',
          jobDescriptionText: raw.targetJob?.jobDescriptionText ?? ''
        },
        education: (raw.education ?? []).map((item) => ({
          institution: item?.institution ?? '',
          degree: item?.degree ?? '',
          fieldOfStudy: item?.fieldOfStudy ?? '',
          startYear: item?.startYear ?? '',
          endYear: item?.endYear ?? '',
          isPresent: !!item?.isPresent,
          marks: item?.marks ?? ''
        })),
        experience: (raw.experience ?? []).map((item) => ({
          company: item?.company ?? '',
          role: item?.role ?? '',
          startDate: item?.startDate ?? '',
          endDate: item?.endDate ?? '',
          isPresent: !!item?.isPresent,
          description: item?.description ?? ''
        })),
        projects: (raw.projects ?? []).map((item) => ({
          name: item?.name ?? '',
          techStack: item?.techStack ?? '',
          description: item?.description ?? ''
        }))
      }
    };

    localStorage.setItem(this.storageKey, JSON.stringify(snapshot));

    if (this.currentProjectId) {
      this.pendingWizardPersistPayload = {
        currentStep: this.currentStep,
        stateJson: snapshot
      };

      this.flushWizardPersistQueue();
    }
  }

  private flushWizardPersistQueue(): void {
    if (this.wizardPersistInFlight || !this.currentProjectId || !this.pendingWizardPersistPayload) {
      return;
    }

    const payload = this.pendingWizardPersistPayload;
    this.pendingWizardPersistPayload = null;
    this.wizardPersistInFlight = true;

    this.projectsApi.upsertWizardState(this.currentProjectId, 'resume_builder', payload).subscribe({
      error: () => {
        // Best-effort persistence only.
      },
      complete: () => {
        this.wizardPersistInFlight = false;
        if (this.pendingWizardPersistPayload) {
          this.flushWizardPersistQueue();
        }
      }
    });
  }

  private startFreshWizard(): void {
    this.currentStep = 1;
    this.noPriorExperience = false;
    this.selectedTemplateId = this.defaultTemplate.id;
    this.jobDescriptionFileName = '';
    this.jobDescriptionFileError = '';
    this.jobDescriptionUploadState = 'idle';
    this.jobDescriptionUploadMessage = '';
    this.actionMessage = '';
    this.revisionRequest = '';
    this.resumePreviewJson = '';
    this.resumePreviewState = 'idle';
    this.resumePreviewError = '';
    this.resumeArtifactId = '';
    this.resumePreviewUpdatedAt = '';
    this.pdfExportFileName = '';
    this.pdfExportStatus = 'idle';
    this.pdfExportError = '';
    this.previewPdfState = 'idle';
    this.previewPdfError = '';
    this.showPreviewJsonDebug = false;
    this.useDefaultResume = false;
    this.defaultResumeResolved = false;
    this.defaultResumeMessage = '';
    this.defaultResumeAvailable = false;
    this.resolvedDefaultResume = null;
    this.revokePreviewPdfUrl();

    this.availableTemplates = this.loadTemplatesFromStorage();

    this.resumeForm.reset(
      {
        basicInfo: {
          fullName: '',
          professionalRole: '',
          email: '',
          phone: '',
          linkedInUrl: '',
          portfolioUrl: '',
          location: '',
          summary: ''
        },
        targetJob: {
          role: '',
          customRole: '',
          jobDescriptionText: ''
        },
        revisionRequest: '',
      },
      { emitEvent: false }
    );

    while (this.educationArray.length > 1) {
      this.educationArray.removeAt(this.educationArray.length - 1);
    }
    this.educationArray.at(0).reset(
      {
        institution: '',
        degree: '',
        fieldOfStudy: '',
        startYear: '',
        endYear: '',
        isPresent: false,
        marks: ''
      },
      { emitEvent: false }
    );

    while (this.experienceArray.length > 1) {
      this.experienceArray.removeAt(this.experienceArray.length - 1);
    }
    this.experienceArray.at(0).reset(
      {
        company: '',
        role: '',
        startDate: '',
        endDate: '',
        isPresent: false,
        description: ''
      },
      { emitEvent: false }
    );

    while (this.projectsArray.length > 2) {
      this.projectsArray.removeAt(this.projectsArray.length - 1);
    }

    while (this.projectsArray.length < 2) {
      this.projectsArray.push(this.createProjectGroup());
    }

    this.projectsArray.at(0).reset(
      {
        name: '',
        techStack: '',
        description: ''
      },
      { emitEvent: false }
    );

    this.projectsArray.at(1).reset(
      {
        name: '',
        techStack: '',
        description: ''
      },
      { emitEvent: false }
    );

    this.targetJobGroup.controls.customRole.clearValidators();
    this.targetJobGroup.controls.customRole.updateValueAndValidity({ emitEvent: false });

    Object.keys(this.stepValidationAttempted).forEach((key) => {
      this.stepValidationAttempted[Number(key)] = false;
    });

    this.persistState();
    this.triggerUiUpdate();
  }

  private async initializeFromProjectContext(): Promise<void> {
    const requestedProjectId = this.route.snapshot.queryParamMap.get('projectId');

    if (!requestedProjectId) {
      this.startFreshWizard();
      return;
    }

    this.currentProjectId = requestedProjectId;

    this.actionMessage = '';
    this.resumePreviewError = '';
    this.pdfExportError = '';
    this.availableTemplates = this.availableTemplates.length > 0
      ? this.availableTemplates
      : this.loadTemplatesFromStorage();

    try {
      const wizardState = await firstValueFrom(this.projectsApi.getWizardState(requestedProjectId, 'resume_builder'));
      const snapshot = wizardState.stateJson as Partial<ResumeBuilderWizardSnapshot>;

      if (typeof snapshot.currentStep === 'number') {
        this.currentStep = Math.min(this.totalSteps, Math.max(1, snapshot.currentStep));
      }

      if (snapshot.jobDescriptionFileName) {
        this.jobDescriptionFileName = snapshot.jobDescriptionFileName;
      }

      this.jobDescriptionUploadState = this.jobDescriptionFileName ? 'parsed' : 'idle';
      this.jobDescriptionUploadMessage = this.jobDescriptionFileName
        ? 'Previously uploaded JD file selected. You can upload again to re-parse.'
        : '';

      if (snapshot.selectedTemplateId) {
        this.selectedTemplateId = snapshot.selectedTemplateId;
      }

      if (typeof snapshot.noPriorExperience === 'boolean') {
        this.noPriorExperience = snapshot.noPriorExperience;
      }

      if (typeof snapshot.revisionRequest === 'string') {
        this.revisionRequest = snapshot.revisionRequest;
        this.resumeForm.controls.revisionRequest.setValue(snapshot.revisionRequest, { emitEvent: false });
      }

      if (typeof snapshot.previewJson === 'string') {
        this.resumePreviewJson = snapshot.previewJson;
        this.resumePreviewState = snapshot.previewJson.trim().length > 0 ? 'ready' : 'idle';
      }

      if (typeof snapshot.previewArtifactId === 'string') {
        this.resumeArtifactId = snapshot.previewArtifactId;
      }

      if (typeof snapshot.previewUpdatedAt === 'string') {
        this.resumePreviewUpdatedAt = snapshot.previewUpdatedAt;
      }

      if (typeof snapshot.pdfExportFileName === 'string') {
        this.pdfExportFileName = snapshot.pdfExportFileName;
      }

      this.useDefaultResume = !!snapshot.useDefaultResume;
      this.defaultResumeResolved = !!snapshot.defaultResumeResolved;

      const formSnapshot = snapshot.form;
      if (formSnapshot) {
        this.resumeForm.patchValue({
          basicInfo: formSnapshot.basicInfo,
          targetJob: formSnapshot.targetJob
        }, { emitEvent: false });
      }

      this.availableTemplates = Array.isArray(snapshot.templates) && snapshot.templates.length > 0
        ? snapshot.templates
        : this.availableTemplates;

      await this.loadBackendArtifact(requestedProjectId);

      if (this.resumePreviewJson.trim().length > 0 && this.previewPdfState !== 'ready') {
        try {
          await this.refreshPdfPreview(requestedProjectId, JSON.parse(this.resumePreviewJson), this.selectedTemplateId);
        } catch {
          this.previewPdfState = 'error';
          this.previewPdfError = 'Unable to refresh preview from saved JSON snapshot.';
          this.triggerUiUpdate();
        }
      }

      this.persistState();
      this.triggerUiUpdate();
    } catch {
      // No existing wizard state yet.
      await this.loadBackendArtifact(requestedProjectId);
      this.triggerUiUpdate();
    }
  }

  private revokePreviewPdfUrl(): void {
    if (this.previewPdfUrl) {
      URL.revokeObjectURL(this.previewPdfUrl);
    }

    this.previewPdfUrl = '';
    this.previewPdfResourceUrl = null;
  }

  private triggerUiUpdate(): void {
    this.cdr.markForCheck();
    this.cdr.detectChanges();
  }

  async onUseDefaultResumeToggle(event: Event): Promise<void> {
    const checked = (event.target as HTMLInputElement).checked;
    this.useDefaultResume = checked;
    this.defaultResumeMessage = '';

    if (!checked) {
      this.defaultResumeResolved = false;
      this.resolvedDefaultResume = null;
      this.persistState();
      this.triggerUiUpdate();
      return;
    }

    if (!this.defaultResumeAvailable) {
      this.useDefaultResume = false;
      this.defaultResumeResolved = false;
      this.defaultResumeMessage = 'No default resume is configured. Set one in Account Settings first.';
      this.persistState();
      this.triggerUiUpdate();
      return;
    }

    await this.resolveDefaultResumeForBuilder();
  }

  private async loadDefaultResumeAvailability(): Promise<void> {
    try {
      await firstValueFrom(this.projectsApi.getDefaultResume());
      this.defaultResumeAvailable = true;
      this.defaultResumeMessage = '';
    } catch {
      this.defaultResumeAvailable = false;
      this.defaultResumeMessage = 'Default resume is not configured. Continue with manual wizard input.';
    } finally {
      this.triggerUiUpdate();
    }
  }

  private async resolveDefaultResumeForBuilder(): Promise<void> {
    this.defaultResumeMessage = 'Resolving default resume...';
    this.triggerUiUpdate();

    try {
      const projectId = await this.ensureResumeProject();
      if (!projectId) {
        throw new Error('Unable to create or resolve resume project.');
      }

      const resolved = await firstValueFrom(this.projectsApi.resolveDefaultResume('resume_builder'));
      this.resolvedDefaultResume = resolved;

      this.applyResolvedResumeToBuilderForm(resolved.parsedResumeJson);
      this.defaultResumeResolved = true;
      this.defaultResumeMessage = 'Default resume applied. You can continue from template selection.';

      if (this.currentStep < 6) {
        this.currentStep = 6;
      }

      this.persistState();
      this.triggerUiUpdate();
    } catch (errorResponse: any) {
      this.useDefaultResume = false;
      this.defaultResumeResolved = false;
      this.resolvedDefaultResume = null;
      this.defaultResumeMessage = errorResponse?.error?.message ?? errorResponse?.message ?? 'Unable to resolve default resume right now.';
      this.persistState();
      this.triggerUiUpdate();
    }
  }

  private applyResolvedResumeToBuilderForm(parsedResumeJson: any): void {
    const personalInfo = parsedResumeJson?.personalInfo ?? {};
    const targetJobs = Array.isArray(parsedResumeJson?.targetJobs) ? parsedResumeJson.targetJobs : [];

    const firstTarget = targetJobs[0] ?? {};
    const targetTitle = (firstTarget.title ?? '').toString();
    const matchedRole = this.matchKnownRole(targetTitle);

    this.resumeForm.patchValue({
      basicInfo: {
        fullName: personalInfo?.name ?? '',
        professionalRole: personalInfo?.professionalTitle ?? '',
        email: personalInfo?.email ?? '',
        phone: personalInfo?.phone ?? '',
        linkedInUrl: personalInfo?.linkedIn ?? '',
        portfolioUrl: personalInfo?.gitHub ?? '',
        location: personalInfo?.location ?? '',
        summary: personalInfo?.summary ?? ''
      },
      targetJob: {
        role: matchedRole,
        customRole: matchedRole === 'Other' ? targetTitle : '',
        jobDescriptionText: firstTarget.description ?? ''
      }
    }, { emitEvent: false });

    this.replaceEducationFromParsedResume(parsedResumeJson?.education);
    this.replaceExperienceFromParsedResume(parsedResumeJson?.experience);
    this.replaceProjectsFromParsedResume(parsedResumeJson?.projects);
  }

  private replaceEducationFromParsedResume(education: any): void {
    const entries = Array.isArray(education) && education.length > 0
      ? education
      : [{ institution: '', degree: '', fieldOfStudy: '', startYear: '', endYear: '', marks: '' }];

    while (this.educationArray.length > entries.length) {
      this.educationArray.removeAt(this.educationArray.length - 1);
    }

    while (this.educationArray.length < entries.length) {
      this.educationArray.push(this.createEducationGroup());
    }

    entries.forEach((item: any, index: number) => {
      this.educationArray.at(index).patchValue({
        institution: item?.school ?? item?.college ?? item?.university ?? '',
        degree: item?.degree ?? '',
        fieldOfStudy: item?.fieldOfStudy ?? '',
        startYear: item?.startYear ?? '',
        endYear: item?.endYear === 'Present' ? '' : (item?.endYear ?? ''),
        isPresent: item?.endYear === 'Present',
        marks: item?.marks ?? ''
      }, { emitEvent: false });
    });
  }

  private replaceExperienceFromParsedResume(experience: any): void {
    const entries = Array.isArray(experience) && experience.length > 0
      ? experience
      : [{ company: '', role: '', startDate: '', endDate: '', description: '' }];

    while (this.experienceArray.length > entries.length) {
      this.experienceArray.removeAt(this.experienceArray.length - 1);
    }

    while (this.experienceArray.length < entries.length) {
      this.experienceArray.push(this.createExperienceGroup());
    }

    entries.forEach((item: any, index: number) => {
      this.experienceArray.at(index).patchValue({
        company: item?.company ?? '',
        role: item?.role ?? '',
        startDate: item?.startDate ?? '',
        endDate: item?.endDate === 'Present' ? '' : (item?.endDate ?? ''),
        isPresent: item?.endDate === 'Present',
        description: item?.description ?? ''
      }, { emitEvent: false });
    });
  }

  private replaceProjectsFromParsedResume(projects: any): void {
    const entries = Array.isArray(projects) && projects.length > 0
      ? projects
      : [{ title: '', technologies: '', description: '' }];

    while (this.projectsArray.length > entries.length) {
      this.projectsArray.removeAt(this.projectsArray.length - 1);
    }

    while (this.projectsArray.length < entries.length) {
      this.projectsArray.push(this.createProjectGroup());
    }

    entries.forEach((item: any, index: number) => {
      this.projectsArray.at(index).patchValue({
        name: item?.title ?? item?.name ?? '',
        techStack: item?.technologies ?? item?.techStack ?? '',
        description: item?.description ?? ''
      }, { emitEvent: false });
    });
  }
}
