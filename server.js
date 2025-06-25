// server.js
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
  console.log("Received token:", token);
  if (!token) return res.json({ success: false });

  const url = `https://www.google.com/recaptcha/api/siteverify?secret=${SECRET_KEY}&response=${token}`;
  try {
    const googleRes = await fetch(url, { method: 'POST' }); // Use global fetch
    const data = await googleRes.json();
    console.log("Google response:", data);
    res.json({ success: data.success });
  } catch (err) {
    console.error("Error verifying reCAPTCHA:", err);
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
      user: "903fde001@smtp-brevo.com",
      pass: "hr8KsCgt71zaDnQH"          
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
    console.error("Error sending code:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('reCAPTCHA backend running on port', PORT));
