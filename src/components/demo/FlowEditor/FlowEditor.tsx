/// <reference types="vite/client" />
/**
 * FlowEditor Component - Single Flow with DB Persistence
 */

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import ReactFlow, {
  Node,
  Edge,
  addEdge,
  Connection,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  MiniMap,
  NodeTypes,
  ReactFlowInstance,
  getNodesBounds,
  getViewportForBounds
} from 'reactflow';
import { toPng } from 'html-to-image';
import 'reactflow/dist/style.css';
import { Button, Space, Modal, App, Drawer, Spin, Input, Menu, Select, Tooltip } from 'antd';
import type { MenuProps } from 'antd';
const { Option } = Select;
import { SaveOutlined, PrinterOutlined, DownloadOutlined, DeleteOutlined, UploadOutlined, PlusOutlined, ApartmentOutlined, ExperimentOutlined } from '@ant-design/icons';
import BoltIcon from '@mui/icons-material/Bolt';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import PhoneForwardedIcon from '@mui/icons-material/PhoneForwarded';
import ScheduleIcon from '@mui/icons-material/Schedule';
import { generateClient } from 'aws-amplify/data';
import { fetchAuthSession } from 'aws-amplify/auth';
import { uploadData, downloadData } from 'aws-amplify/storage';
import { TriggerNode, AskNode, DecisionNode, InfoNode, TransferNode, EndNode } from './CustomNodes';
import { Inspector } from './Inspector';
import dagre from 'dagre';
import QualityPanel from '../QualityPanel';
import { validateFlow, compileFlowToNaturalLanguage } from './validation';
import { GuichetFlow } from './types';
import WorkingHoursInput from '../WorkingHours';

let nodeId = 0;
const getNodeId = () => `node-${nodeId++}`;

