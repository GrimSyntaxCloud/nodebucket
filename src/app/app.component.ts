/*
============================================
 Title: app.component.ts
 Author: Andres Macias
 Date:   01/15/23
 Description: contains the app component class that will be used to create the app component
===========================================
*/

import { Component, ChangeDetectionStrategy } from '@angular/core';

@Component({
  standalone: false,
  selector: 'app-root',
  templateUrl: './app.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./app.component.css']
})
export class AppComponent {

}
