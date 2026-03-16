/**
 * Custom Node Components for Flow Editor
 * 
 * Defines visual representations for all node types in the conversation flow.
 * Each node type has a distinct color scheme and icon for easy identification.
 * 
 * Node Types:
 * - TriggerNode: Entry point with language rules (Blue)
 * - AskNode: Question nodes that collect user input (Light Blue)
 * - DecisionNode: Branching logic with multiple outputs (Orange)
 * - InfoNode: Information delivery to user (Green)
 * - TransferNode: Hand-off to human agent with phone/extension (Purple)
 * - EndNode: Conversation termination (Gray)
 * - GlossaryNode: Term definitions (Yellow)
 * 
 * All nodes use ReactFlow Handle components for connection points.
 * 
 * Called by: FlowEditor.tsx (via nodeTypes configuration)
 */

import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Card } from 'antd';
import BoltIcon from '@mui/icons-material/Bolt';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import PhoneForwardedIcon from '@mui/icons-material/PhoneForwarded';
import TranslateIcon from '@mui/icons-material/Translate';

// Helper to get translated text or fallback
const getTranslated = (data: any, field: string, lang: string = 'en') => {
  const value = data[field];
  // New format: field is an object with language keys
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value[lang] ?? value['en'] ?? value['fr'] ?? value['nl'] ?? value['de'] ?? '';
  }
  // Old format: check translations wrapper
  if (data.translations?.[lang]?.[field] !== undefined) {
    return data.translations[lang][field];
  }
  // Fallback to plain value
  return value ?? '';
};

// Check if translation exists for current language
const hasTranslation = (data: any, lang: string, fields: string[]) => {
  return fields.every(field => {
    const value = data[field];
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const val = value[lang];
      return val && (Array.isArray(val) ? val.length > 0 : val.toString().trim() !== '');
    }
    return false; // If not an object with translations, it's missing
  });
};

// Check if we should show translation badge (missing translation indicator)
const needsTranslationBadge = (data: any, lang: string, fields: string[]) => {
  return fields.some(field => {
    const value = data[field];
    // New format: field is translation object
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const val = value[lang];
      return !val || (Array.isArray(val) ? val.length === 0 : val.toString().trim() === '');
    }
    // Old format: check translations wrapper
    if (data.translations) {
      const translatedValue = data.translations[lang]?.[field];
      return !translatedValue || (Array.isArray(translatedValue) ? translatedValue.length === 0 : translatedValue.toString().trim() === '');
    }
    // Plain string/array - no badge
    return false;
  });
};

