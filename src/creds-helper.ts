import { getConfig } from './config.js';
import { escapeHtml, maskPassword } from './helpers.js';
import type { UserCredentials } from './types.js';






export async function generateUserCredentials(
  username: string,
  displayName: string,
  email: string
): Promise<UserCredentials & { credentialsCard: Buffer; credentialsText: string }> {
  const config = getConfig();
  if (!config) {
    throw new Error(
      'CredentialsHelper not configured. Call configure() before generateUserCredentials().'
    );
  }

  const tempPassword = config.generateTempPassword(12);
  const totpSecret = config.generateTOTPSecret();
  const totpUri = config.generateTOTPUri(totpSecret, 'Tinyland.dev', username);

  const credentialsPackage = await config.generateCredentialsPackage({
    username,
    displayName,
    tempPassword,
    totpUri,
    issuer: 'Tinyland.dev',
  });

  return {
    username,
    displayName,
    email,
    tempPassword,
    totpSecret,
    credentialsCard: credentialsPackage.image,
    credentialsText: credentialsPackage.text,
  };
}




export function createCredentialsDownloadResponse(
  credentialsCard: Buffer,
  username: string,
  format: 'png' | 'txt' = 'png'
): Response {
  const filename = `credentials-${username}-${Date.now()}.${format}`;
  const contentType = format === 'png' ? 'image/png' : 'text/plain';

  const body = new Uint8Array(credentialsCard);
  return new Response(body, {
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      Pragma: 'no-cache',
      Expires: '0',
    },
  });
}




export function generateCredentialsEmailHtml(
  credentials: UserCredentials,
  includeCard: boolean = false
): string {
  const safeUsername = escapeHtml(credentials.username);
  const safeDisplayName = escapeHtml(credentials.displayName);
  const safeEmail = escapeHtml(credentials.email);
  const maskedPwd = credentials.tempPassword
    ? maskPassword(credentials.tempPassword)
    : 'See attached card';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Your Tinyland.dev Account</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background-color: #e91e63;
      color: white;
      padding: 20px;
      text-align: center;
      border-radius: 8px 8px 0 0;
    }
    .content {
      background-color: #f9f9f9;
      padding: 30px;
      border: 1px solid #ddd;
      border-radius: 0 0 8px 8px;
    }
    .credentials-box {
      background-color: white;
      border: 1px solid #ddd;
      padding: 20px;
      margin: 20px 0;
      border-radius: 5px;
    }
    .credentials-box h3 {
      margin-top: 0;
      color: #e91e63;
    }
    .field {
      margin: 10px 0;
    }
    .field-label {
      font-weight: bold;
      display: inline-block;
      width: 120px;
    }
    .field-value {
      font-family: monospace;
      background-color: #f5f5f5;
      padding: 5px 10px;
      border-radius: 3px;
      display: inline-block;
    }
    .warning {
      background-color: #ffebee;
      border: 1px solid #ffcdd2;
      color: #c62828;
      padding: 15px;
      border-radius: 5px;
      margin: 20px 0;
    }
    .steps {
      background-color: #e8f5e9;
      border: 1px solid #c8e6c9;
      padding: 15px;
      border-radius: 5px;
      margin: 20px 0;
    }
    .steps ol {
      margin: 10px 0 0 0;
      padding-left: 20px;
    }
    .footer {
      text-align: center;
      color: #666;
      font-size: 12px;
      margin-top: 30px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Welcome to Tinyland.dev</h1>
  </div>

  <div class="content">
    <p>Hello ${safeDisplayName},</p>

    <p>Your account has been created. Below are your login credentials and instructions for setting up two-factor authentication.</p>

    <div class="credentials-box">
      <h3>Your Login Credentials</h3>
      <div class="field">
        <span class="field-label">Username:</span>
        <span class="field-value">${safeUsername}</span>
      </div>
      <div class="field">
        <span class="field-label">Email:</span>
        <span class="field-value">${safeEmail}</span>
      </div>
      <div class="field">
        <span class="field-label">Password:</span>
        <span class="field-value">${maskedPwd}</span>
      </div>
    </div>

    <div class="steps">
      <h3>Setup Instructions</h3>
      <ol>
        <li>Download an authenticator app on your phone (Google Authenticator, Authy, or similar)</li>
        <li>${includeCard ? 'Open the attached credentials card and scan the QR code' : 'Use the QR code provided by your administrator'}</li>
        <li>Log in using your username and temporary password</li>
        <li>Enter the 6-digit code from your authenticator app</li>
        <li>Change your password immediately after first login</li>
      </ol>
    </div>

    <div class="warning">
      <strong>Security Notice:</strong>
      <ul style="margin: 10px 0 0 0; padding-left: 20px;">
        <li>Keep your credentials secure and do not share them</li>
        <li>Change your temporary password immediately after first login</li>
        <li>Enable two-factor authentication for account security</li>
        <li>If you suspect your account has been compromised, contact us immediately</li>
      </ul>
    </div>

    <p>If you have any questions or need assistance, please contact us at <a href="mailto:admin@stonewallunderground.com">admin@stonewallunderground.com</a>.</p>
  </div>

  <div class="footer">
    <p>&copy; ${new Date().getFullYear()} Tinyland.dev - This email contains confidential information</p>
    <p>Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
  </div>
</body>
</html>`;
}







export function generateSecureCredentialsLink(
  credentialsId: string,
  expiresInMinutes: number = 60
): { url: string; expiresAt: Date } {
  const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);

  const token = Buffer.from(
    JSON.stringify({
      id: credentialsId,
      exp: expiresAt.getTime(),
    })
  ).toString('base64url');

  return {
    url: `/admin/credentials/download/${token}`,
    expiresAt,
  };
}
