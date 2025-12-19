# Dattivox Landing Page

A modern, responsive landing page for Dattivox - Your 24/7 Virtual Secretary for Calls & WhatsApp.

## Features

- **Hero Section**: Clear positioning of Dattivox as a 24/7 virtual secretary
- **Demo Integration**: Embedded Twilio-powered voice demo
- **Contact Form**: Working contact form with email integration
- **Responsive Design**: Mobile-first approach with clean, modern styling
- **Consistent Branding**: Uses "24/7 virtual secretary" terminology throughout

## Tech Stack

- **Frontend**: React 18 + Vite
- **UI Components**: Ant Design (latest version)
- **Animations**: Framer Motion
- **Styling**: CSS with Octoplan design system colors
- **Demo**: Existing Twilio-powered OctoplanDemo component

## Quick Start

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Set up environment variables**:
   ```bash
   cp .env.example .env
   ```
   Edit `.env` with your configuration values.

3. **Start development server**:
   ```bash
   npm run dev
   ```

4. **Build for production**:
   ```bash
   npm run build
   ```

## Configuration

### Environment Variables

Create a `.env` file with the following variables:

```env
# Test phone number displayed on the landing page
REACT_APP_TEST_PHONE=+32 2 123 45 67

# Contact email where form submissions are sent
REACT_APP_CONTACT_EMAIL=hello@dattico.com

# Twilio configuration for the demo component
REACT_APP_TWILIO_ACCOUNT_SID=your_twilio_account_sid
REACT_APP_TWILIO_AUTH_TOKEN=your_twilio_auth_token
REACT_APP_TWILIO_PHONE_NUMBER=your_twilio_phone_number
```

### Email Service Setup

The contact form supports multiple email services. Configure one of the following:

#### Option 1: SendGrid
```env
SENDGRID_API_KEY=your_sendgrid_api_key
```

#### Option 2: AWS SES (Recommandé)
```env
# AWS SES Configuration
AWS_ACCESS_KEY_ID=your_aws_access_key_id
AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key
AWS_REGION=eu-central-1

# Email Configuration (comme Callie - variables séparées pour flexibilité)
DATTIVOX_FROM_EMAIL=info@dattico.com
DATTIVOX_REPLY_TO=info@dattico.com
DATTIVOX_CONTACT_EMAIL=info@dattico.com

# Server Configuration
PORT=3001
NODE_ENV=development
```

**Note** : Les trois variables d'email peuvent avoir la même valeur, mais sont séparées pour plus de flexibilité (comme dans Callie). L'adresse `DATTIVOX_FROM_EMAIL` doit être vérifiée dans AWS SES.

#### Option 3: SMTP (Gmail, etc.)
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
```

## Project Structure

```
src/
├── pages/
│   ├── DattivoxLanding.jsx    # Main landing page component
│   └── DattivoxLanding.css    # Landing page styles
├── api/
│   └── contact.js             # Contact form API handler
├── App.jsx                    # Main app component with Ant Design config
├── App.css                    # Global styles
└── main.jsx                   # React entry point

api/
└── contact.js                 # Serverless function for email handling

Demo/                          # Existing Twilio demo component
├── OctoplanDemo.jsx
├── OctoplanDemo.css
└── index.js
```

## Page Sections

### 1. Hero Section
- **Headline**: "Dattivox — Your 24/7 Virtual Secretary for Calls & WhatsApp"
- **Subtext**: Clear explanation of what Dattivox does
- **Test Phone Number**: Configurable via environment variable
- **CTAs**: "Try the Voice Demo" and "Contact Us"

### 2. Demo Section
- Embeds the existing OctoplanDemo component
- Fully functional Twilio integration
- Seamlessly integrated with page design

### 3. Features Section
- Six key features highlighting the "24/7 virtual secretary" concept
- Clean, card-based layout
- Hover animations

### 4. Contact Section
- Ant Design form with validation
- Fields: Name, Email, Company (optional), Phone (optional), Message
- Email integration with multiple service options

### 5. Footer
- Links to Terms and Privacy Policy
- Company information
- Dattico branding

## Deployment

### Vercel (Recommended)
1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Netlify
1. Connect repository to Netlify
2. Set build command: `npm run build`
3. Set publish directory: `dist`
4. Configure environment variables

### Manual Deployment
1. Build the project: `npm run build`
2. Upload the `dist` folder to your web server
3. Configure your server to handle the API endpoint

## Customization

### Colors and Styling
The design uses the Octoplan color system:
- **Primary**: `#4C2E76` (Deep Purple)
- **Secondary**: `#A286B9` (Lavender)
- **Accent**: `#9EB9D8` (Light Blue)
- **Background**: `#F3F3EF` (Light Gray)

### Content Updates
- Update phone number in `.env` file
- Modify feature descriptions in `DattivoxLanding.jsx`
- Customize email templates in `api/contact.js`

### Demo Integration
The existing OctoplanDemo component is imported and used as-is. Ensure all Twilio configuration is properly set up in your environment variables.

## Support

For questions or issues, contact the development team at hello@dattico.com.

## License

© 2024 Dattivox. All rights reserved.