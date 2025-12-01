/**
 * API 响应包装
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * 文件信息
 */
export interface FileInfo {
  path: string;
  name: string;
  size: number;
  fileType: FileType;
}

/**
 * 文件类型
 */
export enum FileType {
  Image = 'Image',
  Pdf = 'Pdf',
  Unknown = 'Unknown',
}

/**
 * OCR 识别请求
 */
export interface RecognizeRequest {
  filePath?: string;
  base64?: string;
  invoiceType?: string;
}

/**
 * 导出请求
 */
export interface ExportRequest {
  ids?: string[];
  filter?: import('./invoice').InvoiceFilter;
  outputPath: string;
}

/**
 * 导出结果
 */
export interface ExportResult {
  file_path: string;
  count: number;
}

/**
 * 操作结果
 */
export interface OperationResult {
  success: boolean;
  message?: string;
  affectedCount?: number;
}
