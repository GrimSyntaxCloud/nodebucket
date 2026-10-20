import { TestBed } from '@angular/core/testing';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AppModule } from './app.module';
import { AppMessagesComponent } from './shared/app-messages.component';
import { LoginComponent } from './pages/login/login.component';

// Compile the real NgModule and Material/PrimeNG templates, not just component classes.
describe('Angular framework migration', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppModule],
      providers: [provideHttpClientTesting()]
    }).compileComponents();
  });

  it('renders the existing login form with Material inputs and buttons', () => {
    const fixture = TestBed.createComponent(LoginComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('input')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('button[type="submit"]')).not.toBeNull();
  });

  it('renders validation text safely and preserves message dismissal', () => {
    const fixture = TestBed.createComponent(AppMessagesComponent);
    fixture.componentInstance.value = [{ severity: 'error', summary: 'Unable to save', detail: '<img src=x onerror=alert(1)>' }];
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Unable to save');
    expect(fixture.nativeElement.textContent).toContain('<img src=x onerror=alert(1)>');
    expect(fixture.nativeElement.querySelector('img')).toBeNull();
    let remaining: unknown;
    fixture.componentInstance.valueChange.subscribe(value => remaining = value);
    fixture.nativeElement.querySelector('button').click();
    fixture.detectChanges();
    expect(remaining).toEqual([]);
    expect(fixture.nativeElement.querySelector('p-message')).toBeNull();
  });
});
