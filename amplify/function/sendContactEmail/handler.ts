import type { Handler } from "aws-lambda";
import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";

// Email configuration from environment variables (like Callie)
const DATTIVOX_FROM_EMAIL = process.env.DATTIVOX_FROM_EMAIL || "info@dattico.com";
const DATTIVOX_REPLY_TO = process.env.DATTIVOX_REPLY_TO || "info@dattico.com";
const DATTIVOX_CONTACT_EMAIL = process.env.DATTIVOX_CONTACT_EMAIL || "info@dattico.com";
const REGION = process.env.REGION || "eu-central-1";

const sesClient = new SESv2Client({ region: REGION });

// Helper function to escape HTML (security - prevent XSS)
function escapeHtml(text: string | undefined): string {
  if (!text) return '';
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.toString().replace(/[&<>"']/g, m => map[m]);
}

export const handler: Handler = async (event: any) => {
  try {
    console.log("Contact form event received", JSON.stringify(event, null, 2));
    
    // GraphQL passes arguments in event.arguments or event.payload.arguments (Amplify Gen 2)
    const arguments_ = (event.arguments || event.payload?.arguments || event) as {
      name?: string;
      email?: string;
      company?: string;
      phone?: string;
      message?: string;
      to?: string;
    };
    
    console.log("Extracted arguments:", JSON.stringify(arguments_, null, 2));
    
    const { name, email, company, phone, message, to } = arguments_;
    
    // Validate required fields
    if (!name || !email || !message) {
      const missingFields: string[] = [];
      if (!name) missingFields.push('name');
      if (!email) missingFields.push('email');
      if (!message) missingFields.push('message');
      throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
    }

    // Destination email
    const toEmail = to || DATTIVOX_CONTACT_EMAIL;

    // Generate HTML email body (similar to Callie's format)
    const emailBody = `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #4C2E76; border-bottom: 2px solid #A286B9; padding-bottom: 10px;">
              New Contact Form Submission - Dattivox
            </h2>
            
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #4C2E76; margin-top: 0;">Contact Details:</h3>
              <p><strong>Name:</strong> ${escapeHtml(name)}</p>
              <p><strong>Email:</strong> <a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></p>
              <p><strong>Company:</strong> ${company ? escapeHtml(company) : 'Not provided'}</p>
              <p><strong>Phone:</strong> ${phone ? escapeHtml(phone) : 'Not provided'}</p>
            </div>
            
            <div style="background: white; padding: 15px; border-left: 4px solid #007bff; margin: 20px 0;">
              <h3 style="color: #4C2E76; margin-top: 0;">Message:</h3>
              <p style="white-space: pre-wrap;">${escapeHtml(message)}</p>
            </div>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e9ecef; color: #6c757d; font-size: 12px;">
              <p><em>Submitted via Dattivox website contact form</em></p>
              <p><em>Timestamp: ${new Date().toISOString()}</em></p>
            </div>
          </div>
        </body>
      </html>
    `;

    // Plain text version
    const textBody = `
New contact form submission from Dattivox website:

Name: ${name}
Email: ${email}
Company: ${company || 'Not provided'}
Phone: ${phone || 'Not provided'}

Message:
${message}

---
Submitted via Dattivox landing page
Timestamp: ${new Date().toISOString()}
    `.trim();

    // Send email using AWS SESv2
    const params = {
      FromEmailAddress: DATTIVOX_FROM_EMAIL,
      Destination: {
        ToAddresses: [toEmail]
      },
      Content: {
        Simple: {
          Subject: {
            Data: `New contact from ${name} - Dattivox`,
            Charset: 'UTF-8'
          },
          Body: {
            Html: {
              Data: emailBody,
              Charset: 'UTF-8'
            },
            Text: {
              Data: textBody,
              Charset: 'UTF-8'
            }
          }
        }
      },
      ReplyToAddresses: DATTIVOX_REPLY_TO ? [DATTIVOX_REPLY_TO] : undefined
    };

    console.log("Sending contact email via AWS SESv2:", { from: DATTIVOX_FROM_EMAIL, to: toEmail });
    const command = new SendEmailCommand(params);
    const result = await sesClient.send(command);
    
    console.log("SESv2 Response:", JSON.stringify(result, null, 2));

    // Return directly for GraphQL (matches ContactEmailResponse type)
    return {
      success: true,
      message: "Email sent successfully",
      messageId: result.MessageId || 'sent',
    };
  } catch (error) {
    console.error("Error sending contact email:", error);
    // Return error response instead of throwing (like Callie example)
    return {
      success: false,
      message: error instanceof Error ? error.message : "Error while sending email",
      messageId: null,
    };
  }
};

