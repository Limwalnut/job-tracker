import LegalPage from '../../components/LegalPage/LegalPage';

export default function PrivacyPage() {
  return (
    <LegalPage
      canonicalPath="/privacy"
      description="Learn how Applyline collects, uses and protects account and job-search information."
      eyebrow="Your information"
      introduction="This policy explains what information Applyline collects, why we use it and the choices available to you."
      lastUpdated="22 September 2026"
      title="Privacy Policy"
    >
      <section>
        <h2>1. About this policy</h2>
        <p>
          Applyline is a job-application tracking service that helps people organise
          opportunities, interviews, notes and next steps. This policy applies when
          you visit applyline.app, create an account or use the Applyline service.
        </p>
      </section>

      <section>
        <h2>2. Information we collect</h2>
        <h3>Account information</h3>
        <p>
          We collect your email address and the information needed to authenticate
          your account. Passwords are processed using ASP.NET Core Identity and
          stored as cryptographic hashes rather than readable plain text.
        </p>
        <p>
          If you choose Google sign-in, we receive the basic profile information
          needed to authenticate you, such as your Google account identifier and
          verified email address. We do not request access to Gmail, Google Drive,
          contacts or calendar data for sign-in.
        </p>

        <h3>Job-search information</h3>
        <p>
          You may provide company names, job titles, application dates, status
          history, job descriptions, notes, contacts, links and scheduled events.
          This information is private to your account unless you choose to share it.
        </p>

        <h3>Technical and usage information</h3>
        <p>
          Our infrastructure providers may process request information such as IP
          address, browser type, timestamps, requested URLs and diagnostic logs.
          Cloudflare Web Analytics provides aggregated, cookie-free website usage
          and performance information.
        </p>
      </section>

      <section>
        <h2>3. How we use information</h2>
        <ul>
          <li>Provide, operate and maintain your Applyline account.</li>
          <li>Save and display the applications and events you create.</li>
          <li>Authenticate users and protect the service from misuse.</li>
          <li>Respond to support, privacy and account requests.</li>
          <li>Diagnose faults and improve performance and usability.</li>
          <li>Meet legal obligations and enforce our Terms of Service.</li>
        </ul>
        <p>
          We do not sell your personal information or use your job-search content
          for targeted advertising.
        </p>
      </section>

      <section>
        <h2>4. Cookies and authentication</h2>
        <p>
          Applyline uses a secure, HTTP-only authentication cookie to keep you
          signed in. A session cookie expires when the browser session ends. If you
          select “Remember me”, the authentication cookie can remain valid for up
          to seven days and may be renewed while you actively use the service.
        </p>
        <p>
          Cloudflare may use essential security technologies to protect and deliver
          the website. Cloudflare Web Analytics does not use cookies to identify
          visitors.
        </p>
      </section>

      <section>
        <h2>5. Service providers</h2>
        <p>
          We use service providers to run Applyline, including Render for application
          hosting and managed PostgreSQL, Cloudflare for DNS, security, delivery and
          analytics, and Google when you choose Google sign-in. These providers
          process information only as needed to provide their services and under
          their own contractual and security obligations.
        </p>
      </section>

      <section>
        <h2>6. Retention and deletion</h2>
        <p>
          We retain account and job-search information while your account remains
          active and as needed to operate the service, resolve disputes, prevent
          abuse and meet legal obligations. You may request account deletion by
          emailing <a href="mailto:support@applyline.app">support@applyline.app</a>.
          We may retain limited backup or security records for a reasonable period
          after deletion.
        </p>
      </section>

      <section>
        <h2>7. Security</h2>
        <p>
          We use access controls, encrypted network connections, managed database
          infrastructure and secure authentication practices designed to protect
          your information. No internet service can guarantee absolute security, so
          you should use a strong, unique password and protect access to your email
          account.
        </p>
      </section>

      <section>
        <h2>8. Your choices and rights</h2>
        <p>
          You can review and update job-search information from your account. You
          may also ask us to provide access to, correct or delete personal
          information associated with your account. Contact us and we will respond
          according to applicable law after verifying your request.
        </p>
      </section>

      <section>
        <h2>9. International processing</h2>
        <p>
          Applyline and its service providers may process information in countries
          other than your own. Those countries may have different data-protection
          laws. We use reputable service providers and safeguards appropriate to
          the nature of the information processed.
        </p>
      </section>

      <section>
        <h2>10. Children</h2>
        <p>
          Applyline is not directed to children under 16, and we do not knowingly
          collect personal information from children under 16. Contact us if you
          believe a child has provided information to the service.
        </p>
      </section>

      <section>
        <h2>11. Changes and contact</h2>
        <p>
          We may update this policy as the service changes. We will publish the
          current version here and update the date above. Questions or privacy
          requests can be sent to{' '}
          <a href="mailto:support@applyline.app">support@applyline.app</a>.
        </p>
      </section>
    </LegalPage>
  );
}
