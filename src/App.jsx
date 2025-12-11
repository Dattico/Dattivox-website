import React from 'react';
import { ConfigProvider } from 'antd';
import DattivoxLanding from './pages/DattivoxLanding';
import './App.css';

// Ant Design theme configuration to match Octoplan design system
const antdTheme = {
  token: {
    colorPrimary: '#4C2E76', // Deep Purple from Octoplan
    colorSuccess: '#A286B9', // Lavender from Octoplan
    colorInfo: '#9EB9D8', // Light Blue from Octoplan
    colorWarning: '#A286B9',
    colorError: '#4C2E76',
    fontFamily: 'Montserrat, system-ui, sans-serif',
    fontSize: 16,
    borderRadius: 8,
    colorBgContainer: '#ffffff',
    colorBorder: '#F3F3EF',
    colorText: '#000000',
    colorTextSecondary: '#666666',
  },
  components: {
    Button: {
      fontWeight: 600,
      borderRadius: 8,
    },
    Input: {
      borderRadius: 8,
    },
    Form: {
      labelFontWeight: 600,
    },
  },
};

function App() {
  return (
    <ConfigProvider theme={antdTheme}>
      <div className="App">
        <DattivoxLanding />
      </div>
    </ConfigProvider>
  );
}

export default App;