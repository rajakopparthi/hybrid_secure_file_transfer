import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-receive',
  templateUrl: './receive.component.html',
  styleUrls: ['./receive.component.scss']
})
export class ReceiveComponent implements OnInit {
  decryptForm!: FormGroup;
  isProcessing = false;

  constructor(
    private fb: FormBuilder,
    private apiService: ApiService,
    private toastService: ToastService
  ) { }

  ngOnInit(): void {
    this.decryptForm = this.fb.group({
      code: ['', Validators.required],
      password: [''] // Optional for now as per backend logic
    });
  }

  onSubmit() {
    if (this.decryptForm.valid) {
      this.isProcessing = true;
      const fileId = this.decryptForm.get('code')?.value;

      this.toastService.show('Initiating secure handshake...', 'info');

      const privateKey = this.decryptForm.get('password')?.value || '';

      this.apiService.downloadFile(fileId).subscribe({
        next: (blob: Blob) => {
          this.toastService.show('Downloading Encrypted File...', 'info');

          setTimeout(() => {
            this.toastService.show('File downloaded (Encrypted). Decryption requires using "Received Files" page.', 'info');
            this.downloadBlob(blob, `encrypted_file_${fileId}`);
            this.isProcessing = false;
          }, 1000);
        },
        error: (error) => {
          console.error('Download failed', error);
          this.toastService.show('Download failed. File not found or access denied.', 'error');
          this.isProcessing = false;
        }
      });
    } else {
      this.decryptForm.markAllAsTouched();
    }
  }

  private downloadBlob(blob: Blob, filename: string) {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename; // Ideally get real filename from headers
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }
}
