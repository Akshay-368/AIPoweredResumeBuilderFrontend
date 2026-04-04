import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ThemeCard } from '../../components/theme-card/theme-card';
@Component({
  selector: 'app-theme-page',
  standalone: true,
  imports: [CommonModule, ThemeCard],
  templateUrl: './theme.page.html',
  styleUrl: './theme.page.css'
})
export class ThemePage {}
