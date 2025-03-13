const nodemailer = require("nodemailer");

const sendEmail = async (to, subject, htmlContent) => {
  const transporter = nodemailer.createTransport({
    service: "Gmail", // You can use another service like SendGrid
    auth: {
      user: process.env.EMAIL_USER, // Your Gmail email
      pass: process.env.EMAIL_PASS, // Your Gmail app password (not regular password)
    },
  });

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to,
    subject,
    html: htmlContent
  };

  await transporter.sendMail(mailOptions);
};

module.exports = sendEmail;