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
              body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #1a1a2e; margin: 0; padding: 0; background-color: #f0f4f8; }
              .container { max-width: 600px; margin: 40px auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(30, 58, 95, 0.1); }
              .header { 
                background: linear-gradient(135deg, #1e3a8a 0%, #312e81 100%); 
                color: white; 
                padding: 40px 30px; 
                text-align: center; 
              }
              .header h1 { 
                margin: 0; 
                font-size: 28px; 
                font-weight: 700; 
                letter-spacing: -0.5px; 
              }
              .logo { 
                background: rgba(255, 255, 255, 0.15); 
                width: 60px; 
                height: 60px; 
                border-radius: 12px; 
                margin: 0 auto 20px; 
                display: flex; 
                align-items: center; 
                justify-content: center; 
                font-size: 32px; 
                font-weight: bold;
              }
              .content { 
                background-color: #ffffff; 
                padding: 40px 30px; 
              }
              .content p { 
                color: #374151; 
                font-size: 16px; 
                margin: 16px 0; 
              }
              .content strong { 
                color: #1e3a8a; 
              }
              .button-container { 
                text-align: center; 
                margin: 32px 0; 
              }
              .button { 
                background: linear-gradient(135deg, #1e3a8a 0%, #312e81 100%); 
                color: white; 
                padding: 16px 40px; 
                text-decoration: none; 
                border-radius: 8px; 
                display: inline-block; 
                font-weight: 600; 
                font-size: 16px;
                box-shadow: 0 4px 12px rgba(30, 58, 95, 0.3);
                transition: transform 0.2s;
              }
              .button:hover { 
                transform: translateY(-2px); 
                box-shadow: 0 6px 16px rgba(30, 58, 95, 0.4); 
              }
              .info-box { 
                background: linear-gradient(135deg, rgba(30, 58, 95, 0.05) 0%, rgba(49, 46, 129, 0.05) 100%); 
                border-left: 4px solid #1e3a8a; 
                padding: 16px; 
                border-radius: 8px; 
                margin: 24px 0; 
              }
              .info-box p { 
                margin: 4px 0; 
                font-size: 14px; 
                color: #4b5563; 
              }
              .link-text { 
                background: #f3f4f6; 
                padding: 12px; 
                border-radius: 6px; 
                word-break: break-all; 
                font-size: 12px; 
                color: #6b7280; 
                margin-top: 16px; 
              }
              .footer { 
                background: linear-gradient(135deg, #1e3a8a 0%, #312e81 100%); 
                color: rgba(255, 255, 255, 0.8); 
                padding: 24px 30px; 
                text-align: center; 
                font-size: 13px; 
              }
              .footer p { 
                margin: 8px 0; 
              }
              .footer a { 
                color: white; 
                text-decoration: none; 
                font-weight: 600; 
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <div class="logo">🌟</div>
                <h1>Welcome to Amar Somoy, Amar Desh</h1>
              </div>
              <div class="content">
                <p>Hello <strong>${fullName}</strong>,</p>
                <p>Thank you for joining our volunteer community! We're excited to have you on board.</p>
                <p>To get started, please verify your email address by clicking the button below:</p>
                
                <div class="button-container">
                  <a href="${verificationLink}" class="button">✓ Verify Email Address</a>
                </div>
                
                <div class="info-box">
                  <p><strong>⏰ Important:</strong> This verification link will expire in 24 hours.</p>
                  <p>If you didn't create an account, you can safely ignore this email.</p>
                </div>
                
                <p style="color: #6b7280; font-size: 14px; margin-top: 24px;">If the button doesn't work, copy and paste this link into your browser:</p>
                <div class="link-text">${verificationLink}</div>
              </div>
              <div class="footer">
                <p><strong>Amar Somoy, Amar Desh</strong></p>
                <p>Building communities, creating impact together</p>
                <p style="margin-top: 16px;">&copy; ${new Date().getFullYear()} Amar Somoy, Amar Desh. All rights reserved.</p>
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
