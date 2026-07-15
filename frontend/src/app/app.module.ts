import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { NavbarComponent } from './layout/navbar/navbar.component';
import { HomeComponent } from './pages/home/home.component';
import { ReceiveComponent } from './pages/receive/receive.component';
import { UploadCircleComponent } from './components/upload-circle/upload-circle.component';
import { SecurityStatusComponent } from './components/security-status/security-status.component';
import { LoginComponent } from './pages/auth/login/login.component';
import { RegisterComponent } from './pages/auth/register/register.component';
import { ToastComponent } from './components/toast/toast.component';
import { SentFilesComponent } from './pages/sent-files/sent-files.component';
import { ReceivedFilesComponent } from './pages/received-files/received-files.component';
import { UploadModalComponent } from './components/upload-modal/upload-modal.component';
import { PrivateKeyModalComponent } from './components/private-key-modal/private-key-modal.component';
import { ProfileComponent } from './pages/profile/profile.component';
import { AuthInterceptor } from './auth.interceptor';

@NgModule({
  declarations: [
    AppComponent,
    NavbarComponent,
    HomeComponent,
    ReceiveComponent,
    UploadCircleComponent,
    SecurityStatusComponent,
    LoginComponent,
    RegisterComponent,
    ToastComponent,
    SentFilesComponent,
    ReceivedFilesComponent,
    UploadModalComponent,
    PrivateKeyModalComponent,
    ProfileComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    ReactiveFormsModule,
    FormsModule,
    HttpClientModule
  ],
  providers: [
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