export const TriggerNode = memo(({ data, selected }: NodeProps) => {
  const lang = data.__langKey || (window as any).__flowEditorLanguage || 'en';
  const name = getTranslated(data, 'name', lang);
  const phrases = getTranslated(data, 'phrases', lang) || [];
  const showBadge = needsTranslationBadge(data, lang, ['name', 'phrases']);
  const isFallback = showBadge && name;
  return (
    <Card size="small" style={{ minWidth: 200, border: selected ? '2px solid #1890ff' : '1px solid #d9d9d9', background: '#E3F2FD', position: 'relative' }}>
      {showBadge && (
        <div style={{ position: 'absolute', top: 4, right: 4, background: '#8c8c8c', borderRadius: '50%', width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Translation missing">
          <TranslateIcon sx={{ fontSize: 14, color: '#fff' }} />
        </div>
      )}
      <div style={{ fontWeight: 'bold', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6, opacity: isFallback ? 0.5 : 1, fontStyle: isFallback ? 'italic' : 'normal' }}>
        <BoltIcon sx={{ fontSize: 18, color: '#1976D2' }} />
        {name || 'Procedure'}
      </div>
      <div style={{ fontSize: 12, opacity: isFallback ? 0.5 : 1 }}>Phrases: {phrases.length || 0}</div>
      <Handle type="source" position={Position.Bottom} id="next" style={{ width: 16, height: 16 }} />
    </Card>
  );
});

export const AskNode = memo(({ data, selected }: NodeProps) => {
  const lang = data.__langKey || (window as any).__flowEditorLanguage || 'en';
  const question = getTranslated(data, 'question', lang);
  const showBadge = needsTranslationBadge(data, lang, ['question']);
  const isFallback = showBadge && question;
  return (
    <Card size="small" style={{ minWidth: 200, border: selected ? '2px solid #1890ff' : '1px solid #d9d9d9', background: '#E8F4F8', position: 'relative' }}>
      {showBadge && (
        <div style={{ position: 'absolute', top: 4, right: 4, background: '#8c8c8c', borderRadius: '50%', width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Translation missing">
          <TranslateIcon sx={{ fontSize: 14, color: '#fff' }} />
        </div>
      )}
      <Handle type="target" position={Position.Top} style={{ width: 16, height: 16 }} />
      <div style={{ fontWeight: 'bold', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
        <HelpOutlineIcon sx={{ fontSize: 18, color: '#0288D1' }} />
        Ask
      </div>
      <div style={{ fontSize: 12, opacity: isFallback ? 0.5 : 1, fontStyle: isFallback ? 'italic' : 'normal' }}>{question || 'No question'}</div>
      <Handle type="source" position={Position.Bottom} id="next" style={{ width: 16, height: 16 }} />
    </Card>
  );
});

export const DecisionNode = memo(({ data, selected }: NodeProps) => {
  const lang = data.__langKey || (window as any).__flowEditorLanguage || 'en';
  const conditionLabel = getTranslated(data, 'conditionLabel', lang);
  let branches = getTranslated(data, 'branches', lang) || ['yes', 'no'];
  
  // Ensure connected branches are included even if not in branches array
  if (data._connectedBranches && Array.isArray(data._connectedBranches)) {
    const allBranches = new Set([...branches, ...data._connectedBranches]);
    branches = Array.from(allBranches);
  }
  
  const spacing = 200 / (branches.length + 1);
  const showBadge = needsTranslationBadge(data, lang, ['conditionLabel', 'branches']);
  const isFallback = showBadge && conditionLabel;
  return (
    <Card size="small" style={{ minWidth: 200, border: selected ? '2px solid #1890ff' : '1px solid #d9d9d9', background: '#FFF3E0', position: 'relative' }}>
      {showBadge && (
        <div style={{ position: 'absolute', top: 4, right: 4, background: '#8c8c8c', borderRadius: '50%', width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Translation missing">
          <TranslateIcon sx={{ fontSize: 14, color: '#fff' }} />
        </div>
      )}
      <Handle type="target" position={Position.Top} style={{ width: 16, height: 16 }} />
      <div style={{ fontWeight: 'bold', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
        <AccountTreeIcon sx={{ fontSize: 18, color: '#F57C00' }} />
        Decision
      </div>
      <div style={{ fontSize: 12, opacity: isFallback ? 0.5 : 1, fontStyle: isFallback ? 'italic' : 'normal' }}>{conditionLabel?.substring(0, 20) || 'No condition'}{conditionLabel?.length > 20 ? '...' : ''}</div>
      {branches.map((branch: string, idx: number) => (
        <Handle key={`${branch}-${idx}`} type="source" position={Position.Bottom} id={branch} style={{ left: (idx + 1) * spacing, width: 16, height: 16 }} />
      ))}
    </Card>
  );
});

export const InfoNode = memo(({ data, selected }: NodeProps) => {
  const lang = data.__langKey || (window as any).__flowEditorLanguage || 'en';
  const say = getTranslated(data, 'say', lang);
  const showBadge = needsTranslationBadge(data, lang, ['say']);
  const isFallback = showBadge && say;
  return (
    <Card size="small" style={{ minWidth: 200, border: selected ? '2px solid #1890ff' : '1px solid #d9d9d9', background: '#E8F5E9', position: 'relative' }}>
      {showBadge && (
        <div style={{ position: 'absolute', top: 4, right: 4, background: '#8c8c8c', borderRadius: '50%', width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Translation missing">
          <TranslateIcon sx={{ fontSize: 14, color: '#fff' }} />
        </div>
      )}
      <Handle type="target" position={Position.Top} style={{ width: 16, height: 16 }} />
      <div style={{ fontWeight: 'bold', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
        <InfoOutlinedIcon sx={{ fontSize: 18, color: '#388E3C' }} />
        Info
      </div>
      <div style={{ fontSize: 12, opacity: isFallback ? 0.5 : 1, fontStyle: isFallback ? 'italic' : 'normal' }}>{say?.substring(0, 20) || 'No text'}{say?.length > 20 ? '...' : ''}</div>
      {data.contactEmail && <div style={{ fontSize: 11, color: '#1976D2', marginTop: 4 }}>📧 {data.contactEmail}</div>}
      <Handle type="source" position={Position.Bottom} id="next" style={{ width: 16, height: 16 }} />
    </Card>
  );
});

export const TransferNode = memo(({ data, selected }: NodeProps) => {
  const lang = data.__langKey || (window as any).__flowEditorLanguage || 'en';
  const toService = getTranslated(data, 'toService', lang);
  const showBadge = needsTranslationBadge(data, lang, ['toService', 'say']);
  const isFallback = showBadge && toService;
  return (
    <Card size="small" style={{ minWidth: 200, border: selected ? '2px solid #1890ff' : '1px solid #d9d9d9', background: '#F3E5F5', position: 'relative' }}>
      {showBadge && (
        <div style={{ position: 'absolute', top: 4, right: 4, background: '#8c8c8c', borderRadius: '50%', width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Translation missing">
          <TranslateIcon sx={{ fontSize: 14, color: '#fff' }} />
        </div>
      )}
      <Handle type="target" position={Position.Top} style={{ width: 16, height: 16 }} />
      <div style={{ fontWeight: 'bold', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
        <PhoneForwardedIcon sx={{ fontSize: 18, color: '#7B1FA2' }} />
        Transfer
      </div>
      <div style={{ fontSize: 12, opacity: isFallback ? 0.5 : 1, fontStyle: isFallback ? 'italic' : 'normal' }}>{toService?.substring(0, 20) || 'No service'}{toService?.length > 20 ? '...' : ''}</div>
      {data.phoneOrExtension && <div style={{ fontSize: 11, color: '#666' }}>☎️ {data.phoneOrExtension}</div>}
      {(data.onlyDuringWorkingHours ?? true) && <div style={{ fontSize: 10, color: '#1890ff', marginTop: 4 }}>⏰ Working hours only</div>}
      {data.informBeforeTransfer && <div style={{ fontSize: 10, color: '#7B1FA2', marginTop: 4 }}>💬 Inform first</div>}
    </Card>
  );
});



export const EndNode = memo(({ data, selected }: NodeProps) => (
  <Card size="small" style={{ minWidth: 200, border: selected ? '2px solid #1890ff' : '1px solid #d9d9d9', background: '#f5f5f5' }}>
    <Handle type="target" position={Position.Top} style={{ width: 16, height: 16 }} />
    <div style={{ fontWeight: 'bold', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>⏹️ End</div>
    <div style={{ fontSize: 12, color: '#666' }}>Conversation ends</div>
  </Card>
));

export const GlossaryNode = memo(({ data, selected }: NodeProps) => (
  <Card size="small" style={{ minWidth: 200, border: selected ? '2px solid #1890ff' : '1px solid #d9d9d9', background: '#fffbe6' }}>
    <Handle type="target" position={Position.Top} style={{ width: 16, height: 16 }} />
    <div style={{ fontWeight: 'bold', marginBottom: 8 }}>📖 Glossary</div>
    <div style={{ fontSize: 12, fontWeight: 600 }}>{data.term || 'No term'}</div>
    <div style={{ fontSize: 11, color: '#666' }}>{data.definition?.substring(0, 40) || 'No definition'}...</div>
    <Handle type="source" position={Position.Bottom} id="next" style={{ width: 16, height: 16 }} />
  </Card>
));
