import { Injectable } from '@angular/core';
import {
    HttpRequest,
    HttpHandler,
    HttpEvent,
    HttpInterceptor,
    HttpErrorResponse
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from './services/auth.service';
import { Router } from '@angular/router';
import { ToastService } from './services/toast.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {

    constructor(
        private authService: AuthService,
        private router: Router,
        private toastService: ToastService
    ) { }

    intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
        return next.handle(request).pipe(
            catchError((error: HttpErrorResponse) => {
                if (error.status === 403 || error.status === 401) {
                    // Check if we are already on login page to avoid loops
                    if (!this.router.url.includes('/login')) {
                        this.toastService.show('Session expired. Please login again.', 'error');
                        this.authService.logout();
                        this.router.navigate(['/login']);
                    }
                }
                return throwError(() => error);
            })
        );
    }
}
