import { vi } from 'vitest';
import { FormBuilder } from '@angular/forms';
import { of, Subject } from 'rxjs';
import { HomeComponent } from './home.component';
import { Employee } from '../../shared/models/employee.interface';

describe('Shared task board requests', () => {
  const board: Employee = { __v: 7, empId: 1007, firstName: 'Demo', lastName: 'Visitor', todo: [{ _id: '000000000000000000000001', text: 'Sample task' }], done: [] };
  it('blocks duplicate submissions until the first save completes', () => {
    const save = new Subject<Employee>();
    const tasks = { findAllTasks: () => of(structuredClone(board)), createTask: vi.fn().mockReturnValue(save) };
    const component = new HomeComponent(tasks as any, { get: () => '1007' } as any, new FormBuilder(), {} as any);
    component.ngOnInit();
    component.taskForm.setValue({ task: 'New task' });
    const form = { resetForm: vi.fn() };
    component.createTask(form as any); component.createTask(form as any);
    expect(tasks.createTask).toHaveBeenCalledTimes(1);
    expect(component.busy).toBe(true);
    save.next({ ...board, __v: 8 });
    expect(component.busy).toBe(false);
    expect(form.resetForm).toHaveBeenCalledTimes(1);
  });
  it('submits the version that was loaded with the board when moving a task', () => {
    const tasks = { findAllTasks: () => of(structuredClone(board)), updateTask: vi.fn().mockReturnValue(of({ ...board, __v: 8, todo: [], done: board.todo })) };
    const component = new HomeComponent(tasks as any, { get: () => '1007' } as any, new FormBuilder(), {} as any);
    component.ngOnInit();
    component.drop({ previousContainer: { data: component.todo }, container: { data: component.done }, previousIndex: 0, currentIndex: 0 } as any);
    expect(tasks.updateTask).toHaveBeenCalledWith(1007, [], board.todo, 7);
    expect(component.done).toEqual(board.todo);
  });
});
