import React, { useRef, useEffect, useState } from 'react';
import * as d3 from 'd3';

interface Node {
  id: string;
  name: string;
  type: 'server' | 'router' | 'switch' | 'firewall' | 'endpoint';
  status: 'healthy' | 'warning' | 'critical' | 'offline';
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

interface Link {
  source: string | Node;
  target: string | Node;
  type: 'ethernet' | 'wifi' | 'vpn' | 'internet';
  bandwidth?: number;
  latency?: number;
}

interface NetworkTopologyVisualizationProps {
  nodes: Node[];
  links: Link[];
  width?: number;
  height?: number;
  onNodeClick?: (node: Node) => void;
  onNodeHover?: (node: Node | null) => void;
  enableDrag?: boolean;
  showLabels?: boolean;
}

export const NetworkTopologyVisualization: React.FC<NetworkTopologyVisualizationProps> = ({
  nodes,
  links,
  width = 800,
  height = 600,
  onNodeClick,
  onNodeHover,
  enableDrag = true,
  showLabels = true
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [hoveredNode, setHoveredNode] = useState<Node | null>(null);

  const getNodeColor = (node: Node) => {
    const colors = {
      healthy: '#28a745',
      warning: '#ffc107',
      critical: '#dc3545',
      offline: '#6c757d'
    };
    return colors[node.status];
  };

  const getNodeSize = (node: Node) => {
    const sizes = {
      server: 20,
      router: 15,
      switch: 12,
      firewall: 18,
      endpoint: 10
    };
    return sizes[node.type];
  };

  const getNodeIcon = (node: Node) => {
    const icons = {
      server: '🖥️',
      router: '📡',
      switch: '🔀',
      firewall: '🛡️',
      endpoint: '💻'
    };
    return icons[node.type];
  };

  const getLinkColor = (link: any) => {
    const colors = {
      ethernet: '#007bff',
      wifi: '#28a745',
      vpn: '#ffc107',
      internet: '#dc3545'
    };
    return colors[link.type] || '#6c757d';
  };

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    // Create simulation
    const simulation = d3.forceSimulation(nodes as any)
      .force('link', d3.forceLink(links).id((d: any) => d.id).distance(100))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(30));

    // Create container group
    const container = svg.append('g');

    // Add zoom behavior
    const zoom = d3.zoom()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        container.attr('transform', event.transform);
      });

    svg.call(zoom as any);

    // Create links
    const link = container.append('g')
      .selectAll('line')
      .data(links)
      .enter().append('line')
      .attr('stroke', (d: any) => getLinkColor(d))
      .attr('stroke-width', (d: any) => Math.sqrt(d.bandwidth || 1) * 2)
      .attr('stroke-opacity', 0.6);

    // Create nodes
    const node = container.append('g')
      .selectAll('circle')
      .data(nodes)
      .enter().append('circle')
      .attr('r', (d: any) => getNodeSize(d))
      .attr('fill', (d: any) => getNodeColor(d))
      .attr('stroke', '#fff')
      .attr('stroke-width', 2)
      .style('cursor', 'pointer');

    // Add node labels
    const labels = container.append('g')
      .selectAll('text')
      .data(nodes)
      .enter().append('text')
      .text((d: any) => showLabels ? d.name : '')
      .attr('font-size', '12px')
      .attr('font-family', 'Arial, sans-serif')
      .attr('text-anchor', 'middle')
      .attr('dy', -25)
      .style('pointer-events', 'none');

    // Add node icons
    const icons = container.append('g')
      .selectAll('text')
      .data(nodes)
      .enter().append('text')
      .text((d: any) => getNodeIcon(d))
      .attr('font-size', '16px')
      .attr('text-anchor', 'middle')
      .attr('dy', 5)
      .style('pointer-events', 'none');

    // Add drag behavior
    if (enableDrag) {
      const drag = d3.drag()
        .on('start', (event, d: any) => {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on('drag', (event, d: any) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on('end', (event, d: any) => {
          if (!event.active) simulation.alphaTarget(0);
          d.fx = null;
          d.fy = null;
        });

      node.call(drag as any);
    }

    // Add event handlers
    node
      .on('click', (event, d: any) => {
        setSelectedNode(d);
        onNodeClick?.(d);
      })
      .on('mouseenter', (event, d: any) => {
        setHoveredNode(d);
        onNodeHover?.(d);
        
        // Highlight connected nodes and links
        const connectedNodes = new Set();
        links.forEach(link => {
          if (link.source === d.id || (link.source as any).id === d.id) {
            connectedNodes.add(typeof link.target === 'string' ? link.target : (link.target as any).id);
          }
          if (link.target === d.id || (link.target as any).id === d.id) {
            connectedNodes.add(typeof link.source === 'string' ? link.source : (link.source as any).id);
          }
        });

        node.style('opacity', (n: any) => 
          n.id === d.id || connectedNodes.has(n.id) ? 1 : 0.3
        );
        
        link.style('opacity', (l: any) => {
          const sourceId = typeof l.source === 'string' ? l.source : l.source.id;
          const targetId = typeof l.target === 'string' ? l.target : l.target.id;
          return sourceId === d.id || targetId === d.id ? 1 : 0.1;
        });
      })
      .on('mouseleave', () => {
        setHoveredNode(null);
        onNodeHover?.(null);
        
        // Reset opacity
        node.style('opacity', 1);
        link.style('opacity', 0.6);
      });

    // Update positions on simulation tick
    simulation.on('tick', () => {
      link
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y);

      node
        .attr('cx', (d: any) => d.x)
        .attr('cy', (d: any) => d.y);

      labels
        .attr('x', (d: any) => d.x)
        .attr('y', (d: any) => d.y);

      icons
        .attr('x', (d: any) => d.x)
        .attr('y', (d: any) => d.y);
    });

    return () => {
      simulation.stop();
    };
  }, [nodes, links, width, height, enableDrag, showLabels, onNodeClick, onNodeHover]);

  const resetView = () => {
    const svg = d3.select(svgRef.current);
    svg.transition().duration(750).call(
      d3.zoom().transform as any,
      d3.zoomIdentity
    );
  };

  return (
    <div className="network-topology-visualization">
      <div className="topology-controls" style={{ marginBottom: '10px' }}>
        <button
          onClick={resetView}
          className="btn btn-sm btn-outline-secondary me-2"
        >
          Reset View
        </button>
        <div className="legend d-inline-block ms-3">
          <span className="me-3">
            <span className="badge bg-success me-1">●</span> Healthy
          </span>
          <span className="me-3">
            <span className="badge bg-warning me-1">●</span> Warning
          </span>
          <span className="me-3">
            <span className="badge bg-danger me-1">●</span> Critical
          </span>
          <span className="me-3">
            <span className="badge bg-secondary me-1">●</span> Offline
          </span>
        </div>
      </div>
      
      <svg
        ref={svgRef}
        width={width}
        height={height}
        style={{ border: '1px solid #ddd', borderRadius: '4px' }}
      />
      
      {hoveredNode && (
        <div
          className="tooltip-info position-absolute bg-dark text-white p-2 rounded"
          style={{
            top: '10px',
            right: '10px',
            fontSize: '12px',
            zIndex: 1000
          }}
        >
          <div><strong>{hoveredNode.name}</strong></div>
          <div>Type: {hoveredNode.type}</div>
          <div>Status: {hoveredNode.status}</div>
        </div>
      )}
    </div>
  );
};