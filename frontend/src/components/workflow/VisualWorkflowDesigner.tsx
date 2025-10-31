import React, { useState, useEffect, useRef, useCallback } from 'react';
import { format } from 'date-fns';

interface WorkflowNode {
  id: string;
  type: 'start' | 'action' | 'condition' | 'end' | 'approval' | 'notification';
  label: string;
  description?: string;
  position: { x: number; y: number };
  config?: Record<string, any>;
  inputs: string[];
  outputs: string[];
}

interface WorkflowConnection {
  id: string;
  sourceId: string;
  targetId: string;
  sourcePort?: string;
  targetPort?: string;
  condition?: string;
}

interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  nodes: WorkflowNode[];
  connections: WorkflowConnection[];
  version: string;
  createdAt: Date;
  updatedAt: Date;
}

interface NodeLibraryItem {
  type: string;
  label: string;
  icon: string;
  description: string;
  category: string;
  defaultConfig: Record<string, any>;
}

export const VisualWorkflowDesigner: React.FC = () => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [workflow, setWorkflow] = useState<WorkflowTemplate | null>(null);
  const [nodes, setNodes] = useState<WorkflowNode[]>([]);
  const [connections, setConnections] = useState<WorkflowConnection[]>([]);
  const [selectedNode, setSelectedNode] = useState<WorkflowNode | null>(null);
  const [draggedNode, setDraggedNode] = useState<WorkflowNode | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionStart, setConnectionStart] = useState<{ nodeId: string; port: string } | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationStep, setSimulationStep] = useState<string | null>(null);

  const nodeLibrary: NodeLibraryItem[] = [
    {
      type: 'start',
      label: 'Start',
      icon: 'bi-play-circle',
      description: 'Workflow entry point',
      category: 'Control',
      defaultConfig: {}
    },
    {
      type: 'action',
      label: 'Action',
      icon: 'bi-gear',
      description: 'Execute an action or task',
      category: 'Actions',
      defaultConfig: { actionType: 'script', script: '' }
    },
    {
      type: 'condition',
      label: 'Condition',
      icon: 'bi-diamond',
      description: 'Conditional branching',
      category: 'Control',
      defaultConfig: { condition: '', trueLabel: 'Yes', falseLabel: 'No' }
    },
    {
      type: 'approval',
      label: 'Approval',
      icon: 'bi-check-circle',
      description: 'Human approval step',
      category: 'Human',
      defaultConfig: { approvers: [], timeout: 24 }
    },
    {
      type: 'notification',
      label: 'Notification',
      icon: 'bi-bell',
      description: 'Send notification',
      category: 'Communication',
      defaultConfig: { recipients: [], message: '', channel: 'email' }
    },
    {
      type: 'end',
      label: 'End',
      icon: 'bi-stop-circle',
      description: 'Workflow termination',
      category: 'Control',
      defaultConfig: {}
    }
  ];

  useEffect(() => {
    // Initialize with a sample workflow
    const sampleWorkflow: WorkflowTemplate = {
      id: '1',
      name: 'Incident Response Workflow',
      description: 'Automated incident response and escalation workflow',
      category: 'Security',
      nodes: [
        {
          id: 'start-1',
          type: 'start',
          label: 'Incident Detected',
          position: { x: 100, y: 200 },
          inputs: [],
          outputs: ['out1']
        },
        {
          id: 'action-1',
          type: 'action',
          label: 'Analyze Threat',
          description: 'Perform automated threat analysis',
          position: { x: 300, y: 200 },
          config: { actionType: 'analysis', severity: 'auto' },
          inputs: ['in1'],
          outputs: ['out1']
        },
        {
          id: 'condition-1',
          type: 'condition',
          label: 'High Severity?',
          position: { x: 500, y: 200 },
          config: { condition: 'severity > 7', trueLabel: 'Yes', falseLabel: 'No' },
          inputs: ['in1'],
          outputs: ['out1', 'out2']
        },
        {
          id: 'approval-1',
          type: 'approval',
          label: 'Security Team Approval',
          position: { x: 700, y: 100 },
          config: { approvers: ['security-team'], timeout: 2 },
          inputs: ['in1'],
          outputs: ['out1']
        },
        {
          id: 'notification-1',
          type: 'notification',
          label: 'Alert Management',
          position: { x: 700, y: 300 },
          config: { recipients: ['management'], message: 'Low severity incident detected', channel: 'email' },
          inputs: ['in1'],
          outputs: ['out1']
        },
        {
          id: 'end-1',
          type: 'end',
          label: 'Workflow Complete',
          position: { x: 900, y: 200 },
          inputs: ['in1', 'in2'],
          outputs: []
        }
      ],
      connections: [
        { id: 'conn-1', sourceId: 'start-1', targetId: 'action-1' },
        { id: 'conn-2', sourceId: 'action-1', targetId: 'condition-1' },
        { id: 'conn-3', sourceId: 'condition-1', targetId: 'approval-1', condition: 'true' },
        { id: 'conn-4', sourceId: 'condition-1', targetId: 'notification-1', condition: 'false' },
        { id: 'conn-5', sourceId: 'approval-1', targetId: 'end-1' },
        { id: 'conn-6', sourceId: 'notification-1', targetId: 'end-1' }
      ],
      version: '1.0',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    setWorkflow(sampleWorkflow);
    setNodes(sampleWorkflow.nodes);
    setConnections(sampleWorkflow.connections);
  }, []);

  const getNodeIcon = (type: string) => {
    const nodeType = nodeLibrary.find(n => n.type === type);
    return nodeType?.icon || 'bi-circle';
  };

  const getNodeColor = (type: string) => {
    const colors = {
      start: '#28a745',
      action: '#007bff',
      condition: '#ffc107',
      approval: '#17a2b8',
      notification: '#6f42c1',
      end: '#dc3545'
    };
    return colors[type as keyof typeof colors] || '#6c757d';
  };

  const handleNodeDragStart = (node: WorkflowNode, event: React.DragEvent) => {
    setDraggedNode(node);
    event.dataTransfer.effectAllowed = 'move';
  };

  const handleCanvasDrop = (event: React.DragEvent) => {
    event.preventDefault();
    if (!draggedNode || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const updatedNodes = nodes.map(node =>
      node.id === draggedNode.id
        ? { ...node, position: { x, y } }
        : node
    );

    setNodes(updatedNodes);
    setDraggedNode(null);
  };

  const handleCanvasDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  };

  const addNodeFromLibrary = (nodeType: NodeLibraryItem, event: React.DragEvent) => {
    event.preventDefault();
    if (!canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const newNode: WorkflowNode = {
      id: `${nodeType.type}-${Date.now()}`,
      type: nodeType.type as any,
      label: nodeType.label,
      description: nodeType.description,
      position: { x, y },
      config: { ...nodeType.defaultConfig },
      inputs: nodeType.type === 'start' ? [] : ['in1'],
      outputs: nodeType.type === 'end' ? [] : ['out1']
    };

    setNodes(prev => [...prev, newNode]);
  };

  const handleNodeClick = (node: WorkflowNode) => {
    setSelectedNode(node);
  };

  const handleConnectionStart = (nodeId: string, port: string) => {
    setIsConnecting(true);
    setConnectionStart({ nodeId, port });
  };

  const handleConnectionEnd = (nodeId: string, port: string) => {
    if (!connectionStart || connectionStart.nodeId === nodeId) {
      setIsConnecting(false);
      setConnectionStart(null);
      return;
    }

    const newConnection: WorkflowConnection = {
      id: `conn-${Date.now()}`,
      sourceId: connectionStart.nodeId,
      targetId: nodeId,
      sourcePort: connectionStart.port,
      targetPort: port
    };

    setConnections(prev => [...prev, newConnection]);
    setIsConnecting(false);
    setConnectionStart(null);
  };

  const validateWorkflow = () => {
    const errors: string[] = [];

    // Check for start node
    const startNodes = nodes.filter(n => n.type === 'start');
    if (startNodes.length === 0) {
      errors.push('Workflow must have at least one start node');
    }
    if (startNodes.length > 1) {
      errors.push('Workflow can only have one start node');
    }

    // Check for end node
    const endNodes = nodes.filter(n => n.type === 'end');
    if (endNodes.length === 0) {
      errors.push('Workflow must have at least one end node');
    }

    // Check for disconnected nodes
    nodes.forEach(node => {
      if (node.type !== 'start' && node.type !== 'end') {
        const hasIncoming = connections.some(c => c.targetId === node.id);
        const hasOutgoing = connections.some(c => c.sourceId === node.id);
        
        if (!hasIncoming) {
          errors.push(`Node "${node.label}" has no incoming connections`);
        }
        if (!hasOutgoing) {
          errors.push(`Node "${node.label}" has no outgoing connections`);
        }
      }
    });

    setValidationErrors(errors);
    return errors.length === 0;
  };

  const simulateWorkflow = async () => {
    if (!validateWorkflow()) return;

    setIsSimulating(true);
    const startNode = nodes.find(n => n.type === 'start');
    if (!startNode) return;

    let currentNodeId = startNode.id;
    const executionPath: string[] = [];

    while (currentNodeId) {
      executionPath.push(currentNodeId);
      setSimulationStep(currentNodeId);
      
      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Find next node
      const connection = connections.find(c => c.sourceId === currentNodeId);
      currentNodeId = connection?.targetId || '';

      // Stop at end node
      const currentNode = nodes.find(n => n.id === currentNodeId);
      if (currentNode?.type === 'end') {
        executionPath.push(currentNodeId);
        setSimulationStep(currentNodeId);
        break;
      }
    }

    setTimeout(() => {
      setIsSimulating(false);
      setSimulationStep(null);
    }, 1000);
  };

  const exportWorkflow = () => {
    const workflowData = {
      ...workflow,
      nodes,
      connections,
      updatedAt: new Date()
    };

    const blob = new Blob([JSON.stringify(workflowData, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `workflow-${workflow?.name || 'untitled'}.json`;
    link.click();
  };

  const renderNode = (node: WorkflowNode) => {
    const isSelected = selectedNode?.id === node.id;
    const isSimulating = simulationStep === node.id;

    return (
      <div
        key={node.id}
        className={`workflow-node ${isSelected ? 'selected' : ''} ${isSimulating ? 'simulating' : ''}`}
        style={{
          position: 'absolute',
          left: node.position.x,
          top: node.position.y,
          backgroundColor: getNodeColor(node.type),
          color: 'white',
          padding: '10px',
          borderRadius: '8px',
          minWidth: '120px',
          textAlign: 'center',
          cursor: 'pointer',
          border: isSelected ? '3px solid #fff' : '1px solid rgba(255,255,255,0.3)',
          boxShadow: isSimulating ? '0 0 20px rgba(255,255,0,0.8)' : '0 2px 4px rgba(0,0,0,0.2)'
        }}
        draggable
        onDragStart={(e) => handleNodeDragStart(node, e)}
        onClick={() => handleNodeClick(node)}
      >
        <div className="d-flex align-items-center justify-content-center mb-1">
          <i className={`${getNodeIcon(node.type)} me-1`}></i>
          <small className="fw-bold">{node.label}</small>
        </div>
        {node.description && (
          <div className="small opacity-75">{node.description}</div>
        )}
        
        {/* Connection ports */}
        {node.inputs.map((input, index) => (
          <div
            key={`input-${index}`}
            className="connection-port input-port"
            style={{
              position: 'absolute',
              left: '-8px',
              top: '50%',
              transform: 'translateY(-50%)',
              width: '16px',
              height: '16px',
              backgroundColor: '#fff',
              border: '2px solid #333',
              borderRadius: '50%',
              cursor: 'pointer'
            }}
            onClick={() => handleConnectionEnd(node.id, input)}
          />
        ))}
        
        {node.outputs.map((output, index) => (
          <div
            key={`output-${index}`}
            className="connection-port output-port"
            style={{
              position: 'absolute',
              right: '-8px',
              top: '50%',
              transform: 'translateY(-50%)',
              width: '16px',
              height: '16px',
              backgroundColor: '#fff',
              border: '2px solid #333',
              borderRadius: '50%',
              cursor: 'pointer'
            }}
            onClick={() => handleConnectionStart(node.id, output)}
          />
        ))}
      </div>
    );
  };

  const renderConnection = (connection: WorkflowConnection) => {
    const sourceNode = nodes.find(n => n.id === connection.sourceId);
    const targetNode = nodes.find(n => n.id === connection.targetId);
    
    if (!sourceNode || !targetNode) return null;

    const startX = sourceNode.position.x + 120;
    const startY = sourceNode.position.y + 25;
    const endX = targetNode.position.x;
    const endY = targetNode.position.y + 25;

    return (
      <svg
        key={connection.id}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 1
        }}
      >
        <defs>
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="7"
            refX="9"
            refY="3.5"
            orient="auto"
          >
            <polygon
              points="0 0, 10 3.5, 0 7"
              fill="#333"
            />
          </marker>
        </defs>
        <path
          d={`M ${startX} ${startY} Q ${(startX + endX) / 2} ${startY} ${endX} ${endY}`}
          stroke="#333"
          strokeWidth="2"
          fill="none"
          markerEnd="url(#arrowhead)"
        />
        {connection.condition && (
          <text
            x={(startX + endX) / 2}
            y={(startY + endY) / 2 - 10}
            textAnchor="middle"
            fontSize="12"
            fill="#666"
          >
            {connection.condition}
          </text>
        )}
      </svg>
    );
  };

  return (
    <div className="visual-workflow-designer">
      <div className="d-flex h-100">
        {/* Node Library Sidebar */}
        <div className="workflow-sidebar" style={{ width: '250px', borderRight: '1px solid #dee2e6' }}>
          <div className="p-3">
            <h6 className="mb-3">Node Library</h6>
            
            {Object.entries(
              nodeLibrary.reduce((acc, node) => {
                if (!acc[node.category]) acc[node.category] = [];
                acc[node.category].push(node);
                return acc;
              }, {} as Record<string, NodeLibraryItem[]>)
            ).map(([category, categoryNodes]) => (
              <div key={category} className="mb-3">
                <small className="text-muted fw-bold">{category}</small>
                {categoryNodes.map(nodeType => (
                  <div
                    key={nodeType.type}
                    className="node-library-item p-2 mb-1 border rounded"
                    style={{ cursor: 'grab' }}
                    draggable
                    onDragEnd={(e) => addNodeFromLibrary(nodeType, e)}
                  >
                    <div className="d-flex align-items-center">
                      <i className={`${nodeType.icon} me-2`}></i>
                      <div>
                        <div className="small fw-medium">{nodeType.label}</div>
                        <div className="small text-muted">{nodeType.description}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Main Canvas Area */}
        <div className="flex-grow-1 d-flex flex-column">
          {/* Toolbar */}
          <div className="workflow-toolbar p-3 border-bottom">
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <h5 className="mb-0">{workflow?.name || 'Untitled Workflow'}</h5>
                <small className="text-muted">{workflow?.description}</small>
              </div>
              <div className="btn-group">
                <button 
                  className="btn btn-outline-primary btn-sm"
                  onClick={validateWorkflow}
                >
                  <i className="bi bi-check-circle me-1"></i>
                  Validate
                </button>
                <button 
                  className="btn btn-outline-success btn-sm"
                  onClick={simulateWorkflow}
                  disabled={isSimulating}
                >
                  <i className={`bi ${isSimulating ? 'bi-hourglass-split' : 'bi-play'} me-1`}></i>
                  {isSimulating ? 'Simulating...' : 'Test Run'}
                </button>
                <button 
                  className="btn btn-outline-secondary btn-sm"
                  onClick={exportWorkflow}
                >
                  <i className="bi bi-download me-1"></i>
                  Export
                </button>
                <button className="btn btn-primary btn-sm">
                  <i className="bi bi-save me-1"></i>
                  Save
                </button>
              </div>
            </div>
          </div>

          {/* Canvas */}
          <div className="flex-grow-1 position-relative overflow-hidden">
            <div
              ref={canvasRef}
              className="workflow-canvas w-100 h-100 position-relative"
              style={{ 
                backgroundColor: '#f8f9fa',
                backgroundImage: 'radial-gradient(circle, #dee2e6 1px, transparent 1px)',
                backgroundSize: '20px 20px'
              }}
              onDrop={handleCanvasDrop}
              onDragOver={handleCanvasDragOver}
            >
              {/* Render connections first (behind nodes) */}
              {connections.map(renderConnection)}
              
              {/* Render nodes */}
              {nodes.map(renderNode)}
            </div>
          </div>

          {/* Status Bar */}
          <div className="workflow-status-bar p-2 border-top bg-light">
            <div className="d-flex justify-content-between align-items-center">
              <div className="small text-muted">
                Nodes: {nodes.length} | Connections: {connections.length}
              </div>
              <div className="small">
                {validationErrors.length > 0 && (
                  <span className="text-danger">
                    <i className="bi bi-exclamation-triangle me-1"></i>
                    {validationErrors.length} validation error(s)
                  </span>
                )}
                {validationErrors.length === 0 && nodes.length > 0 && (
                  <span className="text-success">
                    <i className="bi bi-check-circle me-1"></i>
                    Workflow is valid
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Properties Panel */}
        {selectedNode && (
          <div className="workflow-properties" style={{ width: '300px', borderLeft: '1px solid #dee2e6' }}>
            <div className="p-3">
              <h6 className="mb-3">Node Properties</h6>
              
              <div className="mb-3">
                <label className="form-label small">Label</label>
                <input
                  type="text"
                  className="form-control form-control-sm"
                  value={selectedNode.label}
                  onChange={(e) => {
                    const updatedNodes = nodes.map(node =>
                      node.id === selectedNode.id
                        ? { ...node, label: e.target.value }
                        : node
                    );
                    setNodes(updatedNodes);
                    setSelectedNode({ ...selectedNode, label: e.target.value });
                  }}
                />
              </div>

              <div className="mb-3">
                <label className="form-label small">Description</label>
                <textarea
                  className="form-control form-control-sm"
                  rows={3}
                  value={selectedNode.description || ''}
                  onChange={(e) => {
                    const updatedNodes = nodes.map(node =>
                      node.id === selectedNode.id
                        ? { ...node, description: e.target.value }
                        : node
                    );
                    setNodes(updatedNodes);
                    setSelectedNode({ ...selectedNode, description: e.target.value });
                  }}
                />
              </div>

              {selectedNode.type === 'condition' && (
                <div className="mb-3">
                  <label className="form-label small">Condition</label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    value={selectedNode.config?.condition || ''}
                    placeholder="e.g., severity > 5"
                    onChange={(e) => {
                      const updatedNodes = nodes.map(node =>
                        node.id === selectedNode.id
                          ? { ...node, config: { ...node.config, condition: e.target.value } }
                          : node
                      );
                      setNodes(updatedNodes);
                    }}
                  />
                </div>
              )}

              {selectedNode.type === 'approval' && (
                <div className="mb-3">
                  <label className="form-label small">Timeout (hours)</label>
                  <input
                    type="number"
                    className="form-control form-control-sm"
                    value={selectedNode.config?.timeout || 24}
                    onChange={(e) => {
                      const updatedNodes = nodes.map(node =>
                        node.id === selectedNode.id
                          ? { ...node, config: { ...node.config, timeout: parseInt(e.target.value) } }
                          : node
                      );
                      setNodes(updatedNodes);
                    }}
                  />
                </div>
              )}

              <div className="mb-3">
                <label className="form-label small">Position</label>
                <div className="row">
                  <div className="col-6">
                    <input
                      type="number"
                      className="form-control form-control-sm"
                      placeholder="X"
                      value={selectedNode.position.x}
                      onChange={(e) => {
                        const updatedNodes = nodes.map(node =>
                          node.id === selectedNode.id
                            ? { ...node, position: { ...node.position, x: parseInt(e.target.value) } }
                            : node
                        );
                        setNodes(updatedNodes);
                      }}
                    />
                  </div>
                  <div className="col-6">
                    <input
                      type="number"
                      className="form-control form-control-sm"
                      placeholder="Y"
                      value={selectedNode.position.y}
                      onChange={(e) => {
                        const updatedNodes = nodes.map(node =>
                          node.id === selectedNode.id
                            ? { ...node, position: { ...node.position, y: parseInt(e.target.value) } }
                            : node
                        );
                        setNodes(updatedNodes);
                      }}
                    />
                  </div>
                </div>
              </div>

              <button
                className="btn btn-danger btn-sm w-100"
                onClick={() => {
                  setNodes(nodes.filter(n => n.id !== selectedNode.id));
                  setConnections(connections.filter(c => 
                    c.sourceId !== selectedNode.id && c.targetId !== selectedNode.id
                  ));
                  setSelectedNode(null);
                }}
              >
                <i className="bi bi-trash me-1"></i>
                Delete Node
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Validation Errors Modal */}
      {validationErrors.length > 0 && (
        <div className="position-fixed bottom-0 end-0 m-3" style={{ zIndex: 1050 }}>
          <div className="alert alert-danger">
            <h6 className="alert-heading">Validation Errors</h6>
            <ul className="mb-0">
              {validationErrors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Custom Styles */}
      <style jsx>{`
        .workflow-node.selected {
          transform: scale(1.05);
          z-index: 10;
        }
        
        .workflow-node.simulating {
          animation: pulse 1s infinite;
        }
        
        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(255, 255, 0, 0.7); }
          70% { box-shadow: 0 0 0 10px rgba(255, 255, 0, 0); }
          100% { box-shadow: 0 0 0 0 rgba(255, 255, 0, 0); }
        }
        
        .node-library-item:hover {
          background-color: #f8f9fa;
        }
        
        .connection-port:hover {
          transform: translateY(-50%) scale(1.2);
        }
      `}</style>
    </div>
  );
};