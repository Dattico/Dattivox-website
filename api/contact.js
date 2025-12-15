// Serverless function for handling contact form submissions
// Compatible with Vercel, Netlify, and other platforms

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

    // Email content
    const emailContent = {
      to: to || process.env.REACT_APP_CONTACT_EMAIL || 'hello@dattico.com',
      subject: `New contact from ${name} - Dattivox`,
      text: `
New contact form submission from Dattivox website:

Name: ${name}
Email: ${email}
Company: ${company || 'Not provided'}
Phone: ${phone || 'Not provided'}

Message:
${message}

---
Sent from Dattivox landing page
      `.trim(),
      html: `
        <h2>New contact form submission from Dattivox website</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Company:</strong> ${company || 'Not provided'}</p>
        <p><strong>Phone:</strong> ${phone || 'Not provided'}</p>
        <h3>Message:</h3>
        <p>${message.replace(/\n/g, '<br>')}</p>
        <hr>
        <p><em>Sent from Dattivox landing page</em></p>
      `
    };

    // Send email using your preferred service
    await sendEmail(emailContent);

    res.status(200).json({ success: true, message: 'Email sent successfully' });
  } catch (error) {
    console.error('Contact form error:', error);
    res.status(500).json({ error: 'Failed to send email' });
  }
}

// Email sending function - implement based on your email service
async function sendEmail(emailContent) {
  // Option 1: Using SendGrid
  if (process.env.SENDGRID_API_KEY) {
    const sgMail = require('@sendgrid/mail');
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    
    const msg = {
      to: emailContent.to,
      from: 'noreply@dattico.com', // Use your verified sender
      subject: emailContent.subject,
      text: emailContent.text,
      html: emailContent.html,
    };
    
    await sgMail.send(msg);
    return;
  }

  // Option 2: Using AWS SES
  if (process.env.AWS_ACCESS_KEY_ID) {
    const AWS = require('aws-sdk');
    
    const ses = new AWS.SES({
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.AWS_REGION || 'eu-central-1'
    });

    const params = {
      Destination: {
        ToAddresses: [emailContent.to]
      },
      Message: {
        Body: {
          Html: { Data: emailContent.html },
          Text: { Data: emailContent.text }
        },
        Subject: { Data: emailContent.subject }
      },
      Source: 'noreply@dattico.com' // Use your verified sender
    };

    await ses.sendEmail(params).promise();
    return;
  }

  // Option 3: Using Nodemailer with SMTP
  if (process.env.SMTP_HOST) {
    const nodemailer = require('nodemailer');
    
    const transporter = nodemailer.createTransporter({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

    await transporter.sendMail({
      from: process.env.SMTP_USER,
      to: emailContent.to,
      subject: emailContent.subject,
      text: emailContent.text,
      html: emailContent.html
    });
    return;
  }

  // If no email service is configured, log the email (development fallback)
  console.log('📧 Email would be sent:', emailContent);
  console.log('⚠️  No email service configured - email logged only');
}

export default handler;