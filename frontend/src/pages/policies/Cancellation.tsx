import PolicyLayout from './PolicyLayout';

export default function Cancellation() {
  return (
    <PolicyLayout title="Cancellation and Refunds" updated="28 June 2026">
      <p className="lead">
        Because StudyNotes sells digital content that is immediately accessible after purchase,
        our refund policy reflects the nature of digital goods.
      </p>

      <h2>General rule: no refunds after access</h2>
      <p>
        Once a chapter has been accessed (i.e., your library shows it as available), we are unable to
        offer a refund. This is consistent with standard digital goods policy under Indian consumer
        protection guidelines, where digital products that have been delivered and accessed are
        non-refundable.
      </p>

      <h2>Situations where we will issue a refund</h2>
      <p>We will refund your payment in the following circumstances:</p>
      <ul>
        <li>
          <strong>Double charge:</strong> Your account was charged more than once for the same order.
        </li>
        <li>
          <strong>Payment captured but access not granted:</strong> Razorpay confirmed payment but the
          chapter does not appear in your library after 24 hours.
        </li>
        <li>
          <strong>Content is materially different from description:</strong> The chapter PDF is
          completely blank, corrupted, or covers entirely different content than what was listed.
          In this case, we may offer a replacement or a refund at our discretion.
        </li>
      </ul>

      <h2>Order cancellation</h2>
      <p>
        You can cancel your order <strong>only if payment has not yet been captured by Razorpay</strong>.
        Once payment is captured, access is granted and the order cannot be cancelled. If the Razorpay
        checkout window is still open and you have not completed payment, you can simply close it —
        no charge will occur.
      </p>

      <h2>How to request a refund</h2>
      <ol>
        <li>Email us at <a href="mailto:support@studynotes.in">support@studynotes.in</a></li>
        <li>Include your registered email address and your Razorpay payment ID (found in your payment confirmation email)</li>
        <li>Describe the reason for your refund request</li>
      </ol>
      <p>
        We will review your request within 2 business days. Approved refunds are processed back to
        the original payment method within 5–7 business days.
      </p>

      <h2>Partial refunds</h2>
      <p>
        If you purchased a bundle and only some chapters have been accessed, we may consider a
        partial refund for the unaccessed portion. Contact us to discuss.
      </p>

      <h2>Contact</h2>
      <p>
        Refund requests: <a href="mailto:support@studynotes.in">support@studynotes.in</a>
      </p>
    </PolicyLayout>
  );
}
