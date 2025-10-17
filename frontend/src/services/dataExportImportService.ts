interface ExportConfig {
  format: 'json' | 'csv' | 'excel' | 'pdf' | 'xml';
  fields?: string[];
  filters?: Record<string, any>;
  includeMetadata?: boolean;
  compression?: 'none' | 'gzip' | 'zip';
  encryption?: {
    enabled: boolean;
    password?: string;
    algorithm?: 'AES-256-GCM';
  };
}

interface ImportConfig {
  format: 'json' | 'csv' | 'excel' | 'xml';
  mapping?: Record<string, string>;
  validation?: {
    required?: string[];
    types?: Record<string, string>;
    custom?: Array<(data: any) => string | null>;
  };
  onDuplicate?: 'skip' | 'update' | 'error';
  batchSize?: number;
}

interface ExportResult {
  success: boolean;
  data?: Blob;
  filename: string;
  size: number;
  recordCount: number;
  error?: string;
}

interface ImportResult {
  success: boolean;
  imported: number;
  skipped: number;
  errors: Array<{
    row: number;
    field?: string;
    message: string;
  }>;
  summary: {
    totalRows: number;
    validRows: number;
    invalidRows: number;
  };
}

class DataExportImportService {
  private workers = new Map<string, Worker>();

  constructor() {
    this.initializeWorkers();
  }

  private initializeWorkers(): void {
    // Initialize web workers for heavy processing
    if ('Worker' in window) {
      this.createWorker('csv', this.createCSVWorker());
      this.createWorker('excel', this.createExcelWorker());
      this.createWorker('pdf', this.createPDFWorker());
    }
  }

  private createWorker(type: string, workerCode: string): void {
    try {
      const blob = new Blob([workerCode], { type: 'application/javascript' });
      const worker = new Worker(URL.createObjectURL(blob));
      this.workers.set(type, worker);
    } catch (error) {
      console.warn(`Failed to create ${type} worker:`, error);
    }
  }

  // Export Methods
  async exportData(data: any[], config: ExportConfig): Promise<ExportResult> {
    try {
      // Validate input
      if (!Array.isArray(data) || data.length === 0) {
        throw new Error('No data to export');
      }

      // Apply filters
      const filteredData = this.applyFilters(data, config.filters);

      // Select fields
      const selectedData = this.selectFields(filteredData, config.fields);

      // Add metadata if requested
      const finalData = config.includeMetadata 
        ? this.addMetadata(selectedData)
        : selectedData;

      // Generate export based on format
      let blob: Blob;
      let filename: string;

      switch (config.format) {
        case 'json':
          blob = await this.exportJSON(finalData, config);
          filename = `export_${Date.now()}.json`;
          break;
        case 'csv':
          blob = await this.exportCSV(finalData, config);
          filename = `export_${Date.now()}.csv`;
          break;
        case 'excel':
          blob = await this.exportExcel(finalData, config);
          filename = `export_${Date.now()}.xlsx`;
          break;
        case 'pdf':
          blob = await this.exportPDF(finalData, config);
          filename = `export_${Date.now()}.pdf`;
          break;
        case 'xml':
          blob = await this.exportXML(finalData, config);
          filename = `export_${Date.now()}.xml`;
          break;
        default:
          throw new Error(`Unsupported export format: ${config.format}`);
      }

      // Apply compression if requested
      if (config.compression && config.compression !== 'none') {
        blob = await this.compressData(blob, config.compression);
        filename = `${filename}.${config.compression === 'gzip' ? 'gz' : 'zip'}`;
      }

      // Apply encryption if requested
      if (config.encryption?.enabled) {
        blob = await this.encryptData(blob, config.encryption);
        filename = `${filename}.encrypted`;
      }

      return {
        success: true,
        data: blob,
        filename,
        size: blob.size,
        recordCount: finalData.length,
      };
    } catch (error) {
      return {
        success: false,
        filename: '',
        size: 0,
        recordCount: 0,
        error: error instanceof Error ? error.message : 'Export failed',
      };
    }
  }

  private async exportJSON(data: any[], config: ExportConfig): Promise<Blob> {
    const jsonString = JSON.stringify(data, null, 2);
    return new Blob([jsonString], { type: 'application/json' });
  }

  private async exportCSV(data: any[], config: ExportConfig): Promise<Blob> {
    if (this.workers.has('csv')) {
      return this.processWithWorker('csv', { data, config });
    }

    // Fallback to main thread processing
    const csv = this.convertToCSV(data);
    return new Blob([csv], { type: 'text/csv' });
  }

