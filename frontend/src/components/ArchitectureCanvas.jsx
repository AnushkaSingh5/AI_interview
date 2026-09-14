import React, { useState, useRef, useEffect } from 'react';
import {
  FiPlus, FiTrash2, FiMove, FiEdit2, FiArrowRight, FiRotateCcw,
  FiDownload, FiLayers, FiCpu, FiDatabase, FiCloud, FiServer,
  FiZap, FiHardDrive, FiActivity, FiGlobe, FiRadio, FiCheck, FiX, FiShare2
} from 'react-icons/fi';

export const COMPONENT_PALETTE = [
  { type: 'client', label: 'Client Device', subLabel: 'Mobile / Browser', category: 'client', color: '#3b82f6', icon: 'FiGlobe' },
  { type: 'dns', label: 'DNS / CDN', subLabel: 'Cloudflare / Edge', category: 'edge', color: '#06b6d4', icon: 'FiGlobe' },
  { type: 'edge', label: 'API Gateway', subLabel: 'Kong / Envoy', category: 'edge', color: '#6366f1', icon: 'FiCloud' },
  { type: 'lb', label: 'Load Balancer', subLabel: 'Nginx / ALB', category: 'compute', color: '#8b5cf6', icon: 'FiActivity' },
  { type: 'service', label: 'Microservice', subLabel: 'Core Logic Pod', category: 'compute', color: '#10b981', icon: 'FiServer' },
  { type: 'worker', label: 'Async Worker', subLabel: 'Background Worker', category: 'compute', color: '#059669', icon: 'FiCpu' },
  { type: 'cache', label: 'Distributed Cache', subLabel: 'Redis Cluster', category: 'cache', color: '#ef4444', icon: 'FiZap' },
  { type: 'db_sql', label: 'Relational DB', subLabel: 'PostgreSQL / MySQL', category: 'db', color: '#2563eb', icon: 'FiDatabase' },
  { type: 'db_nosql', label: 'NoSQL Document', subLabel: 'MongoDB / DynamoDB', category: 'db', color: '#0d9488', icon: 'FiDatabase' },
  { type: 'db_wide', label: 'Wide-Column DB', subLabel: 'Cassandra / HBase', category: 'db', color: '#d97706', icon: 'FiDatabase' },
  { type: 'queue', label: 'Message Queue', subLabel: 'Apache Kafka / RabbitMQ', category: 'queue', color: '#ec4899', icon: 'FiRadio' },
  { type: 'storage', label: 'Blob Storage', subLabel: 'AWS S3 / GCS', category: 'storage', color: '#f59e0b', icon: 'FiHardDrive' }
];

export const CONNECTION_PROTOCOLS = [
  'HTTPS / REST',
  'gRPC / Protobuf',
  'WebSocket',
  'Kafka Event Topic',
  'SQL Query',
  'Redis Cache Get/Set',
  'Async Task Publish'
];

