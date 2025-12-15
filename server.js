import express from 'express';
import cors from 'cors';
import contactHandler from './api/contact.js';

const app = express();
const PORT = 3001;

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
});