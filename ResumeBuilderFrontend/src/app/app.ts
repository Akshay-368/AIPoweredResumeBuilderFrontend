import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Theme } from './dashboard/services/theme';


@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css',
  standalone: true,
  providers : [] // providing the routes to the application as this enables the routing. this would have only been possible if the inline config was used in the bootstrapApplication method in main.ts
})
export class App {
  protected readonly title = signal('ResumeBuilderFrontend');
  constructor(private theme : Theme) {
    this.theme.loadTheme();
  }
}
