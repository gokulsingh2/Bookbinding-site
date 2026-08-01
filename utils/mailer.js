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

module.exports = { transporter, verifyMailer, sendPasswordResetEmail };
