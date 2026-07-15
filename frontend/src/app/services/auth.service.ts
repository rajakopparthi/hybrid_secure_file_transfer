import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap, switchMap } from 'rxjs/operators';

import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private apiUrl = `${environment.apiUrl}/auth`;

  constructor(private http: HttpClient) { }

  register(user: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/register`, user);
  }

  login(credentials: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/login`, credentials).pipe(
      tap((response: any) => {
        if (response && response.token) {
          this.saveToken(response.token);
          this.saveUsername(response.username);
        }
      }),
      switchMap(() => this.http.get(`${this.apiUrl}/profile`, {
        headers: { 'Authorization': `Bearer ${this.getToken()}` }
      })),
      tap((profile: any) => {
        // Backend sends the decrypted key in the 'encryptedPrivateKey' field of the DTO
        // We handle this mismatch here.
        if (profile && profile.encryptedPrivateKey) {
          this.savePrivateKey(profile.encryptedPrivateKey);
        } else if (profile && profile.plaintextPrivateKey) {
          // Fallback in case backend is updated
          this.savePrivateKey(profile.plaintextPrivateKey);
        }
      })
    );
  }

  saveToken(token: string): void {
    localStorage.setItem('token', token);
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  saveUsername(username: string): void {
    localStorage.setItem('username', username);
  }

  getUsername(): string | null {
    return localStorage.getItem('username');
  }

  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
  }

  savePrivateKey(key: string): void {
    localStorage.setItem('privateKey', key);
  }

  getPrivateKey(): string | null {
    return localStorage.getItem('privateKey');
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }
}
