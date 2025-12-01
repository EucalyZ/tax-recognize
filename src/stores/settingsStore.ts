import { create } from 'zustand';
import { configService } from '../services/configService';
import { ConfigKeys } from '../types/config';

interface SettingsState {
  apiKey: string;
  secretKey: string;
  accessToken: string | null;
  exportPath: string;
  loaded: boolean;
  loading: boolean;
  error: string | null;
}

interface SettingsActions {
  loadSettings: () => Promise<void>;
  saveApiConfig: (apiKey: string, secretKey: string) => Promise<void>;
  testConnection: () => Promise<boolean>;
  setExportPath: (path: string) => void;
  saveExportPath: (path: string) => Promise<void>;
  clearError: () => void;
}

type SettingsStore = SettingsState & SettingsActions;

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  // Initial State
  apiKey: '',
  secretKey: '',
  accessToken: null,
  exportPath: '',
  loaded: false,
  loading: false,
  error: null,

  // Actions
  loadSettings: async () => {
    if (get().loaded) return;

    set({ loading: true, error: null });

    try {
      const [apiKey, secretKey, accessToken, exportPath] = await Promise.all([
        configService.getConfig(ConfigKeys.BAIDU_OCR_API_KEY),
        configService.getConfig(ConfigKeys.BAIDU_OCR_SECRET_KEY),
        configService.getConfig(ConfigKeys.BAIDU_OCR_ACCESS_TOKEN),
        configService.getConfig(ConfigKeys.EXPORT_DEFAULT_PATH),
      ]);

      set({
        apiKey: apiKey || '',
        secretKey: secretKey || '',
        accessToken: accessToken || null,
        exportPath: exportPath || '',
        loaded: true,
        loading: false,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : '加载设置失败';
      set({ error: message, loading: false });
    }
  },

  saveApiConfig: async (apiKey: string, secretKey: string) => {
    set({ loading: true, error: null });

    try {
      await Promise.all([
        configService.setConfig(
          ConfigKeys.BAIDU_OCR_API_KEY,
          apiKey,
          '百度 OCR API Key'
        ),
        configService.setConfig(
          ConfigKeys.BAIDU_OCR_SECRET_KEY,
          secretKey,
          '百度 OCR Secret Key'
        ),
      ]);

      // 清除旧的 token（需要重新获取）
      await configService.deleteConfig(ConfigKeys.BAIDU_OCR_ACCESS_TOKEN);

      set({
        apiKey,
        secretKey,
        accessToken: null,
        loading: false,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : '保存 API 配置失败';
      set({ error: message, loading: false });
      throw err;
    }
  },

  testConnection: async () => {
    const { apiKey, secretKey } = get();

    if (!apiKey || !secretKey) {
      set({ error: '请先配置 API Key 和 Secret Key' });
      return false;
    }

    set({ loading: true, error: null });

    try {
      // TODO: 调用 Tauri 命令测试连接
      // const result = await invoke('test_ocr_connection', { apiKey, secretKey });
      // 暂时返回 true，后续实现
      set({ loading: false });
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : '连接测试失败';
      set({ error: message, loading: false });
      return false;
    }
  },

  setExportPath: (path) => {
    set({ exportPath: path });
  },

  saveExportPath: async (path: string) => {
    set({ loading: true, error: null });

    try {
      await configService.setConfig(
        ConfigKeys.EXPORT_DEFAULT_PATH,
        path,
        '默认导出路径'
      );
      set({ exportPath: path, loading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : '保存导出路径失败';
      set({ error: message, loading: false });
      throw err;
    }
  },

  clearError: () => {
    set({ error: null });
  },
}));
