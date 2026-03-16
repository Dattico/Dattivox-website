import React from 'react';
import { Card, Alert, Badge } from 'antd';
import { ValidationError } from './types';

type ValidationPanelProps = {
  errors: ValidationError[];
};

export const ValidationPanel: React.FC<ValidationPanelProps> = ({ errors }) => {
  const errorCount = errors.filter(e => e.severity === 'error').length;
  const warningCount = errors.filter(e => e.severity === 'warning').length;

  return (
    <Card 
      title={
        <div>
          Validation 
          {errorCount > 0 && <Badge count={errorCount} style={{ marginLeft: 8, backgroundColor: '#ff4d4f' }} />}
          {warningCount > 0 && <Badge count={warningCount} style={{ marginLeft: 8, backgroundColor: '#faad14' }} />}
        </div>
      }
      style={{ marginTop: 16 }}
    >
      {errors.length === 0 ? (
        <Alert message="No issues found" type="success" />
      ) : (
        errors.map((err, idx) => (
          <Alert
            key={idx}
            message={err.message}
            description={err.nodeId ? `Node: ${err.nodeId}` : undefined}
            type={err.severity === 'error' ? 'error' : 'warning'}
            style={{ marginBottom: 8 }}
          />
        ))
      )}
    </Card>
  );
};
