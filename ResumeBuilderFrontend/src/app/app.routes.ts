import { Routes } from '@angular/router';
import { Auth } from './auth/auth';
import { adminGuard, authChildGuard, authGuard } from './auth/guards/auth.guard';
import { Dashboard } from './dashboard/dashboard';
import { AccountSettingsPage } from './dashboard/pages/account-settings/account-settings.page';
import { AdminPage } from './dashboard/pages/admin/admin.page';
import { AtsPage } from './dashboard/pages/ats/ats.page';
import { NotificationsPage } from './dashboard/pages/notifications/notifications.page';
import { ProjectsPage } from './dashboard/pages/projects/projects.page';
import { RateUsPage } from './dashboard/pages/rate-us/rate-us.page';
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
                { path: 'notifications', component: NotificationsPage },
                { path: 'rate-us', component: RateUsPage },
                { path: 'templates', component: TemplatesPage },
                { path: 'admin', component: AdminPage, canActivate: [adminGuard] },
                { path: 'account-settings', component: AccountSettingsPage },
                { path: 'subscription', component: SubscriptionPage },
                { path: 'theme', component: ThemePage }
            ]
        }
];
