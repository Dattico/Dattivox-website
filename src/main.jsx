import React from 'react';
import ReactDOM from 'react-dom/client';
import { Amplify } from 'aws-amplify';
import App from './App.jsx';

// Configure Amplify with backend outputs (like Octoplan/Callie)
// In Amplify Hosting: automatically generated during build
// In local dev: run 'npm run sandbox' to generate it
try {
  const outputs = await import(/* @vite-ignore */ '../amplify_outputs.json');
  Amplify.configure(outputs.default || outputs);
} catch (error) {
  // Silently fail in production (file should always exist in Amplify Hosting)
  // In development, check console for warnings
  if (import.meta.env.DEV) {
    console.warn('⚠️  amplify_outputs.json not found. Run "npm run sandbox" to generate it.');
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);