const ARCHITECTURE_TEMPLATES = [
  {
    name: '3-Tier Web App with Cache',
    desc: 'Client -> API Gateway -> Load Balancer -> App Service -> Redis -> PostgreSQL',
    nodes: [
      { id: 't1', type: 'client', label: 'Client App', subLabel: 'iOS / Web', category: 'client', x: 50, y: 160, color: '#3b82f6' },
      { id: 't2', type: 'edge', label: 'API Gateway', subLabel: 'Auth & Rate Limit', category: 'edge', x: 210, y: 160, color: '#6366f1' },
      { id: 't3', type: 'lb', label: 'Load Balancer', subLabel: 'ALB / Nginx', category: 'compute', x: 370, y: 160, color: '#8b5cf6' },
      { id: 't4', type: 'service', label: 'App Microservice', subLabel: 'Node/Go Pods', category: 'compute', x: 530, y: 160, color: '#10b981' },
      { id: 't5', type: 'cache', label: 'Redis Cache', subLabel: 'In-Memory Hot Data', category: 'cache', x: 690, y: 90, color: '#ef4444' },
      { id: 't6', type: 'db_sql', label: 'PostgreSQL DB', subLabel: 'Primary + Read Replicas', category: 'db', x: 690, y: 230, color: '#2563eb' }
    ],
    connections: [
      { id: 'c1', from: 't1', to: 't2', protocol: 'HTTPS / REST', label: 'User Request' },
      { id: 'c2', from: 't2', to: 't3', protocol: 'HTTPS / REST', label: 'Validated Route' },
      { id: 'c3', from: 't3', to: 't4', protocol: 'gRPC / Protobuf', label: 'Internal RPC' },
      { id: 'c4', from: 't4', to: 't5', protocol: 'Redis Cache Get/Set', label: 'Cache-Aside' },
      { id: 'c5', from: 't4', to: 't6', protocol: 'SQL Query', label: 'CRUD Persistence' }
    ]
  },
  {
    name: 'Event-Driven Async Pipeline',
    desc: 'Client -> API Gateway -> Ingestion Service -> Kafka -> Worker -> Storage',
    nodes: [
      { id: 'e1', type: 'client', label: 'Client App', subLabel: 'Mobile Streamer', category: 'client', x: 50, y: 160, color: '#3b82f6' },
      { id: 'e2', type: 'edge', label: 'API Gateway', subLabel: 'Ingress Point', category: 'edge', x: 210, y: 160, color: '#6366f1' },
      { id: 'e3', type: 'service', label: 'Ingestion Service', subLabel: 'Event Producer', category: 'compute', x: 370, y: 160, color: '#10b981' },
      { id: 'e4', type: 'queue', label: 'Kafka Cluster', subLabel: 'Partitioned Event Bus', category: 'queue', x: 530, y: 160, color: '#ec4899' },
      { id: 'e5', type: 'worker', label: 'Processing Worker', subLabel: 'Consumer Group', category: 'compute', x: 690, y: 90, color: '#059669' },
      { id: 'e6', type: 'storage', label: 'S3 Data Lake', subLabel: 'Raw Logs & Media', category: 'storage', x: 690, y: 230, color: '#f59e0b' }
    ],
    connections: [
      { id: 'ec1', from: 'e1', to: 'e2', protocol: 'HTTPS / REST', label: 'Telemetry/Data' },
      { id: 'ec2', from: 'e2', to: 'e3', protocol: 'gRPC / Protobuf', label: 'Stream' },
      { id: 'ec3', from: 'e3', to: 'e4', protocol: 'Kafka Event Topic', label: 'Produce Event' },
      { id: 'ec4', from: 'e4', to: 'e5', protocol: 'Kafka Event Topic', label: 'Consume Event' },
      { id: 'ec5', from: 'e5', to: 'e6', protocol: 'HTTPS / REST', label: 'Blob Store' }
    ]
  }
];

