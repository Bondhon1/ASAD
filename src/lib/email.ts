import nodemailer from "nodemailer";
import ical from "ical-generator";

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

export interface InterviewInvitation {
  applicantName: string;
  applicantEmail: string;
  interviewDate: Date;
  startTime: Date;
  endTime: Date;
  meetLink: string;
  hrName: string;
}

/**
 * Send interview invitation email with calendar attachment
 */
export async function sendInterviewInvitation(invitation: InterviewInvitation) {
  try {
    // Create iCal calendar event
    const cal = ical({ name: "ASAD Interview Schedule" });
    
    cal.createEvent({
      start: invitation.startTime,
      end: invitation.endTime,
      summary: "ASAD Volunteer Interview",
      description: `Dear ${invitation.applicantName},\n\nYou have been scheduled for a volunteer interview with Amar Somoy Amar Desh (ASAD).\n\nInterview Details:\nDate: ${invitation.interviewDate.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}\nTime: ${invitation.startTime.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })} - ${invitation.endTime.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}\n\nGoogle Meet Link: ${invitation.meetLink}\n\nPlease join on time. Best of luck!\n\nRegards,\n${invitation.hrName}\nASAD HR Team`,
      location: invitation.meetLink,
      url: invitation.meetLink,
      organizer: {
        name: invitation.hrName,
        email: process.env.SMTP_USER || "hr@asadofficial.org",
      },
      attendees: [
        {
          name: invitation.applicantName,
          email: invitation.applicantEmail,
        },
      ],
    });

    // Email HTML content
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #0A1929 0%, #1E3A5F 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
    .info-box { background: white; padding: 20px; margin: 20px 0; border-radius: 8px; border-left: 4px solid #1E3A5F; }
    .info-row { margin: 10px 0; }
    .label { font-weight: bold; color: #1E3A5F; }
    .meet-button { display: inline-block; padding: 12px 30px; background: #1E3A5F; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .footer { text-align: center; color: #666; margin-top: 30px; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 Interview Scheduled!</h1>
      <p>Amar Somoy Amar Desh (ASAD)</p>
    </div>
    <div class="content">
      <p>Dear <strong>${invitation.applicantName}</strong>,</p>
      
      <p>Congratulations! Your application has been approved and you have been scheduled for a volunteer interview.</p>
      
      <div class="info-box">
        <h3 style="margin-top: 0; color: #1E3A5F;">Interview Details</h3>
        <div class="info-row">
          <span class="label">📅 Date:</span> 
          ${invitation.interviewDate.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        </div>
        <div class="info-row">
          <span class="label">🕐 Time:</span> 
          ${invitation.startTime.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })} - ${invitation.endTime.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })} (Bangladesh Time)
        </div>
        <div class="info-row">
          <span class="label">💼 Interview Type:</span> 
          Google Meet (Virtual)
        </div>
      </div>

      <center>
        <a href="${invitation.meetLink}" class="meet-button">Join Google Meet</a>
      </center>

      <div style="background: #fff3cd; padding: 15px; border-radius: 6px; margin: 20px 0;">
        <strong>⚠️ Important Notes:</strong>
        <ul style="margin: 10px 0;">
          <li>Please join the meeting 5 minutes before the scheduled time</li>
          <li>Ensure you have a stable internet connection</li>
          <li>Keep your camera on during the interview</li>
          <li>Have your documents ready for verification</li>
        </ul>
      </div>

      <p>A calendar invitation (.ics file) is attached to this email. You can add it to your calendar app.</p>

      <p>If you have any questions, please contact us at <a href="mailto:hello@asadofficial.org">hello@asadofficial.org</a></p>

      <p>Best of luck with your interview!</p>

      <p>
        Warm regards,<br>
        <strong>${invitation.hrName}</strong><br>
        HR Team<br>
        Amar Somoy Amar Desh (ASAD)
      </p>

      <div class="footer">
        <p>© ${new Date().getFullYear()} Amar Somoy Amar Desh. All rights reserved.</p>
        <p>📍 Dhaka, Bangladesh | 📧 hello@asadofficial.org</p>
      </div>
    </div>
  </div>
</body>
</html>
    `;

    // Send email with calendar attachment
    await transporter.sendMail({
      from: `"ASAD HR Team" <${process.env.SMTP_USER}>`,
      to: invitation.applicantEmail,
      subject: "🎉 Interview Scheduled - ASAD Volunteer Program",
      html: htmlContent,
      icalEvent: {
        filename: "interview-invitation.ics",
        method: "REQUEST",
        content: cal.toString(),
      },
    });

    return { success: true };
  } catch (error) {
    console.error("Error sending invitation email:", error);
    throw new Error("Failed to send invitation email");
  }
}
