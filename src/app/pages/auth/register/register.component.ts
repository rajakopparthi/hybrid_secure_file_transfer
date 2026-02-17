import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../../../services/auth.service';
import { Router } from '@angular/router';
import { ToastService } from '../../../services/toast.service';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss']
})
export class RegisterComponent implements OnInit {
  registerForm!: FormGroup;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private toastService: ToastService
  ) { }

  ngOnInit(): void {
    this.registerForm = this.fb.group({
      username: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required]
    }, { validators: this.passwordMatchValidator });
  }

  passwordMatchValidator(form: FormGroup) {
    const password = form.get('password');
    const confirmPassword = form.get('confirmPassword');
    return password && confirmPassword && password.value === confirmPassword.value ? null : { mismatch: true };
  }

  onSubmit() {
    if (this.registerForm.valid) {
      const { confirmPassword, ...registerData } = this.registerForm.value;
      this.authService.register(registerData).subscribe({
        next: (response) => {
          // Handle success - backend might return string or JSON
          let successMessage = 'Registration successful! Please login.';

          if (typeof response === 'string') {
            try {
              const parsed = JSON.parse(response);
              successMessage = parsed.message || successMessage;
            } catch {
              // If it's just a plain string, use it
              if (response.includes('success')) {
                successMessage = 'Registration successful! Please login.';
              }
            }
          } else if (response && response.message) {
            successMessage = response.message;
          }

          this.toastService.show(successMessage, 'success');
          this.router.navigate(['/login']);
        },
        error: (error) => {
          console.error('Registration failed', error);
          let errorMessage = 'Registration failed. Please try again.';

          if (error.error) {
            if (typeof error.error === 'string') {
              try {
                const parsed = JSON.parse(error.error);
                errorMessage = parsed.message || errorMessage;
              } catch {
                errorMessage = error.error;
              }
            } else if (error.error.message) {
              errorMessage = error.error.message;
            }
          } else if (error.message) {
            errorMessage = error.message;
          }

          this.toastService.show(errorMessage, 'error');
        }
      });
    } else {
      this.registerForm.markAllAsTouched();
      this.toastService.show('Please fix the errors in the form', 'info');
    }
  }
}
