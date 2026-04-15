import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { AppTheme, Theme } from '../../services/theme';
@Component({
  selector: 'app-theme-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './theme-card.html',
  styleUrl: './theme-card.css',
})
export class ThemeCard {
  @Input() theme!: AppTheme;

  constructor(public themeService: Theme) {}

  selectTheme() {
    this.themeService.setTheme(this.theme);
  }
  applyTheme() {
    this.themeService.setTheme(this.theme);
  }
}
