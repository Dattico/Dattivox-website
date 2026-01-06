import React from 'react';
import ReactDOM from 'react-dom/client';
import { Amplify } from 'aws-amplify';
import App from './App.jsx';

// Configure Amplify with backend outputs
// In Amplify Hosting: automatically generated during build
// In local dev: run 'npm run sandbox' to generate it
let amplifyConfigured = false;
const amplifyConfigPromise = (async () => {
  try {
    // Load at runtime, not at build time (prevents build errors)
    const response = await fetch('/amplify_outputs.json');
    if (response.ok) {
      const outputs = await response.json();
      Amplify.configure(outputs);
      amplifyConfigured = true;
    } else {
      if (import.meta.env.DEV) {
        console.warn('⚠️  amplify_outputs.json not found. Run "npm run sandbox" to generate it.');
      }
    }
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn('⚠️  Could not load amplify_outputs.json:', error);
    }
  }
})();

// Export promise so components can wait for Amplify to be configured
window.__amplifyConfigPromise = amplifyConfigPromise;

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);