import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from core.config import settings

logger = logging.getLogger("hissaby.email")

# Dynamic Frontend URL for email actions (local or production)
FRONTEND_PROD_URL = (settings.FRONTEND_URL or "https://hissabybuddy.techkreative.com").rstrip("/")

class EmailService:
    @staticmethod
    def send_email(to_email: str, subject: str, html_content: str):
        """Sends an HTML email using HTTP API (Resend) or fallback SMTP configuration"""
        # 1. Try Resend HTTP API if configured
        if settings.RESEND_API_KEY:
            try:
                import requests
                logger.info(f"Attempting to send email to {to_email} via Resend HTTP API...")
                url = "https://api.resend.com/emails"
                headers = {
                    "Authorization": f"Bearer {settings.RESEND_API_KEY}",
                    "Content-Type": "application/json"
                }
                payload = {
                    "from": f"Hissaby Buddy <onboarding@resend.dev>",
                    "to": [to_email],
                    "subject": subject,
                    "html": html_content
                }
                response = requests.post(url, json=payload, headers=headers, timeout=10)
                if response.status_code in [200, 201]:
                    logger.info(f"Email successfully sent to {to_email} via Resend HTTP API")
                    return True
                else:
                    logger.warning(f"Resend HTTP API returned {response.status_code}: {response.text}. Falling back to direct SMTP...")
            except Exception as resend_err:
                logger.warning(f"Resend HTTP API dispatch failed: {resend_err}. Falling back to SMTP...")

        # 2. Fallback to direct SMTP configuration
        if not settings.EMAIL_ID or not settings.EMAIL_SMTP or not settings.EMAIL_PASSWORD:
            logger.warning("Email configuration missing. Skipping SMTP dispatch.")
            return False

        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"Hissaby Buddy <{settings.EMAIL_ID}>"
        msg["To"] = to_email
        msg["Reply-To"] = settings.EMAIL_ID

        msg.attach(MIMEText(html_content, "html"))

        try:
            logger.info(f"Connecting to SMTP server {settings.EMAIL_SMTP} on port 465...")
            server = smtplib.SMTP_SSL(settings.EMAIL_SMTP, 465, timeout=15)
            server.login(settings.EMAIL_ID, settings.EMAIL_PASSWORD)
            server.sendmail(settings.EMAIL_ID, to_email, msg.as_string())
            server.close()
            logger.info(f"Email successfully sent to {to_email} via Port 465")
            return True
        except Exception as ssl_err:
            logger.warning(f"SMTP SSL Port 465 failed: {ssl_err}. Trying TLS on port 587...")
            try:
                server = smtplib.SMTP(settings.EMAIL_SMTP, 587, timeout=15)
                server.ehlo()
                server.starttls()
                server.ehlo()
                server.login(settings.EMAIL_ID, settings.EMAIL_PASSWORD)
                server.sendmail(settings.EMAIL_ID, to_email, msg.as_string())
                server.close()
                logger.info(f"Email successfully sent to {to_email} via Port 587")
                return True
            except Exception as tls_err:
                logger.error(f"Failed to send email to {to_email} via both 465 and 587: {tls_err}")
                return False

    @classmethod
    def send_welcome_email(cls, to_email: str, user_name: str):
        """Sends a beautiful welcome / onboarding email to new users"""
        subject = "Welcome to Hissaby Buddy! 🚀"
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #334155; margin: 0; padding: 40px 0; -webkit-font-smoothing: antialiased;">
          <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 24px; overflow: hidden; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);">
            <tr>
              <td style="padding: 40px; background: linear-gradient(135deg, #012456 0%, #0c3975 100%); text-align: center;">
                <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 900; letter-spacing: -0.03em;">Hissaby <span style="color: #5391FE;">Buddy</span></h1>
                <p style="color: #93c5fd; margin: 5px 0 0 0; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 1.5px;">Financial AI Copilot</p>
              </td>
            </tr>
            <tr>
              <td style="padding: 40px;">
                <h2 style="color: #012456; margin: 0 0 15px 0; font-size: 20px; font-weight: 800;">Welcome, {user_name}! 👋</h2>
                <p style="font-size: 14px; line-height: 1.6; margin: 0 0 24px 0;">We're thrilled to have you. Hissaby Buddy is designed to make tracking personal/shared finances, utilities, and grocery bills completely effortless using cutting-edge AI.</p>
                
                <div style="background-color: #f1f5f9; padding: 20px; border-radius: 16px; margin-bottom: 24px;">
                  <h3 style="color: #012456; margin: 0 0 12px 0; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">Onboarding Checklist:</h3>
                  <table width="100%" cellpadding="0" cellspacing="0" style="font-size: 13px; line-height: 1.5;">
                    <tr>
                      <td style="padding: 6px 0; vertical-align: top; width: 24px;">🤖</td>
                      <td style="padding: 6px 0;"><strong>Ask AI assistant</strong>: Ask natural-language budget, spending, or statement questions.</td>
                    </tr>
                    <tr>
                      <td style="padding: 6px 0; vertical-align: top; width: 24px;">👥</td>
                      <td style="padding: 6px 0;"><strong>Create Shared Groups</strong>: Split groceries or bills dynamically with flatmates or teammates.</td>
                    </tr>
                    <tr>
                      <td style="padding: 6px 0; vertical-align: top; width: 24px;">📄</td>
                      <td style="padding: 6px 0;"><strong>Statement Upload</strong>: Ingest statement PDFs or receipts with automatic smart OCR.</td>
                    </tr>
                  </table>
                </div>

                <div style="text-align: center; margin-bottom: 24px;">
                  <a href="{FRONTEND_PROD_URL}/dashboard" style="background-color: #5391FE; color: #ffffff; padding: 12px 28px; text-decoration: none; font-size: 14px; font-weight: 700; border-radius: 12px; display: inline-block; box-shadow: 0 4px 6px rgba(83, 145, 254, 0.15);">Launch Your Dashboard</a>
                </div>

                <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 30px 0;" />
                <p style="font-size: 11px; color: #94a3b8; text-align: center; margin: 0;">This is an automated transactional welcome mail. Please do not reply directly to this mail.</p>
              </td>
            </tr>
          </table>
        </body>
        </html>
        """
        return cls.send_email(to_email, subject, html_content)

    @classmethod
    def send_group_invitation(cls, to_email: str, inviter_name: str, group_name: str, invite_id: str):
        """Sends a beautiful HTML invitation email to join a shared group"""
        join_url = f"{FRONTEND_PROD_URL}/login?invite={invite_id}&email={to_email}"
        subject = f"Invitation to join '{group_name}' on Hissaby Buddy"
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #334155; margin: 0; padding: 40px 0; -webkit-font-smoothing: antialiased;">
          <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 24px; overflow: hidden; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);">
            <tr>
              <td style="padding: 40px; background: linear-gradient(135deg, #012456 0%, #0c3975 100%); text-align: center;">
                <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 900; letter-spacing: -0.03em;">Hissaby <span style="color: #5391FE;">Buddy</span></h1>
                <p style="color: #93c5fd; margin: 5px 0 0 0; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 1.5px;">Shared Group Invitation</p>
              </td>
            </tr>
            <tr>
              <td style="padding: 40px;">
                <h2 style="color: #012456; margin: 0 0 15px 0; font-size: 18px; font-weight: 800;">You're Invited! 👥</h2>
                <p style="font-size: 14px; line-height: 1.6; margin: 0 0 24px 0;">
                  <strong>{inviter_name}</strong> has invited you to join the shared financial group <strong>"{group_name}"</strong> on Hissaby Buddy.
                </p>
                
                <div style="background-color: #f1f5f9; padding: 20px; border-radius: 16px; margin-bottom: 24px; border: 1px solid #edf2f7; text-align: center;">
                  <span style="font-size: 12px; color: #64748b; font-weight: bold; text-transform: uppercase; display: block; margin-bottom: 8px;">Action Required</span>
                  <p style="margin: 0 0 16px 0; font-size: 13px; color: #475569;">Sign in or create an account below to automatically accept and join the shared billing ledger.</p>
                  <a href="{join_url}" style="background-color: #5391FE; color: white; padding: 12px 28px; text-decoration: none; font-size: 14px; font-weight: 700; border-radius: 12px; display: inline-block; box-shadow: 0 4px 6px rgba(83, 145, 254, 0.15);">Accept Invitation &amp; Join</a>
                </div>

                <p style="font-size: 13px; line-height: 1.6; color: #475569; margin: 0 0 20px 0;">
                  Inside this group, you'll be able to automatically log shared expenses, view category budget caps, and receive real-time email alerts for equal split shares.
                </p>

                <p style="font-size: 11px; color: #94a3b8; word-break: break-all; margin: 0 0 20px 0;">
                  If the button does not work, copy and paste this URL:<br/>
                  <a href="{join_url}" style="color: #5391FE;">{join_url}</a>
                </p>

                <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 30px 0;" />
                <p style="font-size: 11px; color: #94a3b8; text-align: center; margin: 0;">This is an automated invitation notification. Please do not reply directly to this mail.</p>
              </td>
            </tr>
          </table>
        </body>
        </html>
        """
        return cls.send_email(to_email, subject, html_content)

    @classmethod
    def send_payment_request(cls, to_email: str, payer_name: str, group_name: str, expense_description: str, total_amount: float, share_amount: float):
        """Sends a beautiful HTML payment request / expense share alert to group members"""
        subject = f"New Shared Expense in '{group_name}': Share request"
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #334155; margin: 0; padding: 40px 0; -webkit-font-smoothing: antialiased;">
          <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 24px; overflow: hidden; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);">
            <tr>
              <td style="padding: 40px; background: linear-gradient(135deg, #012456 0%, #0c3975 100%); text-align: center;">
                <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 900; letter-spacing: -0.03em;">Hissaby <span style="color: #5391FE;">Buddy</span></h1>
                <p style="color: #93c5fd; margin: 5px 0 0 0; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 1.5px;">Shared Payment Alert</p>
              </td>
            </tr>
            <tr>
              <td style="padding: 40px;">
                <h2 style="color: #012456; margin: 0 0 15px 0; font-size: 18px; font-weight: 800;">New Expense Logged 📝</h2>
                <p style="font-size: 14px; line-height: 1.6; margin: 0 0 24px 0;">
                  A new shared expense has been recorded in the group <strong>"{group_name}"</strong> by <strong>{payer_name}</strong>.
                </p>
                
                <div style="background-color: #fffaf0; padding: 24px; border-radius: 16px; margin-bottom: 24px; border: 1px solid #feebc8;">
                  <h4 style="margin: 0 0 12px 0; color: #c05621; font-size: 13px; font-weight: bold; text-transform: uppercase; border-bottom: 1px solid #fbd38d; padding-bottom: 6px;">Expense Summary</h4>
                  <table width="100%" style="font-size: 13px; border-collapse: collapse; line-height: 1.6;">
                    <tr>
                      <td style="padding: 6px 0; color: #64748b; font-weight: bold;">Description:</td>
                      <td style="padding: 6px 0; text-align: right; color: #1e293b; font-weight: bold;">{expense_description}</td>
                    </tr>
                    <tr>
                      <td style="padding: 6px 0; color: #64748b; font-weight: bold;">Total Amount:</td>
                      <td style="padding: 6px 0; text-align: right; color: #1e293b; font-weight: bold;">Rs {total_amount:,.2f}</td>
                    </tr>
                    <tr style="border-top: 1.5px dashed #fbd38d; font-size: 15px;">
                      <td style="padding: 12px 0 0 0; color: #c05621; font-weight: 900;">Your Share:</td>
                      <td style="padding: 12px 0 0 0; text-align: right; color: #c05621; font-weight: 900;">Rs {share_amount:,.2f}</td>
                    </tr>
                  </table>
                </div>

                <p style="font-size: 13px; line-height: 1.6; color: #475569; margin: 0 0 24px 0;">
                  This notification ensures full transparency. You can inspect category limits or check outstanding dues inside the group dashboard.
                </p>

                <div style="text-align: center; margin-bottom: 24px;">
                  <a href="{FRONTEND_PROD_URL}/dashboard/teams" style="background-color: #012456; color: white; padding: 12px 28px; text-decoration: none; font-size: 13px; font-weight: 700; border-radius: 12px; display: inline-block;">View Group Ledger</a>
                </div>

                <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 30px 0;" />
                <p style="font-size: 11px; color: #94a3b8; text-align: center; margin: 0;">This is an automated notification. Please do not reply directly to this mail.</p>
              </td>
            </tr>
          </table>
        </body>
        </html>
        """
        return cls.send_email(to_email, subject, html_content)

    @classmethod
    def send_settlement_notification(cls, to_email: str, debtor_name: str, creditor_name: str, group_name: str, amount: float, notes: str = ""):
        """Sends a beautiful HTML payment settlement reminder email"""
        subject = f"Payment Reminder: Pay Rs {amount:,.2f} to {creditor_name} in '{group_name}'"
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #334155; margin: 0; padding: 40px 0; -webkit-font-smoothing: antialiased;">
          <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 24px; overflow: hidden; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);">
            <tr>
              <td style="padding: 40px; background: linear-gradient(135deg, #012456 0%, #0c3975 100%); text-align: center;">
                <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 900; letter-spacing: -0.03em;">Hissaby <span style="color: #5391FE;">Buddy</span></h1>
                <p style="color: #93c5fd; margin: 5px 0 0 0; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 1.5px;">Group Settlement Notice</p>
              </td>
            </tr>
            <tr>
              <td style="padding: 40px;">
                <h2 style="color: #012456; margin: 0 0 15px 0; font-size: 18px; font-weight: 800;">Settlement Summary for {debtor_name} 💳</h2>
                <p style="font-size: 14px; line-height: 1.6; margin: 0 0 24px 0;">
                  Here is the latest expense settlement breakdown for the collaborative group <strong>"{group_name}"</strong>.
                </p>
                
                <div style="background-color: #f0fdf4; padding: 24px; border-radius: 16px; margin-bottom: 24px; border: 1px solid #bbf7d0;">
                  <h4 style="margin: 0 0 12px 0; color: #166534; font-size: 13px; font-weight: bold; text-transform: uppercase; border-bottom: 1px solid #86efac; padding-bottom: 6px;">Payment Required</h4>
                  <table width="100%" style="font-size: 13px; border-collapse: collapse; line-height: 1.6;">
                    <tr>
                      <td style="padding: 6px 0; color: #64748b; font-weight: bold;">From (You):</td>
                      <td style="padding: 6px 0; text-align: right; color: #1e293b; font-weight: bold;">{debtor_name}</td>
                    </tr>
                    <tr>
                      <td style="padding: 6px 0; color: #64748b; font-weight: bold;">Pay To:</td>
                      <td style="padding: 6px 0; text-align: right; color: #012456; font-weight: bold;">{creditor_name}</td>
                    </tr>
                    <tr style="border-top: 1.5px dashed #86efac; font-size: 16px;">
                      <td style="padding: 12px 0 0 0; color: #15803d; font-weight: 900;">Amount Due:</td>
                      <td style="padding: 12px 0 0 0; text-align: right; color: #15803d; font-weight: 900;">Rs {amount:,.2f}</td>
                    </tr>
                  </table>
                  {f'<p style="margin: 12px 0 0 0; font-size: 12px; color: #475569; font-style: italic;">Note: {notes}</p>' if notes else ''}
                </div>

                <p style="font-size: 13px; line-height: 1.6; color: #475569; margin: 0 0 24px 0;">
                  Please transfer or pay Rs {amount:,.2f} directly to {creditor_name}. Once paid, you can mark the payment or review group records in Hissaby Buddy.
                </p>

                <div style="text-align: center; margin-bottom: 24px;">
                  <a href="{FRONTEND_PROD_URL}/dashboard/teams" style="background-color: #5391FE; color: white; padding: 12px 28px; text-decoration: none; font-size: 13px; font-weight: 700; border-radius: 12px; display: inline-block;">Open Group Ledger</a>
                </div>

                <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 30px 0;" />
                <p style="font-size: 11px; color: #94a3b8; text-align: center; margin: 0;">This is an automated settlement notification. Please do not reply directly to this mail.</p>
              </td>
            </tr>
          </table>
        </body>
        </html>
        """
        return cls.send_email(to_email, subject, html_content)

    @classmethod
    def send_login_notification(cls, to_email: str, user_name: str = "Valued User", login_time: str = "", ip_address: str = "Current Session", device: str = "Web App"):
        """Sends a security / login notification email upon user authentication"""
        from datetime import datetime
        now_str = login_time or datetime.now().strftime("%B %d, %Y at %I:%M %p (PKT)")
        subject = "New Login Detected — Hissaby Buddy 🔐"
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #334155; margin: 0; padding: 40px 0; -webkit-font-smoothing: antialiased;">
          <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 24px; overflow: hidden; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);">
            <tr>
              <td style="padding: 40px; background: linear-gradient(135deg, #012456 0%, #0c3975 100%); text-align: center;">
                <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 900; letter-spacing: -0.03em;">Hissaby <span style="color: #5391FE;">Buddy</span></h1>
                <p style="color: #93c5fd; margin: 5px 0 0 0; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 1.5px;">Account Security Alert</p>
              </td>
            </tr>
            <tr>
              <td style="padding: 40px;">
                <h2 style="color: #012456; margin: 0 0 15px 0; font-size: 20px; font-weight: 800;">New Login to Your Account 🔐</h2>
                <p style="font-size: 14px; line-height: 1.6; margin: 0 0 24px 0;">
                  Hello <strong>{user_name}</strong>,<br/>
                  We detected a successful login to your Hissaby Buddy account associated with <strong>{to_email}</strong>.
                </p>
                
                <div style="background-color: #f1f5f9; padding: 20px; border-radius: 16px; margin-bottom: 24px; border: 1px solid #e2e8f0;">
                  <h4 style="margin: 0 0 12px 0; color: #012456; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">Login Details</h4>
                  <table width="100%" style="font-size: 13px; border-collapse: collapse; line-height: 1.6;">
                    <tr>
                      <td style="padding: 5px 0; color: #64748b; font-weight: bold;">Time:</td>
                      <td style="padding: 5px 0; text-align: right; color: #0f172a; font-weight: bold;">{now_str}</td>
                    </tr>
                    <tr>
                      <td style="padding: 5px 0; color: #64748b; font-weight: bold;">Device / Client:</td>
                      <td style="padding: 5px 0; text-align: right; color: #0f172a; font-weight: bold;">{device}</td>
                    </tr>
                    <tr>
                      <td style="padding: 5px 0; color: #64748b; font-weight: bold;">Session IP:</td>
                      <td style="padding: 5px 0; text-align: right; color: #0f172a; font-weight: bold;">{ip_address}</td>
                    </tr>
                  </table>
                </div>

                <p style="font-size: 13px; line-height: 1.6; color: #475569; margin: 0 0 24px 0;">
                  If this was you, no action is needed. You can manage your finances, groups, and AI analytics directly from your dashboard:
                </p>

                <div style="text-align: center; margin-bottom: 24px;">
                  <a href="{FRONTEND_PROD_URL}/dashboard" style="background-color: #5391FE; color: #ffffff; padding: 12px 28px; text-decoration: none; font-size: 14px; font-weight: 700; border-radius: 12px; display: inline-block; box-shadow: 0 4px 6px rgba(83, 145, 254, 0.15);">Go to Dashboard</a>
                </div>

                <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 30px 0;" />
                <p style="font-size: 11px; color: #94a3b8; text-align: center; margin: 0;">If you did not perform this login, please change your password immediately or contact support.</p>
              </td>
            </tr>
          </table>
        </body>
        </html>
        """
        return cls.send_email(to_email, subject, html_content)

    @classmethod
    def send_group_creation_email(cls, to_email: str, creator_name: str, group_name: str, group_theme: str = "team", currency: str = "PKR", workspace_id: str = ""):
        """Sends a confirmation email to the creator when a new group/team is created"""
        subject = f"Group '{group_name}' Successfully Created! 🎉"
        group_url = f"{FRONTEND_PROD_URL}/dashboard/teams"
        
        theme_titles = {
            "project": "Project & Milestones Tracker",
            "family": "Family Budget & Household Pool",
            "friends": "Friends & Shared Trip Ledger",
            "team": "Collaborative Team Finance"
        }
        theme_title = theme_titles.get(group_theme.lower(), f"{group_theme.capitalize()} Group")
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #334155; margin: 0; padding: 40px 0; -webkit-font-smoothing: antialiased;">
          <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 24px; overflow: hidden; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);">
            <tr>
              <td style="padding: 40px; background: linear-gradient(135deg, #012456 0%, #0c3975 100%); text-align: center;">
                <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 900; letter-spacing: -0.03em;">Hissaby <span style="color: #5391FE;">Buddy</span></h1>
                <p style="color: #93c5fd; margin: 5px 0 0 0; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 1.5px;">New Group Created</p>
              </td>
            </tr>
            <tr>
              <td style="padding: 40px;">
                <h2 style="color: #012456; margin: 0 0 15px 0; font-size: 20px; font-weight: 800;">Your Group is Ready, {creator_name}! 🚀</h2>
                <p style="font-size: 14px; line-height: 1.6; margin: 0 0 24px 0;">
                  You have successfully created the shared workspace <strong>"{group_name}"</strong>. You are configured as the <strong>Group Owner</strong> with full administration capabilities.
                </p>
                
                <div style="background-color: #f0fdf4; padding: 20px; border-radius: 16px; margin-bottom: 24px; border: 1px solid #bbf7d0;">
                  <h4 style="margin: 0 0 12px 0; color: #166534; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">Workspace Summary</h4>
                  <table width="100%" style="font-size: 13px; border-collapse: collapse; line-height: 1.6;">
                    <tr>
                      <td style="padding: 5px 0; color: #64748b; font-weight: bold;">Group Name:</td>
                      <td style="padding: 5px 0; text-align: right; color: #0f172a; font-weight: bold;">{group_name}</td>
                    </tr>
                    <tr>
                      <td style="padding: 5px 0; color: #64748b; font-weight: bold;">Theme Mode:</td>
                      <td style="padding: 5px 0; text-align: right; color: #0f172a; font-weight: bold;">{theme_title}</td>
                    </tr>
                    <tr>
                      <td style="padding: 5px 0; color: #64748b; font-weight: bold;">Default Currency:</td>
                      <td style="padding: 5px 0; text-align: right; color: #0f172a; font-weight: bold;">{currency}</td>
                    </tr>
                  </table>
                </div>

                <div style="background-color: #f1f5f9; padding: 20px; border-radius: 16px; margin-bottom: 24px;">
                  <h3 style="color: #012456; margin: 0 0 12px 0; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">What's next?</h3>
                  <table width="100%" cellpadding="0" cellspacing="0" style="font-size: 13px; line-height: 1.5;">
                    <tr>
                      <td style="padding: 6px 0; vertical-align: top; width: 24px;">📩</td>
                      <td style="padding: 6px 0;"><strong>Invite Members</strong>: Send invitations via email so members can automatically join.</td>
                    </tr>
                    <tr>
                      <td style="padding: 6px 0; vertical-align: top; width: 24px;">💰</td>
                      <td style="padding: 6px 0;"><strong>Log Shared Spendings</strong>: Log expenses and let Hissaby Buddy compute exact split shares.</td>
                    </tr>
                    <tr>
                      <td style="padding: 6px 0; vertical-align: top; width: 24px;">📊</td>
                      <td style="padding: 6px 0;"><strong>Set Budget Caps</strong>: Monitor group burn rate and category limits in real time.</td>
                    </tr>
                  </table>
                </div>

                <div style="text-align: center; margin-bottom: 24px;">
                  <a href="{group_url}" style="background-color: #5391FE; color: #ffffff; padding: 12px 28px; text-decoration: none; font-size: 14px; font-weight: 700; border-radius: 12px; display: inline-block; box-shadow: 0 4px 6px rgba(83, 145, 254, 0.15);">Manage Your Group</a>
                </div>

                <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 30px 0;" />
                <p style="font-size: 11px; color: #94a3b8; text-align: center; margin: 0;">This is an automated notification. Please do not reply directly to this mail.</p>
              </td>
            </tr>
          </table>
        </body>
        </html>
        """
        return cls.send_email(to_email, subject, html_content)

    @classmethod
    def send_group_deletion_email(cls, to_email: str, member_name: str, group_name: str, deleted_by: str = "an Admin"):
        """Sends a notification email to members when a workspace is permanently deleted"""
        subject = f"Group '{group_name}' Has Been Deleted 🗑️"
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #334155; margin: 0; padding: 40px 0; -webkit-font-smoothing: antialiased;">
          <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 24px; overflow: hidden; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);">
            <tr>
              <td style="padding: 40px; background: linear-gradient(135deg, #012456 0%, #0c3975 100%); text-align: center;">
                <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 900; letter-spacing: -0.03em;">Hissaby <span style="color: #5391FE;">Buddy</span></h1>
                <p style="color: #93c5fd; margin: 5px 0 0 0; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 1.5px;">Group Notice</p>
              </td>
            </tr>
            <tr>
              <td style="padding: 40px;">
                <h2 style="color: #012456; margin: 0 0 15px 0; font-size: 18px; font-weight: 800;">Workspace Deleted 🗑️</h2>
                <p style="font-size: 14px; line-height: 1.6; margin: 0 0 24px 0;">
                  Hello <strong>{member_name}</strong>,<br/>
                  The shared group <strong>"{group_name}"</strong> has been permanently removed by <strong>{deleted_by}</strong>.
                </p>
                
                <div style="background-color: #fef2f2; padding: 20px; border-radius: 16px; margin-bottom: 24px; border: 1px solid #fecaca;">
                  <p style="margin: 0; font-size: 13px; color: #991b1b; line-height: 1.5;">
                    All shared expenses, budget caps, and membership records associated with <strong>"{group_name}"</strong> have been cleaned from the system. If you believe this was done in error, please contact the workspace creator.
                  </p>
                </div>

                <div style="text-align: center; margin-bottom: 24px;">
                  <a href="{FRONTEND_PROD_URL}/dashboard" style="background-color: #012456; color: #ffffff; padding: 12px 28px; text-decoration: none; font-size: 14px; font-weight: 700; border-radius: 12px; display: inline-block;">Return to Dashboard</a>
                </div>

                <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 30px 0;" />
                <p style="font-size: 11px; color: #94a3b8; text-align: center; margin: 0;">This is an automated notification. Please do not reply directly to this mail.</p>
              </td>
            </tr>
          </table>
        </body>
        </html>
        """
        return cls.send_email(to_email, subject, html_content)



