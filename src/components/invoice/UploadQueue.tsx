import { File, X, CheckCircle, AlertCircle, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';

/** 上传文件项 */
export interface UploadItem {
  id: string;
  name: string;
  path: string;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
}

interface UploadQueueProps {
  items: UploadItem[];
  onRemove: (id: string) => void;
  onClearCompleted: () => void;
}

export function UploadQueue({ items, onRemove, onClearCompleted }: UploadQueueProps) {
  const [collapsed, setCollapsed] = useState(false);

  const successCount = items.filter((i) => i.status === 'success').length;
  const errorCount = items.filter((i) => i.status === 'error').length;
  const processingCount = items.filter((i) => i.status === 'uploading' || i.status === 'pending').length;
  const hasCompleted = successCount > 0 || errorCount > 0;

  return (
    <div className="fixed top-16 right-4 w-72 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
      {/* 标题栏 */}
      <div
        className="flex items-center justify-between px-3 py-2 border-b border-gray-100 cursor-pointer hover:bg-gray-50"
        onClick={() => setCollapsed(!collapsed)}
      >
        <div className="flex items-center gap-2">
          {processingCount > 0 && (
            <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
          )}
          <span className="text-sm font-medium text-gray-700">
            上传队列
          </span>
          {items.length > 0 && (
            <span className="text-xs text-gray-500">
              {processingCount > 0 && `处理中 ${processingCount}`}
              {successCount > 0 && ` 成功 ${successCount}`}
              {errorCount > 0 && ` 失败 ${errorCount}`}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {hasCompleted && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClearCompleted();
              }}
              className="text-xs text-gray-400 hover:text-gray-600 px-1"
            >
              清除
            </button>
          )}
          {collapsed ? (
            <ChevronDown className="h-4 w-4 text-gray-400" />
          ) : (
            <ChevronUp className="h-4 w-4 text-gray-400" />
          )}
        </div>
      </div>

      {/* 队列列表 */}
      {!collapsed && (
        items.length === 0 ? (
          <div className="px-3 py-4 text-center text-xs text-gray-400">
            拖拽文件到窗口或点击上传按钮
          </div>
        ) : (
          <ul className="divide-y divide-gray-50 max-h-64 overflow-y-auto">
            {items.map((item) => (
              <UploadItemRow key={item.id} item={item} onRemove={() => onRemove(item.id)} />
            ))}
          </ul>
        )
      )}

      {/* 进度条 */}
      {processingCount > 0 && (
        <div className="h-1 bg-gray-100">
          <div
            className="h-full bg-blue-500 transition-all duration-300"
            style={{ width: `${((items.length - processingCount) / items.length) * 100}%` }}
          />
        </div>
      )}
    </div>
  );
}

interface UploadItemRowProps {
  item: UploadItem;
  onRemove: () => void;
}

function UploadItemRow({ item, onRemove }: UploadItemRowProps) {
  const statusConfig = {
    pending: { icon: <File className="h-3.5 w-3.5 text-gray-400" />, bg: '' },
    uploading: { icon: <Loader2 className="h-3.5 w-3.5 text-blue-500 animate-spin" />, bg: 'bg-blue-50' },
    success: { icon: <CheckCircle className="h-3.5 w-3.5 text-green-500" />, bg: 'bg-green-50' },
    error: { icon: <AlertCircle className="h-3.5 w-3.5 text-red-500" />, bg: 'bg-red-50' },
  };

  const { icon, bg } = statusConfig[item.status];

  return (
    <li className={`flex items-center gap-2 px-3 py-2 ${bg}`}>
      {icon}
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-700 truncate">{item.name}</p>
        {item.error && (
          <p className="text-xs text-red-500 truncate">{item.error}</p>
        )}
      </div>
      {(item.status === 'success' || item.status === 'error') && (
        <button
          type="button"
          onClick={onRemove}
          className="p-0.5 text-gray-400 hover:text-gray-600 rounded"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </li>
  );
}
