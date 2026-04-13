import { isPlatformBrowser } from '@angular/common';
import { Inject, Injectable, PLATFORM_ID } from '@angular/core';

export type AppTheme = 'light' | 'night' | 'aurora' | 'default';

@Injectable({
  providedIn: 'root', // Means create one instance for the whole app , not per component or per page. One Global Instance.
})
export class Theme {
  constructor(@Inject(PLATFORM_ID) private platformId : Object){}
  private currentTheme : AppTheme = 'default';
  private readonly themes: AppTheme[] = ['default', 'light', 'night', 'aurora'];

  setTheme(theme : AppTheme) {
    if (isPlatformBrowser(this.platformId)) {
      // Keep theme class in sync on both html and body for robust global styling.
      const root = document.documentElement;
      root.classList.remove(...this.themes);
      document.body.classList.remove(...this.themes);

      root.classList.add(theme);
      document.body.classList.add(theme);
      
      // store the current theme for future reference
      localStorage.setItem('app-theme', theme);
    }
    
    this.currentTheme = theme;
  }

  loadTheme() {
    if (isPlatformBrowser(this.platformId)) {
      const savedTheme = localStorage.getItem('app-theme');
      const theme = this.themes.includes(savedTheme as AppTheme)
        ? (savedTheme as AppTheme)
        : 'default';

      this.setTheme(theme);
    }
  }

  getTheme() : AppTheme{
    return this.currentTheme;
  }
}

