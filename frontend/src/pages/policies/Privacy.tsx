import PolicyLayout from './PolicyLayout';

export default function Privacy() {
  return (
    <PolicyLayout title="Privacy Policy" updated="29 June 2026">
      <h2>1. Information We Collect</h2>
      <p>When you use Notarium, we collect:</p>
      <ul>
        <li><strong>Account information:</strong> your name and email address when you register.</li>
        <li><strong>Payment information:</strong> payment is processed by Razorpay. We only store the order ID and payment confirmation status — never raw card or bank details.</li>
        <li><strong>Purchase history:</strong> which chapters you have purchased, stored to grant and gate access.</li>
        <li><strong>Usage data:</strong> page views and session activity, used to improve the service.</li>
      </ul>

      <h2>2. How We Use Your Information</h2>
      <ul>
        <li>To authenticate you and maintain your session</li>
        <li>To fulfil your purchases and grant chapter access</li>
        <li>To generate watermarks that include your email and order ID (baked into viewed pages)</li>
        <li>To contact you about your account or changes to the service</li>
        <li>To detect and prevent fraud or abuse</li>
      </ul>

      <h2>3. Watermarks and Traceability</h2>
      <p>
        Every page you view in the secure viewer is watermarked with your email address and order ID.
        This is a condition of access. The watermark is embedded into the image pixels server-side
        and cannot be removed from the viewed content. This information is used solely for identifying
        the source of leaked content, should any occur.
      </p>

      <h2>4. Sharing of Information</h2>
      <p>We do not sell or rent your personal data. We share data only:</p>
      <ul>
        <li>With <strong>Razorpay</strong> to process payments (subject to Razorpay's privacy policy)</li>
        <li>When required by law or a valid legal process</li>
        <li>To protect the rights or safety of Notarium or its users</li>
      </ul>

      <h2>5. Cookies and Sessions</h2>
      <p>
        We use a single httpOnly cookie to maintain your login session. This cookie does not track
        you across external sites and is automatically deleted when your session expires or you log out.
      </p>

      <h2>6. Data Retention</h2>
      <p>
        Account data is retained while your account is active. Purchase records are retained
        indefinitely to support access to content you have paid for. You may request account deletion
        by emailing us, which will remove your personal data (purchases will be anonymised, not deleted,
        for financial records).
      </p>

      <h2>7. Security</h2>
      <p>
        Passwords are stored as bcrypt hashes. Sessions use signed JWT tokens in httpOnly cookies.
        Content is served via authenticated, short-lived signed tokens — raw files are never accessible
        via public URLs.
      </p>

      <h2>8. Your Rights</h2>
      <p>
        Under applicable Indian data protection law, you have the right to access, correct, or request
        deletion of your personal data. To exercise these rights, contact us at{' '}
        <a href="mailto:support@notarium.in">support@notarium.in</a>.
      </p>

      <h2>9. Contact</h2>
      <p>
        Privacy questions: <a href="mailto:support@notarium.in">support@notarium.in</a>
      </p>
    </PolicyLayout>
  );
}
