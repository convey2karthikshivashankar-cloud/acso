import React, { useRef, useEffect, useState } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
  ChartOptions,
  ChartData
} from 'chart.js';
import 'chartjs-adapter-date-fns';
import zoomPlugin from 'chartjs-plugin-zoom';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
  zoomPlugin
);

interface TimeSeriesDataPoint {
  x: Date | string;
  y: number;
}

interface Dataset {
  label: string;
  data: TimeSeriesDataPoint[];
  borderColor: string;
  backgroundColor: string;
  tension?: number;
}

interface InteractiveTimeSeriesChartProps {
  datasets: Dataset[];
  title?: string;
  height?: number;
  enableZoom?: boolean;
  enablePan?: boolean;
  showLegend?: boolean;
  timeFormat?: string;
  onDataPointClick?: (dataPoint: TimeSeriesDataPoint, datasetIndex: number) => void;
}

export const InteractiveTimeSeriesChart: React.FC<InteractiveTimeSeriesChartProps> = ({
  datasets,
  title = 'Time Series Chart',
  height = 400,
  enableZoom = true,
  enablePan = true,
  showLegend = true,
  timeFormat = 'MMM dd, HH:mm',
  onDataPointClick
}) => {
  const chartRef = useRef<ChartJS<'line'>>(null);
  const [isZoomed, setIsZoomed] = useState(false);

  const chartData: ChartData<'line'> = {
    datasets: datasets.map(dataset => ({
      ...dataset,
      tension: dataset.tension || 0.4,
      pointRadius: 3,
      pointHoverRadius: 6,
      borderWidth: 2,
      fill: false
    }))
  };

  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        display: showLegend,
        position: 'top' as const,
      },
      title: {
        display: !!title,
        text: title,
        font: {
          size: 16,
          weight: 'bold'
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: 'white',
        bodyColor: 'white',
        borderColor: 'rgba(255, 255, 255, 0.2)',
        borderWidth: 1,
        callbacks: {
          title: (context) => {
            const date = new Date(context[0].parsed.x);
            return date.toLocaleString();
          },
          label: (context) => {
            return `${context.dataset.label}: ${context.parsed.y.toFixed(2)}`;
          }
        }
      },
      zoom: enableZoom ? {
        zoom: {
          wheel: {
            enabled: true,
          },
          pinch: {
            enabled: true
          },
          mode: 'x',
          onZoomComplete: () => {
            setIsZoomed(true);
          }
        },
        pan: enablePan ? {
          enabled: true,
          mode: 'x',
        } : undefined
      } : undefined
    },
    scales: {
      x: {
        type: 'time',
        time: {
          displayFormats: {
            minute: 'HH:mm',
            hour: 'MMM dd, HH:mm',
            day: 'MMM dd',
            week: 'MMM dd',
            month: 'MMM yyyy'
          }
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.1)'
        }
      },
      y: {
        beginAtZero: false,
        grid: {
          color: 'rgba(0, 0, 0, 0.1)'
        }
      }
    },
    onClick: (event, elements) => {
      if (elements.length > 0 && onDataPointClick) {
        const element = elements[0];
        const datasetIndex = element.datasetIndex;
        const dataIndex = element.index;
        const dataPoint = datasets[datasetIndex].data[dataIndex];
        onDataPointClick(dataPoint, datasetIndex);
      }
    }
  };

  const resetZoom = () => {
    if (chartRef.current) {
      chartRef.current.resetZoom();
      setIsZoomed(false);
    }
  };

  const exportChart = (format: 'png' | 'jpeg' = 'png') => {
    if (chartRef.current) {
      const url = chartRef.current.toBase64Image(format, 1.0);
      const link = document.createElement('a');
      link.download = `chart.${format}`;
      link.href = url;
      link.click();
    }
  };

  return (
    <div className="interactive-time-series-chart">
      <div className="chart-controls" style={{ marginBottom: '10px' }}>
        {isZoomed && (
          <button
            onClick={resetZoom}
            className="btn btn-sm btn-outline-secondary me-2"
          >
            Reset Zoom
          </button>
        )}
        <button
          onClick={() => exportChart('png')}
          className="btn btn-sm btn-outline-primary me-2"
        >
          Export PNG
        </button>
        <button
          onClick={() => exportChart('jpeg')}
          className="btn btn-sm btn-outline-primary"
        >
          Export JPEG
        </button>
      </div>
      <div style={{ height: `${height}px` }}>
        <Line ref={chartRef} data={chartData} options={options} />
      </div>
    </div>
  );
};