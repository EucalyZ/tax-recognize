import { useEffect, useState, useCallback } from 'react';
import { check, Update } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';
import { RefreshCw, Download, X } from 'lucide-react';
import { toast } from 'sonner';

interface UpdateState {
  checking: boolean;
  available: boolean;
  downloading: boolean;
  progress: number;
  update: Update | null;
  error: string | null;
}

export function UpdateChecker() {
  const [state, setState] = useState<UpdateState>({
    checking: false,
    available: false,
    downloading: false,
    progress: 0,
    update: null,
    error: null,
  });
  const [showBanner, setShowBanner] = useState(false);

  const checkForUpdate = useCallback(async () => {
    setState((s) => ({ ...s, checking: true, error: null }));
    try {
      const update = await check();
      if (update) {
        setState((s) => ({ ...s, checking: false, available: true, update }));
        setShowBanner(true);
      } else {
        setState((s) => ({ ...s, checking: false, available: false }));
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : '检查更新失败';
      setState((s) => ({ ...s, checking: false, error: message }));
    }
  }, []);

  const downloadAndInstall = useCallback(async () => {
    if (!state.update) return;

    setState((s) => ({ ...s, downloading: true, progress: 0 }));
    try {
      let contentLength = 0;
      await state.update.downloadAndInstall((event) => {
        if (event.event === 'Started') {
          contentLength = (event.data as { contentLength?: number }).contentLength || 0;
          setState((s) => ({ ...s, progress: 0 }));
        } else if (event.event === 'Progress') {
          const downloaded = (event.data as { chunkLength: number }).chunkLength;
          if (contentLength > 0) {
            setState((s) => ({
              ...s,
              progress: Math.min(100, s.progress + (downloaded / contentLength) * 100),
            }));
          }
        } else if (event.event === 'Finished') {
          setState((s) => ({ ...s, progress: 100 }));
        }
      });
      toast.success('更新下载完成，即将重启应用');
      await relaunch();
    } catch (err) {
      const message = err instanceof Error ? err.message : '下载更新失败';
      setState((s) => ({ ...s, downloading: false, error: message }));
      toast.error(message);
    }
  }, [state.update]);

  // 启动时检查更新
  useEffect(() => {
    const timer = setTimeout(() => {
      checkForUpdate();
    }, 3000);
    return () => clearTimeout(timer);
  }, [checkForUpdate]);

  if (!showBanner || !state.available) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80 bg-white rounded-lg shadow-lg border border-blue-200 overflow-hidden">
      <div className="bg-blue-50 px-4 py-2 flex items-center justify-between border-b border-blue-100">
        <span className="text-sm font-medium text-blue-800">发现新版本</span>
        <button
          type="button"
          onClick={() => setShowBanner(false)}
          className="text-blue-400 hover:text-blue-600"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="p-4">
        <p className="text-sm text-gray-700 mb-3">
          新版本 <span className="font-medium">{state.update?.version}</span> 可用
        </p>
        {state.downloading ? (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />
              <span className="text-sm text-gray-600">下载中...</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 transition-all duration-300"
                style={{ width: `${state.progress}%` }}
              />
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={downloadAndInstall}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Download className="h-4 w-4" />
            下载并安装
          </button>
        )}
      </div>
    </div>
  );
}
