import { invoke } from '@tauri-apps/api/core';
import { InvoiceFilter } from '../types/invoice';
import { ExportResult } from '../types/api';

/**
 * 导出服务 - 封装导出相关的 Tauri 命令调用
 */
export const exportService = {
  /**
   * 按 ID 列表导出发票到 Excel
   * @param ids 发票 ID 列表
   * @param outputPath 输出文件路径
   */
  async exportInvoices(ids: string[], outputPath: string): Promise<ExportResult> {
    return invoke<ExportResult>('export_invoices', {
      ids,
      output_path: outputPath,
    });
  },

  /**
   * 按筛选条件导出所有发票到 Excel
   * @param filter 筛选条件
   * @param outputPath 输出文件路径
   */
  async exportAllInvoices(
    filter: InvoiceFilter,
    outputPath: string
  ): Promise<ExportResult> {
    return invoke<ExportResult>('export_all_invoices', {
      output_path: outputPath,
      invoice_type: filter.invoiceType,
      date_from: filter.dateFrom,
      date_to: filter.dateTo,
      keyword: filter.keyword,
      category: filter.category,
    });
  },
};
