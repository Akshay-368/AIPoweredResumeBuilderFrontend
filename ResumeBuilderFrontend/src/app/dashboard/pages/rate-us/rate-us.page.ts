import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../../auth/services/auth.service';
import { FeedbackApiService, FeedbackItem } from '../../services/feedback-api.service';

@Component({
  selector: 'app-rate-us-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './rate-us.page.html',
  styleUrl: './rate-us.page.css'
})
export class RateUsPage implements OnInit {
  private readonly feedbackApi = inject(FeedbackApiService);
  private readonly authService = inject(AuthService);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly isAdmin = this.authService.isAdmin();
  rating = 8;
  feedbackText = '';
  message = '';
  loading = false;
  feedback: FeedbackItem[] = [];

  async ngOnInit(): Promise<void> {
    await this.reload();
  }

  async reload(): Promise<void> {
    this.loading = true;
    this.message = '';

    try {
      this.feedback = await firstValueFrom(this.feedbackApi.getAll());
    } catch (error: any) {
      this.message = error?.error?.message ?? 'Unable to load feedback.';
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  async submit(): Promise<void> {
    if (this.isAdmin) {
      this.message = 'Admins cannot submit ratings from this module.';
      this.cdr.detectChanges();
      return;
    }

    if (this.rating < 1 || this.rating > 10) {
      this.message = 'Rating must be between 1 and 10.';
      this.cdr.detectChanges();
      return;
    }

    if (!this.feedbackText.trim()) {
      this.message = 'Feedback text is required.';
      this.cdr.detectChanges();
      return;
    }

    try {
      await firstValueFrom(this.feedbackApi.submit({
        rating: this.rating,
        feedbackText: this.feedbackText.trim()
      }));

      this.feedbackText = '';
      this.message = 'Feedback submitted successfully.';
      await this.reload();
    } catch (error: any) {
      this.message = error?.error?.message ?? 'Unable to submit feedback.';
      this.cdr.detectChanges();
    }
  }
}
