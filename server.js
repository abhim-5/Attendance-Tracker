// server.js
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const app = express();

app.use(cors({
  origin: ['https://track-a.netlify.app'],
  credentials: true
}));
app.use(express.json());

const SECRET_KEY = process.env.SECRET_KEY;

app.post('/verify-recaptcha', async (req, res) => {
  const token = req.body.token;
  if (!token) return res.json({ success: false });

  const url = `https://www.google.com/recaptcha/api/siteverify?secret=${SECRET_KEY}&response=${token}`;
  try {
    const googleRes = await fetch(url, { method: 'POST' }); 
    const data = await googleRes.json();
    res.json({ success: data.success });
  } catch (err) {
    res.json({ success: false });
  }
});

app.post('/send-code', async (req, res) => {
  const { email, code } = req.body;
  if (!email || !code) {
    return res.status(400).json({ success: false, message: "Missing email or code" });
  }

  const transporter = nodemailer.createTransport({
    host: "smtp-relay.brevo.com",
    port: 587,
    auth: {
      user: process.env.brevo_user,
      pass: process.env.brevo_pass
    }
  });

  const mailOptions = {
    from: '"Attendance Tracker" <attendancetracker.dev@gmail.com>', 
    to: email,
    subject: 'Your Attendance Tracker Verification Code',
    html: `<p>Your verification code is: <b>${code}</b><br>This code is valid for 15 minutes.</p>`
  };

  try {
    await transporter.sendMail(mailOptions);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('reCAPTCHA backend running on port', PORT));
