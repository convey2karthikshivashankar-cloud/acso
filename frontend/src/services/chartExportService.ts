import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

// Export formats
export type ExportFormat = 'png' | 'jpeg' | 'svg' | 'pdf' | 'csv' | 'json' | 'excel';

// Export options
export interface ExportOptions {
  filename?: string;
  quality?: number; // 0-1 for JPEG
  width?: number;
  height?: number;
  backgroundColor?: string;
  scale?: number;
  includeMetadata?: boolean;
  compression?: boolean;
}

// Chart data for export
export interface ChartExportData {
  title: string;
  data: any[];
  metadata?: Record<string, any>;
  chartType?: string;
  timestamp?: number;
}

// Export result
export interface ExportResult {
  success: boolean;
  filename: string;
  size?: number;
  error?: string;
}

export class ChartExportService {
  // Export chart as image (PNG/JPEG)
  static async exportAsImage(
    element: HTMLElement,
    format: 'png' | 'jpeg' = 'png',
    options: ExportOptions = {}
  ): Promise<ExportResult> {
    try {
      const {
        filename = `chart-${Date.now()}.${format}`,
        quality = 1,
        width,
        height,
        backgroundColor = '#ffffff',
        scale = 2,
      } = options;

      const canvas = await html2canvas(element, {
        backgroundColor,
        scale,
        width,
        height,
        useCORS: true,
        allowTaint: true,
        logging: false,
      });

      return new Promise((resolve) => {
        canvas.toBlob(
          (blob) => {
            if (blob) {
              this.downloadBlob(blob, filename);
              resolve({
                success: true,
                filename,
                size: blob.size,
              });
            } else {
              resolve({
                success: false,
                filename,
                error: 'Failed to create image blob',
              });
            }
          },
          `image/${format}`,
          quality
        );
      });
    } catch (error) {
      return {
        success: false,
        filename: options.filename || `chart-${Date.now()}.${format}`,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // Export chart as SVG
  static async exportAsSVG(
    element: HTMLElement,
    options: ExportOptions = {}
  ): Promise<ExportResult> {
    try {
      const {
        filename = `chart-${Date.now()}.svg`,
        width,
        height,
      } = options;

      // Find SVG element within the provided element
      const svgElement = element.querySelector('svg');
      if (!svgElement) {
        throw new Error('No SVG element found in the provided element');
      }

      // Clone the SVG to avoid modifying the original
      const clonedSvg = svgElement.cloneNode(true) as SVGElement;
      
      // Set dimensions if provided
      if (width) clonedSvg.setAttribute('width', width.toString());
      if (height) clonedSvg.setAttribute('height', height.toString());

      // Add XML declaration and DOCTYPE
      const svgString = new XMLSerializer().serializeToString(clonedSvg);
      const svgBlob = new Blob(
        [`<?xml version="1.0" encoding="UTF-8"?>\n${svgString}`],
        { type: 'image/svg+xml' }
      );

      this.downloadBlob(svgBlob, filename);

      return {
        success: true,
        filename,
        size: svgBlob.size,
      };
    } catch (error) {
      return {
        success: false,
        filename: options.filename || `chart-${Date.now()}.svg`,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // Export chart as PDF
  static async exportAsPDF(
    element: HTMLElement,
    options: ExportOptions = {}
  ): Promise<ExportResult> {
    try {
      const {
        filename = `chart-${Date.now()}.pdf`,
        width = 210, // A4 width in mm
        height = 297, // A4 height in mm
        backgroundColor = '#ffffff',
        scale = 2,
      } = options;

      const canvas = await html2canvas(element, {
        backgroundColor,
        scale,
        useCORS: true,
        allowTaint: true,
        logging: false,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: width > height ? 'landscape' : 'portrait',
        unit: 'mm',
        format: [width, height],
      });

      // Calculate dimensions to fit the page
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      const finalWidth = imgWidth * ratio;
      const finalHeight = imgHeight * ratio;
      
      const x = (pdfWidth - finalWidth) / 2;
      const y = (pdfHeight - finalHeight) / 2;

      pdf.addImage(imgData, 'PNG', x, y, finalWidth, finalHeight);
      pdf.save(filename);

      return {
        success: true,
        filename,
      };
    } catch (error) {
      return {
        success: false,
        filename: options.filename || `chart-${Date.now()}.pdf`,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // Export data as CSV
  static exportAsCSV(
    data: ChartExportData,
    options: ExportOptions = {}
  ): ExportResult {
    try {
      const {
        filename = `chart-data-${Date.now()}.csv`,
        includeMetadata = false,
      } = options;

      let csvContent = '';

      // Add metadata as comments if requested
      if (includeMetadata && data.metadata) {
        csvContent += `# Chart: ${data.title}\n`;
        csvContent += `# Generated: ${new Date().toISOString()}\n`;
        Object.entries(data.metadata).forEach(([key, value]) => {
          csvContent += `# ${key}: ${value}\n`;
        });
        csvContent += '\n';
      }

      // Convert data to CSV
      if (data.data.length > 0) {
        const headers = Object.keys(data.data[0]);
        csvContent += headers.join(',') + '\n';

        data.data.forEach(row => {
          const values = headers.map(header => {
            const value = row[header];
            // Escape commas and quotes in values
            if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
              return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
          });
          csvContent += values.join(',') + '\n';
        });
      }

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      this.downloadBlob(blob, filename);

      return {
        success: true,
        filename,
        size: blob.size,
      };
    } catch (error) {
      return {
        success: false,
        filename: options.filename || `chart-data-${Date.now()}.csv`,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // Export data as JSON
  static exportAsJSON(
    data: ChartExportData,
    options: ExportOptions = {}
  ): ExportResult {
    try {
      const {
        filename = `chart-data-${Date.now()}.json`,
        includeMetadata = true,
        compression = false,
      } = options;

      const exportData = {
        title: data.title,
        chartType: data.chartType,
        timestamp: data.timestamp || Date.now(),
        data: data.data,
        ...(includeMetadata && data.metadata && { metadata: data.metadata }),
      };

      const jsonString = JSON.stringify(exportData, null, compression ? 0 : 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      this.downloadBlob(blob, filename);

      return {
        success: true,
        filename,
        size: blob.size,
      };
    } catch (error) {
      return {
        success: false,
        filename: options.filename || `chart-data-${Date.now()}.json`,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // Export data as Excel (simplified XLSX format)
  static exportAsExcel(
    data: ChartExportData,
    options: ExportOptions = {}
  ): ExportResult {
    try {
      const {
        filename = `chart-data-${Date.now()}.xlsx`,
        includeMetadata = true,
      } = options;

      // This is a simplified implementation
      // In a real application, you would use a library like SheetJS
      const csvContent = this.convertToCSV(data, includeMetadata);
      const blob = new Blob([csvContent], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      
      this.downloadBlob(blob, filename);

      return {
        success: true,
        filename,
        size: blob.size,
      };
    } catch (error) {
      return {
        success: false,
        filename: options.filename || `chart-data-${Date.now()}.xlsx`,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // Main export method that handles all formats
  static async exportChart(
    element: HTMLElement,
    data: ChartExportData,
    format: ExportFormat,
    options: ExportOptions = {}
  ): Promise<ExportResult> {
    switch (format) {
      case 'png':
        return this.exportAsImage(element, 'png', options);
      case 'jpeg':
        return this.exportAsImage(element, 'jpeg', options);
      case 'svg':
        return this.exportAsSVG(element, options);
      case 'pdf':
        return this.exportAsPDF(element, options);
      case 'csv':
        return this.exportAsCSV(data, options);
      case 'json':
        return this.exportAsJSON(data, options);
      case 'excel':
        return this.exportAsExcel(data, options);
      default:
        return {
          success: false,
          filename: options.filename || `chart-${Date.now()}`,
          error: `Unsupported export format: ${format}`,
        };
    }
  }

  // Batch export multiple formats
  static async exportMultipleFormats(
    element: HTMLElement,
    data: ChartExportData,
    formats: ExportFormat[],
    options: ExportOptions = {}
  ): Promise<ExportResult[]> {
    const results: ExportResult[] = [];
    
    for (const format of formats) {
      const result = await this.exportChart(element, data, format, {
        ...options,
        filename: options.filename?.replace(/\.[^/.]+$/, `.${format}`) || 
                  `chart-${Date.now()}.${format}`,
      });
      results.push(result);
    }
    
    return results;
  }

  // Utility methods
  private static downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  private static convertToCSV(data: ChartExportData, includeMetadata: boolean): string {
    let csvContent = '';

    if (includeMetadata && data.metadata) {
      csvContent += `Chart: ${data.title}\n`;
      csvContent += `Generated: ${new Date().toISOString()}\n`;
      Object.entries(data.metadata).forEach(([key, value]) => {
        csvContent += `${key}: ${value}\n`;
      });
      csvContent += '\n';
    }

    if (data.data.length > 0) {
      const headers = Object.keys(data.data[0]);
      csvContent += headers.join(',') + '\n';

      data.data.forEach(row => {
        const values = headers.map(header => row[header]);
        csvContent += values.join(',') + '\n';
      });
    }

    return csvContent;
  }

  // Get supported formats
  static getSupportedFormats(): ExportFormat[] {
    return ['png', 'jpeg', 'svg', 'pdf', 'csv', 'json', 'excel'];
  }

  // Validate export options
  static validateOptions(format: ExportFormat, options: ExportOptions): string[] {
    const errors: string[] = [];

    if (format === 'jpeg' && options.quality && (options.quality < 0 || options.quality > 1)) {
      errors.push('JPEG quality must be between 0 and 1');
    }

    if (options.width && options.width <= 0) {
      errors.push('Width must be greater than 0');
    }

    if (options.height && options.height <= 0) {
      errors.push('Height must be greater than 0');
    }

    if (options.scale && options.scale <= 0) {
      errors.push('Scale must be greater than 0');
    }

    return errors;
  }

  // Get file size estimate
  static estimateFileSize(
    element: HTMLElement,
    format: ExportFormat,
    options: ExportOptions = {}
  ): number {
    const { width = element.offsetWidth, height = element.offsetHeight, scale = 1 } = options;
    const pixels = width * height * scale * scale;

    switch (format) {
      case 'png':
        return pixels * 4; // 4 bytes per pixel (RGBA)
      case 'jpeg':
        return pixels * 0.5; // Rough estimate for JPEG compression
      case 'svg':
        return element.innerHTML.length * 2; // Rough estimate
      case 'pdf':
        return pixels * 2; // Rough estimate
      case 'csv':
      case 'json':
      case 'excel':
        return JSON.stringify(element.textContent).length * 2;
      default:
        return 0;
    }
  }
}

// Export utility functions
export const exportUtils = {
  // Generate filename with timestamp
  generateFilename: (prefix: string, format: ExportFormat): string => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    return `${prefix}-${timestamp}.${format}`;
  },

  // Format file size for display
  formatFileSize: (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },

  // Get format description
  getFormatDescription: (format: ExportFormat): string => {
    const descriptions: Record<ExportFormat, string> = {
      png: 'Portable Network Graphics - High quality, lossless compression',
      jpeg: 'JPEG Image - Smaller file size, lossy compression',
      svg: 'Scalable Vector Graphics - Vector format, infinite scalability',
      pdf: 'Portable Document Format - Print-ready document',
      csv: 'Comma Separated Values - Spreadsheet compatible data',
      json: 'JavaScript Object Notation - Structured data format',
      excel: 'Excel Spreadsheet - Microsoft Excel compatible',
    };
    return descriptions[format] || 'Unknown format';
  },

  // Check browser support for format
  isFormatSupported: (format: ExportFormat): boolean => {
    switch (format) {
      case 'png':
      case 'jpeg':
        return !!document.createElement('canvas').getContext;
      case 'svg':
        return !!document.createElementNS;
      case 'pdf':
        return typeof window !== 'undefined';
      case 'csv':
      case 'json':
      case 'excel':
        return true;
      default:
        return false;
    }
  },
};

export default ChartExportService;