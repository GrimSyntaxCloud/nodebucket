/*
============================================
 Title: confirm-dialog.component.ts
 Author: Andres Macias
 Date:   02/05/23
 Description: contains the confirm dialog component class that will be used to create the confirm dialog component
===========================================
*/

/**
 * imports the component, inject, and oninit from the angular core
 * imports the MatDialog and mat_dialog_data from the angular material dialog
 * imports the dialog data interface from the dialog-data.interface.ts file
 */
import { Component, Inject, OnInit } from '@angular/core';
import { MatDialog, MAT_DIALOG_DATA } from '@angular/material/dialog';
import {DialogData} from '../models/dialog-data.interface';


@Component({
  standalone: false,
  selector: 'app-confirm-dialog',
  templateUrl: './confirm-dialog.component.html',
  styleUrls: ['./confirm-dialog.component.css']
})

/**
 * Description: This is the confirm dialog component class that will be used to create the confirm dialog component.
 * dialogData: This is the dialog data that will be used to create the dialog data.
 * constructor: This is the constructor that will be used to create the confirm dialog component.
 * data: This is the data that will be used to create the dialog data.
 */
export class ConfirmDialogComponent implements OnInit {

  dialogData: DialogData;

  constructor(@Inject(MAT_DIALOG_DATA) public data: DialogData) {
    this.dialogData = data;
    console.log(this.dialogData);

   }

  ngOnInit(): void {
  }

}
