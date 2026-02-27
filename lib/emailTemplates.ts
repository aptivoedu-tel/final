const LOGO_URL = `${process.env.NEXTAUTH_URL}/logo.png`;

const emailWrapper = (content: string) => `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><title>APTIVO</title></head>
<body style="margin:0;padding:0;background:#e8f5f0;font-family:'Georgia',serif;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#e8f5f0;padding:48px 16px;">
<tr><td align="center">
<table width="620" cellpadding="0" cellspacing="0" border="0" style="max-width:620px;width:100%;background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 8px 40px rgba(0,100,80,0.13);">
  <tr><td style="background:linear-gradient(160deg,#0d6e5a,#148a6e,#1aad88);padding:48px 40px 36px;text-align:center;">
    <img src="${LOGO_URL}" alt="APTIVO Logo" width="90" height="90" style="width:90px;height:90px;border-radius:18px;display:block;margin:0 auto 20px;box-shadow:0 4px 20px rgba(0,0,0,0.25);" onerror="this.style.display='none'" />
    <h1 style="margin:0;font-family:'Georgia',serif;font-size:34px;color:#fff;letter-spacing:3px;text-transform:uppercase;">APTIVO</h1>
    <p style="margin:6px 0 0;color:#a8edda;font-size:13px;letter-spacing:2px;text-transform:uppercase;font-family:Arial,sans-serif;">Your Learning Journey</p>
  </td></tr>
  <tr><td style="height:5px;background:linear-gradient(90deg,#f59e0b,#ef4444,#f59e0b);"></td></tr>
  <tr><td style="padding:44px 48px 36px;">${content}</td></tr>
  <tr><td style="background:#f8fafb;padding:24px 48px;text-align:center;border-top:1px solid #e5e7eb;">
    <p style="margin:0;font-family:Arial,sans-serif;font-size:12px;color:#9ca3af;">© ${new Date().getFullYear()} APTIVO. All rights reserved.</p>
    <p style="margin:6px 0 0;font-family:Arial,sans-serif;font-size:11px;color:#d1d5db;">This is an automated email. Please do not reply.</p>
  </td></tr>
</table>
</td></tr>
</table>
</body></html>`;

export const verificationEmailTemplate = (name: string, verificationLink: string) =>
    emailWrapper(`
    <h2 style="margin:0 0 10px;font-family:'Georgia',serif;font-size:26px;color:#0d6e5a;font-weight:700;text-align:center;">Verify Your Email</h2>
    <p style="text-align:center;font-family:Arial,sans-serif;font-size:15px;color:#6b7280;margin-bottom:28px;">Hello <strong>${name}</strong>, welcome to APTIVO! Click the button below to verify your email address and activate your account.</p>
    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom:32px;"><tr><td align="center">
      <a href="${verificationLink}" style="display:inline-block;background:linear-gradient(135deg,#0d6e5a,#1aad88);color:#fff;font-family:Arial,sans-serif;font-size:15px;font-weight:700;padding:16px 48px;border-radius:50px;text-decoration:none;letter-spacing:1px;box-shadow:0 4px 18px rgba(13,110,90,0.35);">✉️ &nbsp; Verify My Email</a>
    </td></tr></table>
    <p style="text-align:center;font-family:Arial,sans-serif;font-size:12px;color:#9ca3af;">This link expires in <strong>30 minutes</strong>. If you didn't create an account, you can safely ignore this email.</p>
    <p style="text-align:center;font-family:Arial,sans-serif;font-size:11px;color:#d1d5db;margin-top:16px;word-break:break-all;">Or paste this link: <a href="${verificationLink}" style="color:#0d6e5a;">${verificationLink}</a></p>
  `);

export const passwordResetEmailTemplate = (name: string, resetLink: string) =>
    emailWrapper(`
    <h2 style="margin:0 0 10px;font-family:'Georgia',serif;font-size:26px;color:#0d6e5a;font-weight:700;text-align:center;">Reset Your Password</h2>
    <p style="text-align:center;font-family:Arial,sans-serif;font-size:15px;color:#6b7280;margin-bottom:28px;">Hello <strong>${name}</strong>, we received a request to reset your APTIVO password. Click the button below to create a new one.</p>
    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom:32px;"><tr><td align="center">
      <a href="${resetLink}" style="display:inline-block;background:linear-gradient(135deg,#dc2626,#f59e0b);color:#fff;font-family:Arial,sans-serif;font-size:15px;font-weight:700;padding:16px 48px;border-radius:50px;text-decoration:none;letter-spacing:1px;box-shadow:0 4px 18px rgba(220,38,38,0.3);">🔑 &nbsp; Reset My Password</a>
    </td></tr></table>
    <p style="text-align:center;font-family:Arial,sans-serif;font-size:12px;color:#9ca3af;">This link expires in <strong>30 minutes</strong>. If you did not request this reset, please ignore this email — your password will remain unchanged.</p>
    <p style="text-align:center;font-family:Arial,sans-serif;font-size:11px;color:#d1d5db;margin-top:16px;word-break:break-all;">Or paste this link: <a href="${resetLink}" style="color:#dc2626;">${resetLink}</a></p>
  `);

export const setPasswordEmailTemplate = (name: string, setPasswordLink: string) =>
    emailWrapper(`
    <h2 style="margin:0 0 10px;font-family:'Georgia',serif;font-size:26px;color:#0d6e5a;font-weight:700;text-align:center;">Set Your Password</h2>
    <p style="text-align:center;font-family:Arial,sans-serif;font-size:15px;color:#6b7280;margin-bottom:28px;">Hello <strong>${name}</strong>, you signed up via Google. To enable email login, please set a password for your APTIVO account.</p>
    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom:32px;"><tr><td align="center">
      <a href="${setPasswordLink}" style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#a855f7);color:#fff;font-family:Arial,sans-serif;font-size:15px;font-weight:700;padding:16px 48px;border-radius:50px;text-decoration:none;letter-spacing:1px;box-shadow:0 4px 18px rgba(124,58,237,0.3);">🔐 &nbsp; Set My Password</a>
    </td></tr></table>
    <p style="text-align:center;font-family:Arial,sans-serif;font-size:12px;color:#9ca3af;">This link expires in <strong>30 minutes</strong>. This step is optional — you can always sign in with Google.</p>
  `);
