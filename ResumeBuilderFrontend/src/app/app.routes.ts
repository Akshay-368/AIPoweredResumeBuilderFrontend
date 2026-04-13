import { Routes } from '@angular/router';
import { Auth } from './auth/auth';
import { Dashboard } from './dashboard/dashboard';
import { authChildGuard, authGuard } from './auth/guards/auth.guard';
import { AccountSettingsPage } from './dashboard/pages/account-settings/account-settings.page';
import { AtsPage } from './dashboard/pages/ats/ats.page';
import { CoverLetterPage } from './dashboard/pages/cover-letter/cover-letter.page';
import { ProjectsPage } from './dashboard/pages/projects/projects.page';
import { ResumeBuilderPage } from './dashboard/pages/resume-builder/resume-builder.page';
import { SubscriptionPage } from './dashboard/pages/subscription/subscription.page';
import { TemplatesPage } from './dashboard/pages/templates/templates.page';
import { ThemePage } from './dashboard/pages/theme/theme.page';
export const routes: Routes = [
    {path : '' , component : Auth}, // default page
        {
            path: 'dashboard',
            component: Dashboard,
            canActivate: [authGuard],
            canActivateChild: [authChildGuard],
            children: [
                { path: '', redirectTo: 'projects', pathMatch: 'full' },
                { path: 'projects', component: ProjectsPage },
                { path: 'ats', component: AtsPage },
                { path: 'resume', component: ResumeBuilderPage },
                { path: 'templates', component: TemplatesPage },
                { path: 'cover-letter', component: CoverLetterPage },
                { path: 'account-settings', component: AccountSettingsPage },
                { path: 'subscription', component: SubscriptionPage },
                { path: 'theme', component: ThemePage }
            ]
        }
];
