import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, ElementRef, OnDestroy, OnInit, PLATFORM_ID, ViewChild, inject } from '@angular/core';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';

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
  private readonly allowedExtensions = ['pdf', 'doc', 'docx'];
  private readonly subscriptions = new Subscription();
  private readonly formBuilder = inject(FormBuilder);
  private readonly platformId = inject(PLATFORM_ID);

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
  noPriorExperience = false;
  selectedTemplateId = 'deedy-one-page-two-column';
  jobDescriptionFileName = '';
  jobDescriptionFileError = '';
  actionMessage = '';

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
    this.startFreshWizard();

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

    this.subscriptions.add(roleSubscription);
    this.subscriptions.add(formSubscription);
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  openJobDescriptionFilePicker(): void {
    this.jobDescriptionFileInput?.nativeElement.click();
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
    this.actionMessage = 'Save placeholder complete. Database integration will be added in a future update.';
  }

  exportResume(): void {
    this.actionMessage = 'Export placeholder complete. PDF export integration will be added in a future update.';
  }

  isStepActive(step: number): boolean {
    return this.currentStep === step;
  }

  isStepCompleted(step: number): boolean {
    return step < this.currentStep;
  }

  canProceedFromStep(step: number): boolean {
    if (step === 1) {
      return this.basicInfoGroup.valid;
    }

    if (step === 2) {
      const selectedRole = this.targetJobGroup.controls.role.value?.trim() ?? '';
      const customRole = this.targetJobGroup.controls.customRole.value?.trim() ?? '';
      const jobDescriptionText = this.targetJobGroup.controls.jobDescriptionText.value?.trim() ?? '';
      const hasSelectedRole = selectedRole.length > 0 && (selectedRole !== 'Other' || customRole.length > 0);
      const hasJobDescriptionSource =
        this.jobDescriptionFileName.length > 0 ||
        jobDescriptionText.length > 0;

      return (hasSelectedRole || hasJobDescriptionSource) && !this.jobDescriptionFileError;
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
    const snapshot: ResumeBuilderWizardSnapshot = {
      currentStep: this.currentStep,
      jobDescriptionFileName: this.jobDescriptionFileName,
      selectedTemplateId: this.selectedTemplateId,
      templates: this.availableTemplates,
      noPriorExperience: this.noPriorExperience,
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
  }

  private startFreshWizard(): void {
    this.currentStep = 1;
    this.noPriorExperience = false;
    this.selectedTemplateId = this.defaultTemplate.id;
    this.jobDescriptionFileName = '';
    this.jobDescriptionFileError = '';
    this.actionMessage = '';

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
        }
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
  }
}
