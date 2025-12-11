import { google } from 'googleapis';
import { NextRequest, NextResponse } from 'next/server';

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  `${process.env.NEXTAUTH_URL}/api/auth/google-calendar-setup/callback`
);

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error) {
    return new NextResponse(
      `<html>
        <body style="font-family: Arial; padding: 40px; text-align: center;">
          <h1 style="color: #dc2626;">❌ Authorization Failed</h1>
          <p>Error: ${error}</p>
          <a href="/dashboard/hr/interviews" style="color: #1E3A5F;">Go back to dashboard</a>
        </body>
      </html>`,
      { headers: { 'Content-Type': 'text/html' } }
    );
  }

  if (!code) {
    return new NextResponse(
      `<html>
        <body style="font-family: Arial; padding: 40px; text-align: center;">
          <h1 style="color: #dc2626;">❌ No authorization code received</h1>
          <a href="/api/auth/google-calendar-setup" style="color: #1E3A5F;">Try again</a>
        </body>
      </html>`,
      { headers: { 'Content-Type': 'text/html' } }
    );
  }

  try {
    const { tokens } = await oauth2Client.getToken(code);
    
    return new NextResponse(
      `<html>
        <head>
          <style>
            body { font-family: Arial; padding: 40px; max-width: 800px; margin: 0 auto; }
            .success { color: #16a34a; }
            .token-box { background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .token { word-break: break-all; font-family: monospace; font-size: 14px; }
            .copy-btn { background: #1E3A5F; color: white; padding: 10px 20px; border: none; border-radius: 6px; cursor: pointer; margin: 10px 0; }
            .copy-btn:hover { background: #2a4d75; }
            .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; }
            code { background: #e5e7eb; padding: 2px 6px; border-radius: 4px; }
          </style>
        </head>
        <body>
          <h1 class="success">✅ Success!</h1>
          <p>Your Google Calendar API refresh token has been generated.</p>
          
          <div class="warning">
            <strong>⚠️ IMPORTANT:</strong> Copy the refresh token below and add it to your <code>.env</code> file immediately. 
            This page will not show the token again!
          </div>
          
          <div class="token-box">
            <label><strong>Refresh Token:</strong></label>
            <div class="token" id="token">${tokens.refresh_token || 'No refresh token (try revoking app access and try again)'}</div>
            <button class="copy-btn" onclick="copyToken()">📋 Copy Token</button>
          </div>
          
          <h3>Next Steps:</h3>
          <ol style="line-height: 2;">
            <li>Open your <code>.env</code> file</li>
            <li>Add this line:<br><code>GOOGLE_REFRESH_TOKEN="${tokens.refresh_token}"</code></li>
            <li>Save the file</li>
            <li>Restart your development server (<code>npm run dev</code>)</li>
            <li><a href="/dashboard/hr/interviews" style="color: #1E3A5F;">Go to interview slots page</a></li>
          </ol>
          
          <div class="warning">
            <strong>🔒 Security:</strong> Keep this token secret. Never commit it to git or share it publicly.
          </div>
          
          <script>
            function copyToken() {
              const token = document.getElementById('token').textContent;
              navigator.clipboard.writeText(token).then(() => {
                alert('✅ Token copied to clipboard!');
              });
            }
          </script>
        </body>
      </html>`,
      { headers: { 'Content-Type': 'text/html' } }
    );
  } catch (error) {
    console.error('Error getting tokens:', error);
    return new NextResponse(
      `<html>
        <body style="font-family: Arial; padding: 40px; text-align: center;">
          <h1 style="color: #dc2626;">❌ Failed to get tokens</h1>
          <p>Error: ${error instanceof Error ? error.message : 'Unknown error'}</p>
          <a href="/api/auth/google-calendar-setup" style="color: #1E3A5F;">Try again</a>
        </body>
      </html>`,
      { headers: { 'Content-Type': 'text/html' } }
    );
  }
}
