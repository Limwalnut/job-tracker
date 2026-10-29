import { Link } from 'react-router';
import BrandLogo from '../../components/BrandLogo/BrandLogo';
import PageMetadata from '../../components/PageMetadata/PageMetadata';
import SiteFooter from '../../components/SiteFooter/SiteFooter';
import styles from './PersonalApiTokenDocsPage.module.scss';

const title = 'Personal API Tokens | Applyline';
const description = 'Create and use personal API tokens to connect trusted scripts to your Applyline applications, events and checklists.';

const routes = [
  ['GET', '/api/auth/me'],
  ['GET', '/api/applications'],
  ['GET', '/api/applications/paged'],
  ['GET', '/api/applications/{id}'],
  ['POST', '/api/applications'],
  ['PUT', '/api/applications/{id}'],
  ['DELETE', '/api/applications/{id}'],
  ['PATCH', '/api/applications/{id}/status'],
  ['GET', '/api/applications/{id}/timeline'],
  ['POST', '/api/applications/{id}/timeline/undo'],
  ['GET', '/api/applications/{applicationId}/events'],
  ['POST', '/api/applications/{applicationId}/events'],
  ['GET', '/api/events'],
  ['GET', '/api/events/{id}'],
  ['PUT', '/api/events/{id}'],
  ['DELETE', '/api/events/{id}'],
  ['GET', '/api/applications/{applicationId}/checklist'],
  ['POST', '/api/applications/{applicationId}/checklist'],
  ['PUT', '/api/checklist/{id}'],
  ['DELETE', '/api/checklist/{id}'],
] as const;

export default function PersonalApiTokenDocsPage() {
  return (
    <div className={styles.page}>
      <PageMetadata canonicalPath="/docs/personal-api-tokens" description={description} title={title} />

      <header className={styles.header}>
        <div className={styles.shell}>
          <Link to="/" aria-label="Applyline home"><BrandLogo tone="dark" /></Link>
          <Link className={styles.homeLink} to="/">Back to home</Link>
        </div>
      </header>

      <main>
        <div className={`${styles.shell} ${styles.intro}`}>
          <p className={styles.eyebrow}>API documentation</p>
          <h1>Personal API tokens</h1>
          <p className={styles.lede}>
            A personal token lets a trusted server-side script or assistant call Applyline as you,
            without sharing your password or browser cookie. It can work with your application,
            event and checklist data through the routes below.
          </p>
        </div>

        <div className={`${styles.shell} ${styles.layout}`}>
          <nav className={styles.contents} aria-label="On this page">
            <span>On this page</span>
            <a href="#create">Create and copy</a>
            <a href="#call">Call the API</a>
            <a href="#allowed">Allowed endpoints</a>
            <a href="#limits">Limits and safety</a>
            <a href="#lifecycle">When access ends</a>
          </nav>

          <article className={styles.article}>
            <section id="create">
              <span className={styles.step}>01 / Set up</span>
              <h2>Create and copy a token</h2>
              <p>
                Open <Link to="/account">Account settings</Link> and choose <strong>Personal API tokens</strong>.
                Select <strong>Create token</strong>, give it a name that identifies the script or assistant,
                and choose an expiry. You can choose <strong>Never expires</strong>, though a shorter expiry
                is safer for temporary work.
              </p>
              <p>
                Copy the secret immediately and store it securely. Applyline shows it only once, when you
                create it. You can see a short prefix in your token list later, but you cannot retrieve
                the full secret again. If it is lost, revoke that token and create another.
              </p>
            </section>

            <section id="call">
              <span className={styles.step}>02 / Make a request</span>
              <h2>Call the API with a bearer token</h2>
              <p>
                Send the token in the <code>Authorization</code> header. This example lists your applications.
                Replace the placeholder with your own secret in a trusted environment.
              </p>
              <pre className={styles.codeBlock}><code>{`curl https://applyline.app/api/applications \\
  -H 'Authorization: Bearer YOUR_PERSONAL_API_TOKEN'`}</code></pre>
              <p>
                Responses and request bodies use the same JSON contracts as the Applyline web app,
                including string-named enum values. The token acts as your account, so requests can
                access only data your account owns.
              </p>
            </section>

            <section id="allowed">
              <span className={styles.step}>03 / Scope</span>
              <h2>Allowed endpoints</h2>
              <p>
                Personal tokens work only on these 20 routes. In a path, <code>{'{id}'}</code> and{' '}
                <code>{'{applicationId}'}</code> stand for the relevant record ID.
              </p>
              <div className={styles.tableScroll}>
                <table>
                  <caption>Routes available to personal API tokens</caption>
                  <thead><tr><th scope="col">Method</th><th scope="col">Path</th></tr></thead>
                  <tbody>{routes.map(([method, path]) => (
                    <tr key={`${method} ${path}`}><td><code>{method}</code></td><td><code>{path}</code></td></tr>
                  ))}</tbody>
                </table>
              </div>
              <div className={styles.tip}>
                <strong>Other routes are refused</strong>
                <span>
                  Tokens cannot manage tokens, change account or password settings, use admin endpoints,
                  or call interview-preparation or development AI endpoints. Any route not listed above
                  is unavailable to personal tokens. Managing tokens requires signing in to the website.
                </span>
              </div>
            </section>

            <section id="limits">
              <span className={styles.step}>04 / Protect access</span>
              <h2>Limits and safety</h2>
              <p>
                By default, an account can have up to 10 active tokens. Each token can make up to 120
                requests per minute; requests over that limit receive HTTP <code>429</code>.
              </p>
              <p>
                Treat the secret like a password. Keep it in a secure server-side environment, not in
                public source code or browser code. Do not paste it into chat messages or logs. If a
                third-party assistant needs access, understand how it stores the secret and what it can
                do with your data. Create a separate token for each integration so you can revoke one
                without interrupting the others.
              </p>
            </section>

            <section id="lifecycle">
              <span className={styles.step}>05 / End access</span>
              <h2>When a token stops working</h2>
              <p>
                Revoke a token from <Link to="/account">Account settings</Link> when you finish using it,
                or if you think its secret has been exposed. A token with an expiry stops working when
                that time arrives. Changing or resetting your account password revokes all your tokens.
                If your account is disabled, its tokens are rejected until the account is re-enabled.
              </p>
            </section>

            <aside className={styles.cta}>
              <div>
                <span>Ready to connect?</span>
                <h2>Create a token for the script you trust.</h2>
                <p>You can manage and revoke your tokens from Account settings at any time.</p>
              </div>
              <Link to="/account">Open Account <span aria-hidden="true">→</span></Link>
            </aside>
          </article>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
