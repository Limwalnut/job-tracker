import { Link } from "react-router";

function LoginPage() {
  return (
    <main>
      <h1>Sign In</h1>
      <p>Sign in to manage your job applications.</p>

      <p>
        Do not have an account? <Link to="/register">Create one</Link>
      </p>

      <Link to="/">Back to Home</Link>
    </main>
  );
}

export default LoginPage;
