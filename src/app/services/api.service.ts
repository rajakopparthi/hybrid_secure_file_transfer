import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ApiService {

  private apiUrl = `${environment.apiUrl}/files`;

  constructor(private http: HttpClient, private authService: AuthService) { }

  private getHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
  }

  getPublicKey(username: string): Observable<any> {
    return this.http.get(`${environment.apiUrl}/users/${username}/public-key`, { headers: this.getHeaders() });
  }

  uploadFile(file: Blob, filename: string, receiverUsername: string, signature: string): Observable<any> {
    const formData = new FormData();
    formData.append('file', file, filename);
    formData.append('receiverUsername', receiverUsername);
    formData.append('signature', signature);

    return this.http.post(`${this.apiUrl}/upload`, formData, { headers: this.getHeaders() });
  }

  downloadFile(id: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/download/${id}`, {
      headers: this.getHeaders(),
      responseType: 'blob'
    });
  }

  getInbox(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/inbox`, { headers: this.getHeaders() });
  }

  getSentFiles(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/sent`, { headers: this.getHeaders() });
  }

  getUserProfile(): Observable<any> {
    return this.http.get(`${environment.apiUrl}/auth/profile`, { headers: this.getHeaders() });
  }

  verifyPassword(password: string): Observable<any> {
    return this.http.post(`${environment.apiUrl}/auth/verify-password`, { password }, { headers: this.getHeaders() });
  }
}
