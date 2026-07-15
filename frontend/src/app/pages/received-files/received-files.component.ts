import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../services/api.service';
import { ToastService } from '../../services/toast.service';
import { CryptoService } from '../../services/crypto.service';
import { AuthService } from '../../services/auth.service';
import { lastValueFrom } from 'rxjs';

@Component({
  selector: 'app-received-files',
  templateUrl: './received-files.component.html',
  styleUrls: ['./received-files.component.scss']
})
export class ReceivedFilesComponent implements OnInit {
  receivedFiles: any[] = [];
  isLoading = true;
  downloadingFileId: number | null = null;

  // Modal properties
  showEncryptedModal = false;
  encryptedContent = '';
  currentFileName = '';

  viewEncrypted(fileId: number, fileName: string) {
    this.apiService.downloadFile(fileId).subscribe({
      next: (blob: Blob) => {
        const reader = new FileReader();
        reader.onload = () => {
          // Get the first 5000 characters to avoid freezing browser if file is huge
          const text = reader.result as string;
          this.encryptedContent = text.substring(0, 5000) + (text.length > 5000 ? '\n\n... [Content Truncated for Display] ...' : '');
          this.currentFileName = fileName;
          this.showEncryptedModal = true;
        };
        reader.readAsText(blob);
      },
      error: () => this.toastService.show('Failed to fetch encrypted content', 'error')
    });
  }

  closeEncryptedModal() {
    this.showEncryptedModal = false;
    this.encryptedContent = '';
  }

  // Private key modal state
  showPrivateKeyModal = false;
  selectedFileId: number | null = null;
  selectedFileName: string = '';

  constructor(
    private apiService: ApiService,
    private toastService: ToastService,
    private cryptoService: CryptoService,
    private authService: AuthService
  ) { }

  ngOnInit(): void {
    this.loadReceivedFiles();
  }

  loadReceivedFiles() {
    this.isLoading = true;
    // this.toastService.show('Loading received files...', 'info');

    this.apiService.getInbox().subscribe({
      next: (files) => {
        this.receivedFiles = files;
        this.isLoading = false;
        // if (files.length === 0) {
        //   this.toastService.show('No received files found', 'info');
        // } else {
        //   this.toastService.show(`Loaded ${files.length} received file(s)`, 'success');
        // }
      },
      error: (error) => {
        console.error('Failed to load received files', error);
        this.toastService.show('Failed to load received files. Please check your connection.', 'error');
        this.isLoading = false;
      }
    });
  }

  downloadFile(fileId: number, fileName: string) {
    const cachedKey = this.authService.getPrivateKey();
    if (cachedKey) {
      this.selectedFileId = fileId;
      this.selectedFileName = fileName;
      this.processDownload(fileId, cachedKey);
    } else {
      // Show private key modal if key not in local storage
      this.selectedFileId = fileId;
      this.selectedFileName = fileName;
      this.showPrivateKeyModal = true;
    }
  }

  onPrivateKeyProvided(privateKey: string) {
    if (!this.selectedFileId) return;
    this.showPrivateKeyModal = false;
    this.processDownload(this.selectedFileId, privateKey);
  }

