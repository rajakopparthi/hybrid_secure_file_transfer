import { Component, ElementRef, ViewChild, Output, EventEmitter } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-upload-circle',
  templateUrl: './upload-circle.component.html',
  styleUrls: ['./upload-circle.component.scss']
})
export class UploadCircleComponent {
  @ViewChild('fileInput') fileInput!: ElementRef;
  isHovering = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    private toastService: ToastService
  ) { }

  triggerUpload() {
    if (this.authService.isLoggedIn()) {
      this.fileInput.nativeElement.click();
    } else {
      this.toastService.show('Please sign in to upload files', 'info');
      this.router.navigate(['/login']);
    }
  }

  @Output() fileSelected = new EventEmitter<File>();

  onFileSelected(event: any) {
    const files = event.target.files;
    if (files.length > 0) {
      this.fileSelected.emit(files[0]);
    }
  }

  // Optional: Add drag and drop listeners to the container yourself or use a directive.
  // For now, simple click to upload.
}
