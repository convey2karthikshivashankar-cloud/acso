import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Box,
  Typography,
  Slider,
  Switch,
  FormControlLabel,
  Alert,
  LinearProgress,
  Chip,
} from '@mui/material';
import {
  Download,
  Image,
  PictureAsPdf,
  TableChart,
  Code,
} from '@mui/icons-material';

export interface ExportOptions {
  format: 'png' | 'svg' | 'pdf' | 'csv' | 'json' | 'excel';
  quality?: number;
  width?: number;
  height?: number;
  backgroundColor?: string;
  includeData?: boolean;
  includeMetadata?: boolean;
  filename?: string;
  compression?: boolean;
  dpi?: number;
}

export interface ExportDialogProps {
  open: boolean;
  onClose: () => void;
  onExport: (options: ExportOptions) => Promise<void>;
  chartTitle?: string;
  availableFormats?: ExportOptions['format'][];
  defaultOptions?: Partial<ExportOptions>;
}

export const ChartExportDialog: React.FC<ExportDialogProps> = ({
  open,
  onClose,
  onExport,
  chartTitle = 'Chart',
  availableFormats = ['png', 'svg', 'pdf', 'csv', 'json'],
  defaultOptions = {},
}) => {
  const [options, setOptions] = React.useState<ExportOptions>({
    format: 'png',
    quality: 90,
    width: 800,
    height: 600,
    backgroundColor: '#ffffff',
    includeData: true,
    includeMetadata: true,
    filename: chartTitle.toLowerCase().replace(/\s+/g, '-'),
    compression: true,
    dpi: 300,
    ...defaultOptions,
  });

  const [isExporting, setIsExporting] = React.useState(false);
  const [exportError, setExportError] = React.useState<string | null>(null);

  const handleOptionChange = (key: keyof ExportOptions, value: any) => {
    setOptions(prev => ({ ...prev, [key]: value }));
  };

  const handleExport = async () => {
    setIsExporting(true);
    setExportError(null);

    try {
      await onExport(options);
      onClose();
    } catch (error) {
      setExportError(error instanceof Error ? error.message : 'Export failed');
    } finally {
      setIsExporting(false);
    }
  };

  const getFormatIcon = (format: ExportOptions['format']) => {
    switch (format) {
      case 'png':
      case 'svg':
        return <Image />;
      case 'pdf':
        return <PictureAsPdf />;
      case 'csv':
      case 'excel':
        return <TableChart />;
      case 'json':
        return <Code />;
      default:
        return <Download />;
    }
  };

  const getFormatDescription = (format: ExportOptions['format']) => {
    switch (format) {
      case 'png':
        return 'Raster image format, good for sharing and embedding';
      case 'svg':
        return 'Vector format, scalable and editable';
      case 'pdf':
        return 'Document format, good for reports and printing';
      case 'csv':
        return 'Comma-separated values, data only';
      case 'json':
        return 'JavaScript Object Notation, structured data';
      case 'excel':
        return 'Excel spreadsheet format';
      default:
        return '';
    }
  };

  const isImageFormat = ['png', 'svg', 'pdf'].includes(options.format);
  const isDataFormat = ['csv', 'json', 'excel'].includes(options.format);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Download />
          Export Chart
        </Box>
      </DialogTitle>

      <DialogContent>
        {exportError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {exportError}
          </Alert>
        )}

        {isExporting && (
          <Box sx={{ mb: 2 }}>
            <LinearProgress />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Exporting chart...
            </Typography>
          </Box>
        )}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* Format Selection */}
          <FormControl fullWidth>
            <InputLabel>Export Format</InputLabel>
            <Select
              value={options.format}
              onChange={(e) => handleOptionChange('format', e.target.value)}
              label="Export Format"
            >
              {availableFormats.map(format => (
                <MenuItem key={format} value={format}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {getFormatIcon(format)}
                    <Box>
                      <Typography variant="body2">
                        {format.toUpperCase()}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {getFormatDescription(format)}
                      </Typography>
                    </Box>
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Filename */}
          <TextField
            label="Filename"
            value={options.filename}
            onChange={(e) => handleOptionChange('filename', e.target.value)}
            fullWidth
            helperText={`File will be saved as: ${options.filename}.${options.format}`}
          />

          {/* Image-specific options */}
          {isImageFormat && (
            <>
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Image Dimensions
                </Typography>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <TextField
                    label="Width"
                    type="number"
                    value={options.width}
                    onChange={(e) => handleOptionChange('width', parseInt(e.target.value))}
                    InputProps={{ endAdornment: 'px' }}
                  />
                  <TextField
                    label="Height"
                    type="number"
                    value={options.height}
                    onChange={(e) => handleOptionChange('height', parseInt(e.target.value))}
                    InputProps={{ endAdornment: 'px' }}
                  />
                </Box>
              </Box>

              {options.format === 'png' && (
                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    Quality: {options.quality}%
                  </Typography>
                  <Slider
                    value={options.quality}
                    onChange={(_, value) => handleOptionChange('quality', value)}
                    min={10}
                    max={100}
                    step={10}
                    marks
                    valueLabelDisplay="auto"
                  />
                </Box>
              )}

              <TextField
                label="Background Color"
                value={options.backgroundColor}
                onChange={(e) => handleOptionChange('backgroundColor', e.target.value)}
                type="color"
                fullWidth
              />

              {options.format === 'pdf' && (
                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    DPI: {options.dpi}
                  </Typography>
                  <Slider
                    value={options.dpi}
                    onChange={(_, value) => handleOptionChange('dpi', value)}
                    min={72}
                    max={600}
                    step={72}
                    marks={[
                      { value: 72, label: '72' },
                      { value: 150, label: '150' },
                      { value: 300, label: '300' },
                      { value: 600, label: '600' },
                    ]}
                    valueLabelDisplay="auto"
                  />
                </Box>
              )}
            </>
          )}

          {/* Data-specific options */}
          {isDataFormat && (
            <Box>
              <FormControlLabel
                control={
                  <Switch
                    checked={options.includeMetadata}
                    onChange={(e) => handleOptionChange('includeMetadata', e.target.checked)}
                  />
                }
                label="Include Metadata"
              />
              <Typography variant="caption" color="text.secondary" display="block">
                Include chart configuration and styling information
              </Typography>
            </Box>
          )}

          {/* Compression option */}
          <FormControlLabel
            control={
              <Switch
                checked={options.compression}
                onChange={(e) => handleOptionChange('compression', e.target.checked)}
              />
            }
            label="Enable Compression"
          />

          {/* Format info */}
          <Box sx={{ p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
            <Typography variant="subtitle2" gutterBottom>
              Export Information
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              <Chip label={`Format: ${options.format.toUpperCase()}`} size="small" />
              {isImageFormat && (
                <Chip label={`${options.width}×${options.height}px`} size="small" />
              )}
              {options.format === 'png' && (
                <Chip label={`Quality: ${options.quality}%`} size="small" />
              )}
              {options.compression && (
                <Chip label="Compressed" size="small" color="success" />
              )}
            </Box>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={isExporting}>
          Cancel
        </Button>
        <Button
          onClick={handleExport}
          variant="contained"
          disabled={isExporting}
          startIcon={<Download />}
        >
          {isExporting ? 'Exporting...' : 'Export'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// Chart export utilities
export class ChartExporter {
  static async exportChart(
    chartElement: HTMLElement,
    options: ExportOptions
  ): Promise<void> {
    const { format, filename } = options;

    switch (format) {
      case 'png':
        return this.exportAsPNG(chartElement, options);
      case 'svg':
        return this.exportAsSVG(chartElement, options);
      case 'pdf':
        return this.exportAsPDF(chartElement, options);
      case 'csv':
        return this.exportAsCSV(chartElement, options);
      case 'json':
        return this.exportAsJSON(chartElement, options);
      case 'excel':
        return this.exportAsExcel(chartElement, options);
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  private static async exportAsPNG(
    element: HTMLElement,
    options: ExportOptions
  ): Promise<void> {
    const canvas = await this.elementToCanvas(element, options);
    const dataURL = canvas.toDataURL('image/png', options.quality! / 100);
    this.downloadDataURL(dataURL, `${options.filename}.png`);
  }

  private static async exportAsSVG(
    element: HTMLElement,
    options: ExportOptions
  ): Promise<void> {
    const svgElement = element.querySelector('svg');
    if (!svgElement) {
      throw new Error('No SVG element found in chart');
    }

    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svgElement);
    const blob = new Blob([svgString], { type: 'image/svg+xml' });
    this.downloadBlob(blob, `${options.filename}.svg`);
  }

  private static async exportAsPDF(
    element: HTMLElement,
    options: ExportOptions
  ): Promise<void> {
    // This would require a PDF library like jsPDF
    // For now, we'll convert to canvas and then to PDF
    const canvas = await this.elementToCanvas(element, options);
    
    // Placeholder for PDF generation
    // In a real implementation, you would use jsPDF:
    // const pdf = new jsPDF();
    // pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0);
    // pdf.save(`${options.filename}.pdf`);
    
    throw new Error('PDF export requires jsPDF library');
  }

  private static async exportAsCSV(
    element: HTMLElement,
    options: ExportOptions
  ): Promise<void> {
    // Extract data from chart (this would need to be implemented based on chart type)
    const data = this.extractChartData(element);
    const csv = this.convertToCSV(data);
    const blob = new Blob([csv], { type: 'text/csv' });
    this.downloadBlob(blob, `${options.filename}.csv`);
  }

  private static async exportAsJSON(
    element: HTMLElement,
    options: ExportOptions
  ): Promise<void> {
    const data = this.extractChartData(element);
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    this.downloadBlob(blob, `${options.filename}.json`);
  }

  private static async exportAsExcel(
    element: HTMLElement,
    options: ExportOptions
  ): Promise<void> {
    // This would require a library like SheetJS
    throw new Error('Excel export requires SheetJS library');
  }

  private static async elementToCanvas(
    element: HTMLElement,
    options: ExportOptions
  ): Promise<HTMLCanvasElement> {
    // This would require html2canvas library
    // For now, we'll create a placeholder canvas
    const canvas = document.createElement('canvas');
    canvas.width = options.width || 800;
    canvas.height = options.height || 600;
    
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = options.backgroundColor || '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // In a real implementation, you would use html2canvas:
    // return html2canvas(element, { ...options });
    
    return canvas;
  }

  private static extractChartData(element: HTMLElement): any[] {
    // This would extract actual data from the chart
    // Implementation depends on the chart library being used
    return [];
  }

  private static convertToCSV(data: any[]): string {
    if (data.length === 0) return '';
    
    const headers = Object.keys(data[0]);
    const csvRows = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header];
          return typeof value === 'string' ? `"${value}"` : value;
        }).join(',')
      )
    ];
    
    return csvRows.join('\n');
  }

  private static downloadDataURL(dataURL: string, filename: string): void {
    const link = document.createElement('a');
    link.download = filename;
    link.href = dataURL;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  private static downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = filename;
    link.href = url;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

export default ChartExportDialog;