  processDownload(fileId: number, privateKey: string) {
    this.downloadingFileId = fileId;
    const fileData = this.receivedFiles.find(f => f.id === fileId);

    if (!fileData) {
      this.toastService.show('Error: File metadata not found.', 'error');
      this.downloadingFileId = null;
      return;
    }

    this.toastService.show('Downloading Encrypted Blob...', 'info');

    this.apiService.downloadFile(fileId).subscribe({
      next: async (encryptedBlob: Blob) => {
        try {
          // 1. Decrypt AES Key (Using Receiver's RSA Private Key)
          this.toastService.show('Decrypting Session Key...', 'info');
          const aesKey = this.cryptoService.decryptAESKey(fileData.encryptedAesKey, privateKey);

          // 2. Decrypt File Content (Using Decrypted AES Key)
          this.toastService.show('Decrypting File Content...', 'info');
          const encryptedBuffer = await this.cryptoService.blobToArrayBuffer(encryptedBlob);
          const decryptedBuffer = this.cryptoService.decryptFile(this.cryptoService.arrayBufferToBinaryString(encryptedBuffer), aesKey);

          // 3. Download
          this.toastService.show('File Decrypted Successfully!', 'success');
          const decryptedBlob = new Blob([decryptedBuffer]);
          this.downloadBlob(decryptedBlob, this.selectedFileName);

        } catch (error: any) {
          console.error('Decryption failed', error);
          this.toastService.show('Decryption/Verification Failed: ' + error.message, 'error');
        } finally {
          this.downloadingFileId = null;
          this.selectedFileId = null;
          this.selectedFileName = '';
        }
      },
      error: (error) => {
        console.error('Download failed', error);
        this.toastService.show('Download failed: ' + error.message, 'error');
        this.downloadingFileId = null;
      }
    });
  }

  onPrivateKeyCancelled() {
    this.showPrivateKeyModal = false;
    this.selectedFileId = null;
    this.selectedFileName = '';
  }

  private downloadBlob(blob: Blob, filename: string) {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  }

  // Manual Decryption Modal State
  showDecryptModal = false;
  manualPrivateKey = '';
  manualAesKey = ''; // The decrypted key shown to user
  inputAesKey = '';  // The key user pastes back in
  decryptedAesKeyResult = '';

  openDecryptModal(file: any) {
    this.selectedFileId = file.id;
    this.selectedFileName = file.fileName;
    // Do NOT auto-fill private key as per user request. User must enter it manually.
    this.manualPrivateKey = '';
    this.decryptedAesKeyResult = '';
    this.inputAesKey = '';
    this.showDecryptModal = true;
  }

  closeDecryptModal() {
    this.showDecryptModal = false;
    this.manualPrivateKey = '';
    this.decryptedAesKeyResult = '';
    this.inputAesKey = '';
  }

  // Processing Modal State
  isProcessing = false;
  isSuccess = false;
  processStatus = '';

  decryptKeyManually() {
    if (!this.selectedFileId || !this.manualPrivateKey) return;

    this.isProcessing = true;
    this.isSuccess = false;
    this.processStatus = 'Decrypting AES Session Key...';

    // Small delay to show processing state
    setTimeout(() => {
      const fileData = this.receivedFiles.find(f => f.id === this.selectedFileId);
      if (!fileData) {
        this.isProcessing = false;
        return;
      }

      try {
        const decryptedBinary = this.cryptoService.decryptAESKey(fileData.encryptedAesKey, this.manualPrivateKey);
        // Convert binary string to Hex for safe display
        this.decryptedAesKeyResult = this.cryptoService.bytesToHex(decryptedBinary);

        this.processStatus = 'Key Unlocked Successfully!';
        this.isSuccess = true;

        setTimeout(() => {
          this.isProcessing = false;
          this.isSuccess = false;
          // Toast removed as per request, result is visible in the modal
        }, 1500);

      } catch (e: any) {
        this.isProcessing = false;
        this.toastService.show('Key Decryption Failed: ' + e.message, 'error');
      }
    }, 1000);
  }

  copyToClipboard(text: string) {
    navigator.clipboard.writeText(text).then(() => {
      // User requested no alert message on copy
      // this.toastService.show('Key copied to clipboard', 'success');
    });
  }

