import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from "react-router";
import HomePage from "./pages/HomePage/HomePage";
import RequireAuth from "./auth/RequireAuth";
import PrivacyPage from "./pages/PrivacyPage/PrivacyPage";
import TermsPage from "./pages/TermsPage/TermsPage";
import TrackingGuidePage from "./pages/TrackingGuidePage/TrackingGuidePage";
import PageMetadata from "./components/PageMetadata/PageMetadata";
import RequireAdmin from './auth/RequireAdmin';

const ApplicationsPage = lazy(() => import('./pages/ApplicationsPage/ApplicationsPage'));
const LoginPage = lazy(() => import('./pages/LoginPage/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage/RegisterPage'));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage/ResetPasswordPage'));
const AccountPage = lazy(() => import('./pages/AccountPage/AccountPage'));
const AdminPage = lazy(() => import('./pages/AdminPage/AdminPage'));

const privatePageMetadata = (
  <PageMetadata
    canonicalPath="/applications"
    description="Manage your private Applyline workspace."
    noIndex
    title="Your applications | Applyline"
  />
);

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/privacy" element={<PrivacyPage />} />
      <Route path="/terms" element={<TermsPage />} />
      <Route path="/guide/job-application-tracking" element={<TrackingGuidePage />} />
      <Route
        path="/login"
        element={<><PageMetadata canonicalPath="/login" description="Sign in to Applyline." noIndex title="Sign in | Applyline" /><Suspense fallback={null}><LoginPage /></Suspense></>}
      />
      <Route
        path="/register"
        element={<><PageMetadata canonicalPath="/register" description="Create your Applyline account." noIndex title="Create an account | Applyline" /><Suspense fallback={null}><RegisterPage /></Suspense></>}
      />
      <Route
        path="/forgot-password"
        element={<><PageMetadata canonicalPath="/forgot-password" description="Reset your Applyline password." noIndex title="Forgot password | Applyline" /><Suspense fallback={null}><ForgotPasswordPage /></Suspense></>}
      />
      <Route
        path="/reset-password"
        element={<><PageMetadata canonicalPath="/reset-password" description="Choose a new Applyline password." noIndex title="Reset password | Applyline" /><Suspense fallback={null}><ResetPasswordPage /></Suspense></>}
      />
      <Route
        path="/applications"
        element={
          <>{privatePageMetadata}<RequireAuth><Suspense fallback={null}><ApplicationsPage /></Suspense></RequireAuth></>
        }
      />
      <Route
        path="/applications/:applicationId"
        element={
          <>{privatePageMetadata}<RequireAuth><Suspense fallback={null}><ApplicationsPage /></Suspense></RequireAuth></>
        }
      />
      <Route
        path="/account"
        element={
          <><PageMetadata canonicalPath="/account" description="Manage your Applyline account." noIndex title="Account settings | Applyline" /><RequireAuth><Suspense fallback={null}><AccountPage /></Suspense></RequireAuth></>
        }
      />
      <Route
        path="/admin"
        element={
          <>
            <PageMetadata canonicalPath="/admin" description="Manage Applyline operations." noIndex title="Admin | Applyline" />
            <RequireAdmin>
              <Suspense fallback={<p>Loading administration…</p>}><AdminPage /></Suspense>
            </RequireAdmin>
          </>
        }
      />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

export default App;
