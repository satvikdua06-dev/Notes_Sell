import PolicyLayout from './PolicyLayout';

export default function Terms() {
  return (
    <PolicyLayout title="Terms and Conditions" updated="29 June 2026">
      <h2>1. Acceptance of Terms</h2>
      <p>
        By creating an account or making a purchase on Notarium ("we", "us", "our"), you agree to
        be bound by these Terms and Conditions. If you do not agree, please do not use the service.
      </p>

      <h2>2. Description of Service</h2>
      <p>
        Notarium is a digital content marketplace that sells chapter-wise study notes in PDF format
        for Biology, Chemistry, and Physics. After a verified payment, customers receive access to
        purchased notes through a secure in-browser viewer. No physical goods are shipped.
      </p>

      <h2>3. Eligibility</h2>
      <p>
        You must be at least 13 years of age to use the service. If you are under 18, you must have
        parental or guardian consent.
      </p>

      <h2>4. Accounts</h2>
      <p>
        You are responsible for maintaining the confidentiality of your login credentials. You agree
        not to share your account or attempt to access notes purchased by another user.
      </p>

      <h2>5. Purchases and Payment</h2>
      <p>
        All prices are listed in Indian Rupees (INR). Payments are processed securely via Razorpay.
        Access to purchased content is granted only after Razorpay confirms payment. We do not store
        your card or banking details.
      </p>

      <h2>6. Intellectual Property</h2>
      <p>
        All notes, content, and materials on this site are the intellectual property of Notarium or
        their respective creators. Purchasing access does not transfer any copyright. You may not
        reproduce, redistribute, share, sell, or commercially exploit the notes in any form.
      </p>

      <h2>7. Prohibited Use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>Screenshot, photograph, or otherwise reproduce notes for distribution</li>
        <li>Attempt to bypass the secure viewer or access raw PDF files</li>
        <li>Share login credentials or purchased content with third parties</li>
        <li>Use automated scripts to bulk-download page images</li>
      </ul>
      <p>
        Violations may result in immediate account termination and legal action under applicable
        copyright law.
      </p>

      <h2>8. Limitation of Liability</h2>
      <p>
        Notarium is provided "as is". We are not liable for any indirect, incidental, or
        consequential damages arising from your use of the service, including loss of data or academic
        outcomes.
      </p>

      <h2>9. Governing Law</h2>
      <p>
        These terms are governed by the laws of India. Any disputes will be subject to the exclusive
        jurisdiction of courts in India.
      </p>

      <h2>10. Changes</h2>
      <p>
        We may update these Terms from time to time. Continued use of the service after changes
        constitutes acceptance. Material changes will be communicated via the email on your account.
      </p>

      <h2>11. Contact</h2>
      <p>
        For questions about these Terms, write to us at{' '}
        <a href="mailto:support@notarium.in">support@notarium.in</a>.
      </p>
    </PolicyLayout>
  );
}
