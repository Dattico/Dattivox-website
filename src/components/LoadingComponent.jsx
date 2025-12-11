import React from 'react';
import { Spin } from 'antd';

const LoadingComponent = ({ size = 40, spinning = true, demo = false }) => {
  if (demo) {
    return (
      <div style={{ 
        width: size, 
        height: size, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center' 
      }}>
        <Spin size="large" spinning={spinning} />
      </div>
    );
  }
  
  return <Spin size="large" spinning={spinning} />;
};

export default LoadingComponent;