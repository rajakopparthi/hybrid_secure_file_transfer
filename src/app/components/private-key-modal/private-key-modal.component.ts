import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-private-key-modal',
  templateUrl: './private-key-modal.component.html',
  styleUrls: ['./private-key-modal.component.scss']
})
export class PrivateKeyModalComponent {
  @Input() fileName: string = '';
  @Input() isVisible: boolean = false;
  @Output() decrypt = new EventEmitter<string>();
  @Output() cancel = new EventEmitter<void>();

  privateKey: string = '';
  showKey: boolean = false;

  onDecrypt() {
    if (this.privateKey.trim()) {
      this.decrypt.emit(this.privateKey.trim());
      this.privateKey = '';
    }
  }

  onCancel() {
    this.cancel.emit();
    this.privateKey = '';
  }

  toggleKeyVisibility() {
    this.showKey = !this.showKey;
  }
}
