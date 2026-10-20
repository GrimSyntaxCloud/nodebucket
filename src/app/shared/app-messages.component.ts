import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ToastMessageOptions } from 'primeng/api';

/** Keeps the existing inline validation messages on PrimeNG's supported Message API. */
@Component({
  selector: 'app-messages',
  standalone: false,
  template: `
    <p-message *ngFor="let message of value; let i = index"
      [severity]="severity(message.severity)" [closable]="message.closable !== false"
      (onClose)="dismiss(i)">
      <strong *ngIf="message.summary">{{ message.summary }}</strong>
      <span *ngIf="message.detail">{{ message.detail }}</span>
    </p-message>
  `,
  styles: [':host { display: block; } p-message { display: block; margin: 1rem 0; } strong { margin-right: .5rem; }']
})
export class AppMessagesComponent {
  @Input() value: ToastMessageOptions[] | null | undefined = [];
  @Input() enableService = false;
  @Output() valueChange = new EventEmitter<ToastMessageOptions[]>();

  severity(value?: string): 'success' | 'info' | 'warn' | 'error' | 'secondary' | 'contrast' {
    switch (value) {
      case 'success': case 'warn': case 'error': case 'secondary': case 'contrast': return value;
      default: return 'info';
    }
  }

  dismiss(index: number): void {
    this.value = (this.value || []).filter((_, i) => i !== index);
    this.valueChange.emit(this.value);
  }
}
