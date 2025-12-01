import { useState, useCallback } from 'react';
import { Search, X, Filter, Trash2, Download } from 'lucide-react';
import { save } from '@tauri-apps/plugin-dialog';
import { toast } from 'sonner';
import { InvoiceType, InvoiceTypeLabels, InvoiceFilter as FilterType } from '../../types/invoice';
import { Button } from '../ui/Button';
import { exportService } from '../../services/exportService';

interface InvoiceFilterProps {
  filter: FilterType;
  onFilterChange: (filter: Partial<FilterType>) => void;
  onReset: () => void;
  selectedCount: number;
  selectedIds: string[];
  onDeleteSelected: () => void;
}

export function InvoiceFilter({
  filter,
  onFilterChange,
  onReset,
  selectedCount,
  selectedIds,
  onDeleteSelected,
}: InvoiceFilterProps) {
  const [keyword, setKeyword] = useState(filter.keyword || '');
  const [exporting, setExporting] = useState(false);

  /** 处理关键字搜索 */
  const handleSearch = useCallback(() => {
    onFilterChange({ keyword: keyword || undefined });
  }, [keyword, onFilterChange]);

  /** 按回车键搜索 */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        handleSearch();
      }
    },
    [handleSearch]
  );

  /** 清空关键字 */
  const handleClearKeyword = useCallback(() => {
    setKeyword('');
    onFilterChange({ keyword: undefined });
  }, [onFilterChange]);

  /** 处理类型筛选 */
  const handleTypeChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const value = e.target.value;
      onFilterChange({
        invoiceType: value ? (value as InvoiceType) : undefined,
      });
    },
    [onFilterChange]
  );

  /** 处理日期范围变更 */
  const handleDateFromChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onFilterChange({ dateFrom: e.target.value || undefined });
    },
    [onFilterChange]
  );

  const handleDateToChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onFilterChange({ dateTo: e.target.value || undefined });
    },
    [onFilterChange]
  );

  /** 重置所有筛选 */
  const handleReset = useCallback(() => {
    setKeyword('');
    onReset();
  }, [onReset]);

  /** 导出选中的发票 */
  const handleExportSelected = useCallback(async () => {
    if (selectedIds.length === 0) return;

    const filePath = await save({
      defaultPath: `发票导出_${new Date().toISOString().slice(0, 10)}.xlsx`,
      filters: [{ name: 'Excel 文件', extensions: ['xlsx'] }],
    });

    if (!filePath) return;

    setExporting(true);
    try {
      const result = await exportService.exportInvoices(selectedIds, filePath);
      toast.success(`成功导出 ${result.count} 条发票`);
    } catch (err) {
      const message = err instanceof Error ? err.message : '导出失败';
      toast.error(message);
    } finally {
      setExporting(false);
    }
  }, [selectedIds]);

  /** 导出全部发票（按筛选条件） */
  const handleExportAll = useCallback(async () => {
    const filePath = await save({
      defaultPath: `发票导出_全部_${new Date().toISOString().slice(0, 10)}.xlsx`,
      filters: [{ name: 'Excel 文件', extensions: ['xlsx'] }],
    });

    if (!filePath) return;

    setExporting(true);
    try {
      const result = await exportService.exportAllInvoices(filter, filePath);
      toast.success(`成功导出 ${result.count} 条发票`);
    } catch (err) {
      const message = err instanceof Error ? err.message : '导出失败';
      toast.error(message);
    } finally {
      setExporting(false);
    }
  }, [filter]);

  /** 是否有激活的筛选条件 */
  const hasActiveFilters =
    filter.invoiceType ||
    filter.dateFrom ||
    filter.dateTo ||
    filter.keyword;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex flex-wrap items-center gap-4">
        {/* 关键字搜索 */}
        <div className="flex-1 min-w-[200px] max-w-sm relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="搜索发票号、卖方、商品名..."
            className="w-full pl-9 pr-8 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          {keyword && (
            <button
              type="button"
              onClick={handleClearKeyword}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* 发票类型筛选 */}
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-400" />
          <select
            value={filter.invoiceType || ''}
            onChange={handleTypeChange}
            className="text-sm border border-gray-300 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">全部类型</option>
            {Object.entries(InvoiceTypeLabels).map(([type, label]) => (
              <option key={type} value={type}>
                {label}
              </option>
            ))}
          </select>
        </div>

        {/* 日期范围筛选 */}
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={filter.dateFrom || ''}
            onChange={handleDateFromChange}
            className="text-sm border border-gray-300 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="开始日期"
          />
          <span className="text-gray-400">至</span>
          <input
            type="date"
            value={filter.dateTo || ''}
            onChange={handleDateToChange}
            className="text-sm border border-gray-300 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="结束日期"
          />
        </div>

        {/* 清除筛选按钮 */}
        {hasActiveFilters && (
          <button
            type="button"
            onClick={handleReset}
            className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
          >
            <X className="h-4 w-4" />
            清除筛选
          </button>
        )}

        {/* 操作按钮区域 */}
        <div className="ml-auto flex items-center gap-2">
          {/* 批量操作（选中时显示） */}
          {selectedCount > 0 && (
            <>
              <span className="text-sm text-gray-600">
                已选择 {selectedCount} 项
              </span>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleExportSelected}
                loading={exporting}
              >
                <Download className="h-4 w-4 mr-1" />
                导出选中
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={onDeleteSelected}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                批量删除
              </Button>
            </>
          )}
          {/* 导出全部按钮 */}
          {selectedCount === 0 && (
            <Button
              variant="secondary"
              size="sm"
              onClick={handleExportAll}
              loading={exporting}
            >
              <Download className="h-4 w-4 mr-1" />
              导出全部
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
