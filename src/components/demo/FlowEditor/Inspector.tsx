/**
 * Inspector Component
 * 
 * Property panel for editing selected node data in the flow editor.
 * Provides context-specific form fields based on node type.
 * 
 * Features:
 * - Dynamic form fields per node type
 * - Word document upload for Info nodes (using mammoth.js)
 * - Multi-rule management for Trigger nodes
 * - Branch management for Decision nodes
 * - Phone number input for Transfer nodes
 * - Working hours checkbox for Transfer nodes
 * - Real-time updates to node data
 * 
 * Node-Specific Fields:
 * - Trigger: Language, Rules (phrase, intent, target)
 * - Ask: Question, Variable Name, Help Text
 * - Decision: Condition Label, Branches
 * - Info: Say text, Document upload
 * - Transfer: Service name, Phone/Extension, Working hours flag, Say text
 * - End: Say text
 * 
 * @param {Object} props
 * @param {Node | null} props.selectedNode - Currently selected node
 * @param {Function} props.onUpdate - Callback to update node data
 * 
 * Called by: FlowEditor.tsx
 */

import React, { useState } from 'react';
import { Card, Input, Select, Button, Space, Upload, message, List, Typography, Checkbox, Collapse, Divider, Tag, Tooltip } from 'antd';
import { Node } from 'reactflow';
import { PlusOutlined, DeleteOutlined, UploadOutlined, FileTextOutlined, CheckCircleOutlined, CloseCircleOutlined, BookOutlined, DownloadOutlined } from '@ant-design/icons';
import { uploadData, getUrl } from 'aws-amplify/storage';

const { TextArea } = Input;
const { Option } = Select;
const { Text } = Typography;

type InspectorProps = {
  selectedNode: Node | null;
  onUpdate: (nodeId: string, data: any) => void;
  language: string;
};

