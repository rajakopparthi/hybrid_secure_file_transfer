import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-upload-modal',
  templateUrl: './upload-modal.component.html',
  styleUrls: ['./upload-modal.component.scss']
})
export class UploadModalComponent {
  @Input() fileName: string = '';
  @Input() isVisible: boolean = false;
  @Output() upload = new EventEmitter<string>();
  @Output() cancel = new EventEmitter<void>();

  receiverUsername: string = '';

  onUpload() {
    if (this.receiverUsername.trim()) {
      this.upload.emit(this.receiverUsername.trim());
      this.receiverUsername = '';
    }
  }

  onCancel() {
    this.cancel.emit();
    this.receiverUsername = '';
  }
}
