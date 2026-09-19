import { Navigate, Route, Routes } from "react-router";
import ApplicationsPage from "./pages/ApplicationsPage/ApplicationsPage";
import HomePage from "./pages/HomePage/HomePage";
import LoginPage from "./pages/LoginPage/LoginPage";
import RegisterPage from "./pages/RegisterPage/RegisterPage";
import RequireAuth from "./auth/RequireAuth";

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route
        path="/applications"
        element={
          <RequireAuth>
            <ApplicationsPage />
          </RequireAuth>
        }
      />
      <Route
        path="/applications/:applicationId"
        element={
          <RequireAuth>
            <ApplicationsPage />
          </RequireAuth>
        }
      />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

export default App;
