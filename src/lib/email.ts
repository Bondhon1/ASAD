import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

interface EmailVerificationParams {
  email: string;
  fullName: string;
  verificationLink: string;
}

export async function sendVerificationEmail({
  email,
  fullName,
  verificationLink,
}: EmailVerificationParams): Promise<void> {
  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: email,
      subject: "Verify Your Email - Amar Somoy, Amar Desh",
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background-color: #c8102e; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
              .content { background-color: #f5f5f5; padding: 30px; text-align: center; }
              .button { background-color: #c8102e; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0; }
              .footer { background-color: #1a1a1a; color: #fff; padding: 15px; text-align: center; border-radius: 0 0 8px 8px; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Welcome to Amar Somoy, Amar Desh</h1>
              </div>
              <div class="content">
                <p>Hello <strong>${fullName}</strong>,</p>
                <p>Thank you for registering with us! Please verify your email address by clicking the button below:</p>
                <a href="${verificationLink}" class="button">Verify Email</a>
                <p style="color: #666; font-size: 12px;">This link will expire in 24 hours.</p>
                <p style="color: #999; font-size: 12px;">Or copy this link: <br/><code>${verificationLink}</code></p>
              </div>
              <div class="footer">
                <p>&copy; 2024 Amar Somoy, Amar Desh. All rights reserved.</p>
              </div>
            </div>
          </body>
        </html>
      `,
    });
  } catch (error) {
    console.error("Error sending verification email:", error);
    throw error;
  }
}

interface InitialPaymentEmailParams {
  email: string;
  fullName: string;
  paymentLink: string;
}

export async function sendInitialPaymentEmail({
  email,
  fullName,
  paymentLink,
}: InitialPaymentEmailParams): Promise<void> {
  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: email,
      subject: "Complete Your Registration - Payment Required",
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background-color: #c8102e; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
              .content { background-color: #f5f5f5; padding: 30px; text-align: center; }
              .button { background-color: #c8102e; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0; }
              .footer { background-color: #1a1a1a; color: #fff; padding: 15px; text-align: center; border-radius: 0 0 8px 8px; font-size: 12px; }
              .highlight { color: #c8102e; font-weight: bold; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Email Verified Successfully!</h1>
              </div>
              <div class="content">
                <p>Hello <strong>${fullName}</strong>,</p>
                <p>Your email has been verified successfully! 🎉</p>
                <p>To complete your registration, please make a payment of <span class="highlight">30 BDT</span> using any of these payment methods:</p>
                <ul style="text-align: left; display: inline-block;">
                  <li>bKash</li>
                  <li>Nagad</li>
                  <li>Visa</li>
                  <li>Mastercard</li>
                </ul>
                <a href="${paymentLink}" class="button">Continue to Payment</a>
                <p style="color: #999; font-size: 12px;">This registration step must be completed within 7 days.</p>
              </div>
              <div class="footer">
                <p>&copy; 2024 Amar Somoy, Amar Desh. All rights reserved.</p>
              </div>
            </div>
          </body>
        </html>
      `,
    });
  } catch (error) {
    console.error("Error sending payment email:", error);
    throw error;
  }
}
