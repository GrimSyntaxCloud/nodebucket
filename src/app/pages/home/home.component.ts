import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  FormGroupDirective,
  Validators,
} from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { CookieService } from 'ngx-cookie-service';
import {
  CdkDragDrop,
  moveItemInArray,
  transferArrayItem,
} from '@angular/cdk/drag-drop';
import { TaskService } from '../../shared/services/task.service';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog/confirm-dialog.component';
import { Employee } from '../../shared/models/employee.interface';
import { Item } from '../../shared/models/item.interface';

@Component({
  standalone: false,
  selector: 'app-home',
  templateUrl: './home.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./home.component.css'],
})
export class HomeComponent implements OnInit {
  todo: Item[] = [];
  done: Item[] = [];
  empId: number;
  errorMessage = '';
  busy = true;
  statusMessage = '';
  get completion(): number {
    const total = this.todo.length + this.done.length;
    return total ? Math.round((this.done.length / total) * 100) : 0;
  }
  trackTask(_index: number, item: Item): string {
    return item._id;
  }
  moveTask(item: Item, completed: boolean): void {
    const source = completed ? this.todo : this.done;
    const target = completed ? this.done : this.todo;
    const index = source.findIndex((task) => task._id === item._id);
    if (index < 0 || this.busy) return;
    this.drop({
      previousContainer: { data: source },
      container: { data: target },
      previousIndex: index,
      currentIndex: target.length,
    } as CdkDragDrop<Item[]>);
  }
  private version = 0;
  taskForm: FormGroup = this.fb.group({
    task: [
      null,
      [Validators.required, Validators.minLength(3), Validators.maxLength(35)],
    ],
  });

  constructor(
    private taskService: TaskService,
    cookieService: CookieService,
    private fb: FormBuilder,
    private dialog: MatDialog,
  ) {
    this.empId = Number(cookieService.get('session_user'));
  }
  ngOnInit(): void {
    this.reload();
  }
  private apply(employee: Employee): void {
    this.version = employee.__v;
    this.todo = employee.todo;
    this.done = employee.done;
    this.busy = false;
  }
  private reload(): void {
    this.busy = true;
    this.taskService.findAllTasks(this.empId).subscribe({
      next: (employee) => this.apply(employee),
      error: (error) => {
        this.busy = false;
        this.errorMessage =
          error.error?.err || 'Could not load the board. Please try again.';
      },
    });
  }
  private failed(error: any): void {
    this.errorMessage =
      error.error?.err || 'Could not save your change. Please try again.';
    this.reload();
  }
  createTask(form?: FormGroupDirective): void {
    if (this.busy || this.taskForm.invalid) return;
    this.busy = true;
    this.errorMessage = '';
    this.taskService
      .createTask(this.empId, this.taskForm.controls['task'].value)
      .subscribe({
        next: (employee) => {
          this.apply(employee);
          this.statusMessage = 'Task added to Todo.';
          if (form) form.resetForm();
          else this.taskForm.reset();
        },
        error: (error) => this.failed(error),
      });
  }
  deleteTask(taskId: string): void {
    if (this.busy) return;
    this.busy = true;
    this.dialog
      .open(ConfirmDialogComponent, {
        data: {
          header: 'Delete task',
          content: 'Remove this task from the shared demo board?',
        },
        disableClose: true,
      })
      .afterClosed()
      .subscribe((result) => {
        if (result !== 'confirm') {
          this.busy = false;
          return;
        }
        this.errorMessage = '';
        this.taskService.deleteTask(this.empId, taskId).subscribe({
          next: (employee) => {
            this.apply(employee);
            this.statusMessage = 'Task deleted.';
          },
          error: (error) => this.failed(error),
        });
      });
  }
  drop(event: CdkDragDrop<Item[]>): void {
    if (this.busy) return;
    this.busy = true;
    this.errorMessage = '';
    if (event.previousContainer === event.container) {
      moveItemInArray(
        event.container.data,
        event.previousIndex,
        event.currentIndex,
      );
    } else {
      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        event.currentIndex,
      );
    }
    this.taskService
      .updateTask(this.empId, this.todo, this.done, this.version)
      .subscribe({
        next: (employee) => {
          this.apply(employee);
          this.statusMessage = 'Board updated.';
        },
        error: (error) => this.failed(error),
      });
  }
}