export const Inspector: React.FC<InspectorProps> = ({ selectedNode, onUpdate, language }) => {
  const [uploading, setUploading] = useState(false);

  if (!selectedNode) {
    return <div style={{ padding: 24, color: '#999', textAlign: 'center' }}>Select a node to edit</div>;
  }

  // Get translations for current language
  const getTranslation = (field: string) => {
    return selectedNode.data.translations?.[language]?.[field] ?? selectedNode.data[field] ?? '';
  };

  const setTranslation = (field: string, value: any) => {
    const translations = selectedNode.data.translations || {};
    const langData = translations[language] || {};
    langData[field] = value;
    translations[language] = langData;
    onUpdate(selectedNode.id, { ...selectedNode.data, translations });
  };

  if (selectedNode.type === 'info') {
    console.log('[MISSING_DOC_DEBUG] Info node data:', JSON.stringify(selectedNode.data, null, 2));
    console.log('[MISSING_DOC_DEBUG] Documents array:', selectedNode.data.documents);
    console.log('[MISSING_DOC_DEBUG] Documents length:', selectedNode.data.documents?.length);
  }

  const handleChange = (field: string, value: any) => {
    const updatedData = { ...selectedNode.data, [field]: value };
    if (selectedNode.type === 'info' && !updatedData.documents) {
      updatedData.documents = [];
    }
    onUpdate(selectedNode.id, updatedData);
  };

  const addPhrase = () => {
    const currentPhrases = getTranslation('phrases') || [];
    const phrases = Array.isArray(currentPhrases) ? [...currentPhrases, ''] : [''];
    setTranslation('phrases', phrases);
  };

  const removePhrase = (idx: number) => {
    const currentPhrases = getTranslation('phrases') || [];
    const phrases = currentPhrases.filter((_: any, i: number) => i !== idx);
    setTranslation('phrases', phrases);
  };

  const updatePhrase = (idx: number, value: string) => {
    const currentPhrases = getTranslation('phrases') || [];
    const phrases = [...currentPhrases];
    phrases[idx] = value;
    setTranslation('phrases', phrases);
  };

  const addBranch = () => {
    const currentBranches = getTranslation('branches') || [];
    const branches = [...currentBranches, `Branch ${currentBranches.length + 1}`];
    setTranslation('branches', branches);
  };

  const removeBranch = (idx: number) => {
    const currentBranches = getTranslation('branches') || [];
    const branches = currentBranches.filter((_: any, i: number) => i !== idx);
    setTranslation('branches', branches);
  };

  const updateBranch = (idx: number, value: string) => {
    const currentBranches = getTranslation('branches') || [];
    const branches = [...currentBranches];
    branches[idx] = value;
    setTranslation('branches', branches);
  };

  return (
    <div style={{ height: '100%', overflow: 'auto', background: '#fafafa' }}>
      {/* Title Section - Only for Info nodes */}
      {selectedNode.type === 'info' && (
        <div style={{ padding: '20px 24px', background: '#fff', borderBottom: '1px solid #f0f0f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Input 
              placeholder="Knowledge Title (required for document upload)" 
              value={selectedNode.data.flowTitle || ''} 
              onChange={e => handleChange('flowTitle', e.target.value)}
              disabled={selectedNode.data.titleLocked}
              style={{ fontSize: 16, fontWeight: 500, border: 'none', padding: 0, flex: 1 }}
              variant="borderless"
            />
            {selectedNode.data.titleLocked && (
              <Tooltip title="Title is locked because documents are stored under this name. Delete all documents to change the title.">
                <span style={{ fontSize: 16 }}>🔒</span>
              </Tooltip>
            )}
          </div>
        </div>
      )}

      <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {selectedNode.type === 'trigger' && (
          <Collapse defaultActiveKey={['basic']} ghost items={[{
            key: 'basic',
            label: <span style={{ fontWeight: 600 }}>Basic</span>,
            children: <>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', marginBottom: 4, fontWeight: 500, fontSize: 13 }}>Name (max 20 chars)</label>
                <Input 
                  placeholder="e.g., Lost Doc" 
                  value={getTranslation('name')} 
                  onChange={e => setTranslation('name', e.target.value.substring(0, 20))} 
                  maxLength={20}
                />
              </div>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 500, fontSize: 13 }}>Trigger Phrases</label>
              {(getTranslation('phrases') || []).map((phrase: string, idx: number) => (
                <Space key={idx} style={{ marginBottom: 8, width: '100%', display: 'flex' }}>
                  <TextArea 
                    placeholder="e.g., lost document, stolen ID card" 
                    value={phrase} 
                    onChange={e => updatePhrase(idx, e.target.value)} 
                    autoSize={{ minRows: 1, maxRows: 4 }}
                    style={{ flex: 1, width: 450 }} 
                  />
                  <Button danger size="small" icon={<DeleteOutlined />} onClick={() => removePhrase(idx)} />
                </Space>
              ))}
              <Button icon={<PlusOutlined />} onClick={addPhrase} block>Add Phrase</Button>
            </>
          }]} />
        )}

        {selectedNode.type === 'ask' && (
          <Collapse defaultActiveKey={['basic']} ghost items={[{
            key: 'basic',
            label: <span style={{ fontWeight: 600 }}>Basic</span>,
            children: <>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', marginBottom: 4, fontWeight: 500, fontSize: 13 }}>Question</label>
                <TextArea 
                  placeholder="e.g., What type of document did you lose?"
                  value={getTranslation('question')} 
                  onChange={e => setTranslation('question', e.target.value)} 
                  rows={3} 
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 4, fontWeight: 500, fontSize: 13 }}>Help Text</label>
                <Input 
                  placeholder="e.g., ID card, passport, driver's license"
                  value={getTranslation('helpText')} 
                  onChange={e => setTranslation('helpText', e.target.value)} 
                />
              </div>
            </>
          }]} />
        )}

        {selectedNode.type === 'decision' && (
          <Collapse defaultActiveKey={['basic']} ghost items={[{
            key: 'basic',
            label: <span style={{ fontWeight: 600 }}>Basic</span>,
            children: <>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', marginBottom: 4, fontWeight: 500, fontSize: 13 }}>Condition Label</label>
                <TextArea placeholder="e.g., Was the document stolen or lost?" value={getTranslation('conditionLabel')} onChange={e => setTranslation('conditionLabel', e.target.value)} rows={2} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 8, fontWeight: 500, fontSize: 13 }}>Branches</label>
                {(getTranslation('branches') || ['yes', 'no']).map((branch: string, idx: number) => (
                  <Space key={idx} style={{ marginBottom: 8, width: '100%', display: 'flex' }}>
                    <TextArea 
                      value={branch} 
                      onChange={e => updateBranch(idx, e.target.value)} 
                      placeholder={idx === 0 ? "e.g., it was stolen" : "e.g., it was lost"}
                      autoSize={{ minRows: 1 }}
                      style={{ flex: 1, width: 450 }} 
                    />
                    <Button danger size="small" icon={<DeleteOutlined />} onClick={() => removeBranch(idx)} />
                  </Space>
                ))}
                <Button icon={<PlusOutlined />} onClick={addBranch} block>Add Branch</Button>
              </div>
            </>
          }]} />
        )}

        {selectedNode.type === 'info' && (
          <Collapse defaultActiveKey={['content', 'docs']} ghost items={[
            {
              key: 'content',
              label: <span style={{ fontWeight: 600 }}>Content</span>,
              children: <>
                <TextArea 
                  placeholder="e.g., You need to file a police report. Visit the nearest police station." 
                  value={getTranslation('say')} 
                  onChange={e => setTranslation('say', e.target.value)} 
                  rows={4}
                  style={{ marginBottom: 12 }}
                />
                <TextArea 
                  placeholder="Always provide (e.g., reference number, contact info)" 
                  value={getTranslation('alwaysProvide')} 
                  onChange={e => setTranslation('alwaysProvide', e.target.value)} 
                  rows={2}
                  style={{ marginBottom: 12 }}
                />
                <div>
                  <label style={{ display: 'block', marginBottom: 4, fontWeight: 500, fontSize: 13 }}>Contact Email (optional)</label>
                  <Input 
                    placeholder="e.g., administration@example.com"
                    value={selectedNode.data.contactEmail || ''} 
                    onChange={e => handleChange('contactEmail', e.target.value)}
                    prefix="📧"
                  />
                  <div style={{ fontSize: 11, color: '#666', marginTop: 4 }}>If provided, user can contact via email or request transfer</div>
                </div>
              </>
            },
            {
              key: 'docs',
              label: <span style={{ fontWeight: 600 }}>Documents & Glossary</span>,
              children: <>
              <Upload
                accept=".docx,.pdf"
                showUploadList={false}
                beforeUpload={async (file) => {
                  if (!selectedNode.data.flowTitle || selectedNode.data.flowTitle.trim() === '') {
                    message.error('Please enter a Knowledge Title before uploading documents');
                    return false;
                  }
                  setUploading(true);
                  try {
                    const folderName = selectedNode.data.flowTitle.trim().replace(/[^a-zA-Z0-9-_]/g, '-');
                    const s3Key = `flows/${folderName}/documents/${language}/${Date.now()}-${file.name}`;
                    await uploadData({
                      path: s3Key,
                      data: file,
                      options: { contentType: file.type }
                    }).result;
                    
                    const currentDocs = getTranslation('documents') || [];
                    const documents = [...currentDocs, {
                      fileName: file.name,
                      s3Key,
                      uploadedAt: new Date().toISOString()
                    }];
                    setTranslation('documents', documents);
                    
                    onUpdate(selectedNode.id, {
                      ...selectedNode.data,
                      titleLocked: true
                    });
                    message.success(`${file.name} uploaded`);
                  } catch (error) {
                    console.error('Upload error:', error);
                    message.error('Upload failed');
                  } finally {
                    setUploading(false);
                  }
                  return false;
                }}
              >
                <Button icon={<UploadOutlined />} loading={uploading} block style={{ marginBottom: 12 }}>Upload Document</Button>
              </Upload>
              {(getTranslation('documents') || []).length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  {(getTranslation('documents') || []).map((doc: any) => (
                    <div key={doc.s3Key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: '#fff', border: '1px solid #f0f0f0', borderRadius: 6, marginBottom: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                        <FileTextOutlined style={{ color: '#1890ff' }} />
                        <Text style={{ fontSize: 13 }}>{doc.fileName}</Text>
                      </div>
                      <Space size="small">
                        <Button
                          size="small"
                          icon={<DownloadOutlined />}
                          onClick={async () => {
                            try {
                              const result = await getUrl({ path: doc.s3Key });
                              window.open(result.url.toString(), '_blank');
                            } catch (error) {
                              message.error('Failed to get download link');
                            }
                          }}
                        />
                        <Button
                          size="small"
                          danger
                          icon={<DeleteOutlined />}
                          onClick={() => {
                            const currentDocs = getTranslation('documents') || [];
                            const documents = currentDocs.filter((d: any) => d.s3Key !== doc.s3Key);
                            setTranslation('documents', documents);
                            
                            const allLangsEmpty = !selectedNode.data.translations || 
                              Object.values(selectedNode.data.translations).every((t: any) => !t.documents || t.documents.length === 0);
                            
                            if (allLangsEmpty) {
                              onUpdate(selectedNode.id, {
                                ...selectedNode.data,
                                titleLocked: false
                              });
                              message.info('Title unlocked - you can now change it');
                            }
                          }}
                        />
                      </Space>
                    </div>
                  ))}
                </div>
              )}
              <Divider style={{ margin: '16px 0' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <BookOutlined style={{ color: '#722ed1' }} />
                <span style={{ fontWeight: 500, fontSize: 13 }}>Glossary</span>
              </div>
              <TextArea 
                placeholder="Term: Definition (one per line)" 
                value={getTranslation('glossary')} 
                onChange={e => setTranslation('glossary', e.target.value)} 
                rows={4}
                style={{ fontFamily: 'monospace', fontSize: 12 }}
              />
              </>
            }
          ]} />
        )}

        {selectedNode.type === 'transfer' && (
          <Collapse defaultActiveKey={['basic']} ghost items={[{
            key: 'basic',
            label: <span style={{ fontWeight: 600 }}>Basic</span>,
            children: <>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', marginBottom: 4, fontWeight: 500, fontSize: 13 }}>To Service</label>
                <Input placeholder="e.g., Document Service" value={getTranslation('toService')} onChange={e => setTranslation('toService', e.target.value)} />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', marginBottom: 4, fontWeight: 500, fontSize: 13 }}>Phone Number or SIP URI</label>
                <Input 
                  value={selectedNode.data.phoneOrExtension} 
                  onChange={e => handleChange('phoneOrExtension', e.target.value)}
                  placeholder="sip:sales@company.sip.twilio.com or +32123456789"
                />
              </div>
              <div style={{ marginBottom: 12 }}>
                <Checkbox 
                  checked={selectedNode.data.onlyDuringWorkingHours ?? true}
                  onChange={e => handleChange('onlyDuringWorkingHours', e.target.checked)}
                >
                  Only transfer during working hours
                </Checkbox>
              </div>
              <div style={{ marginBottom: 12 }}>
                <Checkbox 
                  checked={selectedNode.data.informBeforeTransfer ?? true}
                  onChange={e => handleChange('informBeforeTransfer', e.target.checked)}
                >
                  Inform user before transferring (don't push for transfer)
                </Checkbox>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 4, fontWeight: 500, fontSize: 13 }}>Say</label>
                <TextArea placeholder="e.g., I'll connect you to our administration team who can help you further." value={getTranslation('say')} onChange={e => setTranslation('say', e.target.value)} rows={3} />
              </div>
            </>
          }]} />
        )}

      </div>
    </div>
  );
};
