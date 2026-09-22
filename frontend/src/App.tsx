import { Navigate, Route, Routes } from "react-router";
import ApplicationsPage from "./pages/ApplicationsPage/ApplicationsPage";
import HomePage from "./pages/HomePage/HomePage";
import LoginPage from "./pages/LoginPage/LoginPage";
import RegisterPage from "./pages/RegisterPage/RegisterPage";
import RequireAuth from "./auth/RequireAuth";
import PrivacyPage from "./pages/PrivacyPage/PrivacyPage";
import TermsPage from "./pages/TermsPage/TermsPage";
import PageMetadata from "./components/PageMetadata/PageMetadata";

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
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

export default App;
