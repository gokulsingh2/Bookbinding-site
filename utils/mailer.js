const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false, // Brevo uses STARTTLS on port 587, not implicit TLS (secure: true is for port 465)
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

async function verifyMailer() {
  try {
    await transporter.verify();
    console.log('✅ Email service ready (Brevo SMTP)');
  } catch (err) {
    console.error('❌ Email service failed to connect:', err.message);
    console.error('   Check SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS in your .env');
  }
}

async function sendPasswordResetEmail({ to, name, resetUrl }) {
  const fromAddress = process.env.EMAIL_FROM || '"Book Binding Co." <no-reply@bookbinding.co>';

  return transporter.sendMail({
    from: fromAddress,
    to,
    subject: 'Reset your password — Book Binding Co.',
    html: `
      <div style="font-family: Georgia, 'Times New Roman', serif; max-width: 480px; margin: 0 auto; color: #2b2320;">
        <h2 style="color:#6b3f2a;">Password reset request</h2>
        <p>Hi ${name || 'there'},</p>
        <p>We received a request to reset your password. Click the button below to choose a new one. This link expires in <strong>1 hour</strong>.</p>
        <p style="text-align:center; margin: 32px 0;">
          <a href="${resetUrl}" style="background:#6b3f2a;color:#ffffff;padding:12px 28px;border-radius:6px;text-decoration:none;display:inline-block;">
            Reset Password
          </a>
        </p>
        <p style="font-size:13px;color:#666;">If the button doesn't work, copy and paste this link into your browser:<br>
          <a href="${resetUrl}">${resetUrl}</a>
        </p>
        <p>If you didn't request this, you can safely ignore this email — your password will stay the same.</p>
      </div>
    `,
  });
}

async function sendOrderConfirmationEmail({ to, name, order, serviceName }) {
  const fromAddress = process.env.EMAIL_FROM || '"Book Binding Co." <no-reply@bookbinding.co>';
  const appUrl = process.env.APP_URL || 'http://localhost:3000';
  const confirmationUrl = `${appUrl}/order/${order.id}/confirmation`;

  const fulfillmentLabels = {
    pickup: 'Pickup',
    local_delivery: 'Local Delivery',
    shipping: 'Shipping',
  };

  return transporter.sendMail({
    from: fromAddress,
    to,
    subject: `Order Confirmed — ${order.order_number} — Book Binding Co.`,
    html: `
      <div style="font-family: Georgia, 'Times New Roman', serif; max-width: 480px; margin: 0 auto; color: #2b2320;">
        <h2 style="color:#6b3f2a;">Thanks for your order, ${name || 'there'}!</h2>
        <p>We've received your order and will begin work on it shortly. Here's a summary:</p>

        <table style="width:100%; border-collapse: collapse; margin: 24px 0;">
          <tr><td style="padding:6px 0; color:#666;">Order number</td><td style="padding:6px 0; text-align:right; font-weight:bold;">${order.order_number}</td></tr>
          <tr><td style="padding:6px 0; color:#666;">Service</td><td style="padding:6px 0; text-align:right;">${serviceName}</td></tr>
          <tr><td style="padding:6px 0; color:#666;">Quantity</td><td style="padding:6px 0; text-align:right;">${order.quantity}</td></tr>
          <tr><td style="padding:6px 0; color:#666;">Fulfillment</td><td style="padding:6px 0; text-align:right;">${fulfillmentLabels[order.fulfillment_type] || order.fulfillment_type}</td></tr>
          <tr><td style="padding:6px 0; color:#666;">Estimated price</td><td style="padding:6px 0; text-align:right; font-weight:bold;">₹${Number(order.price_estimate).toFixed(2)}</td></tr>
          <tr><td style="padding:6px 0; color:#666;">Payment</td><td style="padding:6px 0; text-align:right;">Pay on pickup/delivery</td></tr>
        </table>

        <p style="text-align:center; margin: 32px 0;">
          <a href="${confirmationUrl}" style="background:#6b3f2a;color:#ffffff;padding:12px 28px;border-radius:6px;text-decoration:none;display:inline-block;">
            View Order
          </a>
        </p>

        <p>We'll let you know as your order moves through production. Thanks for trusting us with your book!</p>
      </div>
    `,
  });
}

async function sendContactNotificationEmail({ name, email, message }) {
  const fromAddress = process.env.EMAIL_FROM || '"Book Binding Co." <no-reply@bookbinding.co>';
  const notifyTo = process.env.CONTACT_NOTIFY_EMAIL || process.env.SMTP_USER;

  if (!notifyTo) return; // Nowhere configured to send this — skip quietly.

  return transporter.sendMail({
    from: fromAddress,
    to: notifyTo,
    replyTo: email,
    subject: `New contact form message from ${name}`,
    html: `
      <div style="font-family: Georgia, 'Times New Roman', serif; max-width: 480px; margin: 0 auto; color: #2b2320;">
        <h2 style="color:#6b3f2a;">New message from your website</h2>
        <p><strong>From:</strong> ${name} (${email})</p>
        <p><strong>Message:</strong></p>
        <p style="white-space:pre-wrap; background:#f3ece2; padding:14px; border-radius:6px;">${message}</p>
      </div>
    `,
  });
}

module.exports = {
  transporter,
  verifyMailer,
  sendPasswordResetEmail,
  sendOrderConfirmationEmail,
  sendContactNotificationEmail,
};