export const FlowEditor: React.FC<{ 
  language?: string; 
  onBack?: () => void; 
  onFlowChange?: (nodes: Node[], edges: Edge[]) => void; 
  s3Path?: string; 
  promptRecordId?: string; 
  flowDataMap?: Record<string, string>; 
  onLanguageChange?: (lang: string) => void;
  onServicesUpdate?: () => Promise<void>;
  onQualityCheck?: () => void;
  analyzingQuality?: boolean;
  availableLanguages?: Array<{code: string, label: string}>;
  showLanguageSelector?: boolean;
}> = ({ 
  language = 'fr', 
  onBack, 
  onFlowChange, 
  s3Path, 
  promptRecordId, 
  flowDataMap, 
  onLanguageChange,
  onServicesUpdate,
  onQualityCheck,
  analyzingQuality = false,
  availableLanguages = [{code: 'en', label: 'English'}, {code: 'fr', label: 'Français'}, {code: 'nl', label: 'Nederlands'}, {code: 'de', label: 'Deutsch'}],
  showLanguageSelector = true
}) => {
  const { message, modal } = App.useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const isStandalone = location.pathname === '/flow-editor';
  
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [flowMeta, setFlowMeta] = useState({ id: 'PROCEDURE_BUILDER', name: 'procedure-builder', version: 1, language });
  const nodesRef = useRef<Node[]>([]);
  const edgesRef = useRef<Edge[]>([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [selectedNodeForConnection, setSelectedNodeForConnection] = useState<Node | null>(null);
  const [selectedEdges, setSelectedEdges] = useState<string[]>([]);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [inspectorDrawerOpen, setInspectorDrawerOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dbRecordId, setDbRecordId] = useState<string | null>(promptRecordId || null);
  const [s3Key, setS3Key] = useState<string | null>(s3Path || null);
  const hasLoadedRef = useRef(false);
  const loadInitiatedRef = useRef(false);
  const cacheLoadedRef = useRef(false);
  const [services, setServices] = useState<Record<string, string>>(() => {
    console.log('[FlowEditor] Initial services from flowDataMap:', flowDataMap);
    return flowDataMap || {};
  });
  
  // Update services from flowDataMap prop
  useEffect(() => {
    if (flowDataMap && Object.keys(flowDataMap).length > 0) {
      console.log('[FlowEditor] flowDataMap updated, setting services:', flowDataMap);
      setServices(flowDataMap);
      cacheLoadedRef.current = false; // Trigger cache reload
    }
  }, [JSON.stringify(flowDataMap)]); // Use JSON.stringify to detect content changes
  
  useEffect(() => {
    console.log('[FlowEditor] Initialized with services:', services);
    console.log('[FlowEditor] flowDataMap prop:', flowDataMap);
    console.log('[FlowEditor] promptRecordId:', promptRecordId);
  }, []);
  const [serviceFlowCache, setServiceFlowCache] = useState<Record<string, {nodes: Node[], edges: Edge[]}>>({});
  const [currentService, setCurrentService] = useState<string | null>(null);
  const [addServiceModal, setAddServiceModal] = useState(false);
  const [newServiceName, setNewServiceName] = useState('');
  const [openKeys, setOpenKeys] = useState<string[]>([]);
  const [deleteServiceModal, setDeleteServiceModal] = useState(false);
  const [serviceToDelete, setServiceToDelete] = useState<string | null>(null);
  const [migrationModal, setMigrationModal] = useState(false);
  const [migrationServiceName, setMigrationServiceName] = useState('');
  const [currentLanguage, setCurrentLanguage] = useState(language);
  const [serviceWorkingHours, setServiceWorkingHours] = useState<Record<string, {hours: any[], closedDates: string[]}>>({});
  const [workingHoursModal, setWorkingHoursModal] = useState(false);
  const [editingServiceHours, setEditingServiceHours] = useState<string | null>(null);
  const [hoveredService, setHoveredService] = useState<string | null>(null);
  const [globalWorkingHours, setGlobalWorkingHours] = useState<{hours: any[], closedDates: string[]}>({ hours: [], closedDates: [] });
  
  // Deep clone utility for working hours (handles nested breaks arrays)
  const deepCloneHours = (hours: any[]) => {
    return hours.map(day => ({
      ...day,
      breaks: day.breaks ? day.breaks.map((b: any) => ({ ...b })) : []
    }));
  };
  
  // Update current language when prop changes
  useEffect(() => {
    setCurrentLanguage(language);
    (window as any).__flowEditorLanguage = language;
  }, [language]);
  
  const handleLanguageChange = (lang: string) => {
    setCurrentLanguage(lang);
    (window as any).__flowEditorLanguage = lang;
    onLanguageChange?.(lang);
    // Force re-render by updating node keys
    setNodes(nds => nds.map(n => ({ ...n, data: { ...n.data, __langKey: lang } })));
  };
  
  const validationErrors = validateFlow(nodes, edges);
  const client = generateClient({ authMode: 'userPool' });

  const procedures = useMemo(() => {
    const seen = new Set();
    return nodes
      .filter(n => n.type === 'trigger')
      .filter(n => {
        if (seen.has(n.id)) return false;
        seen.add(n.id);
        return true;
      })
      .map(n => ({ 
        id: n.id, 
        name: n.data.translations?.[currentLanguage]?.name ?? n.data.name ?? 'Unnamed', 
        type: n.type 
      }));
  }, [nodes, currentLanguage]);

  const nodeTypes = useMemo<NodeTypes>(() => ({
    trigger: TriggerNode,
    ask: AskNode,
    decision: DecisionNode,
    info: InfoNode,
    transfer: TransferNode,
    end: EndNode
  }), []);

  const loadFromS3 = async (s3KeyToLoad: string) => {
    if (loadInitiatedRef.current) return;
    loadInitiatedRef.current = true;
    setLoading(true);
    try {
      console.log('[FLOW_LOAD] Loading from S3:', s3KeyToLoad);
      const downloadResult = await downloadData({ 
        path: s3KeyToLoad,
        options: {
          cacheControl: 'no-cache'
        }
      }).result;
      console.log('[FLOW_LOAD] Download complete, parsing...');
      const blob = await downloadResult.body.blob();
      const text = await blob.text();
      console.log('[FLOW_LOAD] Raw JSON:', text.substring(0, 500));
      const flowData = JSON.parse(text);
      console.log('[FLOW_LOAD] Parsed flow data:', { nodeCount: flowData.nodes?.length, edgeCount: flowData.edges?.length });
      setNodes(flowData.nodes || []);
      const loadedEdges = (flowData.edges || []).map((e: any) => {
        const branchLabel = e.sourceHandle && e.sourceHandle !== 'next' ? e.sourceHandle : e.label || '';
        return {
          ...e,
          label: branchLabel.length > 23 ? branchLabel.substring(0, 23) + '...' : branchLabel,
          style: { strokeWidth: 3, stroke: '#F57C00' },
          labelStyle: { fontSize: 12, fontWeight: 600, fill: '#fff' },
          labelBgStyle: { fill: '#F57C00', fillOpacity: 1 },
          labelBgPadding: [4, 8] as [number, number],
          labelBgBorderRadius: 12
        };
      });
      setEdges(loadedEdges);
      const maxId = Math.max(0, ...(flowData.nodes || []).map((n: any) => {
        const match = n.id.match(/\d+$/);
        return match ? parseInt(match[0]) : 0;
      }));
      nodeId = maxId + 1;
      hasLoadedRef.current = true;
      console.log('[FLOW_LOAD] Success');
      message.success('Flow loaded');
    } catch (error: any) {
      console.error('[FLOW_LOAD] Error:', error);
      console.error('[FLOW_LOAD] Error name:', error.name);
      console.error('[FLOW_LOAD] Error message:', error.message);
      hasLoadedRef.current = true;
      if (error.name === 'NoSuchKey') {
        console.log('[FLOW_LOAD] File not found, starting with empty flow');
      } else {
        message.error(`Failed to load flow: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const saveToPrompt = useCallback(async () => {
    if (!currentService) {
      console.error('[FLOW_SAVE] No current service selected');
      return;
    }
    setSaving(true);
    const latestNodes = nodes;
    const latestEdges = edges;
    console.log('[FLOW_SAVE] Saving flow:', { service: currentService, nodes: latestNodes.length, edges: latestEdges.length });
    try {
      const flowDataToSave = { nodes: latestNodes, edges: latestEdges, meta: flowMeta };
      const currentS3Key = services[currentService];
      
      if (!currentS3Key) {
        throw new Error(`No S3 key found for service: ${currentService}`);
      }
      
      // Upload with cache control to prevent stale reads
      await uploadData({
        path: currentS3Key,
        data: JSON.stringify(flowDataToSave),
        options: { 
          contentType: 'application/json',
          metadata: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'x-amz-meta-timestamp': Date.now().toString()
          }
        }
      }).result;
      
      // Update cache
      setServiceFlowCache(prev => ({
        ...prev,
        [currentService]: { nodes: latestNodes, edges: latestEdges }
      }));
      
      // Update DynamoDB with current services map
      if (dbRecordId) {
        await client.models.Prompt.update({
          id: dbRecordId,
          flowData: JSON.stringify(services)
        });
      }
      
      message.success('Saved');
      console.log('[FLOW_SAVE] Save complete');
    } catch (error: any) {
      console.error('[FLOW_SAVE] Error:', error);
      message.error(`Save failed: ${error.message || 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  }, [nodes, edges, flowMeta, language, message, currentService, services]);

  // Check for old format and prompt migration
  useEffect(() => {
    if (Object.keys(services).length === 1) {
      const [serviceId, s3Key] = Object.entries(services)[0];
      // If service ID matches VITE_CITY, it's from old format migration
      const migrationKey = `service_migrated_${dbRecordId}`;
      if (serviceId === import.meta.env.VITE_CITY && !localStorage.getItem(migrationKey)) {
        setMigrationModal(true);
      }
    }
  }, [services, dbRecordId]);

  const handleMigration = async () => {
    if (!migrationServiceName.trim()) {
      message.error('Service name cannot be empty');
      return;
    }
    const newServiceId = migrationServiceName.trim();
    const oldServiceId = import.meta.env.VITE_CITY;
    const oldS3Key = services[oldServiceId];
    
    // Create new S3 path with new service name
    const newS3Key = `flows/${newServiceId}-${language}.json`;
    
    // Copy old flow to new location
    if (oldS3Key && oldS3Key !== newS3Key) {
      const downloadResult = await downloadData({ path: oldS3Key }).result;
      const blob = await downloadResult.body.blob();
      const text = await blob.text();
      await uploadData({
        path: newS3Key,
        data: text,
        options: { contentType: 'application/json' }
      }).result;
    }
    
    const updatedServices = { [newServiceId]: newS3Key };
    setServices(updatedServices);
    setCurrentService(newServiceId);
    
    if (dbRecordId) {
      await client.models.Prompt.update({
        id: dbRecordId,
        flowData: updatedServices
      });
    }
    
    localStorage.setItem(`service_migrated_${dbRecordId}`, 'true');
    setMigrationModal(false);
    message.success(`Service renamed to "${newServiceId}"`);
  };

  // Load all services into cache ONCE on mount
  useEffect(() => {
    if (cacheLoadedRef.current) return;
    
    const loadAllServices = async () => {
      console.log('[CACHE_LOAD] Starting with services:', services);
      if (!services || typeof services !== 'object' || Object.keys(services).length === 0) {
        console.log('[CACHE_LOAD] Invalid or empty services, skipping load');
        return;
      }
      
      setLoading(true);
      const cache: Record<string, {nodes: Node[], edges: Edge[]}> = {};
      
      // Load service working hours from DB if available
      if (dbRecordId) {
        try {
          const result = await client.models.Prompt.get({ id: dbRecordId });
          if (result.data?.serviceWorkingHours) {
            const hours = typeof result.data.serviceWorkingHours === 'string' 
              ? JSON.parse(result.data.serviceWorkingHours) 
              : result.data.serviceWorkingHours;
            setServiceWorkingHours(hours);
          }
          // Load global working hours
          if (result.data?.formData) {
            const formData = typeof result.data.formData === 'string' 
              ? JSON.parse(result.data.formData) 
              : result.data.formData;
            if (formData.workingHours || formData.closedDates) {
              setGlobalWorkingHours({
                hours: formData.workingHours || [],
                closedDates: formData.closedDates || []
              });
            }
          }
        } catch (error) {
          console.error('[LOAD_HOURS] Failed to load service working hours:', error);
        }
      }
      
      for (const [serviceId, s3Key] of Object.entries(services)) {
        try {
          console.log('[CACHE_LOAD] Loading service:', serviceId, 'from:', s3Key);
          const downloadResult = await downloadData({ 
            path: s3Key,
            options: {
              useAccelerateEndpoint: false,
              // Force fresh read, bypass any caching
              cacheControl: 'no-cache'
            }
          }).result;
          const blob = await downloadResult.body.blob();
          const text = await blob.text();
          const flowData = JSON.parse(text);
          
          // Validate flow data structure
          if (!flowData.nodes || !Array.isArray(flowData.nodes)) {
            console.error('[CACHE_LOAD] Invalid flow structure for', serviceId);
            throw new Error('Invalid flow structure');
          }
          
          console.log('[CACHE_LOAD] Loaded', serviceId, '- nodes:', flowData.nodes.length, 'edges:', flowData.edges?.length || 0);
          
          cache[serviceId] = {
            nodes: flowData.nodes || [],
            edges: (flowData.edges || []).map((e: any) => {
              const branchLabel = e.sourceHandle && e.sourceHandle !== 'next' ? e.sourceHandle : e.label || '';
              return {
                ...e,
                label: branchLabel.length > 23 ? branchLabel.substring(0, 23) + '...' : branchLabel,
                style: { strokeWidth: 3, stroke: '#F57C00' },
                labelStyle: { fontSize: 12, fontWeight: 600, fill: '#fff' },
                labelBgStyle: { fill: '#F57C00', fillOpacity: 1 },
                labelBgPadding: [4, 8] as [number, number],
                labelBgBorderRadius: 12
              };
            })
          };
        } catch (error: any) {
          console.error('[CACHE_LOAD] Failed to load', serviceId, error);
          cache[serviceId] = { nodes: [], edges: [] };
        }
      }
      
      console.log('[CACHE_LOAD] Cache built:', Object.keys(cache));
      setServiceFlowCache(cache);
      
      // Set first service as active
      const firstServiceId = Object.keys(services)[0];
      console.log('[CACHE_LOAD] Setting active service:', firstServiceId);
      setCurrentService(firstServiceId);
      if (cache[firstServiceId]) {
        const cachedNodes = cache[firstServiceId].nodes.map(n => ({ ...n, data: { ...n.data, __langKey: currentLanguage } }));
        setNodes(cachedNodes);
        setEdges(cache[firstServiceId].edges);
        
        // Update nodeId counter to prevent ID collisions
        const maxId = Math.max(0, ...cachedNodes.map((n: any) => {
          const match = n.id.match(/\d+$/);
          return match ? parseInt(match[0]) : 0;
        }));
        nodeId = maxId + 1;
        console.log('[CACHE_LOAD] Active service loaded with', cachedNodes.length, 'nodes');
      }
      
      setLoading(false);
      cacheLoadedRef.current = true;
    };
    
    if (Object.keys(services).length > 0) {
      loadAllServices();
    }
  }, []); // Empty deps - only run once

  // Set initial language
  useEffect(() => {
    (window as any).__flowEditorLanguage = currentLanguage;
  }, [currentLanguage]);

  // Show hint on first load
  useEffect(() => {
    const hasSeenHint = localStorage.getItem('flowEditor_doubleClickHint');
    if (!hasSeenHint && nodes.length > 0) {
      message.info('💡 Double-click any node to edit its properties', 4);
      localStorage.setItem('flowEditor_doubleClickHint', 'true');
    }
  }, [nodes.length, message]);

  // Update cache when nodes/edges change (but don't trigger reload)
  useEffect(() => {
    nodesRef.current = nodes;
    edgesRef.current = edges;
    if (currentService && cacheLoadedRef.current) {
      setServiceFlowCache(prev => ({
        ...prev,
        [currentService]: { nodes, edges }
      }));
    }
  }, [nodes, edges, currentService]);

  // Listen for save event from parent
  useEffect(() => {
    const handleSave = () => saveToPrompt();
    window.addEventListener('saveFlow', handleSave);
    return () => window.removeEventListener('saveFlow', handleSave);
  }, [saveToPrompt]);

  // Update decision nodes with connected branches
  useEffect(() => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.type === 'decision') {
          const connectedBranches = edges
            .filter((e) => e.source === node.id && e.sourceHandle)
            .map((e) => e.sourceHandle);
          return { ...node, data: { ...node.data, _connectedBranches: connectedBranches } };
        }
        return node;
      })
    );
  }, [edges, setNodes]);

  useEffect(() => {
    setEdges((eds) =>
      eds.map((edge) => {
        const isSelected = selectedEdges.includes(edge.id);
        const branchLabel = edge.sourceHandle && edge.sourceHandle !== 'next' ? edge.sourceHandle : edge.label || '';
        return {
          ...edge,
          label: branchLabel.length > 23 ? branchLabel.substring(0, 23) + '...' : branchLabel,
          style: { strokeWidth: isSelected ? 5 : 3, stroke: isSelected ? '#1890ff' : '#F57C00' },
          labelStyle: { fontSize: 12, fontWeight: 600, fill: '#fff' },
          labelBgStyle: { fill: isSelected ? '#1890ff' : '#F57C00', fillOpacity: 1 },
          labelBgPadding: [4, 8] as [number, number],
          labelBgBorderRadius: 12
        };
      })
    );
  }, [selectedEdges, setEdges]);

  // Prevent data loss on page refresh
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (saving) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [saving]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedEdges.length > 0) {
        setEdges((eds) => eds.filter((edge) => !selectedEdges.includes(edge.id)));
        setSelectedEdges([]);
        message.success('Edge deleted');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedEdges, setEdges, message]);

  useEffect(() => {
    onFlowChange?.(nodes, edges);
  }, [nodes, edges]);

  useEffect(() => {
    console.log('[FLOW_MOUNT] s3Path prop:', s3Path, 'language:', language);
  }, [s3Path, language]);

  const onConnect = useCallback(
    (params: Connection) => {
      const branchLabel = params.sourceHandle && params.sourceHandle !== 'next' ? params.sourceHandle : '';
      const edge = { 
        ...params, 
        label: branchLabel.length > 23 ? branchLabel.substring(0, 23) + '...' : branchLabel,
        style: { strokeWidth: 3, stroke: '#F57C00' },
        labelStyle: { fontSize: 12, fontWeight: 600, fill: '#fff' },
        labelBgStyle: { fill: '#F57C00', fillOpacity: 1 },
        labelBgPadding: [4, 8] as [number, number],
        labelBgBorderRadius: 12
      };
      setEdges((eds) => addEdge(edge, eds));
    },
    [setEdges]
  );

  const onEdgeClick = useCallback((_: any, edge: Edge) => {
    setSelectedEdges([edge.id]);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedEdges([]);
    setSelectedNodeForConnection(null);
  }, []);

  const onNodeClick = useCallback((_: any, node: Node) => {
    setSelectedEdges([]);
    setSelectedNodeForConnection(node);
  }, []);

  const onNodeDoubleClick = useCallback((_: any, node: Node) => {
    setSelectedNode({ ...node });
    setInspectorDrawerOpen(true);
  }, []);

  const updateNodeData = useCallback((nodeId: string, data: any) => {
    setNodes((nds) =>
      nds.map((node) => (node.id === nodeId ? { ...node, data } : node))
    );
    setSelectedNode((prev) => prev?.id === nodeId ? { ...prev, data } : prev);
  }, [setNodes]);

  const autoLayout = useCallback(() => {
    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));
    dagreGraph.setGraph({ rankdir: 'TB', nodesep: 100, ranksep: 150 });

    nodes.forEach(node => {
      dagreGraph.setNode(node.id, { width: 200, height: 100 });
    });

    edges.forEach(edge => {
      dagreGraph.setEdge(edge.source, edge.target);
    });

    dagre.layout(dagreGraph);

    const layoutedNodes = nodes.map(node => {
      const nodeWithPosition = dagreGraph.node(node.id);
      return {
        ...node,
        position: {
          x: nodeWithPosition.x - 100,
          y: nodeWithPosition.y - 50
        }
      };
    });

    setNodes(layoutedNodes);
    message.success('Layout applied');
  }, [nodes, edges, setNodes, message]);

  const addNode = (type: string) => {
    if (!reactFlowInstance) return;
    
    console.log('[ADD_NODE] selectedNodeForConnection:', selectedNodeForConnection);
    
    setSelectedNode(null);
    setInspectorDrawerOpen(false);
    
    const centerX = (window.innerWidth - 240) / 2;
    const centerY = window.innerHeight / 2;
    const position = reactFlowInstance.screenToFlowPosition({ x: centerX, y: centerY });
    
    const newNode: Node = {
      id: getNodeId(),
      type,
      position: { x: position.x + Math.random() * 100 - 50, y: position.y + Math.random() * 100 - 50 },
      data: getDefaultData(type)
    };
    setNodes((nds) => [...nds, newNode]);
    
    // Auto-connect if a node is selected
    if (selectedNodeForConnection) {
      console.log('[ADD_NODE] Creating connection from', selectedNodeForConnection.id, 'to', newNode.id);
      
      let sourceHandle = 'next';
      
      // For decision nodes, find first available branch
      if (selectedNodeForConnection.type === 'decision') {
        const branches = selectedNodeForConnection.data.branches || ['yes', 'no'];
        const connectedBranches = edges
          .filter(e => e.source === selectedNodeForConnection.id && e.sourceHandle)
          .map(e => e.sourceHandle);
        
        // Find first unused branch
        const availableBranch = branches.find(b => !connectedBranches.includes(b));
        sourceHandle = availableBranch || branches[0];
        console.log('[ADD_NODE] Decision node - available branch:', sourceHandle, 'connected:', connectedBranches);
      }
      
      const branchLabel = sourceHandle !== 'next' ? sourceHandle : '';
      const edge = {
        id: `e${Date.now()}`,
        source: selectedNodeForConnection.id,
        target: newNode.id,
        sourceHandle,
        label: branchLabel.length > 23 ? branchLabel.substring(0, 23) + '...' : branchLabel,
        style: { strokeWidth: 3, stroke: '#F57C00' },
        labelStyle: { fontSize: 12, fontWeight: 600, fill: '#fff' },
        labelBgStyle: { fill: '#F57C00', fillOpacity: 1 },
        labelBgPadding: [4, 8] as [number, number],
        labelBgBorderRadius: 12
      };
      setEdges((eds) => [...eds, edge]);
      message.success('Node added and connected');
      setSelectedNodeForConnection(null);
    } else {
      console.log('[ADD_NODE] No node selected for connection');
    }
  };

  const getDefaultData = (type: string) => {
    switch (type) {
      case 'trigger':
        return { name: '', phrases: [], rules: [] };
      case 'decision':
        return { conditionLabel: '', mode: 'yesno', branches: ['yes', 'no'] };
      case 'info':
        return { say: '', bullets: [], documents: [] };
      case 'transfer':
        return { toService: '', channel: '', say: '' };
      default:
        return {};
    }
  };

  const printFlow = async () => {
    if (!reactFlowWrapper.current) return;
    
    const nodesBounds = getNodesBounds(nodes);
    const viewport = getViewportForBounds(nodesBounds, 1200, 800, 0.5, 2, 0.2);
    
    try {
      const dataUrl = await toPng(reactFlowWrapper.current.querySelector('.react-flow') as HTMLElement, {
        backgroundColor: '#ffffff',
        width: 1200,
        height: 800
      });
      
      const printWindow = window.open('', '_blank');
      if (!printWindow) return;
      
      printWindow.document.write(`
        <html>
          <head>
            <title>${flowMeta.name} - Flow Diagram</title>
            <style>
              body { margin: 0; padding: 20px; font-family: Arial, sans-serif; }
              .header { text-align: center; margin-bottom: 20px; }
              h1 { color: #4C2E76; margin: 10px 0; }
              .meta { background: #f5f5f5; padding: 10px; border-radius: 8px; margin-bottom: 20px; font-size: 14px; }
              img { max-width: 100%; height: auto; border: 1px solid #ddd; }
              @media print { body { padding: 10px; } }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>${flowMeta.name}</h1>
              <div class="meta">
                <strong>Version:</strong> ${flowMeta.version} | 
                <strong>Language:</strong> ${flowMeta.language}
              </div>
            </div>
            <img src="${dataUrl}" alt="Flow Diagram" />
          </body>
        </html>
      `);
      printWindow.document.close();
      setTimeout(() => printWindow.print(), 250);
    } catch (error) {
      console.error('Print error:', error);
      message.error('Failed to generate print preview');
    }
  };

  const downloadFlow = () => {
    const flowData = {
      format: 'reactflow-v1',
      id: flowMeta.id,
      name: flowMeta.name,
      language: language,
      version: flowMeta.version,
      exportedAt: new Date().toISOString(),
      nodes,
      edges
    };
    
    const blob = new Blob([JSON.stringify(flowData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `flow-${language}-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    message.success('Flow downloaded');
  };

  const clearFlow = () => {
    modal.confirm({
      title: 'Clear flow?',
      content: 'This will delete all nodes and edges.',
      onOk: () => {
        setNodes([]);
        setEdges([]);
        message.success('Flow cleared');
      }
    });
  };

  const importFlow = () => {
    console.log('[IMPORT] Starting import');
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e: any) => {
      const file = e.target.files[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const imported = JSON.parse(event.target?.result as string);
          if (imported.nodes && imported.edges) {
            console.log('[IMPORT] Importing', imported.nodes.length, 'nodes');
            setNodes(imported.nodes);
            setEdges(imported.edges);
            
            // Update cache for current service
            if (currentService) {
              setServiceFlowCache(prev => ({
                ...prev,
                [currentService]: { nodes: imported.nodes, edges: imported.edges }
              }));
            }
            
            const maxId = Math.max(0, ...imported.nodes.map((n: any) => {
              const match = n.id.match(/\d+$/);
              return match ? parseInt(match[0]) : 0;
            }));
            nodeId = maxId + 1;
            message.success('Flow imported');
          } else {
            message.error('Invalid flow file');
          }
        } catch (error) {
          console.error('[IMPORT] Parse error:', error);
          message.error('Failed to parse flow file');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const handleAddService = async () => {
    if (!newServiceName.trim()) {
      message.error('Service name cannot be empty');
      return;
    }
    const serviceId = newServiceName.trim().toLowerCase().replace(/\s+/g, '-');
    const newS3Key = `flows/${serviceId}-${language}.json`;
    
    await uploadData({
      path: newS3Key,
      data: JSON.stringify({ nodes: [], edges: [], meta: { serviceId, language } }),
      options: { contentType: 'application/json' }
    }).result;
    
    const updatedServices = { ...services, [serviceId]: newS3Key };
    
    console.log('[ADD_SERVICE] dbRecordId:', dbRecordId, 'updatedServices:', updatedServices);
    if (dbRecordId) {
      await client.models.Prompt.update({
        id: dbRecordId,
        flowData: updatedServices
      });
      console.log('[ADD_SERVICE] DynamoDB updated');
    }
    
    // Update local state immediately
    setServices(updatedServices);
    setServiceFlowCache(prev => ({
      ...prev,
      [serviceId]: { nodes: [], edges: [] }
    }));
    setCurrentService(serviceId);
    setNodes([]);
    setEdges([]);
    
    setNewServiceName('');
    setAddServiceModal(false);
    message.success(`Service "${newServiceName}" created. Add Procedure nodes to this service.`);
    
    if (onServicesUpdate) {
      await onServicesUpdate();
    }
  };

  const openWorkingHoursModal = (serviceId: string) => {
    // If service has no hours set, copy from global (deep copy)
    if (!serviceWorkingHours[serviceId] && globalWorkingHours.hours.length > 0) {
      const cloned = {
        hours: deepCloneHours(globalWorkingHours.hours),
        closedDates: [...globalWorkingHours.closedDates]
      };
      setServiceWorkingHours(prev => ({
        ...prev,
        [serviceId]: cloned
      }));
    }
    setEditingServiceHours(serviceId);
    setWorkingHoursModal(true);
  };

  const saveServiceWorkingHours = async (hours: any[], closedDates: string[]) => {
    if (!editingServiceHours) return;
    const updated = { 
      ...serviceWorkingHours, 
      [editingServiceHours]: { 
        hours: deepCloneHours(hours), 
        closedDates: [...closedDates] 
      } 
    };
    setServiceWorkingHours(updated);
    if (dbRecordId) {
      await client.models.Prompt.update({
        id: dbRecordId,
        serviceWorkingHours: JSON.stringify(updated)
      });
    }
    setWorkingHoursModal(false);
    setEditingServiceHours(null);
    message.success('Working hours saved');
  };

  const handleDeleteService = async () => {
    if (!serviceToDelete) return;
    
    const s3KeyToDelete = services[serviceToDelete];
    const updatedServices = { ...services };
    delete updatedServices[serviceToDelete];
    setServices(updatedServices);
    
    // Remove working hours for deleted service
    const updatedHours = { ...serviceWorkingHours };
    delete updatedHours[serviceToDelete];
    setServiceWorkingHours(updatedHours);
    
    // Delete S3 file
    if (s3KeyToDelete) {
      try {
        const { remove } = await import('aws-amplify/storage');
        await remove({ path: s3KeyToDelete });
        console.log('[DELETE_SERVICE] S3 file deleted:', s3KeyToDelete);
      } catch (error) {
        console.error('[DELETE_SERVICE] Failed to delete S3 file:', error);
      }
    }
    
    // Update DynamoDB
    if (dbRecordId) {
      await client.models.Prompt.update({
        id: dbRecordId,
        flowData: updatedServices
      });
    }
    
    // Switch to another service if current was deleted
    if (currentService === serviceToDelete) {
      const firstServiceId = Object.keys(updatedServices)[0];
      if (firstServiceId) {
        setCurrentService(firstServiceId);
        if (serviceFlowCache[firstServiceId]) {
          const cachedNodes = serviceFlowCache[firstServiceId].nodes.map(n => ({ ...n, data: { ...n.data, __langKey: currentLanguage } }));
          setNodes(cachedNodes);
          setEdges(serviceFlowCache[firstServiceId].edges);
        }
      } else {
        setCurrentService(null);
        setNodes([]);
        setEdges([]);
      }
    }
    
    setDeleteServiceModal(false);
    setServiceToDelete(null);
    message.success('Service deleted');
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <>
      <Modal
        title="Name Your Service"
        open={migrationModal}
        onOk={handleMigration}
        onCancel={() => setMigrationModal(false)}
        okText="Continue"
        closable={false}
        maskClosable={false}
      >
        <p>Please give a name to your service (e.g., "Civil Registry", "Document Services"):</p>
        <Input
          placeholder="Service name"
          value={migrationServiceName}
          onChange={(e) => setMigrationServiceName(e.target.value)}
          onPressEnter={handleMigration}
          autoFocus
        />
      </Modal>

      <Modal
        title="Delete Service"
        open={deleteServiceModal}
        onOk={handleDeleteService}
        onCancel={() => {
          setDeleteServiceModal(false);
          setServiceToDelete(null);
        }}
        okText="Delete"
        okButtonProps={{ danger: true }}
      >
        <p>Are you sure you want to delete the service <strong>{serviceToDelete?.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</strong>?</p>
        <p>This action cannot be undone.</p>
      </Modal>

      <Modal
        title="Add Service"
        open={addServiceModal}
        onOk={handleAddService}
        onCancel={() => {
          setAddServiceModal(false);
          setNewServiceName('');
        }}
        okText="Add"
      >
        <Input
          placeholder="e.g., Government Services"
          value={newServiceName}
          onChange={(e) => setNewServiceName(e.target.value)}
          onPressEnter={handleAddService}
          autoFocus
        />
      </Modal>

      <Modal
        title={`Working Hours - ${editingServiceHours?.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}`}
        open={workingHoursModal}
        onCancel={() => {
          setWorkingHoursModal(false);
          setEditingServiceHours(null);
        }}
        footer={[
          <Button key="cancel" onClick={() => {
            setWorkingHoursModal(false);
            setEditingServiceHours(null);
          }}>Cancel</Button>,
          <Button key="save" type="primary" onClick={() => {
            const data = serviceWorkingHours[editingServiceHours || ''] || { hours: [], closedDates: [] };
            saveServiceWorkingHours(data.hours, data.closedDates);
          }}>Save</Button>
        ]}
        width={1200}
        destroyOnClose
      >
        <div style={{ padding: '16px 0' }}>
          <p style={{ color: '#8c8c8c', fontSize: 13, marginBottom: 16 }}>
            {globalWorkingHours.hours.length > 0 ? 'Global hours pre-filled. Modify as needed.' : 'Configure working hours for this service.'}
          </p>
          <WorkingHoursInput
            key={editingServiceHours}
            givenWorkingHours={serviceWorkingHours[editingServiceHours || '']?.hours ? deepCloneHours(serviceWorkingHours[editingServiceHours || ''].hours) : []}
            onChange={(hours) => {
              if (editingServiceHours) {
                setServiceWorkingHours(prev => ({
                  ...prev,
                  [editingServiceHours]: {
                    hours: deepCloneHours(hours),
                    closedDates: prev[editingServiceHours]?.closedDates || []
                  }
                }));
              }
            }}
            closedDates={serviceWorkingHours[editingServiceHours || '']?.closedDates ? [...serviceWorkingHours[editingServiceHours || ''].closedDates] : []}
            onClosedDatesChange={(dates) => {
              if (editingServiceHours) {
                setServiceWorkingHours(prev => ({
                  ...prev,
                  [editingServiceHours]: {
                    hours: prev[editingServiceHours]?.hours ? deepCloneHours(prev[editingServiceHours].hours) : [],
                    closedDates: [...dates]
                  }
                }));
              }
            }}
          />
        </div>
      </Modal>

      <Drawer
        title="Quality Analysis"
        placement="right"
        width={400}
        onClose={() => setDrawerOpen(false)}
        open={drawerOpen}
      >
        <QualityPanel 
          checks={validationErrors.map(e => ({
            key: e.nodeId || 'flow',
            label: e.message,
            description: e.nodeId ? `Node: ${e.nodeId}` : 'Flow level issue',
            severity: e.severity,
            fixHint: 'Review and fix this issue',
            isSatisfied: () => false
          }))} 
          draft={{}} 
          activeStep={0} 
          focusKeys={[]} 
          showPanel={true}
        />
      </Drawer>

      <Drawer
        title={selectedNode ? `${selectedNode.type === 'trigger' ? 'Procedure' : selectedNode.type.charAt(0).toUpperCase() + selectedNode.type.slice(1)} - ${selectedNode.data.name || selectedNode.id}` : 'Node Inspector'}
        placement="right"
        width={600}
        onClose={() => {
          setInspectorDrawerOpen(false);
          setSelectedNode(null);
        }}
        open={inspectorDrawerOpen}
        styles={{ body: { padding: 0 } }}
      >
        <Inspector selectedNode={selectedNode} onUpdate={updateNodeData} language={currentLanguage} />
      </Drawer>

      <div style={{ display: 'flex', height: '100vh', width: '100%', flexDirection: 'row' }}>
        <div style={{ width: 240, borderRight: '1px solid #d9d9d9', padding: 16, background: '#fafafa', overflowY: 'auto' }}>
          <div style={{ marginBottom: 12, fontWeight: 'bold', color: '#4C2E76', fontSize: 14 }}>Services</div>
          <Button 
            icon={<PlusOutlined />} 
            onClick={() => setAddServiceModal(true)}
            block
            type="dashed"
            style={{ marginBottom: 16 }}
          >
            Add Service
          </Button>
          {Object.keys(services).length > 0 && (
            <>
              <Menu
                mode="inline"
                selectedKeys={currentService ? [currentService] : []}
                openKeys={openKeys}
                onOpenChange={setOpenKeys}
                style={{ marginBottom: 8, border: 'none', background: 'transparent' }}
                theme="light"
                items={Object.entries(services).map(([serviceId, s3Key]) => ({
                  key: serviceId,
                  label: (
                    <div 
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}
                      onMouseEnter={() => setHoveredService(serviceId)}
                      onMouseLeave={() => setHoveredService(null)}
                    >
                      <span>{serviceId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
                      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                        {hoveredService === serviceId && (
                          <ScheduleIcon 
                            onClick={(e) => {
                              e.stopPropagation();
                              openWorkingHoursModal(serviceId);
                            }}
                            sx={{ 
                              fontSize: 14, 
                              color: '#8c8c8c',
                              cursor: 'pointer',
                              transition: 'color 0.2s',
                              '&:hover': { color: '#1890ff' }
                            }}
                          />
                        )}
                        {hoveredService === serviceId && (
                          <DeleteOutlined 
                            onClick={(e) => {
                              e.stopPropagation();
                              setServiceToDelete(serviceId);
                              setDeleteServiceModal(true);
                            }}
                            style={{ 
                              fontSize: 12, 
                              color: '#ff4d4f', 
                              opacity: 0.6,
                              transition: 'opacity 0.2s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                            onMouseLeave={(e) => e.currentTarget.style.opacity = '0.6'}
                          />
                        )}
                      </div>
                    </div>
                  ),
                  style: { fontWeight: currentService === serviceId ? 600 : 400 },
                  children: procedures.length > 0 && currentService === serviceId ? procedures.map(proc => ({
                    key: `${serviceId}-node-${proc.id}`,
                    label: proc.name,
                    onClick: () => {
                      const node = reactFlowInstance?.getNode(proc.id);
                      if (node) {
                        reactFlowInstance?.setCenter(node.position.x , node.position.y + 200, { zoom: 1.2, duration: 800 });
                      }
                    }
                  })) : undefined,
                  onClick: async () => {
                    setCurrentService(serviceId);
                    setOpenKeys([serviceId]);
                    
                    if (serviceFlowCache[serviceId]) {
                      const cachedNodes = serviceFlowCache[serviceId].nodes.map(n => ({ ...n, data: { ...n.data, __langKey: currentLanguage } }));
                      setNodes(cachedNodes);
                      setEdges(serviceFlowCache[serviceId].edges);
                      
                      // Update nodeId counter to prevent ID collisions
                      const maxId = Math.max(0, ...cachedNodes.map((n: any) => {
                        const match = n.id.match(/\d+$/);
                        return match ? parseInt(match[0]) : 0;
                      }));
                      nodeId = maxId + 1;
                    }
                  }
                }))}
              />
            </>
          )}
          <div style={{ marginBottom: 16, fontWeight: 'bold', color: '#4C2E76', fontSize: 14 }}>Add Nodes:</div>
          <div onClick={() => addNode('trigger')} style={{ padding: 12, marginBottom: 8, border: '1px solid #d9d9d9', borderRadius: 2, background: '#E3F2FD', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <BoltIcon sx={{ fontSize: 18, color: '#1976D2' }} />
            <div style={{ fontWeight: 'bold' }}>Procedure</div>
          </div>
          <div onClick={() => addNode('decision')} style={{ padding: 12, marginBottom: 8, border: '1px solid #d9d9d9', borderRadius: 2, background: '#FFF3E0', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <AccountTreeIcon sx={{ fontSize: 18, color: '#F57C00' }} />
            <div style={{ fontWeight: 'bold' }}>Decision</div>
          </div>
          <div onClick={() => addNode('info')} style={{ padding: 12, marginBottom: 8, border: '1px solid #d9d9d9', borderRadius: 2, background: '#E8F5E9', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <InfoOutlinedIcon sx={{ fontSize: 18, color: '#388E3C' }} />
            <div style={{ fontWeight: 'bold' }}>Info</div>
          </div>
          <div onClick={() => addNode('transfer')} style={{ padding: 12, marginBottom: 8, border: '1px solid #d9d9d9', borderRadius: 2, background: '#F3E5F5', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <PhoneForwardedIcon sx={{ fontSize: 18, color: '#7B1FA2' }} />
            <div style={{ fontWeight: 'bold' }}>Transfer</div>
          </div>
        </div>
        
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: 8, background: '#f0f0f0', borderBottom: '1px solid #d9d9d9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {showLanguageSelector ? (
              <Select value={currentLanguage} onChange={handleLanguageChange} style={{ width: 150 }}>
                {availableLanguages.map(lang => (
                  <Option key={lang.code} value={lang.code}>{lang.label}</Option>
                ))}
              </Select>
            ) : <div />}
            <Space>
              <Tooltip title="Auto Layout">
                <Button icon={<ApartmentOutlined />} onClick={autoLayout} />
              </Tooltip>
              <Tooltip title="Save">
                <Button icon={<SaveOutlined />} onClick={saveToPrompt} loading={saving} />
              </Tooltip>
              {onQualityCheck && (
                <Tooltip title="Quality">
                  <Button 
                    icon={<ExperimentOutlined />} 
                    onClick={onQualityCheck} 
                    loading={analyzingQuality}
                  />
                </Tooltip>
              )}
              <Tooltip title="Import">
                <Button icon={<UploadOutlined />} onClick={importFlow} />
              </Tooltip>
              <Tooltip title="Clear">
                <Button icon={<DeleteOutlined />} onClick={clearFlow} />
              </Tooltip>
              <Tooltip title="Download">
                <Button icon={<DownloadOutlined />} onClick={downloadFlow} />
              </Tooltip>
              <Tooltip title="Print">
                <Button icon={<PrinterOutlined />} onClick={printFlow} />
              </Tooltip>
            </Space>
          </div>
          <div style={{ flex: 1, width: '100%', height: '100%' }} ref={reactFlowWrapper}>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onNodeClick={onNodeClick}
              onNodeDoubleClick={onNodeDoubleClick}
              onEdgeClick={onEdgeClick}
              onPaneClick={onPaneClick}
              onInit={setReactFlowInstance}
              nodeTypes={nodeTypes}
              nodesDraggable={true}
              nodesConnectable={true}
              nodesFocusable={true}
              elementsSelectable={true}
              defaultEdgeOptions={{
                style: { strokeWidth: 5, stroke: '#9EB9D8' },
                labelStyle: { fontSize: 20, fontWeight: 900, fill: '#000' },
                labelBgStyle: { fill: '#fff', fillOpacity: 0.9 },
                labelBgPadding: [8, 8],
                labelBgBorderRadius: 4
              }}
              fitView
              fitViewOptions={{ padding: 0.2, duration: 800 }}
            >
              <Background />
              <Controls position="top-left" />
              <MiniMap position="bottom-right" />
            </ReactFlow>
          </div>
        </div>
      </div>
    </>
  );
};
