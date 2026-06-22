import aiosmtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from app.config import settings


async def _send(to: str, subject: str, html: str, _plain_url: str = ""):
    """Send an email. Prints the link to console if SMTP is not configured."""
    if not settings.SMTP_USER or not settings.SMTP_PASS or settings.SMTP_PASS == "YOUR_EMAIL_PASSWORD_HERE":
        print(f"\n{'='*60}")
        print(f"[EMAIL — no SMTP configured]")
        print(f"  To      : {to}")
        print(f"  Subject : {subject}")
        if _plain_url:
            print(f"  Link    : {_plain_url}")
        print(f"{'='*60}\n")
        return

    msg = MIMEMultipart("alternative")
    msg["From"] = f"{settings.SMTP_FROM_NAME} <{settings.SMTP_USER}>"
    msg["To"] = to
    msg["Subject"] = subject
    msg.attach(MIMEText(html, "html"))

    try:
        await aiosmtplib.send(
            msg,
            hostname=settings.SMTP_HOST,
            port=settings.SMTP_PORT,
            username=settings.SMTP_USER,
            password=settings.SMTP_PASS,
            start_tls=True,
        )
    except Exception as e:
        print(f"[Email ERROR] {e}")


def _wrap(title: str, body: str) -> str:
    """Wrap body HTML in a branded email template."""
    return f"""<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0f0f0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f0f;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#1a1a1a;border-radius:16px;overflow:hidden;border:1px solid #2a2a2a;">
        <!-- Header -->
        <tr>
          <td style="background:#111;padding:28px 32px;border-bottom:1px solid #2a2a2a;">
            <table cellpadding="0" cellspacing="0">
              <tr>
                <td style="font-size:24px;padding-right:10px;">🕯️</td>
                <td>
                  <div style="font-size:20px;font-weight:700;color:#fff;font-family:serif;">راہنما</div>
                  <div style="font-size:11px;color:#666;margin-top:1px;">Riphah International University</div>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:32px;">
            <h2 style="color:#fff;margin:0 0 16px;font-size:22px;">{title}</h2>
            {body}
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="padding:20px 32px;border-top:1px solid #2a2a2a;">
            <p style="color:#555;font-size:11px;margin:0;">
              This email was sent by Rahnuma AI Assistant — Riphah International University.<br>
              If you did not request this, please ignore this email.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>"""


async def send_verification_email(to: str, username: str, token: str):
    link = f"{settings.APP_URL}/verify-email?token={token}"
    body = f"""
    <p style="color:#ccc;font-size:15px;line-height:1.6;">Hi <strong style="color:#fff">{username}</strong>,</p>
    <p style="color:#ccc;font-size:15px;line-height:1.6;">
      Welcome to <strong style="color:#fff">Rahnuma</strong>! Please verify your email address to activate your account.
    </p>
    <div style="margin:28px 0;text-align:center;">
      <a href="{link}" style="background:#16a34a;color:#fff;text-decoration:none;padding:14px 32px;border-radius:10px;font-weight:600;font-size:15px;display:inline-block;">
        ✓ &nbsp;Verify Email Address
      </a>
    </div>
    <p style="color:#666;font-size:13px;">This link expires in <strong style="color:#999">24 hours</strong>. If the button does not work, copy and paste this link:</p>
    <p style="color:#16a34a;font-size:12px;word-break:break-all;">{link}</p>
    """
    await _send(to, "Verify your Rahnuma account", _wrap("Verify your email", body), _plain_url=link)


async def send_welcome_email(to: str, username: str):
    body = f"""
    <p style="color:#ccc;font-size:15px;line-height:1.6;">Hi <strong style="color:#fff">{username}</strong>,</p>
    <p style="color:#ccc;font-size:15px;line-height:1.6;">
      Your Rahnuma account has been <strong style="color:#16a34a">successfully verified</strong>! 🎉
    </p>
    <p style="color:#ccc;font-size:15px;line-height:1.6;">
      You can now sign in and start using all features of your AI assistant.
    </p>
    <div style="margin:28px 0;text-align:center;">
      <a href="{settings.APP_URL}/login" style="background:#16a34a;color:#fff;text-decoration:none;padding:14px 32px;border-radius:10px;font-weight:600;font-size:15px;display:inline-block;">
        Sign in to Rahnuma →
      </a>
    </div>
    """
    await _send(to, "Welcome to Rahnuma — Account activated!", _wrap("Account Activated", body))


async def send_password_reset_email(to: str, username: str, token: str):
    link = f"{settings.APP_URL}/reset-password?token={token}"
    body = f"""
    <p style="color:#ccc;font-size:15px;line-height:1.6;">Hi <strong style="color:#fff">{username}</strong>,</p>
    <p style="color:#ccc;font-size:15px;line-height:1.6;">
      We received a request to reset your password. Click the button below to choose a new one.
    </p>
    <div style="margin:28px 0;text-align:center;">
      <a href="{link}" style="background:#dc2626;color:#fff;text-decoration:none;padding:14px 32px;border-radius:10px;font-weight:600;font-size:15px;display:inline-block;">
        Reset Password
      </a>
    </div>
    <p style="color:#666;font-size:13px;">This link expires in <strong style="color:#999">1 hour</strong>. If you did not request this, you can safely ignore this email — your password has not changed.</p>
    <p style="color:#555;font-size:12px;word-break:break-all;">{link}</p>
    """
    await _send(to, "Reset your Rahnuma password", _wrap("Password Reset Request", body), _plain_url=link)


async def send_login_notification(to: str, username: str, ip: str, user_agent: str):
    body = f"""
    <p style="color:#ccc;font-size:15px;line-height:1.6;">Hi <strong style="color:#fff">{username}</strong>,</p>
    <p style="color:#ccc;font-size:15px;line-height:1.6;">
      A new sign-in to your Rahnuma account was detected.
    </p>
    <table style="background:#111;border-radius:8px;padding:16px;width:100%;border:1px solid #2a2a2a;border-collapse:collapse;">
      <tr><td style="color:#888;font-size:12px;padding:6px 0;">IP Address</td><td style="color:#ccc;font-size:13px;">{ip}</td></tr>
      <tr><td style="color:#888;font-size:12px;padding:6px 0;">Browser</td><td style="color:#ccc;font-size:13px;">{user_agent[:80]}</td></tr>
    </table>
    <p style="color:#666;font-size:13px;margin-top:16px;">If this was you, no action is needed. If this was not you, please reset your password immediately.</p>
    """
    await _send(to, "New sign-in to your Rahnuma account", _wrap("Sign-in Notification", body))
