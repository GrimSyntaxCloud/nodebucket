import { Component, EventEmitter, Input, Output, ChangeDetectionStrategy } from '@angular/core';

export interface AppMessage {
  severity?: string;
  summary?: string;
  detail?: string;
  closable?: boolean;
}

/** Inline, escaped validation text with the existing dismissal contract. */
@Component({
  selector: 'app-messages',
  standalone: false,
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <div *ngFor="let message of value; let i = index" class="app-message"
      [attr.data-severity]="message.severity || 'info'"
      [attr.role]="message.severity === 'error' ? 'alert' : 'status'">
      <div><strong *ngIf="message.summary">{{ message.summary }}</strong>
      <span *ngIf="message.detail">{{ message.detail }}</span></div>
      <button *ngIf="message.closable !== false" type="button" aria-label="Dismiss message" (click)="dismiss(i)">×</button>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .app-message { display: flex; align-items: center; gap: .75rem; padding: .75rem 1rem; margin: 1rem 0; border: 1px solid #b8d2ed; border-radius: 6px; background: #eff6ff; color: #174c83; font: inherit; overflow-wrap: anywhere; }
    .app-message > div { flex: 1; min-width: 0; }
    [data-severity="error"] { background: #fff0f0; border-color: #edb9b9; color: #922626; }
    [data-severity="warn"] { background: #fff8e8; border-color: #e5cc8a; color: #76520a; }
    [data-severity="success"] { background: #ecf8ee; border-color: #abd3b4; color: #236137; }
    strong { margin-right: .5rem; }
    button { flex: 0 0 44px; width: 44px; height: 44px; border: 0; border-radius: 50%; background: transparent; color: inherit; font-size: 1.5rem; cursor: pointer; }
    button:hover { background: #0000000a; }
    button:focus-visible { outline: 2px solid currentColor; outline-offset: 2px; }
  `]
})
export class AppMessagesComponent {
  @Input() value: AppMessage[] | null | undefined = [];
  @Input() enableService = false;
  @Output() valueChange = new EventEmitter<AppMessage[]>();
  dismiss(index: number): void {
    this.value = (this.value || []).filter((_, i) => i !== index);
    this.valueChange.emit(this.value);
  }
}
