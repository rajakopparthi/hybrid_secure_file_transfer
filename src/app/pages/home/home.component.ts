import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import { ApiService } from '../../services/api.service';
import { CryptoService } from '../../services/crypto.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent {
  showUploadModal = false;
  selectedFile: File | null = null;
  selectedFileName = '';

  isUploading = false;
  isSuccess = false;
  uploadStatus = '';

  constructor(
    private authService: AuthService,
    private router: Router,
    private toastService: ToastService,
    private apiService: ApiService,
    private cryptoService: CryptoService
  ) { }

  onFileSelected(file: File) {
    if (!this.authService.isLoggedIn()) {
      this.toastService.show('Please sign in to upload files', 'info');
      this.router.navigate(['/login']);
      return;
    }

    // Show modal with file info
    this.selectedFile = file;
    this.selectedFileName = file.name;
    this.showUploadModal = true;
    this.isSuccess = false; // Reset state
  }

  onUploadConfirmed(receiverUsername: string) {
    if (!this.selectedFile) return;

    this.isUploading = true;
    this.isSuccess = false;
    this.uploadStatus = 'Initiating Secure Transfer...';
    // Close the input modal so we can show the progress modal
    this.showUploadModal = false;

    const receiver = receiverUsername;

    // 1. Fetch Receiver Public Key
    this.apiService.getPublicKey(receiver).subscribe({
      next: async (data: any) => {
        const receiverPublicKey = data.publicKey;

        try {
          // 2. Read File for Signing (Client-Side)
          const fileBuffer = await this.cryptoService.blobToArrayBuffer(this.selectedFile!);

          // 3. Digital Signature (Client-Side Authenticity)
          this.uploadStatus = 'Signing Data (Digital Signature)...';
          await new Promise(r => setTimeout(r, 300));

          const senderPrivateKey = this.authService.getPrivateKey();
          if (!senderPrivateKey) throw new Error("Private Key not found. Please re-login.");
          const signature = this.cryptoService.signData(fileBuffer, senderPrivateKey);

          // 4. Upload Plaintext File (For Server-Side Scanning & Encryption)
          this.uploadStatus = 'Uploading File for Secure Scanning...';
          this.apiService.uploadFile(this.selectedFile!, this.selectedFile!.name, receiver, signature)
            .subscribe({
              next: (response) => {
                this.uploadStatus = 'File Scanned & Encrypted Successfully!';
                this.isSuccess = true; // Trigger success state

                // Keep success message for a bit before closing
                setTimeout(() => {
                  this.isUploading = false;
                  this.isSuccess = false;
                  this.selectedFile = null;
                }, 2000);
              },
              error: (error) => {
                console.error('Upload failed', error);
                const errorMessage = error.error?.message || error.message;

                if (errorMessage && (errorMessage.includes('Malware') || errorMessage.includes('Security Alert'))) {
                  this.toastService.show('⚠️ DANGER: Malicious File Detected! Upload Blocked.', 'error');
                } else {
                  this.toastService.show('Upload failed: ' + errorMessage, 'error');
                }

                this.isUploading = false;
                this.selectedFile = null;
              }
            });

        } catch (e: any) {
          console.error(e);
          this.toastService.show('Encryption Error: ' + e.message, 'error');
          this.isUploading = false;
        }
      },
      error: (err) => {
        this.toastService.show('Receiver not found or invalid.', 'error');
        this.isUploading = false;
      }
    });
  }

  onUploadCancelled() {
    this.showUploadModal = false;
    this.selectedFile = null;
    this.selectedFileName = '';
  }

  handleToggle(route: string) {
    if (this.authService.isLoggedIn()) {
      this.router.navigate([route]);
    } else {
      this.toastService.show('Please sign in to access this feature', 'info');
      this.router.navigate(['/login']);
    }
  }
}