  private async exportExcel(data: any[], config: ExportConfig): Promise<Blob> {
    if (this.workers.has('excel')) {
      return this.processWithWorker('excel', { data, config });
    }

    // Fallback - create simple Excel-compatible CSV
    const csv = this.convertToCSV(data);
    return new Blob([csv], { type: 'application/vnd.ms-excel' });
  }

  private async exportPDF(data: any[], config: ExportConfig): Promise<Blob> {
    if (this.workers.has('pdf')) {
      return this.processWithWorker('pdf', { data, config });
    }

    // Fallback - create simple HTML that can be printed to PDF
    const html = this.convertToHTML(data);
    return new Blob([html], { type: 'text/html' });
  }

  private async exportXML(data: any[], config: ExportConfig): Promise<Blob> {
    const xml = this.convertToXML(data);
    return new Blob([xml], { type: 'application/xml' });
  }

  // Import Methods
  async importData(file: File, config: ImportConfig): Promise<ImportResult> {
    try {
      // Validate file
      if (!file) {
        throw new Error('No file provided');
      }

      // Read file content
      const content = await this.readFile(file);

      // Parse data based on format
      let parsedData: any[];
      
      switch (config.format) {
        case 'json':
          parsedData = await this.parseJSON(content);
          break;
        case 'csv':
          parsedData = await this.parseCSV(content, config);
          break;
        case 'excel':
          parsedData = await this.parseExcel(file, config);
          break;
        case 'xml':
          parsedData = await this.parseXML(content);
          break;
        default:
          throw new Error(`Unsupported import format: ${config.format}`);
      }

      // Apply field mapping
      if (config.mapping) {
        parsedData = this.applyFieldMapping(parsedData, config.mapping);
      }

      // Validate data
      const validationResult = this.validateData(parsedData, config.validation);

      // Process valid data in batches
      const batchSize = config.batchSize || 100;
      let imported = 0;
      let skipped = 0;

      for (let i = 0; i < validationResult.validData.length; i += batchSize) {
        const batch = validationResult.validData.slice(i, i + batchSize);
        const batchResult = await this.processBatch(batch, config);
        imported += batchResult.imported;
        skipped += batchResult.skipped;
      }

      return {
        success: true,
        imported,
        skipped,
        errors: validationResult.errors,
        summary: {
          totalRows: parsedData.length,
          validRows: validationResult.validData.length,
          invalidRows: validationResult.errors.length,
        },
      };
    } catch (error) {
      return {
        success: false,
        imported: 0,
        skipped: 0,
        errors: [{
          row: 0,
          message: error instanceof Error ? error.message : 'Import failed',
        }],
        summary: {
          totalRows: 0,
          validRows: 0,
          invalidRows: 0,
        },
      };
    }
  }

  private async readFile(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }

  private async parseJSON(content: string): Promise<any[]> {
    const data = JSON.parse(content);
    return Array.isArray(data) ? data : [data];
  }

  private async parseCSV(content: string, config: ImportConfig): Promise<any[]> {
    if (this.workers.has('csv')) {
      return this.processWithWorker('csv', { content, config, action: 'parse' });
    }

    // Fallback to main thread parsing
    const lines = content.split('\n').filter(line => line.trim());
    if (lines.length === 0) return [];

    const headers = this.parseCSVLine(lines[0]);
    const data = [];

    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCSVLine(lines[i]);
      const row: any = {};
      
      headers.forEach((header, index) => {
        row[header.trim()] = values[index]?.trim() || '';
      });
      
      data.push(row);
    }

