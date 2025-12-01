import { useCallback, useState, useEffect, useRef } from 'react';
import { Upload } from 'lucide-react';
import { open } from '@tauri-apps/plugin-dialog';
import { getCurrentWebview } from '@tauri-apps/api/webview';
import { toast } from 'sonner';
import { invoiceService } from '../../services/invoiceService';
import { useInvoiceStore } from '../../stores/invoiceStore';
import { UploadQueue, UploadItem } from './UploadQueue';
import { DropZoneOverlay } from './DropZoneOverlay';

/** 支持的文件扩展名 */
const ACCEPTED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.bmp', '.pdf'];

/** 生成唯一ID */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/** 最大并发数 */
const MAX_CONCURRENT = 2;

/** 重试延迟（毫秒） */
const RETRY_DELAY = 500;

/** 最大重试次数 */
const MAX_RETRIES = 3;

/** 判断是否为可重试错误（QPS限制、网络错误等） */
function isRetryableError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  const lowerMsg = msg.toLowerCase();
  return (
    lowerMsg.includes('qps') ||
    lowerMsg.includes('request limit') ||
    lowerMsg.includes('error sending request') ||
    lowerMsg.includes('network') ||
    lowerMsg.includes('timeout') ||
    lowerMsg.includes('connection') ||
    lowerMsg.includes('econnreset') ||
    lowerMsg.includes('enotfound')
  );
}

/** 延迟函数 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** 检查文件扩展名是否支持 */
function isValidExtension(filePath: string): boolean {
  const ext = filePath.toLowerCase().split('.').pop();
  return ext ? ACCEPTED_EXTENSIONS.includes(`.${ext}`) : false;
}

