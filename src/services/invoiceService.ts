import { invoke } from '@tauri-apps/api/core';
import { Invoice, InvoiceFilter, PagedResult } from '../types/invoice';

/**
 * 识别结果
 */
export interface RecognizeResult {
  filePath: string;
  success: boolean;
  invoice?: Invoice;
  error?: string;
}

/**
 * 后端返回的分页结果（snake_case）
 */
interface BackendPagedResult {
  items: BackendInvoice[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

/**
 * 后端发票数据格式（snake_case）
 */
interface BackendInvoice {
  id: string;
  invoice_type: string;
  invoice_code?: string;
  invoice_number?: string;
  invoice_date?: string;
  amount_without_tax?: number;
  tax_amount?: number;
  total_amount: number;
  buyer_name?: string;
  buyer_tax_number?: string;
  seller_name?: string;
  seller_tax_number?: string;
  commodity_name?: string;
  commodity_detail?: string;
  check_code?: string;
  machine_code?: string;
  original_file_path?: string;
  file_type?: string;
  ocr_raw_response?: string;
  ocr_confidence?: number;
  category?: string;
  remark?: string;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * 将后端发票数据转换为前端格式
 */
function transformInvoice(backend: BackendInvoice): Invoice {
  return {
    id: backend.id,
    invoiceType: backend.invoice_type as Invoice['invoiceType'],
    invoiceCode: backend.invoice_code,
    invoiceNumber: backend.invoice_number,
    invoiceDate: backend.invoice_date,
    amountWithoutTax: backend.amount_without_tax,
    taxAmount: backend.tax_amount,
    totalAmount: backend.total_amount,
    buyerName: backend.buyer_name,
    buyerTaxNumber: backend.buyer_tax_number,
    sellerName: backend.seller_name,
    sellerTaxNumber: backend.seller_tax_number,
    commodityName: backend.commodity_name,
    commodityDetail: backend.commodity_detail,
    checkCode: backend.check_code,
    machineCode: backend.machine_code,
    originalFilePath: backend.original_file_path,
    fileType: backend.file_type,
    ocrRawResponse: backend.ocr_raw_response,
    ocrConfidence: backend.ocr_confidence,
    category: backend.category,
    remark: backend.remark,
    isVerified: backend.is_verified,
    createdAt: backend.created_at,
    updatedAt: backend.updated_at,
  };
}

/**
 * 将前端发票数据转换为后端格式
 */
function transformInvoiceToBackend(frontend: Invoice): BackendInvoice {
  return {
    id: frontend.id,
    invoice_type: frontend.invoiceType,
    invoice_code: frontend.invoiceCode,
    invoice_number: frontend.invoiceNumber,
    invoice_date: frontend.invoiceDate,
    amount_without_tax: frontend.amountWithoutTax,
    tax_amount: frontend.taxAmount,
    total_amount: frontend.totalAmount,
    buyer_name: frontend.buyerName,
    buyer_tax_number: frontend.buyerTaxNumber,
    seller_name: frontend.sellerName,
    seller_tax_number: frontend.sellerTaxNumber,
    commodity_name: frontend.commodityName,
    commodity_detail: frontend.commodityDetail,
    check_code: frontend.checkCode,
    machine_code: frontend.machineCode,
    original_file_path: frontend.originalFilePath,
    file_type: frontend.fileType,
    ocr_raw_response: frontend.ocrRawResponse,
    ocr_confidence: frontend.ocrConfidence,
    category: frontend.category,
    remark: frontend.remark,
    is_verified: frontend.isVerified,
    created_at: frontend.createdAt,
    updated_at: frontend.updatedAt,
  };
}

/**
 * 发票服务 - 封装发票相关的 Tauri 命令调用
 */
export const invoiceService = {
  /**
   * 识别并保存发票
   * @param filePath 文件路径
   * @param invoiceType 发票类型（可选，自动识别时不传）
   */
  async recognizeAndSaveInvoice(
    filePath: string,
    invoiceType?: string
  ): Promise<Invoice> {
    const result = await invoke<BackendInvoice>('recognize_and_save_invoice', {
      filePath,
      invoiceType,
    });
    return transformInvoice(result);
  },

  /**
   * 批量识别发票
   * @param filePaths 文件路径列表
   * @param invoiceType 发票类型（可选）
   */
  async recognizeInvoicesBatch(
    filePaths: string[],
    invoiceType?: string
  ): Promise<RecognizeResult[]> {
    interface BackendRecognizeResult {
      file_path: string;
      success: boolean;
      invoice?: BackendInvoice;
      error?: string;
    }
    const results = await invoke<BackendRecognizeResult[]>('recognize_invoices_batch', {
      filePaths,
      invoiceType,
    });
    return results.map((r) => ({
      filePath: r.file_path,
      success: r.success,
      invoice: r.invoice ? transformInvoice(r.invoice) : undefined,
      error: r.error,
    }));
  },

  /**
   * 获取发票列表
   * @param filter 筛选条件
   * @param page 页码（从 1 开始）
   * @param pageSize 每页数量
   */
  async getInvoices(
    filter: InvoiceFilter,
    page: number,
    pageSize: number
  ): Promise<PagedResult<Invoice>> {
    const result = await invoke<BackendPagedResult>('get_invoices', {
      page,
      pageSize,
      invoiceType: filter.invoiceType,
      dateFrom: filter.dateFrom,
      dateTo: filter.dateTo,
      keyword: filter.keyword,
    });
    return {
      data: result.items.map(transformInvoice),
      pagination: {
        page: result.page,
        pageSize: result.page_size,
        total: result.total,
      },
    };
  },

  /**
   * 获取单个发票详情
   * @param id 发票 ID
   */
  async getInvoice(id: string): Promise<Invoice | null> {
    const result = await invoke<BackendInvoice | null>('get_invoice', { id });
    return result ? transformInvoice(result) : null;
  },

  /**
   * 更新发票
   * @param invoice 发票数据
   */
  async updateInvoice(invoice: Invoice): Promise<void> {
    return invoke('update_invoice', { invoice: transformInvoiceToBackend(invoice) });
  },

  /**
   * 删除发票
   * @param id 发票 ID
   */
  async deleteInvoice(id: string): Promise<void> {
    return invoke('delete_invoice', { id });
  },

  /**
   * 批量删除发票
   * @param ids 发票 ID 列表
   */
  async deleteInvoices(ids: string[]): Promise<void> {
    return invoke('delete_invoices', { ids });
  },

  /**
   * 测试 OCR 连接
   * @param apiKey API Key
   * @param secretKey Secret Key
   */
  async testOcrConnection(apiKey: string, secretKey: string): Promise<boolean> {
    return invoke<boolean>('test_ocr_connection', {
      apiKey,
      secretKey,
    });
  },
};
