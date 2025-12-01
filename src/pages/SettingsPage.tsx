import { useEffect, useState, useCallback } from 'react';
import { Save, TestTube, FolderOpen, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { open } from '@tauri-apps/plugin-dialog';
import { useSettingsStore } from '../stores/settingsStore';
import { invoiceService } from '../services/invoiceService';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Loading } from '../components/ui/Loading';

/**
 * 设置页面
 */
export function SettingsPage() {
  const {
    apiKey,
    secretKey,
    exportPath,
    loaded,
    loading,
    error,
    loadSettings,
    saveApiConfig,
    saveExportPath,
    clearError,
  } = useSettingsStore();

  // 本地表单状态
  const [formApiKey, setFormApiKey] = useState('');
  const [formSecretKey, setFormSecretKey] = useState('');
  const [formExportPath, setFormExportPath] = useState('');
  const [testResult, setTestResult] = useState<boolean | null>(null);
  const [testing, setTesting] = useState(false);

  // 加载设置
  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // 同步 store 值到表单
  useEffect(() => {
    if (loaded) {
      setFormApiKey(apiKey);
      setFormSecretKey(secretKey);
      setFormExportPath(exportPath);
    }
  }, [loaded, apiKey, secretKey, exportPath]);

  // 显示错误
  useEffect(() => {
    if (error) {
      toast.error(error);
      clearError();
    }
  }, [error, clearError]);

  /** 保存 API 配置 */
  const handleSaveApiConfig = useCallback(async () => {
    try {
      await saveApiConfig(formApiKey, formSecretKey);
      setTestResult(null);
      toast.success('API 配置保存成功');
    } catch (err) {
      const message = err instanceof Error ? err.message : '保存失败';
      toast.error(message);
    }
  }, [formApiKey, formSecretKey, saveApiConfig]);

  /** 测试 OCR 连接 */
  const handleTestConnection = useCallback(async () => {
    if (!formApiKey || !formSecretKey) {
      toast.error('请先输入 API Key 和 Secret Key');
      return;
    }

    setTesting(true);
    try {
      const result = await invoiceService.testOcrConnection(
        formApiKey,
        formSecretKey
      );
      setTestResult(result);
      if (result) {
        toast.success('连接测试成功');
      } else {
        toast.error('连接测试失败');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : '连接测试失败';
      toast.error(message);
      setTestResult(false);
    } finally {
      setTesting(false);
    }
  }, [formApiKey, formSecretKey]);

  /** 选择导出目录 */
  const handleSelectExportPath = useCallback(async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: '选择默认导出目录',
      });

      if (selected && typeof selected === 'string') {
        setFormExportPath(selected);
      }
    } catch (err) {
      console.error('选择目录失败:', err);
      toast.error('选择目录失败');
    }
  }, []);

  /** 保存导出路径 */
  const handleSaveExportPath = useCallback(async () => {
    try {
      await saveExportPath(formExportPath);
      toast.success('导出路径保存成功');
    } catch (err) {
      const message = err instanceof Error ? err.message : '保存失败';
      toast.error(message);
    }
  }, [formExportPath, saveExportPath]);

  if (!loaded) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loading text="加载设置..." />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-8">
      {/* API 配置 */}
      <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          百度 OCR API 配置
        </h2>
        <p className="text-sm text-gray-500 mb-4">
          请前往{' '}
          <a
            href="https://cloud.baidu.com/product/ocr"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline"
          >
            百度云 OCR 控制台
          </a>{' '}
          获取 API Key 和 Secret Key
        </p>
        <div className="space-y-4">
          <Input
            label="API Key"
            value={formApiKey}
            onChange={setFormApiKey}
            placeholder="请输入百度 OCR API Key"
          />
          <Input
            label="Secret Key"
            type="password"
            value={formSecretKey}
            onChange={setFormSecretKey}
            placeholder="请输入百度 OCR Secret Key"
          />
          <div className="flex items-center gap-3 pt-2">
            <Button onClick={handleSaveApiConfig} loading={loading}>
              <Save className="h-4 w-4 mr-1.5" />
              保存配置
            </Button>
            <Button
              variant="secondary"
              onClick={handleTestConnection}
              loading={testing}
              disabled={!formApiKey || !formSecretKey}
            >
              <TestTube className="h-4 w-4 mr-1.5" />
              测试连接
            </Button>
            {testResult !== null && (
              <span
                className={`flex items-center gap-1 ${
                  testResult ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {testResult ? (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    连接成功
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4" />
                    连接失败
                  </>
                )}
              </span>
            )}
          </div>
        </div>
      </section>

      {/* 导出配置 */}
      <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">导出配置</h2>
        <div className="space-y-4">
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <Input
                label="默认导出路径"
                value={formExportPath}
                onChange={setFormExportPath}
                placeholder="选择默认导出目录"
              />
            </div>
            <Button variant="ghost" onClick={handleSelectExportPath}>
              <FolderOpen className="h-4 w-4" />
            </Button>
          </div>
          <Button onClick={handleSaveExportPath} loading={loading}>
            <Save className="h-4 w-4 mr-1.5" />
            保存路径
          </Button>
        </div>
      </section>

      {/* 关于 */}
      <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-2">关于</h2>
        <p className="text-sm text-gray-600">发票识别助手 v0.1.0</p>
        <p className="text-sm text-gray-500 mt-1">基于 Tauri + React 构建</p>
      </section>
    </div>
  );
}
