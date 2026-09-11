// backend/test-email.js
require('dotenv').config();
const nodemailer = require('nodemailer');

console.log('📧 Testing email configuration...');
console.log('SMTP_HOST:', process.env.SMTP_HOST);
console.log('SMTP_PORT:', process.env.SMTP_PORT);
console.log('SMTP_USER:', process.env.SMTP_USER);
console.log('SMTP_PASS length:', process.env.SMTP_PASS?.length);
console.log('SMTP_PASS first 4 chars:', process.env.SMTP_PASS?.substring(0, 4));
console.log('SMTP_PASS last 4 chars:', process.env.SMTP_PASS?.slice(-4));
console.log('');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

// Verify connection first
transporter.verify((error, success) => {
  if (error) {
    console.error('❌ SMTP Verification Failed:');
    console.error(error);
    return;
  }
  console.log('✅ SMTP Server is ready to send emails!');
  console.log('');

  // Now try sending an actual email
  const mailOptions = {
    from: process.env.SMTP_FROM,
    to: process.env.SMTP_USER,
    subject: '🧪 SmartHire AI Test Email',
    html: '<h1>Test Email</h1><p>If you see this, email is working! 🎉</p>'
  };

  transporter.sendMail(mailOptions, (err, info) => {
    if (err) {
      console.error('❌ Send Failed:');
      console.error(err);
    } else {
      console.log('✅ Email sent successfully!');
      console.log('Message ID:', info.messageId);
      console.log('Check your inbox:', process.env.SMTP_USER);
    }
  });
});