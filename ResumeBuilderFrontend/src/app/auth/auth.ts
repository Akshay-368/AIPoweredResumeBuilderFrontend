import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

import { Login } from './login/login';

import { Register } from './register/register';

@Component({
  selector: 'app-auth',
  imports: [CommonModule, Login, Register],
  templateUrl: './auth.html',
  styleUrl: './auth.css',
  standalone: true
})
export class Auth {
  activeTab : 'login' | 'register' = 'login'; // by default , showing login form / and fixing activetab type as login or register only by union operator
  isForgotPasswordFlowActive = false;

  currentTab  : 'Login' | 'Register' = 'Login'; // for dynamic heading of the form, by default it is login and it can be either login or register only

  switchTab(tab: 'login'| 'register') {
    if (this.isForgotPasswordFlowActive) {
      return;
    }

    this.activeTab = tab ; // setting the value of activeTab as whatever switchtab gives, on the event listener of click of the tab button
    this.currentTab = tab === 'login' ? 'Login' : 'Register'; // keep the display state in sync with active tab
  }

  onForgotPasswordFlowActiveChange(isActive: boolean): void {
    this.isForgotPasswordFlowActive = isActive;
    if (isActive) {
      this.activeTab = 'login';
      this.currentTab = 'Login';
    }
  }

  onForgotPasswordFlowCompleted(): void {
    this.isForgotPasswordFlowActive = false;
    this.activeTab = 'login';
    this.currentTab = 'Login';
  }
}
