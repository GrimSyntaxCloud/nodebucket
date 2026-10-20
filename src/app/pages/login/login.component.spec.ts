import { FormBuilder } from '@angular/forms';
import { of, throwError } from 'rxjs';
import { LoginComponent } from './login.component';

describe('Opening the shared demo', () => {
  it('stores the demo display identity after the API accepts the ID', () => {
    const router = { navigate: jasmine.createSpy('navigate') };
    const cookies = { set: jasmine.createSpy('set') };
    const employees = { findEmployeeById: jasmine.createSpy('find').and.returnValue(of({ empId: 1007, firstName: 'Demo', lastName: 'Visitor' })) };
    const component = new LoginComponent(new FormBuilder(), router as any, cookies as any, {} as any, employees as any);
    component.login();
    expect(employees.findEmployeeById).toHaveBeenCalledWith(1007);
    expect(cookies.set).toHaveBeenCalledWith('session_user', '1007', 1);
    expect(router.navigate).toHaveBeenCalledWith(['/']);
  });
  it('shows an API failure without opening the board', () => {
    const router = { navigate: jasmine.createSpy('navigate') };
    const employees = { findEmployeeById: () => throwError(() => ({ error: { err: 'Please try again.' } })) };
    const component = new LoginComponent(new FormBuilder(), router as any, {} as any, {} as any, employees as any);
    component.login();
    expect(component.errorMessages[0].detail).toBe('Please try again.');
    expect(router.navigate).not.toHaveBeenCalled();
  });
});
