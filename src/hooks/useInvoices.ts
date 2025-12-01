import { useEffect, useCallback } from 'react';
import { useInvoiceStore } from '../stores/invoiceStore';
import { InvoiceFilter } from '../types/invoice';

/**
 * 发票数据管理 Hook
 * 封装发票列表的获取、筛选、分页等操作
 */
export function useInvoices() {
  const {
    invoices,
    selectedIds,
    filter,
    pagination,
    loading,
    error,
    fetchInvoices,
    updateFilter,
    resetFilter,
    setPage,
    setPageSize,
    selectInvoice,
    deselectInvoice,
    selectAll,
    clearSelection,
    clearError,
  } = useInvoiceStore();

  // 初始加载
  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  // 筛选条件或分页变化时重新获取
  useEffect(() => {
    fetchInvoices();
  }, [filter, pagination.page, pagination.pageSize, fetchInvoices]);

  // 搜索
  const search = useCallback(
    (keyword: string) => {
      updateFilter({ keyword: keyword || undefined });
    },
    [updateFilter]
  );

  // 按类型筛选
  const filterByType = useCallback(
    (invoiceType: InvoiceFilter['invoiceType']) => {
      updateFilter({ invoiceType });
    },
    [updateFilter]
  );

  // 按日期范围筛选
  const filterByDateRange = useCallback(
    (dateFrom?: string, dateTo?: string) => {
      updateFilter({ dateFrom, dateTo });
    },
    [updateFilter]
  );

  // 按金额范围筛选
  const filterByAmountRange = useCallback(
    (amountMin?: number, amountMax?: number) => {
      updateFilter({ amountMin, amountMax });
    },
    [updateFilter]
  );

  // 切换选中状态
  const toggleSelect = useCallback(
    (id: string) => {
      if (selectedIds.includes(id)) {
        deselectInvoice(id);
      } else {
        selectInvoice(id);
      }
    },
    [selectedIds, selectInvoice, deselectInvoice]
  );

  // 是否全选
  const isAllSelected = invoices.length > 0 && selectedIds.length === invoices.length;

  // 是否部分选中
  const isPartialSelected = selectedIds.length > 0 && selectedIds.length < invoices.length;

  // 切换全选
  const toggleSelectAll = useCallback(() => {
    if (isAllSelected) {
      clearSelection();
    } else {
      selectAll();
    }
  }, [isAllSelected, selectAll, clearSelection]);

  return {
    // 数据
    invoices,
    selectedIds,
    filter,
    pagination,
    loading,
    error,

    // 选择状态
    isAllSelected,
    isPartialSelected,

    // 操作
    refresh: fetchInvoices,
    search,
    filterByType,
    filterByDateRange,
    filterByAmountRange,
    resetFilter,
    setPage,
    setPageSize,
    toggleSelect,
    toggleSelectAll,
    clearSelection,
    clearError,
  };
}
