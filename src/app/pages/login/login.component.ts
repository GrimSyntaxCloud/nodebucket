/*
============================================
 Title: login.component.ts
 Author: Andres Macias
 Date:   01/15/23
 Description: contains code to allow user to log in
===========================================
*/

import { HttpClient } from '@angular/common/http';
import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { CookieService } from 'ngx-cookie-service';
import { EmployeeService } from '../../shared/services/employee.service';
import { AppMessage as Message } from '../../shared/app-messages.component';
import { Employee } from '../../shared/models/employee.interface';

@Component({
  standalone: false,
  selector: 'app-login',
  templateUrl: './login.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./login.component.css'],
})
export class LoginComponent implements OnInit {
  errorMessages: Message[] = [];
  employee: Employee;
  busy = false;

  loginForm: FormGroup = this.fb.group({
    /**
     * checks for numbers between 0-9
     */
    empId: [
      1007,
      Validators.compose([Validators.required, Validators.pattern('^[0-9]*$')]),
    ],
  });

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private cookieService: CookieService,
    private http: HttpClient,
    private employeeService: EmployeeService,
  ) {
    this.employee = {} as Employee;
  }

  ngOnInit(): void {}

  /**
   * The log in method contains the logic for verifying the empId matches a valid employee
   * from the database. Otherwise an the error message is passed to the error messages property.
   */
  login() {
    if (this.busy || this.loginForm.invalid) return;
    this.busy = true;
    this.errorMessages = [];
    const empId = this.loginForm.controls['empId'].value;

    this.employeeService.findEmployeeById(empId).subscribe({
      next: (res) => {
        this.busy = false;
        if (res) {
          this.employee = res;
          this.cookieService.set(
            'session_user',
            this.employee.empId.toString(),
            1,
          );
          this.cookieService.set(
            'session_name',
            `${this.employee.firstName} ${this.employee.lastName}`,
            1,
          );
          this.router.navigate(['/']);
        } else {
          this.errorMessages = [
            {
              severity: 'error',
              summary: 'Error',
              detail: 'Please enter a valid employeeId to continue.',
            },
          ];
        }
      },
      error: (e) => {
        this.busy = false;
        this.errorMessages = [
          {
            severity: 'error',
            summary: 'Error',
            detail:
              e.error?.err ||
              'The demo is unavailable. Please try again shortly.',
          },
        ];
      },
    });
  }
}
