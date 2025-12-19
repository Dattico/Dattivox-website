// Serverless function for handling contact form submissions
// Compatible with Vercel, Netlify, and other platforms

import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

const handler = async (req, res) => {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { name, email, company, phone, message, to } = req.body;

    // Validate required fields
    if (!name || !email || !message) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Email configuration from environment variables (like Callie)
    const DATTIVOX_FROM_EMAIL = process.env.DATTIVOX_FROM_EMAIL || 'info@dattico.com';
    const DATTIVOX_REPLY_TO = process.env.DATTIVOX_REPLY_TO || 'info@dattico.com';
    const DATTIVOX_CONTACT_EMAIL = process.env.DATTIVOX_CONTACT_EMAIL || 'info@dattico.com';
    const REGION = process.env.AWS_REGION || 'eu-central-1';

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

    // Send email using AWS SES
    await sendEmail({
      from: DATTIVOX_FROM_EMAIL,
      replyTo: DATTIVOX_REPLY_TO,
      to: toEmail,
      subject: `New contact from ${name} - Dattivox`,
      html: emailBody,
      text: textBody,
      region: REGION
    });

    res.status(200).json({ 
      success: true, 
      message: 'Email sent successfully' 
    });
  } catch (error) {
    console.error('Contact form error:', error);
    res.status(500).json({ 
      error: 'Failed to send email',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

// Email sending function using AWS SES v3 (like Callie)
async function sendEmail({ from, replyTo, to, subject, html, text, region }) {
  // Configure SES client - use explicit credentials if provided, otherwise use default AWS SDK credentials chain
  // (like Octoplan does with Amplify - checks ~/.aws/credentials, IAM roles, etc.)
  const sesConfig = {
    region: region
  };

  // Only add explicit credentials if environment variables are set
  // Otherwise, AWS SDK will use default credential chain (like Octoplan)
  if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
    sesConfig.credentials = {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    };
    console.log('Using explicit AWS credentials from environment variables');
  } else {
    console.log('Using default AWS credential chain (like Octoplan) - checking ~/.aws/credentials, IAM roles, etc.');
  }

  const sesClient = new SESClient(sesConfig);

  const params = {
    Source: from,
    Destination: {
      ToAddresses: [to]
    },
    Message: {
      Subject: {
        Data: subject,
        Charset: 'UTF-8'
      },
      Body: {
        Html: {
          Data: html,
          Charset: 'UTF-8'
        },
        Text: {
          Data: text,
          Charset: 'UTF-8'
        }
      }
    },
    // Add Reply-To header if specified
    ...(replyTo && { ReplyToAddresses: [replyTo] })
  };

  console.log('Sending email via AWS SES:', { from, to, subject, replyTo });
  const command = new SendEmailCommand(params);
  const result = await sesClient.send(command);
  
  console.log('SES Response:', JSON.stringify(result, null, 2));
  return result;
}

// Helper function to escape HTML (security - prevent XSS)
function escapeHtml(text) {
  if (!text) return '';
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.toString().replace(/[&<>"']/g, m => map[m]);
}

export default handler;