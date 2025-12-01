import { useCallback, useState } from 'react';
import { useDropzone, FileRejection } from 'react-dropzone';
import { Upload, File, X, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { open } from '@tauri-apps/plugin-dialog';
import { toast } from 'sonner';
import { invoiceService } from '../../services/invoiceService';
import { useInvoiceStore } from '../../stores/invoiceStore';

/** 支持的文件扩展名 */
const ACCEPTED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.bmp', '.pdf'];
const ACCEPTED_MIME_TYPES = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/bmp': ['.bmp'],
  'application/pdf': ['.pdf'],
};

/** 上传文件项 */
interface UploadItem {
  id: string;
  name: string;
  path: string;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
}

/** 生成唯一ID */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

export function FileUploader() {
  const [uploadItems, setUploadItems] = useState<UploadItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const { fetchInvoices } = useInvoiceStore();

  /** 处理单个文件上传 */
  const processFile = useCallback(async (item: UploadItem) => {
    setUploadItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, status: 'uploading' } : i))
    );

    try {
      await invoiceService.recognizeAndSaveInvoice(item.path);
      setUploadItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, status: 'success' } : i))
      );
      return true;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : '识别失败';
      setUploadItems((prev) =>
        prev.map((i) =>
          i.id === item.id ? { ...i, status: 'error', error: errorMsg } : i
        )
      );
      return false;
    }
  }, []);

  /** 处理所有待上传文件 */
  const processAllFiles = useCallback(
    async (items: UploadItem[]) => {
      if (items.length === 0) return;

      setIsProcessing(true);
      let successCount = 0;
      let errorCount = 0;

      for (const item of items) {
        const success = await processFile(item);
        if (success) {
          successCount++;
        } else {
          errorCount++;
        }
      }

      setIsProcessing(false);
      await fetchInvoices();

      if (successCount > 0 && errorCount === 0) {
        toast.success(`成功识别 ${successCount} 张发票`);
      } else if (successCount > 0 && errorCount > 0) {
        toast.warning(`识别完成：${successCount} 成功，${errorCount} 失败`);
      } else if (errorCount > 0) {
        toast.error(`识别失败：${errorCount} 张发票`);
      }
    },
    [processFile, fetchInvoices]
  );

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
      processAllFiles(newItems);
    },
    [processAllFiles]
  );

  /** 处理 dropzone 文件拖放 */
  const onDrop = useCallback(
    (acceptedFiles: File[], rejectedFiles: FileRejection[]) => {
      if (rejectedFiles.length > 0) {
        toast.error('部分文件格式不支持，请上传 JPG、PNG、BMP 或 PDF 文件');
      }

      // 获取文件路径 (Tauri 环境下 File 对象有 path 属性)
      const filePaths = acceptedFiles
        .map((file) => (file as File & { path?: string }).path)
        .filter((path): path is string => !!path);

      if (filePaths.length > 0) {
        addFilesToQueue(filePaths);
      }
    },
    [addFilesToQueue]
  );

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

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_MIME_TYPES,
    noClick: true,
  });

  const hasCompletedItems = uploadItems.some(
    (item) => item.status === 'success' || item.status === 'error'
  );

  return (
    <div className="space-y-4">
      {/* 拖放区域 */}
      <div
        {...getRootProps()}
        className={`
          relative flex flex-col items-center justify-center
          p-8 border-2 border-dashed rounded-lg
          transition-colors duration-200 cursor-pointer
          ${
            isDragActive
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 bg-gray-50 hover:bg-gray-100 hover:border-blue-400'
          }
        `}
        onClick={handleSelectFiles}
      >
        <input {...getInputProps()} />
        <Upload
          className={`h-10 w-10 mb-3 ${
            isDragActive ? 'text-blue-500' : 'text-gray-400'
          }`}
        />
        <p className="text-base font-medium text-gray-700">
          {isDragActive ? '释放文件开始上传' : '拖拽文件到此处上传'}
        </p>
        <p className="text-sm text-gray-500 mt-1">
          支持 {ACCEPTED_EXTENSIONS.join('、')} 格式
        </p>
        <button
          type="button"
          className="mt-4 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            handleSelectFiles();
          }}
        >
          选择文件
        </button>
      </div>

      {/* 上传队列 */}
      {uploadItems.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
            <span className="text-sm font-medium text-gray-700">
              上传队列 ({uploadItems.length})
            </span>
            {hasCompletedItems && (
              <button
                type="button"
                onClick={clearCompleted}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                清除已完成
              </button>
            )}
          </div>
          <ul className="divide-y divide-gray-100 max-h-60 overflow-y-auto">
            {uploadItems.map((item) => (
              <UploadItemRow
                key={item.id}
                item={item}
                onRemove={() => removeItem(item.id)}
              />
            ))}
          </ul>
        </div>
      )}

      {/* 处理中遮罩提示 */}
      {isProcessing && (
        <div className="text-center text-sm text-gray-500">
          <Loader2 className="inline h-4 w-4 animate-spin mr-1" />
          正在处理文件...
        </div>
      )}
    </div>
  );
}

/** 上传项行组件 */
interface UploadItemRowProps {
  item: UploadItem;
  onRemove: () => void;
}

function UploadItemRow({ item, onRemove }: UploadItemRowProps) {
  const statusIcons = {
    pending: <File className="h-4 w-4 text-gray-400" />,
    uploading: <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />,
    success: <CheckCircle className="h-4 w-4 text-green-500" />,
    error: <AlertCircle className="h-4 w-4 text-red-500" />,
  };

  return (
    <li className="flex items-center gap-3 px-4 py-3">
      {statusIcons[item.status]}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-700 truncate">{item.name}</p>
        {item.error && (
          <p className="text-xs text-red-500 truncate">{item.error}</p>
        )}
      </div>
      {(item.status === 'success' || item.status === 'error') && (
        <button
          type="button"
          onClick={onRemove}
          className="p-1 text-gray-400 hover:text-gray-600 rounded"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </li>
  );
}