    return data;
  }

  private parseCSVLine(line: string): string[] {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current);
    return result;
  }

  private async parseExcel(file: File, config: ImportConfig): Promise<any[]> {
    if (this.workers.has('excel')) {
      const arrayBuffer = await file.arrayBuffer();
      return this.processWithWorker('excel', { data: arrayBuffer, config, action: 'parse' });
    }

    // Fallback - treat as CSV
    const content = await this.readFile(file);
    return this.parseCSV(content, config);
  }

  private async parseXML(content: string): Promise<any[]> {
    const parser = new DOMParser();
    const doc = parser.parseFromString(content, 'application/xml');
    
    if (doc.documentElement.nodeName === 'parsererror') {
      throw new Error('Invalid XML format');
    }

    return this.xmlToArray(doc.documentElement);
  }

  private xmlToArray(element: Element): any[] {
    const result = [];
    const children = Array.from(element.children);

    if (children.length === 0) {
      return [{ [element.nodeName]: element.textContent }];
    }

    for (const child of children) {
      const obj = this.xmlToObject(child);
      result.push(obj);
    }

    return result;
  }

  private xmlToObject(element: Element): any {
    const obj: any = {};

    // Add attributes
    for (const attr of element.attributes) {
      obj[`@${attr.name}`] = attr.value;
    }

    // Add child elements
    for (const child of element.children) {
      if (child.children.length > 0) {
        obj[child.nodeName] = this.xmlToObject(child);
      } else {
        obj[child.nodeName] = child.textContent;
      }
    }

    // Add text content if no children
    if (element.children.length === 0 && element.textContent) {
      return element.textContent;
    }

    return obj;
  }

  // Helper Methods
  private applyFilters(data: any[], filters?: Record<string, any>): any[] {
    if (!filters) return data;

    return data.filter(item => {
      return Object.entries(filters).every(([key, value]) => {
        if (typeof value === 'object' && value !== null) {
          // Handle complex filters
          if (value.$in) return value.$in.includes(item[key]);
          if (value.$gt) return item[key] > value.$gt;
          if (value.$lt) return item[key] < value.$lt;
          if (value.$regex) return new RegExp(value.$regex).test(item[key]);
        }
        return item[key] === value;
      });
    });
  }

  private selectFields(data: any[], fields?: string[]): any[] {
    if (!fields || fields.length === 0) return data;

    return data.map(item => {
      const selected: any = {};
      fields.forEach(field => {
        if (item.hasOwnProperty(field)) {
          selected[field] = item[field];
        }
      });
      return selected;
    });
  }

  private addMetadata(data: any[]): any {
    return {
      metadata: {
        exportDate: new Date().toISOString(),
        recordCount: data.length,
        version: '1.0',
      },
      data,
    };
  }

  private convertToCSV(data: any[]): string {
    if (data.length === 0) return '';

    const headers = Object.keys(data[0]);
    const csvRows = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header];
          const stringValue = value === null || value === undefined ? '' : String(value);
          return stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')
            ? `"${stringValue.replace(/"/g, '""')}"`
            : stringValue;
        }).join(',')
      )
    ];

    return csvRows.join('\n');
  }

  private convertToHTML(data: any[]): string {
    if (data.length === 0) return '<html><body><p>No data</p></body></html>';

    const headers = Object.keys(data[0]);
    const headerRow = headers.map(h => `<th>${h}</th>`).join('');
    const dataRows = data.map(row => 
      `<tr>${headers.map(h => `<td>${row[h] || ''}</td>`).join('')}</tr>`
    ).join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Data Export</title>
        <style>
          table { border-collapse: collapse; width: 100%; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; }
        </style>
      </head>
      <body>
        <table>
          <thead><tr>${headerRow}</tr></thead>
          <tbody>${dataRows}</tbody>
        </table>
      </body>
      </html>
    `;
  }

  private convertToXML(data: any[]): string {
    const xmlItems = data.map(item => {
      const fields = Object.entries(item)
        .map(([key, value]) => `<${key}>${this.escapeXML(String(value))}</${key}>`)
        .join('');
      return `<item>${fields}</item>`;
    }).join('');

    return `<?xml version="1.0" encoding="UTF-8"?><root>${xmlItems}</root>`;
  }

  private escapeXML(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private applyFieldMapping(data: any[], mapping: Record<string, string>): any[] {
    return data.map(item => {
      const mapped: any = {};
      Object.entries(item).forEach(([key, value]) => {
        const mappedKey = mapping[key] || key;
        mapped[mappedKey] = value;
      });
      return mapped;
    });
  }

  private validateData(data: any[], validation?: ImportConfig['validation']): {
    validData: any[];
    errors: Array<{ row: number; field?: string; message: string }>;
  } {
    const validData = [];
    const errors = [];

    if (!validation) {
      return { validData: data, errors };
    }

    data.forEach((item, index) => {
      let isValid = true;
      const rowNumber = index + 1;

      // Check required fields
      if (validation.required) {
        for (const field of validation.required) {
          if (!item[field] || item[field] === '') {
            errors.push({
              row: rowNumber,
              field,
              message: `Required field '${field}' is missing or empty`,
            });
            isValid = false;
          }
        }
      }

      // Check field types
      if (validation.types) {
        for (const [field, expectedType] of Object.entries(validation.types)) {
          if (item[field] !== undefined && item[field] !== null) {
            const actualType = typeof item[field];
            if (actualType !== expectedType) {
              errors.push({
                row: rowNumber,
                field,
                message: `Field '${field}' should be ${expectedType}, got ${actualType}`,
              });
              isValid = false;
            }
          }
        }
      }

      // Run custom validations
      if (validation.custom) {
        for (const validator of validation.custom) {
          const error = validator(item);
          if (error) {
            errors.push({
              row: rowNumber,
              message: error,
            });
            isValid = false;
          }
        }
      }

      if (isValid) {
        validData.push(item);
      }
    });

    return { validData, errors };
  }

  private async processBatch(batch: any[], config: ImportConfig): Promise<{ imported: number; skipped: number }> {
    // This would integrate with your actual data storage/API
    // For now, just simulate processing
    await new Promise(resolve => setTimeout(resolve, 100));
    
    return {
      imported: batch.length,
      skipped: 0,
    };
  }

  private async processWithWorker(workerType: string, data: any): Promise<any> {
    const worker = this.workers.get(workerType);
    if (!worker) {
      throw new Error(`Worker ${workerType} not available`);
    }

    return new Promise((resolve, reject) => {
      const messageId = Math.random().toString(36).substr(2, 9);
      
      const handleMessage = (event: MessageEvent) => {
        if (event.data.id === messageId) {
          worker.removeEventListener('message', handleMessage);
          if (event.data.success) {
            resolve(event.data.result);
          } else {
            reject(new Error(event.data.error));
          }
        }
      };

      worker.addEventListener('message', handleMessage);
      worker.postMessage({ id: messageId, ...data });
    });
  }

  private async compressData(blob: Blob, compression: 'gzip' | 'zip'): Promise<Blob> {
    // Implement compression using CompressionStream API or libraries
    if ('CompressionStream' in window) {
      const stream = new CompressionStream(compression);
      const compressedStream = blob.stream().pipeThrough(stream);
      return new Response(compressedStream).blob();
    }
    
    // Fallback - return original blob
    return blob;
  }

  private async encryptData(blob: Blob, encryption: NonNullable<ExportConfig['encryption']>): Promise<Blob> {
    if (!encryption.password) {
      throw new Error('Encryption password required');
    }

    // Implement encryption using Web Crypto API
    const key = await this.deriveKey(encryption.password);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const data = await blob.arrayBuffer();
    
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      data
    );

    // Combine IV and encrypted data
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encrypted), iv.length);

    return new Blob([combined], { type: 'application/octet-stream' });
  }

  private async deriveKey(password: string): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      'PBKDF2',
      false,
      ['deriveKey']
    );

    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: encoder.encode('salt'), // In production, use random salt
        iterations: 100000,
        hash: 'SHA-256',
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  // Worker creation methods
  private createCSVWorker(): string {
    return `
      self.onmessage = function(e) {
        const { id, data, config, action, content } = e.data;
        
        try {
          let result;
          
          if (action === 'parse') {
            result = parseCSV(content);
          } else {
            result = new Blob([convertToCSV(data)], { type: 'text/csv' });
          }
          
          self.postMessage({ id, success: true, result });
        } catch (error) {
          self.postMessage({ id, success: false, error: error.message });
        }
      };
      
      function parseCSV(content) {
        // CSV parsing logic here
        return [];
      }
      
      function convertToCSV(data) {
        // CSV conversion logic here
        return '';
      }
    `;
  }

  private createExcelWorker(): string {
    return `
      self.onmessage = function(e) {
        const { id, data, config, action } = e.data;
        
        try {
          let result;
          
          if (action === 'parse') {
            result = parseExcel(data);
          } else {
            result = new Blob([convertToExcel(data)], { 
              type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
            });
          }
          
          self.postMessage({ id, success: true, result });
        } catch (error) {
          self.postMessage({ id, success: false, error: error.message });
        }
      };
      
      function parseExcel(arrayBuffer) {
        // Excel parsing logic here
        return [];
      }
      
      function convertToExcel(data) {
        // Excel conversion logic here
        return '';
      }
    `;
  }

  private createPDFWorker(): string {
    return `
      self.onmessage = function(e) {
        const { id, data, config } = e.data;
        
        try {
          const result = new Blob([convertToPDF(data)], { type: 'application/pdf' });
          self.postMessage({ id, success: true, result });
        } catch (error) {
          self.postMessage({ id, success: false, error: error.message });
        }
      };
      
      function convertToPDF(data) {
        // PDF conversion logic here
        return '';
      }
    `;
  }

  // Cleanup
  destroy(): void {
    this.workers.forEach(worker => worker.terminate());
    this.workers.clear();
  }
}

export const dataExportImportService = new DataExportImportService();
export default DataExportImportService;