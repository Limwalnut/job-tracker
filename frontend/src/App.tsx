import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from "react-router";
import ApplicationsPage from "./pages/ApplicationsPage/ApplicationsPage";
import HomePage from "./pages/HomePage/HomePage";
import LoginPage from "./pages/LoginPage/LoginPage";
import RegisterPage from "./pages/RegisterPage/RegisterPage";
import RequireAuth from "./auth/RequireAuth";
import PrivacyPage from "./pages/PrivacyPage/PrivacyPage";
import TermsPage from "./pages/TermsPage/TermsPage";
import PageMetadata from "./components/PageMetadata/PageMetadata";
import ForgotPasswordPage from "./pages/ForgotPasswordPage/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage/ResetPasswordPage";
import AccountPage from "./pages/AccountPage/AccountPage";
import RequireAdmin from './auth/RequireAdmin';

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
      <Route
        path="/login"
        element={<><PageMetadata canonicalPath="/login" description="Sign in to Applyline." noIndex title="Sign in | Applyline" /><LoginPage /></>}
      />
      <Route
        path="/register"
        element={<><PageMetadata canonicalPath="/register" description="Create your Applyline account." noIndex title="Create an account | Applyline" /><RegisterPage /></>}
      />
      <Route
        path="/forgot-password"
        element={<><PageMetadata canonicalPath="/forgot-password" description="Reset your Applyline password." noIndex title="Forgot password | Applyline" /><ForgotPasswordPage /></>}
      />
      <Route
        path="/reset-password"
        element={<><PageMetadata canonicalPath="/reset-password" description="Choose a new Applyline password." noIndex title="Reset password | Applyline" /><ResetPasswordPage /></>}
      />
      <Route
        path="/applications"
        element={
          <>{privatePageMetadata}<RequireAuth><ApplicationsPage /></RequireAuth></>
        }
      />
      <Route
        path="/applications/:applicationId"
        element={
          <>{privatePageMetadata}<RequireAuth><ApplicationsPage /></RequireAuth></>
        }
      />
      <Route
        path="/account"
        element={
          <><PageMetadata canonicalPath="/account" description="Manage your Applyline account." noIndex title="Account settings | Applyline" /><RequireAuth><AccountPage /></RequireAuth></>
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
