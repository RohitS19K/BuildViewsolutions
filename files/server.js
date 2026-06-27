require('dotenv').config();
const express  = require('express');
const nodemailer = require('nodemailer');
const cors     = require('cors');

const app = express();

// ── Middleware ──────────────────────────────────────────────
app.use(express.json());
app.use(cors({
  origin: process.env.ALLOWED_ORIGIN || '*',   // set to your domain in .env
}));

// ── Transporter ────────────────────────────────────────────
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,                                 // SSL
  auth: {
    user: process.env.GMAIL_USER,               // your Gmail address
    pass: process.env.GMAIL_APP_PASSWORD,       // 16-char App Password (not your Gmail password)
  },
});

// Verify SMTP connection on startup
transporter.verify((err) => {
  if (err) console.error('SMTP connection failed:', err.message);
  else     console.log('SMTP ready ✓');
});

// ── Basic rate limiter (no extra package needed) ────────────
const hits = new Map();
function rateLimit(req, res, next) {
  const ip  = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  const now = Date.now();
  const windowMs = 60 * 1000;   // 1 minute window
  const max = 3;                 // max 3 submissions per minute per IP

  const record = hits.get(ip) || { count: 0, start: now };
  if (now - record.start > windowMs) {
    record.count = 0;
    record.start = now;
  }
  record.count++;
  hits.set(ip, record);

  if (record.count > max) {
    return res.status(429).json({ error: 'Too many requests. Please wait a minute.' });
  }
  next();
}

// ── POST /send ──────────────────────────────────────────────
app.post('/send', rateLimit, async (req, res) => {
  const { name, email, service, message } = req.body;

  // Validate required fields
  if (!name?.trim() || !email?.trim() || !message?.trim()) {
    return res.status(400).json({ error: 'Name, email and message are required.' });
  }

  // Basic email format check
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Invalid email address.' });
  }

  try {
    // ── Email to YOU (notification) ─────────────────────────
    await transporter.sendMail({
      from    : `"BuildView Contact Form" <${process.env.GMAIL_USER}>`,
      to      : process.env.GMAIL_USER,
      replyTo : email,
      subject : `New Enquiry: ${service?.trim() || 'General'} — from ${name.trim()}`,
      html    : `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;border:1px solid #eee;border-radius:8px;overflow:hidden;">
          <div style="background:#0d1f3c;padding:28px 32px;">
            <h2 style="color:#ffffff;margin:0;font-size:22px;letter-spacing:2px;">BUILDVIEW</h2>
            <p style="color:#00B4A0;margin:4px 0 0;font-size:12px;letter-spacing:2px;">NEW CONTACT FORM SUBMISSION</p>
          </div>
          <div style="padding:32px;">
            <table style="width:100%;border-collapse:collapse;">
              <tr>
                <td style="padding:10px 0;border-bottom:1px solid #f0ece4;color:#7a7570;font-size:11px;letter-spacing:1px;text-transform:uppercase;width:140px;">Name</td>
                <td style="padding:10px 0;border-bottom:1px solid #f0ece4;font-size:16px;color:#0a0a0a;">${name.trim()}</td>
              </tr>
              <tr>
                <td style="padding:10px 0;border-bottom:1px solid #f0ece4;color:#7a7570;font-size:11px;letter-spacing:1px;text-transform:uppercase;">Email</td>
                <td style="padding:10px 0;border-bottom:1px solid #f0ece4;font-size:16px;color:#0a0a0a;"><a href="mailto:${email}" style="color:#F47B20;">${email.trim()}</a></td>
              </tr>
              <tr>
                <td style="padding:10px 0;border-bottom:1px solid #f0ece4;color:#7a7570;font-size:11px;letter-spacing:1px;text-transform:uppercase;">Service</td>
                <td style="padding:10px 0;border-bottom:1px solid #f0ece4;font-size:16px;color:#0a0a0a;">${service?.trim() || '—'}</td>
              </tr>
              <tr>
                <td style="padding:10px 0;color:#7a7570;font-size:11px;letter-spacing:1px;text-transform:uppercase;vertical-align:top;">Message</td>
                <td style="padding:10px 0;font-size:16px;color:#0a0a0a;line-height:1.6;">${message.trim().replace(/\n/g, '<br>')}</td>
              </tr>
            </table>
            <div style="margin-top:28px;">
              <a href="mailto:${email}?subject=Re: Your enquiry at BuildView"
                 style="display:inline-block;padding:12px 28px;background:#F47B20;color:#fff;text-decoration:none;border-radius:100px;font-size:12px;font-weight:600;letter-spacing:1px;text-transform:uppercase;">
                Reply to ${name.trim()}
              </a>
            </div>
          </div>
          <div style="background:#f0ece4;padding:16px 32px;text-align:center;">
            <p style="margin:0;font-size:11px;color:#7a7570;">BuildView Solutions · Indore, Madhya Pradesh, India</p>
          </div>
        </div>
      `,
    });

    // ── Auto-reply to the person who submitted ──────────────
    await transporter.sendMail({
      from    : `"BuildView Solutions" <${process.env.GMAIL_USER}>`,
      to      : email,
      subject : `We got your message, ${name.trim().split(' ')[0]}!`,
      html    : `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;border:1px solid #eee;border-radius:8px;overflow:hidden;">
          <div style="background:#0d1f3c;padding:28px 32px;">
            <h2 style="color:#ffffff;margin:0;font-size:22px;letter-spacing:2px;">BUILDVIEW</h2>
            <p style="color:#00B4A0;margin:4px 0 0;font-size:12px;letter-spacing:2px;">SOLUTIONS</p>
          </div>
          <div style="padding:32px;">
            <p style="font-size:18px;color:#0a0a0a;margin:0 0 16px;">Hi ${name.trim().split(' ')[0]},</p>
            <p style="font-size:15px;color:#3a3a3a;line-height:1.7;margin:0 0 16px;">
              Thanks for reaching out! We've received your message and will get back to you within <strong>24 hours</strong>.
            </p>
            <p style="font-size:15px;color:#3a3a3a;line-height:1.7;margin:0 0 28px;">
              In the meantime, feel free to explore our work or connect with us directly at
              <a href="mailto:${process.env.GMAIL_USER}" style="color:#F47B20;">${process.env.GMAIL_USER}</a>.
            </p>
            <p style="font-size:14px;color:#7a7570;margin:0;">— The BuildView Team</p>
          </div>
          <div style="background:#f0ece4;padding:16px 32px;text-align:center;">
            <p style="margin:0;font-size:11px;color:#7a7570;">BuildView Solutions · Indore, Madhya Pradesh, India</p>
          </div>
        </div>
      `,
    });

    res.json({ success: true });

  } catch (err) {
    console.error('Mail send error:', err.message);
    res.status(500).json({ error: 'Failed to send email. Please try again.' });
  }
});

// ── Health check ────────────────────────────────────────────
app.get('/health', (_, res) => res.json({ status: 'ok' }));

// ── Start ───────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => console.log(`Mailer running on port ${PORT}`));
