import React, { useState, useEffect, useRef } from 'react';
import { Line, Bar, Scatter, Radar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  RadialLinearScale,
  Title,
  Tooltip,
  Legend,
  Filler,
  ChartOptions,
  ChartData
} from 'chart.js';
import zoomPlugin from 'chartjs-plugin-zoom';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  RadialLinearScale,
  Title,
  Tooltip,
  Legend,
  Filler,
  zoomPlugin
);

interface DrillDownData {
  level: number;
  data: any[];
  breadcrumb: string[];
}

interface AdvancedDataVisualizationProps {
  data: any[];
  chartType: 'line' | 'bar' | 'scatter' | 'radar' | 'heatmap';
  enableDrillDown?: boolean;
  enableExport?: boolean;
  enableZoom?: boolean;
  title?: string;
  height?: number;
}

export const AdvancedDataVisualization: React.FC<AdvancedDataVisualizationProps> = ({
  data,
  chartType,
  enableDrillDown = false,
  enableExport = false,
  enableZoom = false,
  title,
  height = 400
}) => {
  const chartRef = useRef<any>(null);
  const [drillDownStack, setDrillDownStack] = useState<DrillDownData[]>([]);
  const [currentData, setCurrentData] = useState(data);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setCurrentData(data);
  }, [data]);

  const generateChartData = (): ChartData<any> => {
    switch (chartType) {
      case 'line':
        return {
          labels: currentData.map(item => item.label || item.x),
          datasets: [{
            label: 'Value',
            data: currentData.map(item => item.value || item.y),
            borderColor: 'rgb(75, 192, 192)',
            backgroundColor: 'rgba(75, 192, 192, 0.2)',
            tension: 0.1,
            fill: true
          }]
        };
      
      case 'bar':
        return {
          labels: currentData.map(item => item.label || item.x),
          datasets: [{
            label: 'Value',
            data: currentData.map(item => item.value || item.y),
            backgroundColor: [
              'rgba(255, 99, 132, 0.8)',
              'rgba(54, 162, 235, 0.8)',
              'rgba(255, 205, 86, 0.8)',
              'rgba(75, 192, 192, 0.8)',
              'rgba(153, 102, 255, 0.8)',
            ]
          }]
        };
      
      case 'scatter':
        return {
          datasets: [{
            label: 'Data Points',
            data: currentData.map(item => ({ x: item.x, y: item.y })),
            backgroundColor: 'rgba(255, 99, 132, 0.6)',
            borderColor: 'rgba(255, 99, 132, 1)',
            pointRadius: 5
          }]
        };
      
      case 'radar':
        return {
          labels: currentData.map(item => item.label),
          datasets: [{
            label: 'Metrics',
            data: currentData.map(item => item.value),
            backgroundColor: 'rgba(54, 162, 235, 0.2)',
            borderColor: 'rgba(54, 162, 235, 1)',
            pointBackgroundColor: 'rgba(54, 162, 235, 1)',
            pointBorderColor: '#fff',
            pointHoverBackgroundColor: '#fff',
            pointHoverBorderColor: 'rgba(54, 162, 235, 1)'
          }]
        };
      
      default:
        return { labels: [], datasets: [] };
    }
  };

  const generateChartOptions = (): ChartOptions<any> => {
    const baseOptions: ChartOptions<any> = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top' as const,
        },
        title: {
          display: !!title,
          text: title,
        },
        tooltip: {
          callbacks: {
            afterLabel: (context) => {
              if (enableDrillDown) {
                return 'Click to drill down';
              }
              return '';
            }
          }
        }
      },
      onClick: enableDrillDown ? handleChartClick : undefined,
    };

    if (enableZoom) {
      baseOptions.plugins!.zoom = {
        zoom: {
          wheel: {
            enabled: true,
          },
          pinch: {
            enabled: true
          },
          mode: 'xy',
        },
        pan: {
          enabled: true,
          mode: 'xy',
        }
      };
    }

    if (chartType === 'scatter') {
      baseOptions.scales = {
        x: {
          type: 'linear',
          position: 'bottom'
        },
        y: {
          type: 'linear'
        }
      };
    }

    return baseOptions;
  };

  const handleChartClick = (event: any, elements: any[]) => {
    if (elements.length > 0 && enableDrillDown) {
      const elementIndex = elements[0].index;
      const clickedItem = currentData[elementIndex];
      
      if (clickedItem.drillDownData) {
        setIsLoading(true);
        
        // Simulate async drill-down data loading
        setTimeout(() => {
          const newDrillDown: DrillDownData = {
            level: drillDownStack.length + 1,
            data: clickedItem.drillDownData,
            breadcrumb: [...(drillDownStack[drillDownStack.length - 1]?.breadcrumb || []), clickedItem.label]
          };
          
          setDrillDownStack(prev => [...prev, newDrillDown]);
          setCurrentData(clickedItem.drillDownData);
          setIsLoading(false);
        }, 500);
      }
    }
  };

  const handleBreadcrumbClick = (level: number) => {
    if (level === 0) {
      setDrillDownStack([]);
      setCurrentData(data);
    } else {
      const newStack = drillDownStack.slice(0, level);
      setDrillDownStack(newStack);
      setCurrentData(newStack[newStack.length - 1].data);
    }
  };

  const exportChart = (format: 'png' | 'pdf' | 'csv') => {
    if (!chartRef.current) return;

    switch (format) {
      case 'png':
        const canvas = chartRef.current.canvas;
        const url = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = `chart-${Date.now()}.png`;
        link.href = url;
        link.click();
        break;
      
      case 'csv':
        const csvContent = currentData.map(item => 
          `${item.label || item.x},${item.value || item.y}`
        ).join('\n');
        const blob = new Blob([`Label,Value\n${csvContent}`], { type: 'text/csv' });
        const csvUrl = URL.createObjectURL(blob);
        const csvLink = document.createElement('a');
        csvLink.download = `chart-data-${Date.now()}.csv`;
        csvLink.href = csvUrl;
        csvLink.click();
        break;
      
      case 'pdf':
        // PDF export would require additional library like jsPDF
        console.log('PDF export not implemented');
        break;
    }
  };

  const resetZoom = () => {
    if (chartRef.current) {
      chartRef.current.resetZoom();
    }
  };

  const renderChart = () => {
    const chartData = generateChartData();
    const chartOptions = generateChartOptions();

    switch (chartType) {
      case 'line':
        return <Line ref={chartRef} data={chartData} options={chartOptions} />;
      case 'bar':
        return <Bar ref={chartRef} data={chartData} options={chartOptions} />;
      case 'scatter':
        return <Scatter ref={chartRef} data={chartData} options={chartOptions} />;
      case 'radar':
        return <Radar ref={chartRef} data={chartData} options={chartOptions} />;
      default:
        return <div>Unsupported chart type</div>;
    }
  };

  return (
    <div className="advanced-data-visualization">
      {/* Controls */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          {/* Breadcrumb Navigation */}
          {drillDownStack.length > 0 && (
            <nav aria-label="breadcrumb">
              <ol className="breadcrumb mb-0">
                <li className="breadcrumb-item">
                  <button 
                    className="btn btn-link p-0 text-decoration-none"
                    onClick={() => handleBreadcrumbClick(0)}
                  >
                    Root
                  </button>
                </li>
                {drillDownStack.map((level, index) => (
                  <li key={index} className="breadcrumb-item">
                    <button 
                      className="btn btn-link p-0 text-decoration-none"
                      onClick={() => handleBreadcrumbClick(index + 1)}
                    >
                      {level.breadcrumb[level.breadcrumb.length - 1]}
                    </button>
                  </li>
                ))}
              </ol>
            </nav>
          )}
        </div>

        <div className="btn-group">
          {enableZoom && (
            <button 
              className="btn btn-outline-secondary btn-sm"
              onClick={resetZoom}
              title="Reset Zoom"
            >
              <i className="bi bi-zoom-out"></i>
            </button>
          )}
          
          {enableExport && (
            <div className="btn-group">
              <button 
                className="btn btn-outline-primary btn-sm dropdown-toggle"
                data-bs-toggle="dropdown"
              >
                <i className="bi bi-download me-1"></i>
                Export
              </button>
              <ul className="dropdown-menu">
                <li>
                  <button 
                    className="dropdown-item"
                    onClick={() => exportChart('png')}
                  >
                    <i className="bi bi-image me-2"></i>
                    PNG Image
                  </button>
                </li>
                <li>
                  <button 
                    className="dropdown-item"
                    onClick={() => exportChart('csv')}
                  >
                    <i className="bi bi-file-earmark-spreadsheet me-2"></i>
                    CSV Data
                  </button>
                </li>
                <li>
                  <button 
                    className="dropdown-item"
                    onClick={() => exportChart('pdf')}
                  >
                    <i className="bi bi-file-earmark-pdf me-2"></i>
                    PDF Report
                  </button>
                </li>
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Chart Container */}
      <div className="position-relative" style={{ height: `${height}px` }}>
        {isLoading && (
          <div className="position-absolute top-50 start-50 translate-middle">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        )}
        {renderChart()}
      </div>

      {/* Chart Info */}
      <div className="mt-3">
        <div className="row">
          <div className="col-md-6">
            <small className="text-muted">
              Data Points: {currentData.length}
            </small>
          </div>
          <div className="col-md-6 text-end">
            {enableDrillDown && (
              <small className="text-muted">
                <i className="bi bi-info-circle me-1"></i>
                Click on data points to drill down
              </small>
            )}
            {enableZoom && (
              <small className="text-muted ms-3">
                <i className="bi bi-zoom-in me-1"></i>
                Scroll to zoom, drag to pan
              </small>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Heat Map Component
interface HeatMapProps {
  data: number[][];
  labels: { x: string[]; y: string[] };
  colorScale?: string[];
  title?: string;
}

export const HeatMap: React.FC<HeatMapProps> = ({
  data,
  labels,
  colorScale = ['#f7fbff', '#08519c'],
  title
}) => {
  const [hoveredCell, setHoveredCell] = useState<{x: number, y: number, value: number} | null>(null);

  const getColor = (value: number, min: number, max: number) => {
    const ratio = (value - min) / (max - min);
    // Simple linear interpolation between two colors
    const startColor = colorScale[0];
    const endColor = colorScale[1];
    
    // Convert hex to RGB for interpolation
    const hexToRgb = (hex: string) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      } : null;
    };

    const start = hexToRgb(startColor);
    const end = hexToRgb(endColor);

    if (!start || !end) return startColor;

    const r = Math.round(start.r + (end.r - start.r) * ratio);
    const g = Math.round(start.g + (end.g - start.g) * ratio);
    const b = Math.round(start.b + (end.b - start.b) * ratio);

    return `rgb(${r}, ${g}, ${b})`;
  };

  const flatData = data.flat();
  const minValue = Math.min(...flatData);
  const maxValue = Math.max(...flatData);

  return (
    <div className="heat-map">
      {title && <h6 className="mb-3">{title}</h6>}
      
      <div className="position-relative">
        <svg width="100%" height="400" viewBox="0 0 800 400">
          {/* Y-axis labels */}
          {labels.y.map((label, yIndex) => (
            <text
              key={`y-${yIndex}`}
              x="80"
              y={50 + (yIndex * 300 / labels.y.length) + 15}
              textAnchor="end"
              fontSize="12"
              fill="#666"
            >
              {label}
            </text>
          ))}

          {/* X-axis labels */}
          {labels.x.map((label, xIndex) => (
            <text
              key={`x-${xIndex}`}
              x={100 + (xIndex * 600 / labels.x.length) + 30}
              y="380"
              textAnchor="middle"
              fontSize="12"
              fill="#666"
              transform={`rotate(-45, ${100 + (xIndex * 600 / labels.x.length) + 30}, 380)`}
            >
              {label}
            </text>
          ))}

          {/* Heat map cells */}
          {data.map((row, yIndex) =>
            row.map((value, xIndex) => (
              <rect
                key={`cell-${yIndex}-${xIndex}`}
                x={100 + (xIndex * 600 / labels.x.length)}
                y={50 + (yIndex * 300 / labels.y.length)}
                width={600 / labels.x.length}
                height={300 / labels.y.length}
                fill={getColor(value, minValue, maxValue)}
                stroke="#fff"
                strokeWidth="1"
                style={{ cursor: 'pointer' }}
                onMouseEnter={() => setHoveredCell({ x: xIndex, y: yIndex, value })}
                onMouseLeave={() => setHoveredCell(null)}
              />
            ))
          )}
        </svg>

        {/* Tooltip */}
        {hoveredCell && (
          <div 
            className="position-absolute bg-dark text-white p-2 rounded shadow"
            style={{ 
              pointerEvents: 'none',
              zIndex: 1000,
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)'
            }}
          >
            <div className="small">
              <strong>{labels.x[hoveredCell.x]} × {labels.y[hoveredCell.y]}</strong>
            </div>
            <div>Value: {hoveredCell.value.toFixed(2)}</div>
          </div>
        )}
      </div>

      {/* Color Scale Legend */}
      <div className="d-flex align-items-center mt-3">
        <span className="small text-muted me-2">Low</span>
        <div className="flex-grow-1 position-relative" style={{ height: '20px' }}>
          <div 
            className="w-100 h-100 rounded"
            style={{
              background: `linear-gradient(to right, ${colorScale[0]}, ${colorScale[1]})`
            }}
          ></div>
        </div>
        <span className="small text-muted ms-2">High</span>
        <span className="small text-muted ms-3">
          ({minValue.toFixed(1)} - {maxValue.toFixed(1)})
        </span>
      </div>
    </div>
  );
};