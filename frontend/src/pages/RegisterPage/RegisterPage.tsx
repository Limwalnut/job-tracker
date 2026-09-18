import { Link } from 'react-router';

function RegisterPage() {
  return (
    <main>
      <h1>Create Account</h1>
      <p>Create an account to start tracking your applications.</p>

      <p>
        Already have an account? <Link to="/login">Sign in</Link>
      </p>

      <Link to="/">Back to Home</Link>
    </main>
  );
}

export default RegisterPage;