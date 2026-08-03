const contactModel = require('../models/contactModel');
const { sendContactNotificationEmail } = require('../utils/mailer');

async function create(req, res) {
  try {
    const { name, email, message } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({ error: 'Name, email, and message are all required' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Please enter a valid email address' });
    }

    const saved = await contactModel.create({ name: name.trim(), email: email.trim(), message: message.trim() });

    // Notify the shop, but don't let a failed notification block the person's submission.
    try {
      await sendContactNotificationEmail({ name, email, message });
    } catch (mailErr) {
      console.error('Failed to send contact notification email:', mailErr.message);
    }

    return res.status(201).json({ message: 'Thanks — we\'ll get back to you soon.', contact: saved });
  } catch (err) {
    console.error('Contact form error:', err);
    return res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
}

async function listForAdmin(req, res) {
  try {
    const messages = await contactModel.findAll();
    return res.json({ messages });
  } catch (err) {
    console.error('List contact messages error:', err);
    return res.status(500).json({ error: 'Something went wrong' });
  }
}

module.exports = { create, listForAdmin };