const ArchitectureCanvas = ({
  initialNodes = [],
  initialConnections = [],
  onChange = () => {},
  readOnly = false,
  height = '500px'
}) => {
  const [nodes, setNodes] = useState(initialNodes && initialNodes.length > 0 ? initialNodes : ARCHITECTURE_TEMPLATES[0].nodes);
  const [connections, setConnections] = useState(initialConnections && initialConnections.length > 0 ? initialConnections : ARCHITECTURE_TEMPLATES[0].connections);

  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [connectSourceNodeId, setConnectSourceNodeId] = useState(null);
  const [selectedProtocol, setSelectedProtocol] = useState('HTTPS / REST');
  const [editingNodeId, setEditingNodeId] = useState(null);
  const [editLabel, setEditLabel] = useState('');
  const [editSubLabel, setEditSubLabel] = useState('');

  // Dragging state
  const [isDraggingNode, setIsDraggingNode] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const canvasRef = useRef(null);

  useEffect(() => {
    if (initialNodes && initialNodes.length > 0) {
      setNodes(initialNodes);
    }
  }, [JSON.stringify(initialNodes)]);

  useEffect(() => {
    if (initialConnections && initialConnections.length > 0) {
      setConnections(initialConnections);
    }
  }, [JSON.stringify(initialConnections)]);

  useEffect(() => {
    if (!readOnly) {
      onChange({ nodes, connections });
    }
  }, [nodes, connections]);

  const handleAddNode = (template) => {
    if (readOnly) return;
    const newNode = {
      id: 'node_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      type: template.type,
      label: template.label,
      subLabel: template.subLabel,
      category: template.category,
      color: template.color,
      x: 80 + (nodes.length % 5) * 50,
      y: 80 + (nodes.length % 4) * 45
    };
    setNodes(prev => [...prev, newNode]);
    setSelectedNodeId(newNode.id);
  };

  const handleNodeMouseDown = (e, nodeId) => {
    if (readOnly) return;
    e.stopPropagation();

    // If in connecting mode
    if (connectSourceNodeId) {
      if (connectSourceNodeId !== nodeId) {
        // Prevent duplicate connection in same direction
        const existing = connections.find(c => c.from === connectSourceNodeId && c.to === nodeId);
        if (!existing) {
          const newConn = {
            id: 'conn_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
            from: connectSourceNodeId,
            to: nodeId,
            protocol: selectedProtocol,
            label: selectedProtocol
          };
          setConnections(prev => [...prev, newConn]);
        }
      }
      setConnectSourceNodeId(null);
      return;
    }

    setSelectedNodeId(nodeId);
    setIsDraggingNode(true);

    if (canvasRef.current) {
      const canvasRect = canvasRef.current.getBoundingClientRect();
      const node = nodes.find(n => n.id === nodeId);
      if (node) {
        setDragOffset({
          x: e.clientX - canvasRect.left - node.x,
          y: e.clientY - canvasRect.top - node.y
        });
      }
    }
  };

  const handleCanvasMouseMove = (e) => {
    if (!isDraggingNode || !selectedNodeId || readOnly || !canvasRef.current) return;
    const canvasRect = canvasRef.current.getBoundingClientRect();
    const newX = Math.max(15, Math.min(canvasRect.width - 165, e.clientX - canvasRect.left - dragOffset.x));
    const newY = Math.max(15, Math.min(canvasRect.height - 75, e.clientY - canvasRect.top - dragOffset.y));

    setNodes(prev => prev.map(n => n.id === selectedNodeId ? { ...n, x: newX, y: newY } : n));
  };

  const handleCanvasMouseUp = () => {
    setIsDraggingNode(false);
  };

  const handleDeleteSelected = () => {
    if (readOnly || !selectedNodeId) return;
    setNodes(prev => prev.filter(n => n.id !== selectedNodeId));
    setConnections(prev => prev.filter(c => c.from !== selectedNodeId && c.to !== selectedNodeId));
    setSelectedNodeId(null);
  };

  const handleDeleteConnection = (e, connId) => {
    e.stopPropagation();
    if (readOnly) return;
    setConnections(prev => prev.filter(c => c.id !== connId));
  };

  const handleStartEditing = (node) => {
    setEditingNodeId(node.id);
    setEditLabel(node.label);
    setEditSubLabel(node.subLabel || '');
  };

  const handleSaveEdit = () => {
    setNodes(prev => prev.map(n => n.id === editingNodeId ? { ...n, label: editLabel, subLabel: editSubLabel } : n));
    setEditingNodeId(null);
  };

  const handleApplyTemplate = (tpl) => {
    if (readOnly) return;
    if (window.confirm('Apply "' + tpl.name + '" template? Current canvas will be replaced.')) {
      setNodes(tpl.nodes);
      setConnections(tpl.connections);
      setSelectedNodeId(null);
      setConnectSourceNodeId(null);
    }
  };

  const handleClearCanvas = () => {
    if (readOnly) return;
    if (window.confirm('Clear all architecture components and connections?')) {
      setNodes([]);
      setConnections([]);
      setSelectedNodeId(null);
      setConnectSourceNodeId(null);
    }
  };

  const getNodeCenter = (nodeId) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return { x: 0, y: 0 };
    return {
      x: node.x + 75,
      y: node.y + 35
    };
  };

  return (
    <div className="d-flex flex-column border rounded-3 overflow-hidden bg-white shadow-sm h-100">
      
      {/* Canvas Top Toolbar */}
      <div 
        className="d-flex flex-wrap justify-content-between align-items-center px-3 py-2 border-bottom select-none bg-light"
        style={{ borderColor: '#e2e8f0', fontSize: '0.8rem' }}
      >
        {/* Left: Action Buttons */}
        <div className="d-flex align-items-center gap-2 flex-wrap">
          <span className="fw-bold text-dark d-flex align-items-center gap-1.5 me-2">
            <FiLayers className="text-primary" /> Visual Architecture Studio
          </span>

          {!readOnly && (
            <>
              {/* Connect Tool Button */}
              <button
                type="button"
                onClick={() => setConnectSourceNodeId(connectSourceNodeId ? null : selectedNodeId || (nodes[0]?.id || null))}
                disabled={nodes.length < 2}
                className={'btn btn-sm py-1 px-2.5 rounded-pill fw-semibold d-flex align-items-center gap-1.5 ' + (connectSourceNodeId ? 'btn-warning text-dark' : 'btn-outline-primary')}
                style={{ fontSize: '0.75rem' }}
                title="Click a source node then click a target node to connect"
              >
                <FiArrowRight /> {connectSourceNodeId ? 'Click Target Node...' : 'Connect Flow'}
              </button>

              {/* Protocol Selector for Connection */}
              <select
                value={selectedProtocol}
                onChange={(e) => setSelectedProtocol(e.target.value)}
                className="form-select form-select-sm py-0.5 px-2 rounded bg-white text-dark border"
                style={{ width: '160px', fontSize: '0.74rem' }}
                title="Select protocol for new connections"
              >
                {CONNECTION_PROTOCOLS.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>

              {/* Delete Node Button */}
              {selectedNodeId && (
                <button
                  type="button"
                  onClick={handleDeleteSelected}
                  className="btn btn-sm btn-outline-danger py-1 px-2 rounded d-flex align-items-center gap-1"
                  style={{ fontSize: '0.72rem' }}
                  title="Delete selected component"
                >
                  <FiTrash2 size={12} /> Delete Node
                </button>
              )}

              {/* Clear Canvas */}
              <button
                type="button"
                onClick={handleClearCanvas}
                className="btn btn-sm btn-outline-secondary py-1 px-2 rounded d-flex align-items-center gap-1"
                style={{ fontSize: '0.72rem' }}
                title="Clear entire canvas"
              >
                <FiRotateCcw size={12} /> Clear
              </button>
            </>
          )}
        </div>

        {/* Right: Pre-built Architecture Templates */}
        {!readOnly && (
          <div className="d-flex align-items-center gap-1.5">
            <span className="text-muted small" style={{ fontSize: '0.72rem' }}>Templates:</span>
            {ARCHITECTURE_TEMPLATES.map((tpl, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleApplyTemplate(tpl)}
                className="btn btn-sm btn-light border text-secondary py-0.5 px-2 rounded"
                style={{ fontSize: '0.72rem' }}
                title={tpl.desc}
              >
                {tpl.name.split(' ')[0]}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Main Canvas Workspace with Left Palette */}
      <div className="d-flex flex-grow-1" style={{ minHeight: height, position: 'relative' }}>
        
        {/* Left Component Palette Sidebar */}
        {!readOnly && (
          <div 
            className="p-2.5 border-end overflow-auto bg-light select-none d-flex flex-column gap-1.5"
            style={{ width: '190px', borderColor: '#e2e8f0', minWidth: '190px', maxHeight: '550px' }}
          >
            <span className="text-muted fw-bold d-block mb-1" style={{ fontSize: '0.72rem', letterSpacing: '0.5px' }}>
              + ADD COMPONENTS
            </span>

            <div className="d-flex flex-column gap-1">
              {COMPONENT_PALETTE.map((comp, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleAddNode(comp)}
                  className="btn btn-sm text-start p-1.5 rounded-2 bg-white border d-flex align-items-center gap-2 shadow-xs"
                  style={{ fontSize: '0.76rem', borderColor: '#e2e8f0' }}
                  title={'Add ' + comp.label + ' to canvas'}
                >
                  <div 
                    className="rounded p-1 text-white d-flex align-items-center justify-content-center flex-shrink-0"
                    style={{ backgroundColor: comp.color, width: '22px', height: '22px' }}
                  >
                    <FiServer size={12} />
                  </div>
                  <div className="overflow-hidden">
                    <strong className="text-dark d-block text-truncate" style={{ fontSize: '0.75rem', lineHeight: '1.2' }}>{comp.label}</strong>
                    <span className="text-muted d-block text-truncate" style={{ fontSize: '0.66rem' }}>{comp.subLabel}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Center Interactive Drawing Surface */}
        <div 
          ref={canvasRef}
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUp}
          className="flex-grow-1 position-relative overflow-hidden cursor-crosshair"
          style={{
            backgroundColor: '#ffffff',
            backgroundImage: 'radial-gradient(#e2e8f0 1.2px, transparent 1.2px)',
            backgroundSize: '20px 20px',
            userSelect: 'none',
            minHeight: '450px'
          }}
          onClick={() => { setSelectedNodeId(null); setConnectSourceNodeId(null); }}
        >
          {/* SVG Connector Lines Layer */}
          <svg className="position-absolute top-0 start-0 w-100 h-100" style={{ zIndex: 1, pointerEvents: 'none' }}>
            <defs>
              <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
                <polygon points="0 0, 8 3, 0 6" fill="#64748b" />
              </marker>
              <marker id="arrowhead-active" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
                <polygon points="0 0, 8 3, 0 6" fill="#8b5cf6" />
              </marker>
            </defs>

            {connections.map((conn) => {
              const fromCenter = getNodeCenter(conn.from);
              const toCenter = getNodeCenter(conn.to);
              const midX = (fromCenter.x + toCenter.x) / 2;
              const midY = (fromCenter.y + toCenter.y) / 2;

              return (
                <g key={conn.id} style={{ pointerEvents: 'auto' }}>
                  {/* Connection Line */}
                  <line
                    x1={fromCenter.x}
                    y1={fromCenter.y}
                    x2={toCenter.x}
                    y2={toCenter.y}
                    stroke="#64748b"
                    strokeWidth="2"
                    strokeDasharray="4 2"
                    markerEnd="url(#arrowhead)"
                  />
                  {/* Connection Protocol Tag */}
                  <rect
                    x={midX - 48}
                    y={midY - 10}
                    width="96"
                    height="19"
                    rx="9.5"
                    fill="#f1f5f9"
                    stroke="#cbd5e1"
                    strokeWidth="1"
                  />
                  <text
                    x={midX}
                    y={midY + 3.5}
                    fill="#334155"
                    fontSize="9"
                    fontWeight="600"
                    textAnchor="middle"
                    fontFamily="monospace"
                  >
                    {conn.protocol || 'Flow'}
                  </text>
                  {!readOnly && (
                    <circle
                      cx={midX + 40}
                      cy={midY - 4}
                      r="6"
                      fill="#ef4444"
                      cursor="pointer"
                      onClick={(e) => handleDeleteConnection(e, conn.id)}
                      title="Delete connection"
                    />
                  )}
                </g>
              );
            })}
          </svg>

          {/* Component Nodes Layer */}
          {nodes.map((node) => {
            const isSelected = selectedNodeId === node.id;
            const isConnectingSource = connectSourceNodeId === node.id;

            return (
              <div
                key={node.id}
                onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
                onClick={(e) => { e.stopPropagation(); setSelectedNodeId(node.id); }}
                className={'position-absolute rounded-3 shadow-sm border p-2 d-flex align-items-center gap-2 select-none transition-all ' + (isSelected ? 'border-primary' : 'bg-white')}
                style={{
                  left: node.x,
                  top: node.y,
                  width: '155px',
                  backgroundColor: '#ffffff',
                  borderColor: isConnectingSource ? '#f59e0b' : isSelected ? '#8b5cf6' : '#cbd5e1',
                  boxShadow: isSelected ? '0 4px 12px rgba(139, 92, 246, 0.25)' : '0 2px 4px rgba(0,0,0,0.06)',
                  cursor: readOnly ? 'default' : 'grab',
                  zIndex: isSelected ? 10 : 2
                }}
              >
                {/* Node Category Color Indicator Badge */}
                <div 
                  className="rounded-circle p-1 text-white d-flex align-items-center justify-content-center flex-shrink-0"
                  style={{ backgroundColor: node.color || '#3b82f6', width: '26px', height: '26px' }}
                >
                  <FiCpu size={14} />
                </div>

                {/* Node Details */}
                <div className="flex-grow-1 overflow-hidden">
                  <strong className="text-dark d-block text-truncate" style={{ fontSize: '0.78rem', lineHeight: '1.2' }}>
                    {node.label}
                  </strong>
                  <span className="text-muted d-block text-truncate" style={{ fontSize: '0.68rem' }}>
                    {node.subLabel || node.category}
                  </span>
                </div>

                {/* Inline Edit Icon */}
                {!readOnly && isSelected && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleStartEditing(node); }}
                    className="btn btn-sm btn-link p-0 text-muted"
                    style={{ fontSize: '0.7rem' }}
                    title="Rename component"
                  >
                    <FiEdit2 size={11} />
                  </button>
                )}
              </div>
            );
          })}

          {/* Empty Canvas Notice */}
          {nodes.length === 0 && (
            <div className="d-flex flex-column justify-content-center align-items-center h-100 text-muted small select-none" style={{ minHeight: '350px' }}>
              <FiLayers size={36} className="mb-2 opacity-30 text-primary" />
              <span>Canvas is empty. Click components on the left or apply a template above.</span>
            </div>
          )}
        </div>

      </div>

      {/* Edit Component Modal */}
      {editingNodeId && (
        <div className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center" style={{ backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 99999 }}>
          <div className="p-4 bg-white rounded-4 shadow-lg border text-start" style={{ maxWidth: '380px', width: '100%', borderColor: '#e2e8f0' }}>
            <h6 className="fw-bold text-dark mb-3">Edit Component Label</h6>
            <div className="mb-2.5">
              <label className="form-label small fw-semibold text-muted">Component Title</label>
              <input
                type="text"
                value={editLabel}
                onChange={(e) => setEditLabel(e.target.value)}
                className="form-control form-control-sm"
              />
            </div>
            <div className="mb-3">
              <label className="form-label small fw-semibold text-muted">Sub-Label / Tech Spec</label>
              <input
                type="text"
                value={editSubLabel}
                onChange={(e) => setEditSubLabel(e.target.value)}
                placeholder="e.g., PostgreSQL with Read Replicas"
                className="form-control form-control-sm"
              />
            </div>
            <div className="d-flex justify-content-end gap-2">
              <button type="button" onClick={() => setEditingNodeId(null)} className="btn btn-sm btn-light border px-3">Cancel</button>
              <button type="button" onClick={handleSaveEdit} className="btn btn-sm btn-primary-purple text-white px-3">Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Footer Connection Matrix */}
      <div className="px-3 py-1.5 border-top bg-light d-flex justify-content-between align-items-center text-muted small" style={{ fontSize: '0.72rem', borderColor: '#e2e8f0' }}>
        <span>Components: <strong>{nodes.length}</strong> | Connections: <strong>{connections.length}</strong></span>
        <span>Drag components to move • Click Connect Flow to link with protocols</span>
      </div>

    </div>
  );
};

export default ArchitectureCanvas;
