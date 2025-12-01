import { useMemo, useCallback, useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  createColumnHelper,
  SortingState,
} from '@tanstack/react-table';
import { Trash2, Eye } from 'lucide-react';
import { Invoice, InvoiceType, InvoiceTypeLabels } from '../../types/invoice';
import { formatAmount, formatDate, truncateText } from '../../utils/format';
import { SortableHeader } from './TableComponents';

interface InvoiceTableProps {
  invoices: Invoice[];
  selectedIds: string[];
  onSelect: (id: string) => void;
  onSelectAll: () => void;
  isAllSelected: boolean;
  isPartialSelected: boolean;
  onView: (id: string) => void;
  onDelete: (id: string) => void;
}

const columnHelper = createColumnHelper<Invoice>();

export function InvoiceTable({
  invoices,
  selectedIds,
  onSelect,
  onSelectAll,
  isAllSelected,
  isPartialSelected,
  onView,
  onDelete,
}: InvoiceTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);

  /** 获取发票类型标签 */
  const getTypeLabel = useCallback((type: InvoiceType) => {
    return InvoiceTypeLabels[type] || type;
  }, []);

  /** 表格列定义 */
  const columns = useMemo(
    () => [
      // 选择列
      columnHelper.display({
        id: 'select',
        header: () => (
          <input
            type="checkbox"
            checked={isAllSelected}
            ref={(el) => {
              if (el) el.indeterminate = isPartialSelected;
            }}
            onChange={onSelectAll}
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
        ),
        cell: ({ row }) => (
          <input
            type="checkbox"
            checked={selectedIds.includes(row.original.id)}
            onChange={() => onSelect(row.original.id)}
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
        ),
        size: 40,
      }),

      // 日期列
      columnHelper.accessor('invoiceDate', {
        header: ({ column }) => (
          <SortableHeader
            label="日期"
            sorted={column.getIsSorted()}
            onSort={() => column.toggleSorting()}
          />
        ),
        cell: (info) => (
          <span className="text-gray-700">
            {formatDate(info.getValue(), 'short')}
          </span>
        ),
        size: 110,
      }),

      // 类型列
      columnHelper.accessor('invoiceType', {
        header: ({ column }) => (
          <SortableHeader
            label="类型"
            sorted={column.getIsSorted()}
            onSort={() => column.toggleSorting()}
          />
        ),
        cell: (info) => (
          <span className="inline-flex px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-700 rounded">
            {getTypeLabel(info.getValue())}
          </span>
        ),
        size: 150,
      }),

      // 金额列
      columnHelper.accessor('totalAmount', {
        header: ({ column }) => (
          <SortableHeader
            label="金额"
            sorted={column.getIsSorted()}
            onSort={() => column.toggleSorting()}
          />
        ),
        cell: (info) => (
          <span className="font-medium text-gray-900">
            {formatAmount(info.getValue())}
          </span>
        ),
        size: 120,
      }),

      // 商品名称列
      columnHelper.accessor('commodityName', {
        header: '商品/服务名称',
        cell: (info) => (
          <span className="text-gray-700" title={info.getValue() || ''}>
            {truncateText(info.getValue(), 20)}
          </span>
        ),
        size: 180,
      }),

      // 卖方名称列
      columnHelper.accessor('sellerName', {
        header: '卖方名称',
        cell: (info) => (
          <span className="text-gray-700" title={info.getValue() || ''}>
            {truncateText(info.getValue(), 16)}
          </span>
        ),
        size: 150,
      }),

      // 操作列
      columnHelper.display({
        id: 'actions',
        header: '操作',
        cell: ({ row }) => (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onView(row.original.id)}
              className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
              title="查看详情"
            >
              <Eye className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => onDelete(row.original.id)}
              className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
              title="删除"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ),
        size: 100,
      }),
    ],
    [
      selectedIds,
      isAllSelected,
      isPartialSelected,
      onSelect,
      onSelectAll,
      onView,
      onDelete,
      getTypeLabel,
    ]
  );

  const table = useReactTable({
    data: invoices,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  if (invoices.length === 0) {
    return null;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-200">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  style={{ width: header.getSize() }}
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody className="divide-y divide-gray-100">
          {table.getRowModel().rows.map((row) => (
            <tr
              key={row.id}
              className={`
                hover:bg-gray-50 transition-colors
                ${selectedIds.includes(row.original.id) ? 'bg-blue-50' : ''}
              `}
            >
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} className="px-4 py-3 whitespace-nowrap">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Re-export Pagination from TableComponents
export { Pagination } from './TableComponents';