  downloadWithManualKey() {
    if (!this.selectedFileId || !this.inputAesKey) {
      this.toastService.show('Please enter the AES Key first', 'error');
      return;
    }

    this.downloadingFileId = this.selectedFileId;
    this.isProcessing = true;
    this.isSuccess = false;
    this.processStatus = 'Initiating Secure Download...';

    // Close decrypt modal to show processing modal
    this.showDecryptModal = false;

    // Retrieve fileData for signature verification
    const fileData = this.receivedFiles.find(f => f.id === this.selectedFileId)!;

    this.apiService.downloadFile(this.selectedFileId).subscribe({
      next: async (encryptedBlob: Blob) => {
        try {
          // Decrypt File Content (Using MAnual AES Key)
          // Input key is Hex, convert back to binary for decryption
          const trimmedKey = this.inputAesKey.trim();
          console.log('Processing Key:', trimmedKey);

          if (!trimmedKey) {
            throw new Error('AES Key is empty');
          }

          // User Error Detection:
          if (trimmedKey.includes('-----BEGIN')) {
            throw new Error('You pasted your PRIVATE KEY! Please paste the DEC_SESSION_KEY (Hex) from Step 1.');
          }
          if (trimmedKey.length > 100) {
            throw new Error('Key is too long! You likely pasted the encrypted file or private key. Please paste the 64-character Hex Session Key.');
          }
          if (trimmedKey.length !== 64) {
            // Try to be helpful: is it Base64? (44 chars)
            if (trimmedKey.length === 44 && trimmedKey.endsWith('=')) {
              throw new Error('You pasted a Base64 Key. Please use the Hex Key shown in the previous step.');
            }
            throw new Error(`Invalid Key Length: ${trimmedKey.length}. Expected 64 characters (Hex).`);
          }

          const binaryAesKey = this.cryptoService.hexToBytes(trimmedKey);
          console.log('Binary Key Length:', binaryAesKey.length);

          this.processStatus = 'Decrypting File Content...';
          // delay for UI
          await new Promise(r => setTimeout(r, 500));

          const encryptedBuffer = await this.cryptoService.blobToArrayBuffer(encryptedBlob);
          const decryptedBuffer = this.cryptoService.decryptFile(this.cryptoService.arrayBufferToBinaryString(encryptedBuffer), binaryAesKey);

          // Verify Signature
          if (fileData.signature && fileData.signature !== 'UNSIGNED') {
            this.processStatus = 'Verifying Digital Signature...';
            await new Promise(r => setTimeout(r, 500));

            // We need sender public key. Ideally valid, but for now fetch it or if we have it.
            // For simplicity in this manual flow, we fetch it now.
            const senderKeyData = await lastValueFrom(this.apiService.getPublicKey(fileData.senderUsername));
            const isValid = this.cryptoService.verifySignature(decryptedBuffer, fileData.signature, senderKeyData.publicKey);

            if (isValid) {
              // Verified silently or update status
              this.processStatus = 'Signature Verified!';
              await new Promise(r => setTimeout(r, 500));
            } else {
              this.toastService.show('⚠️ Signature Mismatch! The file might have been modified.', 'error');
              console.warn('Signature Verification Failed. Check console logs for hash mismatch.');
              // We continue download but warn user
            }
          }

          // Download
          this.processStatus = 'Download Complete!';
          this.isSuccess = true;

          await new Promise(r => setTimeout(r, 1500)); // Show success tick

          const decryptedBlob = new Blob([decryptedBuffer]);
          this.downloadBlob(decryptedBlob, this.selectedFileName);

          this.isProcessing = false;
          this.isSuccess = false;
          this.closeDecryptModal();

        } catch (error: any) {
          console.error('Decryption failed', error);
          this.toastService.show('Decryption Failed: ' + error.message, 'error');
          this.isProcessing = false;
          this.isSuccess = false;
          // Re-open decrypt modal so they can try again if they want
          this.showDecryptModal = true;
        } finally {
          this.downloadingFileId = null;
        }
      },
      error: (error) => {
        console.error('Download failed', error);
        this.toastService.show('Download failed: ' + error.message, 'error');
        this.downloadingFileId = null;
        this.isProcessing = false;
        this.showDecryptModal = true;
      }
    });
  }

  isDownloading(fileId: number): boolean {
    return this.downloadingFileId === fileId;
  }
}
