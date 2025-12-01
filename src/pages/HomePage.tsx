import { useEffect, useCallback, useState } from 'react';
import { FileText } from 'lucide-react';
import { toast } from 'sonner';
import { useInvoices } from '../hooks/useInvoices';
import { useUIStore } from '../stores/uiStore';
import { useInvoiceStore } from '../stores/invoiceStore';
import { Loading, ConfirmModal } from '../components/ui';
import {
  FileUploader,
  InvoiceTable,
  InvoiceFilter,
  InvoiceDetail,
  Pagination,
} from '../components/invoice';

/** 删除确认状态 */
interface DeleteConfirmState {
  isOpen: boolean;
  type: 'single' | 'batch';
  id?: string;
  count?: number;
}

/**
 * 主页 - 发票列表和上传
 */
export function HomePage() {
  const {
    invoices,
    selectedIds,
    filter,
    pagination,
    loading,
    error,
    isAllSelected,
    isPartialSelected,
    refresh,
    resetFilter,
    setPage,
    setPageSize,
    toggleSelect,
    toggleSelectAll,
    clearError,
  } = useInvoices();

  const { deleteBatch, deleteInvoice, updateFilter } = useInvoiceStore();
  const { detailModalOpen, selectedInvoiceId, openDetailModal, closeDetailModal } =
    useUIStore();

  const [deleteConfirm, setDeleteConfirm] = useState<DeleteConfirmState>({
    isOpen: false,
    type: 'single',
  });
  const [deleting, setDeleting] = useState(false);

  /** 显示错误 */
  useEffect(() => {
    if (error) {
      toast.error(error);
      clearError();
    }
  }, [error, clearError]);

  /** 查看发票详情 */
  const handleViewInvoice = useCallback(
    (id: string) => {
      openDetailModal(id);
    },
    [openDetailModal]
  );

  /** 打开删除单个发票确认 */
  const handleDeleteInvoice = useCallback((id: string) => {
    setDeleteConfirm({ isOpen: true, type: 'single', id });
  }, []);

  /** 打开批量删除确认 */
  const handleDeleteSelected = useCallback(() => {
    if (selectedIds.length === 0) return;
    setDeleteConfirm({ isOpen: true, type: 'batch', count: selectedIds.length });
  }, [selectedIds.length]);

  /** 关闭删除确认 */
  const closeDeleteConfirm = useCallback(() => {
    setDeleteConfirm({ isOpen: false, type: 'single' });
  }, []);

  /** 确认删除 */
  const confirmDelete = useCallback(async () => {
    setDeleting(true);
    try {
      if (deleteConfirm.type === 'single' && deleteConfirm.id) {
        await deleteInvoice(deleteConfirm.id);
        toast.success('删除成功');
      } else if (deleteConfirm.type === 'batch') {
        await deleteBatch(selectedIds);
        toast.success(`成功删除 ${selectedIds.length} 张发票`);
      }
      closeDeleteConfirm();
    } catch (err) {
      const message = err instanceof Error ? err.message : '删除失败';
      toast.error(message);
    } finally {
      setDeleting(false);
    }
  }, [deleteConfirm, deleteInvoice, deleteBatch, selectedIds, closeDeleteConfirm]);

  /** 筛选条件变更 */
  const handleFilterChange = useCallback(
    (newFilter: Parameters<typeof updateFilter>[0]) => {
      updateFilter(newFilter);
    },
    [updateFilter]
  );

  return (
    <div className="flex flex-col h-full p-6 space-y-4">
      {/* 筛选条件栏（包含上传按钮） */}
      <div className="flex items-center gap-4">
        <FileUploader />
        <div className="flex-1" />
      </div>

      {/* 筛选条件栏 */}
      <InvoiceFilter
        filter={filter}
        onFilterChange={handleFilterChange}
        onReset={resetFilter}
        selectedCount={selectedIds.length}
        selectedIds={selectedIds}
        onDeleteSelected={handleDeleteSelected}
      />

      {/* 发票列表 */}
      <div className="flex-1 bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col min-h-0">
        {loading ? (
          <div className="flex items-center justify-center flex-1">
            <Loading text="加载中..." />
          </div>
        ) : invoices.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            <div className="flex-1 overflow-auto">
              <InvoiceTable
                invoices={invoices}
                selectedIds={selectedIds}
                onSelect={toggleSelect}
                onSelectAll={toggleSelectAll}
                isAllSelected={isAllSelected}
                isPartialSelected={isPartialSelected}
                onView={handleViewInvoice}
                onDelete={handleDeleteInvoice}
              />
            </div>
            <Pagination
              page={pagination.page}
              pageSize={pagination.pageSize}
              total={pagination.total}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
            />
          </>
        )}
      </div>

      {/* 发票详情 Modal */}
      <InvoiceDetail
        invoiceId={selectedInvoiceId}
        isOpen={detailModalOpen}
        onClose={closeDetailModal}
        onUpdate={refresh}
      />

      {/* 删除确认 Modal */}
      <ConfirmModal
        isOpen={deleteConfirm.isOpen}
        onClose={closeDeleteConfirm}
        onConfirm={confirmDelete}
        title="确认删除"
        message={
          deleteConfirm.type === 'single'
            ? '确定要删除这张发票吗？此操作不可恢复。'
            : `确定要删除选中的 ${deleteConfirm.count} 张发票吗？此操作不可恢复。`
        }
        confirmText="删除"
        variant="danger"
        loading={deleting}
      />
    </div>
  );
}

/**
 * 空状态组件
 */
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center flex-1 text-gray-500 py-16">
      <FileText className="h-12 w-12 mb-3 text-gray-300" />
      <p className="text-base">暂无发票数据</p>
      <p className="text-sm mt-1">上传发票图片开始识别</p>
    </div>
  );
}
