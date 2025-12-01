/**
 * 发票类型枚举（与后端 snake_case 格式对应）
 */
export enum InvoiceType {
  VatInvoice = 'vat_invoice',
  VatCommonInvoice = 'vat_common_invoice',
  VatElectronicInvoice = 'vat_electronic_invoice',
  VatRollInvoice = 'vat_roll_invoice',
  TrainTicket = 'train_ticket',
  TaxiTicket = 'taxi_ticket',
  FlightItinerary = 'flight_itinerary',
  TollInvoice = 'toll_invoice',
  QuotaInvoice = 'quota_invoice',
  Other = 'other',
}

/**
 * 发票类型显示名称映射
 */
export const InvoiceTypeLabels: Record<InvoiceType, string> = {
  [InvoiceType.VatInvoice]: '增值税专用发票',
  [InvoiceType.VatCommonInvoice]: '增值税普通发票',
  [InvoiceType.VatElectronicInvoice]: '增值税电子普通发票',
  [InvoiceType.VatRollInvoice]: '增值税卷式发票',
  [InvoiceType.TrainTicket]: '火车票',
  [InvoiceType.TaxiTicket]: '出租车票',
  [InvoiceType.FlightItinerary]: '机票行程单',
  [InvoiceType.TollInvoice]: '过路费发票',
  [InvoiceType.QuotaInvoice]: '定额发票',
  [InvoiceType.Other]: '其他',
};

/**
 * 发票数据模型
 */
export interface Invoice {
  id: string;
  invoiceType: InvoiceType;
  invoiceCode?: string;
  invoiceNumber?: string;
  invoiceDate?: string;
  amountWithoutTax?: number;
  taxAmount?: number;
  totalAmount: number;
  buyerName?: string;
  buyerTaxNumber?: string;
  sellerName?: string;
  sellerTaxNumber?: string;
  commodityName?: string;
  commodityDetail?: string;
  checkCode?: string;
  machineCode?: string;
  originalFilePath?: string;
  fileType?: string;
  ocrRawResponse?: string;
  ocrConfidence?: number;
  category?: string;
  remark?: string;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * 发票筛选条件
 */
export interface InvoiceFilter {
  invoiceType?: InvoiceType;
  dateFrom?: string;
  dateTo?: string;
  amountMin?: number;
  amountMax?: number;
  keyword?: string;
  category?: string;
}

/**
 * 分页信息
 */
export interface Pagination {
  page: number;
  pageSize: number;
  total: number;
}

/**
 * 分页结果
 */
export interface PagedResult<T> {
  data: T[];
  pagination: Pagination;
}
