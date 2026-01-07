import React from 'react';
import ReactDOM from 'react-dom/client';
import { Amplify } from 'aws-amplify';
import App from './App.jsx';

// Configure Amplify with backend outputs (like Callie)
// File exists in repo (default) and will be replaced by Amplify during deployment
import outputs from '../amplify_outputs.json';
Amplify.configure(outputs);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);