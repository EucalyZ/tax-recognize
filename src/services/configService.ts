import { invoke } from '@tauri-apps/api/core';

/**
 * 配置服务 - 封装配置相关的 Tauri 命令调用
 */
export const configService = {
  /**
   * 获取配置项
   * @param key 配置键
   * @returns 配置值，不存在时返回 null
   */
  async getConfig(key: string): Promise<string | null> {
    return invoke<string | null>('get_config', { key });
  },

  /**
   * 设置配置项
   * @param key 配置键
   * @param value 配置值
   * @param description 配置描述（可选）
   */
  async setConfig(key: string, value: string, description?: string): Promise<void> {
    return invoke('set_config', { key, value, description });
  },

  /**
   * 删除配置项
   * @param key 配置键
   */
  async deleteConfig(key: string): Promise<void> {
    return invoke('delete_config', { key });
  },
};
