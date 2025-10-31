import React, { useRef, useEffect, useState } from 'react';
import * as d3 from 'd3';

interface HeatMapDataPoint {
  x: string | number;
  y: string | number;
  value: number;
  label?: string;
}

interface InteractiveHeatMapProps {
  data: HeatMapDataPoint[];
  width?: number;
  height?: number;
  colorScheme?: 'blues' | 'reds' | 'greens' | 'viridis' | 'plasma';
  showValues?: boolean;
  showTooltip?: boolean;
  onCellClick?: (dataPoint: HeatMapDataPoint) => void;
  onCellHover?: (dataPoint: HeatMapDataPoint | null) => void;
}

export const InteractiveHeatMap: React.FC<InteractiveHeatMapProps> = ({
  data,
  width = 600,
  height = 400,
  colorScheme = 'blues',
  showValues = true,
  showTooltip = true,
  onCellClick,
  onCellHover
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [tooltip, setTooltip] = useState<{
    visible: boolean;
    x: number;
    y: number;
    content: string;
  }>({ visible: false, x: 0, y: 0, content: '' });

  const margin = { top: 50, right: 50, bottom: 50, left: 50 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  const getColorScale = () => {
    const minValue = d3.min(data, d => d.value) || 0;
    const maxValue = d3.max(data, d => d.value) || 1;

    const schemes = {
      blues: d3.interpolateBlues,
      reds: d3.interpolateReds,
      greens: d3.interpolateGreens,
      viridis: d3.interpolateViridis,
      plasma: d3.interpolatePlasma
    };

    return d3.scaleSequential(schemes[colorScheme])
      .domain([minValue, maxValue]);
  };

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    // Get unique x and y values
    const xValues = Array.from(new Set(data.map(d => d.x))).sort();
    const yValues = Array.from(new Set(data.map(d => d.y))).sort();

    // Create scales
    const xScale = d3.scaleBand()
      .domain(xValues.map(String))
      .range([0, innerWidth])
      .padding(0.1);

    const yScale = d3.scaleBand()
      .domain(yValues.map(String))
      .range([0, innerHeight])
      .padding(0.1);

    const colorScale = getColorScale();

    // Create main group
    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Create cells
    const cells = g.selectAll('.cell')
      .data(data)
      .enter().append('g')
      .attr('class', 'cell')
      .attr('transform', d => `translate(${xScale(String(d.x))},${yScale(String(d.y))})`);

    // Add rectangles
    cells.append('rect')
      .attr('width', xScale.bandwidth())
      .attr('height', yScale.bandwidth())
      .attr('fill', d => colorScale(d.value))
      .attr('stroke', '#fff')
      .attr('stroke-width', 1)
      .style('cursor', 'pointer')
      .on('click', (event, d) => {
        onCellClick?.(d);
      })
      .on('mouseenter', (event, d) => {
        onCellHover?.(d);
        
        if (showTooltip) {
          const rect = event.target.getBoundingClientRect();
          setTooltip({
            visible: true,
            x: rect.left + rect.width / 2,
            y: rect.top - 10,
            content: `X: ${d.x}, Y: ${d.y}, Value: ${d.value.toFixed(2)}`
          });
        }

        // Highlight row and column
        g.selectAll('.row-highlight').remove();
        g.selectAll('.col-highlight').remove();

        g.append('rect')
          .attr('class', 'row-highlight')
          .attr('x', 0)
          .attr('y', yScale(String(d.y)))
          .attr('width', innerWidth)
          .attr('height', yScale.bandwidth())
          .attr('fill', 'rgba(0, 0, 0, 0.1)')
          .style('pointer-events', 'none');

        g.append('rect')
          .attr('class', 'col-highlight')
          .attr('x', xScale(String(d.x)))
          .attr('y', 0)
          .attr('width', xScale.bandwidth())
          .attr('height', innerHeight)
          .attr('fill', 'rgba(0, 0, 0, 0.1)')
          .style('pointer-events', 'none');
      })
      .on('mouseleave', () => {
        onCellHover?.(null);
        setTooltip(prev => ({ ...prev, visible: false }));
        
        // Remove highlights
        g.selectAll('.row-highlight').remove();
        g.selectAll('.col-highlight').remove();
      });

    // Add text values if enabled
    if (showValues) {
      cells.append('text')
        .attr('x', xScale.bandwidth() / 2)
        .attr('y', yScale.bandwidth() / 2)
        .attr('dy', '0.35em')
        .attr('text-anchor', 'middle')
        .attr('font-size', '10px')
        .attr('font-family', 'Arial, sans-serif')
        .attr('fill', d => {
          const brightness = d3.hsl(colorScale(d.value)).l;
          return brightness > 0.5 ? '#000' : '#fff';
        })
        .text(d => d.value.toFixed(1))
        .style('pointer-events', 'none');
    }

    // Add x-axis
    const xAxis = d3.axisBottom(xScale);
    g.append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(xAxis)
      .selectAll('text')
      .style('text-anchor', 'middle')
      .attr('font-size', '12px');

    // Add y-axis
    const yAxis = d3.axisLeft(yScale);
    g.append('g')
      .attr('class', 'y-axis')
      .call(yAxis)
      .selectAll('text')
      .attr('font-size', '12px');

    // Add color legend
    const legendWidth = 200;
    const legendHeight = 20;
    const legendX = innerWidth - legendWidth;
    const legendY = -30;

    const legendScale = d3.scaleLinear()
      .domain(colorScale.domain())
      .range([0, legendWidth]);

    const legendAxis = d3.axisBottom(legendScale)
      .ticks(5)
      .tickFormat(d3.format('.1f'));

    const legend = g.append('g')
      .attr('class', 'legend')
      .attr('transform', `translate(${legendX},${legendY})`);

    // Create gradient for legend
    const gradient = svg.append('defs')
      .append('linearGradient')
      .attr('id', 'legend-gradient')
      .attr('x1', '0%')
      .attr('x2', '100%')
      .attr('y1', '0%')
      .attr('y2', '0%');

    const numStops = 10;
    for (let i = 0; i <= numStops; i++) {
      const t = i / numStops;
      const value = colorScale.domain()[0] + t * (colorScale.domain()[1] - colorScale.domain()[0]);
      gradient.append('stop')
        .attr('offset', `${t * 100}%`)
        .attr('stop-color', colorScale(value));
    }

    legend.append('rect')
      .attr('width', legendWidth)
      .attr('height', legendHeight)
      .attr('fill', 'url(#legend-gradient)')
      .attr('stroke', '#000')
      .attr('stroke-width', 1);

    legend.append('g')
      .attr('transform', `translate(0,${legendHeight})`)
      .call(legendAxis)
      .selectAll('text')
      .attr('font-size', '10px');

  }, [data, width, height, colorScheme, showValues, onCellClick, onCellHover]);

  return (
    <div className="interactive-heatmap" style={{ position: 'relative' }}>
      <svg
        ref={svgRef}
        width={width}
        height={height}
        style={{ border: '1px solid #ddd', borderRadius: '4px' }}
      />
      
      {tooltip.visible && showTooltip && (
        <div
          className="tooltip-info position-absolute bg-dark text-white p-2 rounded"
          style={{
            left: tooltip.x,
            top: tooltip.y,
            transform: 'translate(-50%, -100%)',
            fontSize: '12px',
            zIndex: 1000,
            pointerEvents: 'none'
          }}
        >
          {tooltip.content}
        </div>
      )}
    </div>
  );
};