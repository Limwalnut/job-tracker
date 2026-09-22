import LegalPage from '../../components/LegalPage/LegalPage';

export default function TermsPage() {
  return (
    <LegalPage
      canonicalPath="/terms"
      description="Read the terms that apply when you create an account or use Applyline."
      eyebrow="Using Applyline"
      introduction="These terms describe the rules for using Applyline and the responsibilities shared between you and the service."
      lastUpdated="22 September 2026"
      title="Terms of Service"
    >
      <section>
        <h2>1. Agreement to these terms</h2>
        <p>
          These Terms of Service apply when you access applyline.app, create an
          account or use Applyline. By using the service, you agree to these terms.
          If you do not agree, do not use the service.
        </p>
      </section>

      <section>
        <h2>2. Eligibility and accounts</h2>
        <p>
          You must be at least 16 years old and able to enter into a binding
          agreement in your location. You are responsible for providing accurate
          account information, protecting your sign-in credentials and activity
          performed through your account.
        </p>
        <p>
          Contact <a href="mailto:support@applyline.app">support@applyline.app</a>{' '}
          promptly if you believe your account has been accessed without permission.
        </p>
      </section>

      <section>
        <h2>3. The service</h2>
        <p>
          Applyline provides tools for recording job applications, progress,
          interviews, notes and related information. Applyline does not apply for
          jobs on your behalf, provide recruitment services or guarantee interviews,
          offers or employment outcomes.
        </p>
        <p>
          We may improve, modify or discontinue features as the product develops.
          We will take reasonable steps to avoid unnecessary disruption and to
          communicate material changes where appropriate.
        </p>
      </section>

      <section>
        <h2>4. Your content</h2>
        <p>
          You retain ownership of information you add to Applyline. You give us a
          limited permission to host, process, back up and display that information
          only as needed to operate, secure and support the service.
        </p>
        <p>
          You are responsible for ensuring you have the right to store the content
          you submit, including job descriptions, contact details and notes. Do not
          upload unlawful content or information that you are not permitted to use.
        </p>
      </section>

      <section>
        <h2>5. Acceptable use</h2>
        <p>You must not:</p>
        <ul>
          <li>Use Applyline for unlawful, fraudulent or abusive activity.</li>
          <li>Attempt to access another user’s account or private information.</li>
          <li>Probe, disrupt or bypass service security or access controls.</li>
          <li>Introduce malware or automate requests that harm the service.</li>
          <li>Reverse engineer the service except where applicable law permits it.</li>
          <li>Resell or commercially exploit the service without permission.</li>
        </ul>
      </section>

      <section>
        <h2>6. Third-party services</h2>
        <p>
          Applyline relies on third-party infrastructure and may link to external
          sites, job listings or meeting services. Those services have their own
          terms and privacy practices, and we are not responsible for content or
          services they control.
        </p>
      </section>

      <section>
        <h2>7. Availability and warranties</h2>
        <p>
          We work to keep Applyline available and reliable, but the service is
          provided on an “as is” and “as available” basis. To the extent permitted
          by law, we do not promise uninterrupted operation, permanent storage or
          that every error will be corrected.
        </p>
        <p>
          Nothing in these terms excludes warranties, guarantees or other rights
          that cannot legally be excluded, including applicable rights under the
          Australian Consumer Law.
        </p>
      </section>

      <section>
        <h2>8. Suspension and termination</h2>
        <p>
          You may stop using Applyline at any time and request deletion of your
          account. We may suspend or terminate access when reasonably necessary to
          protect users or the service, address unlawful conduct, enforce these
          terms or comply with legal requirements.
        </p>
      </section>

      <section>
        <h2>9. Liability</h2>
        <p>
          To the extent permitted by law, Applyline is not liable for indirect,
          incidental or consequential losses, lost opportunities, employment
          decisions made by third parties, or loss caused by matters outside our
          reasonable control. This limitation does not apply where liability cannot
          legally be limited.
        </p>
      </section>

      <section>
        <h2>10. Governing law</h2>
        <p>
          These terms are governed by the laws of Western Australia, Australia,
          without limiting any mandatory consumer protections that apply where you
          live.
        </p>
      </section>

      <section>
        <h2>11. Changes and contact</h2>
        <p>
          We may update these terms as Applyline develops. The current version will
          be published here with an updated date. Questions can be sent to{' '}
          <a href="mailto:support@applyline.app">support@applyline.app</a>.
        </p>
      </section>
    </LegalPage>
  );
}
