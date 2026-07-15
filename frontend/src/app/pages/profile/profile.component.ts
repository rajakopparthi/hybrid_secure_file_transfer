import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { ApiService } from '../../services/api.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss']
})
export class ProfileComponent implements OnInit {
  username: string = '';
  email: string = '';
  publicKey: string = '';
  privateKey: string = '';
  showPrivateKey: boolean = false;
  isLoading: boolean = true;

  constructor(
    private authService: AuthService,
    private apiService: ApiService,
    private toastService: ToastService
  ) { }

  ngOnInit(): void {
    this.loadUserProfile();
  }

  loadUserProfile() {
    this.isLoading = true;
    // Get username from auth service
    this.username = this.authService.getUsername() || '';

    // Fetch real user profile from API
    this.apiService.getUserProfile().subscribe({
      next: (profile) => {
        this.username = profile.username;
        this.email = profile.email;
        this.publicKey = profile.publicKey;
        this.privateKey = profile.encryptedPrivateKey;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Failed to load profile', error);
        this.toastService.show('Failed to load profile data', 'error');
        this.isLoading = false;
      }
    });
  }

  copyToClipboard(text: string, label: string) {
    navigator.clipboard.writeText(text).then(() => {
      this.toastService.show(`${label} copied to clipboard!`, 'success');
    }).catch(() => {
      this.toastService.show('Failed to copy to clipboard', 'error');
    });
  }

  downloadPrivateKey() {
    this.pendingAction = 'download';
    this.showPasswordModal = true;
  }

  togglePrivateKeyVisibility() {
    if (this.showPrivateKey) {
      this.showPrivateKey = false;
    } else {
      this.pendingAction = 'show';
      this.showPasswordModal = true;
    }
  }

  // Password Modal Logic
  showPasswordModal: boolean = false;
  passwordInput: string = '';
  pendingAction: 'show' | 'download' | 'copy' | null = null;
  verifyLoading: boolean = false;

  closePasswordModal() {
    this.showPasswordModal = false;
    this.passwordInput = '';
    this.pendingAction = null;
  }

  copyPrivateKey() {
    this.pendingAction = 'copy';
    this.showPasswordModal = true;
  }

  verifyPassword() {
    if (!this.passwordInput) return;

    this.verifyLoading = true;
    this.apiService.verifyPassword(this.passwordInput).subscribe({
      next: () => {
        this.verifyLoading = false;
        // Removed intermediate toast to avoid double alerts


        if (this.pendingAction === 'show') {
          this.showPrivateKey = true;
        } else if (this.pendingAction === 'download') {
          this.performDownload();
        } else if (this.pendingAction === 'copy') {
          this.performCopyPrivateKey();
        }

        this.closePasswordModal();
      },
      error: (error) => {
        this.verifyLoading = false;
        // console.error('Verification error:', error); // debugging
        const msg = error.error?.message || 'Invalid credentials';
        this.toastService.show(msg, 'error');
      }
    });
  }

  performCopyPrivateKey() {
    navigator.clipboard.writeText(this.privateKey).then(() => {
      this.toastService.show('Private key copied to clipboard!', 'success');
    }).catch(() => {
      this.toastService.show('Failed to copy private key', 'error');
    });
  }

  performDownload() {
    const blob = new Blob([this.privateKey], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${this.username}_private_key.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    this.toastService.show('Private key downloaded!', 'success');
  }
}
