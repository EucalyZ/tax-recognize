import { useCallback } from 'react';
import { Download, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../ui/Button';
import { useUIStore } from '../../stores/uiStore';
import { useInvoiceStore } from '../../stores/invoiceStore';

const pageTitles: Record<string, string> = {
  home: '发票管理',
  settings: '系统设置',
};

export function Header() {
  const { currentPage } = useUIStore();
  const { loading, fetchInvoices } = useInvoiceStore();
  const title = pageTitles[currentPage] || '发票识别助手';

  /** 刷新发票列表 */
  const handleRefresh = useCallback(async () => {
    try {
      await fetchInvoices();
      toast.success('刷新成功');
    } catch (err) {
      const message = err instanceof Error ? err.message : '刷新失败';
      toast.error(message);
    }
  }, [fetchInvoices]);

  /** 导出发票（预留功能） */
  const handleExport = useCallback(() => {
    toast.info('导出功能开发中...');
  }, []);

  return (
    <header className="flex items-center justify-between h-16 px-6 bg-white border-b border-gray-200">
      <h1 className="text-xl font-semibold text-gray-800">{title}</h1>

      <div className="flex items-center gap-3">
        {currentPage === 'home' && (
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              loading={loading}
            >
              <RefreshCw className="h-4 w-4 mr-1.5" />
              刷新
            </Button>
            <Button variant="secondary" size="sm" onClick={handleExport}>
              <Download className="h-4 w-4 mr-1.5" />
              导出
            </Button>
          </>
        )}
      </div>
    </header>
  );
}
