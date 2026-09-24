import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router';
import { AuthProvider } from './auth/AuthContext';
import App from './App';

export function render(path: string) {
  return renderToString(
    <StaticRouter location={path}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </StaticRouter>,
  );
}
