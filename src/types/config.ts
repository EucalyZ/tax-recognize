/**
 * 配置项模型
 */
export interface ConfigItem {
  key: string;
  value: string;
  description?: string;
  updatedAt: string;
}

/**
 * 百度 OCR 配置
 */
export interface OcrConfig {
  apiKey: string;
  secretKey: string;
  accessToken?: string;
  tokenExpiresAt?: string;
}

/**
 * 导出配置
 */
export interface ExportConfig {
  defaultPath: string;
  includeHeader: boolean;
  dateFormat: string;
  columns: ExportColumn[];
}

/**
 * 导出列配置
 */
export interface ExportColumn {
  key: string;
  label: string;
  enabled: boolean;
  width?: number;
}

/**
 * 预定义配置键
 */
export const ConfigKeys = {
  BAIDU_OCR_API_KEY: 'baidu_ocr_api_key',
  BAIDU_OCR_SECRET_KEY: 'baidu_ocr_secret_key',
  BAIDU_OCR_ACCESS_TOKEN: 'baidu_ocr_access_token',
  BAIDU_OCR_TOKEN_EXPIRES: 'baidu_ocr_token_expires',
  EXPORT_DEFAULT_PATH: 'export_default_path',
  EXPORT_TEMPLATE: 'export_template',
} as const;

export type ConfigKey = (typeof ConfigKeys)[keyof typeof ConfigKeys];
