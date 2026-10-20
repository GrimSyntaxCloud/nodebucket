import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { CookieService } from 'ngx-cookie-service';
import { CdkDragDrop, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { TaskService } from '../../shared/services/task.service';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog/confirm-dialog.component';
import { Employee } from '../../shared/models/employee.interface';
import { Item } from '../../shared/models/item.interface';

@Component({ selector: 'app-home', templateUrl: './home.component.html', styleUrls: ['./home.component.css'] })
export class HomeComponent implements OnInit {
  todo: Item[] = [];
  done: Item[] = [];
  empId: number;
  errorMessage = '';
  taskForm: FormGroup = this.fb.group({
    task: [null, [Validators.required, Validators.minLength(3), Validators.maxLength(35)]]
  });

  constructor(private taskService: TaskService, cookieService: CookieService, private fb: FormBuilder, private dialog: MatDialog) {
    this.empId = Number(cookieService.get('session_user'));
  }
  ngOnInit(): void { this.reload(); }
  private apply(employee: Employee): void {
    this.todo = employee.todo;
    this.done = employee.done;
  }
  private reload(): void {
    this.taskService.findAllTasks(this.empId).subscribe({
      next: employee => this.apply(employee),
      error: error => { this.errorMessage = error.error?.err || 'Could not load the board. Please try again.'; }
    });
  }
  private failed(error: any): void {
    this.errorMessage = error.error?.err || 'Could not save your change. Please try again.';
    this.reload();
  }
  createTask(): void {
    if (this.taskForm.invalid) return;
    this.errorMessage = '';
    this.taskService.createTask(this.empId, this.taskForm.controls['task'].value).subscribe({
      next: employee => { this.apply(employee); this.taskForm.reset(); },
      error: error => this.failed(error)
    });
  }
  deleteTask(taskId: string): void {
    this.dialog.open(ConfirmDialogComponent, {
      data: { header: 'Delete task', content: 'Remove this task from the shared demo board?' }, disableClose: true
    }).afterClosed().subscribe(result => {
      if (result !== 'confirm') return;
      this.errorMessage = '';
      this.taskService.deleteTask(this.empId, taskId).subscribe({
        next: employee => this.apply(employee), error: error => this.failed(error)
      });
    });
  }
  drop(event: CdkDragDrop<Item[]>): void {
    this.errorMessage = '';
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    } else {
      transferArrayItem(event.previousContainer.data, event.container.data, event.previousIndex, event.currentIndex);
    }
    this.taskService.updateTask(this.empId, this.todo, this.done).subscribe({
      next: employee => this.apply(employee), error: error => this.failed(error)
    });
  }
}
