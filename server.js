import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import contactHandler from './api/contact.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Contact API endpoint
app.post('/api/contact', async (req, res) => {
  try {
    await contactHandler(req, res);
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  
  if (process.env.AWS_ACCESS_KEY_ID) {
    console.log('✅ AWS SES configured (explicit credentials)');
  } else {
    console.log('ℹ️  AWS SES will use default credential chain (like Octoplan)');
    console.log('   - Checks ~/.aws/credentials');
    console.log('   - Checks IAM roles (if on EC2/Lambda)');
    console.log('   - Checks AWS Amplify credentials');
  }
  
  console.log(`   FROM: ${process.env.DATTIVOX_FROM_EMAIL || 'info@dattico.com'}`);
  console.log(`   TO: ${process.env.DATTIVOX_CONTACT_EMAIL || 'info@dattico.com'}`);
  console.log(`   SES_AVAILABLE: ${process.env.SES_AVAILABLE || 'not set'}`);
});