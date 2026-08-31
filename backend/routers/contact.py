import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from services.email_service import EmailService

logger = logging.getLogger("hissaby.contact")
router = APIRouter(prefix="/api/contact", tags=["Contact Support Form"])

class ContactRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    email: str = Field(..., min_length=3, max_length=100)
    subject: str = Field(..., min_length=1, max_length=150)
    message: str = Field(..., min_length=1, max_length=1000)

@router.post("")
async def submit_contact_form(payload: ContactRequest):
    """Processes contact support submissions and forwards details to team@techkreative.com"""
    subject_line = f"[Hissaby Support Request] {payload.subject}"
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
        <div style="text-align: center; margin-bottom: 20px; border-bottom: 1px solid #edf2f7; padding-bottom: 15px;">
            <h2 style="color: #012456; margin: 0 0 5px 0;">Hissaby Buddy Support Desk</h2>
            <span style="font-size: 11px; text-transform: uppercase; color: #a0aec0; font-weight: bold;">New Ticket Submission</span>
        </div>
        
        <p>A user has submitted a support inquiry on the contact form:</p>
        
        <div style="background-color: #f7fafc; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #edf2f7;">
            <table style="width: 100%; font-size: 13px;">
                <tr>
                    <td style="padding: 5px 0; font-weight: bold; width: 100px;">From Name:</td>
                    <td style="padding: 5px 0; color: #2d3748;">{payload.name}</td>
                </tr>
                <tr>
                    <td style="padding: 5px 0; font-weight: bold;">Email:</td>
                    <td style="padding: 5px 0; color: #2d3748;"><a href="mailto:{payload.email}" style="color: #5391FE;">{payload.email}</a></td>
                </tr>
                <tr>
                    <td style="padding: 5px 0; font-weight: bold;">Subject:</td>
                    <td style="padding: 5px 0; color: #2d3748; font-weight: bold;">{payload.subject}</td>
                </tr>
            </table>
            
            <hr style="border: 0; border-top: 1px dashed #e2e8f0; margin: 15px 0;" />
            
            <h4 style="margin: 0 0 8px 0; color: #012456;">Message Details:</h4>
            <p style="margin: 0; font-size: 13px; color: #4a5568; white-space: pre-wrap; background-color: #ffffff; padding: 12px; border-radius: 6px; border: 1px solid #edf2f7;">{payload.message}</p>
        </div>

        <hr style="border: 0; border-top: 1px solid #edf2f7; margin: 25px 0;" />
        <p style="font-size: 10px; color: #a0aec0; text-align: center; margin: 0;">Sent automatically by Hissaby Buddy System.</p>
    </body>
    </html>
    """
    
    success = EmailService.send_email(
        to_email="team@techkreative.com",
        subject=subject_line,
        html_content=html_content
    )
    
    if not success:
        raise HTTPException(status_code=500, detail="Failed to dispatch support email. Please try again later.")
        
    return {"status": "success", "message": "Your support ticket has been forwarded to TechKreative Team!"}
