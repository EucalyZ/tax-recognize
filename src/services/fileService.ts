import { invoke } from '@tauri-apps/api/core';
import { FileInfo } from '../types/api';

/**
 * 文件服务 - 封装文件相关的 Tauri 命令调用
 */
export const fileService = {
  /**
   * 验证文件类型
   * @param filePath 文件路径
   */
  async validateFile(filePath: string): Promise<FileInfo> {
    return invoke<FileInfo>('validate_file', { filePath });
  },

  /**
   * 读取文件为 Base64
   * @param filePath 文件路径
   */
  async readFileAsBase64(filePath: string): Promise<string> {
    return invoke<string>('get_file_base64', { filePath });
  },
};
