import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../services/api.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-sent-files',
  templateUrl: './sent-files.component.html',
  styleUrls: ['./sent-files.component.scss']
})
export class SentFilesComponent implements OnInit {
  sentFiles: any[] = [];
  isLoading = true;

  constructor(
    private apiService: ApiService,
    private toastService: ToastService
  ) { }

  ngOnInit(): void {
    this.loadSentFiles();
  }

  loadSentFiles() {
    this.isLoading = true;
    // this.toastService.show('Loading sent files...', 'info');

    this.apiService.getSentFiles().subscribe({
      next: (files) => {
        this.sentFiles = files;
        this.isLoading = false;
        // if (files.length === 0) {
        //   this.toastService.show('No sent files found', 'info');
        // } else {
        //   this.toastService.show(`Loaded ${files.length} sent file(s)`, 'success');
        // }
      },
      error: (error) => {
        console.error('Failed to load sent files', error);
        this.toastService.show('Failed to load sent files. Please check your connection.', 'error');
        this.isLoading = false;
      }
    });
  }

  // Modal properties
  showEncryptedModal = false;
  encryptedContent = '';
  currentFileName = '';

  viewEncrypted(fileId: number, fileName: string) {
    this.apiService.downloadFile(fileId).subscribe({
      next: (blob: Blob) => {
        const reader = new FileReader();
        reader.onload = () => {
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

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  }
}
