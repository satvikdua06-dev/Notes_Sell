import PolicyLayout from './PolicyLayout';

export default function Delivery() {
  return (
    <PolicyLayout title="Delivery Policy" updated="29 June 2026">
      <p className="lead">
        Notarium sells digital notes. There is no physical product and no physical shipping.
        This page explains how your purchase is delivered.
      </p>

      <h2>How delivery works</h2>
      <p>
        After a successful payment, access is granted <strong>instantly and automatically</strong>.
        Here is the exact sequence:
      </p>
      <ol>
        <li>You complete payment on the Razorpay checkout screen.</li>
        <li>Razorpay notifies our servers via a secure webhook (usually within 2–5 seconds).</li>
        <li>We verify the payment signature and amount server-side.</li>
        <li>Your purchase is recorded in our database and the chapters you bought immediately appear in your library.</li>
        <li>You can open and read your chapters in the secure browser viewer right away.</li>
      </ol>

      <h2>What you receive</h2>
      <p>
        You receive <strong>permanent in-app access</strong> to the chapter notes you purchased.
        Notes are displayed in a secure, read-only browser viewer — they are not downloadable as
        raw PDF files. This is intentional: it protects the intellectual property of the creators
        while giving you unrestricted reading access from any device where you are logged in.
      </p>

      <h2>Access from multiple devices</h2>
      <p>
        You can read your purchased notes on any device by logging in to your Notarium account.
        There is no limit on how many times you can access notes you have paid for.
      </p>

      <h2>Delivery failure</h2>
      <p>
        In the rare event that your payment is confirmed by Razorpay but your library does not update
        within 10 minutes, please contact us at{' '}
        <a href="mailto:support@notarium.in">support@notarium.in</a> with your Razorpay payment ID.
        We will resolve it manually within 24 hours.
      </p>

      <h2>No physical shipping</h2>
      <p>
        We do not ship any physical goods. No courier, no postal address, no tracking number.
        All content is delivered digitally through your account.
      </p>
    </PolicyLayout>
  );
}
