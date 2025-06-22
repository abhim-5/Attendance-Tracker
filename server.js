// server.js
const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

const SECRET_KEY = process.env.SECRET_KEY;

app.post('/verify-recaptcha', async (req, res) => {
  const token = req.body.token;
  console.log("Received token:", token);
  if (!token) return res.json({ success: false });

  const url = `https://www.google.com/recaptcha/api/siteverify?secret=${SECRET_KEY}&response=${token}`;
  try {
    const googleRes = await fetch(url, { method: 'POST' });
    const data = await googleRes.json();
    console.log("Google response:", data);
    res.json({ success: data.success });
  } catch (err) {
    console.error("Error verifying reCAPTCHA:", err);
    res.json({ success: false });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('reCAPTCHA backend running on port', PORT));