export function FileUploader() {
  const [uploadItems, setUploadItems] = useState<UploadItem[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const { fetchInvoices } = useInvoiceStore();

  // 全局队列处理状态
  const isProcessingRef = useRef(false);
  const pendingQueueRef = useRef<UploadItem[]>([]);
  const statsRef = useRef({ success: 0, error: 0 });

  /** 处理单个文件上传（带 QPS 限制重试） */
  const processFile = useCallback(async (item: UploadItem): Promise<boolean> => {
    setUploadItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, status: 'uploading' } : i))
    );

    let lastError: unknown;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        await invoiceService.recognizeAndSaveInvoice(item.path);
        setUploadItems((prev) =>
          prev.map((i) => (i.id === item.id ? { ...i, status: 'success' } : i))
        );
        return true;
      } catch (err) {
        lastError = err;
        if (isRetryableError(err) && attempt < MAX_RETRIES) {
          await delay(RETRY_DELAY);
          continue;
        }
        break;
      }
    }

    const errorMsg = lastError instanceof Error ? lastError.message : '识别失败';
    setUploadItems((prev) =>
      prev.map((i) =>
        i.id === item.id ? { ...i, status: 'error', error: errorMsg } : i
      )
    );
    return false;
  }, []);

  /** 全局队列处理器 - 只在队列完全清空后显示 toast */
  const processQueue = useCallback(async () => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;

    const executing: Promise<void>[] = [];

    while (pendingQueueRef.current.length > 0 || executing.length > 0) {
      // 从队列取出待处理项
      while (executing.length < MAX_CONCURRENT && pendingQueueRef.current.length > 0) {
        const item = pendingQueueRef.current.shift()!;
        const promise = processFile(item).then((success) => {
          if (success) statsRef.current.success++;
          else statsRef.current.error++;
          executing.splice(executing.indexOf(promise), 1);
        });
        executing.push(promise);
      }
      if (executing.length > 0) {
        await Promise.race(executing);
      }
    }

    // 所有文件处理完成，显示汇总通知
    const { success, error } = statsRef.current;
    if (success > 0 || error > 0) {
      await fetchInvoices();
      if (success > 0 && error === 0) {
        toast.success(`成功识别 ${success} 张发票`);
      } else if (success > 0 && error > 0) {
        toast.warning(`识别完成：${success} 成功，${error} 失败`);
      } else if (error > 0) {
        toast.error(`识别失败：${error} 张发票`);
      }
    }

    // 重置状态
    statsRef.current = { success: 0, error: 0 };
    isProcessingRef.current = false;
  }, [processFile, fetchInvoices]);

  /** 添加文件到上传队列 */
  const addFilesToQueue = useCallback(
    (filePaths: string[]) => {
      const newItems: UploadItem[] = filePaths.map((path) => ({
        id: generateId(),
        name: path.split(/[/\\]/).pop() || path,
        path,
        status: 'pending',
      }));

      setUploadItems((prev) => [...prev, ...newItems]);
      pendingQueueRef.current.push(...newItems);
      processQueue();
    },
    [processQueue]
  );

  // 使用 ref 保存最新的 addFilesToQueue，避免 useEffect 重复注册
  const addFilesToQueueRef = useRef(addFilesToQueue);
  addFilesToQueueRef.current = addFilesToQueue;

  // 防止重复处理同一批文件
  const lastDropTimeRef = useRef(0);
  const processingPathsRef = useRef<Set<string>>(new Set());

  /** 监听 Tauri 拖放事件 */
  useEffect(() => {
    let unlisten: (() => void) | undefined;

    const setupDragDrop = async () => {
      try {
        const webview = getCurrentWebview();
        unlisten = await webview.onDragDropEvent((event) => {
          if (event.payload.type === 'over') {
            setIsDragOver(true);
          } else if (event.payload.type === 'drop') {
            setIsDragOver(false);
            
            // 防抖：100ms 内的重复 drop 事件忽略
            const now = Date.now();
            if (now - lastDropTimeRef.current < 100) {
              return;
            }
            lastDropTimeRef.current = now;
            
            const paths = event.payload.paths;
            // 过滤支持的文件类型
            const validPaths = paths.filter(isValidExtension);
            
            // 过滤掉正在处理中的文件
            const newPaths = validPaths.filter(p => !processingPathsRef.current.has(p));
            
            const invalidCount = paths.length - validPaths.length;
            if (invalidCount > 0) {
              toast.error(`${invalidCount} 个文件格式不支持，请上传 JPG、PNG、BMP 或 PDF 文件`);
            }
            
            if (newPaths.length > 0) {
              // 标记为处理中
              newPaths.forEach(p => processingPathsRef.current.add(p));
              addFilesToQueueRef.current(newPaths);
              // 5秒后清除标记，允许重新上传
              setTimeout(() => {
                newPaths.forEach(p => processingPathsRef.current.delete(p));
              }, 5000);
            }
          } else if (event.payload.type === 'leave') {
            setIsDragOver(false);
          }
        });
      } catch (err) {
        console.error('Failed to setup drag-drop listener:', err);
      }
    };

    setupDragDrop();

    return () => {
      if (unlisten) {
        unlisten();
      }
    };
  }, []); // 空依赖，只注册一次

  /** 使用系统对话框选择文件 */
  const handleSelectFiles = useCallback(async () => {
    try {
      const selected = await open({
        multiple: true,
        filters: [
          {
            name: '发票文件',
            extensions: ['jpg', 'jpeg', 'png', 'bmp', 'pdf'],
          },
        ],
      });

      if (selected) {
        const paths = Array.isArray(selected) ? selected : [selected];
        addFilesToQueue(paths);
      }
    } catch (err) {
      console.error('选择文件失败:', err);
      toast.error('选择文件失败');
    }
  }, [addFilesToQueue]);

  /** 移除上传项 */
  const removeItem = useCallback((id: string) => {
    setUploadItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  /** 清空已完成的项 */
  const clearCompleted = useCallback(() => {
    setUploadItems((prev) =>
      prev.filter((item) => item.status !== 'success' && item.status !== 'error')
    );
  }, []);

  return (
    <>
      {/* 紧凑上传按钮 */}
      <button
        type="button"
        onClick={handleSelectFiles}
        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
      >
        <Upload className="h-4 w-4" />
        上传发票
      </button>

      {/* 全局拖拽覆盖层 */}
      <DropZoneOverlay isDragOver={isDragOver} />

      {/* 右上角上传队列 */}
      <UploadQueue
        items={uploadItems}
        onRemove={removeItem}
        onClearCompleted={clearCompleted}
      />
    </>
  );
}
