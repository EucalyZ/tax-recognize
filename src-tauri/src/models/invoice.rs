use serde::{Deserialize, Serialize};

/// 发票类型枚举
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum InvoiceType {
    /// 增值税专用发票
    VatInvoice,
    /// 增值税普通发票
    VatCommonInvoice,
    /// 增值税电子普通发票
    VatElectronicInvoice,
    /// 增值税卷式发票
    VatRollInvoice,
    /// 火车票
    TrainTicket,
    /// 出租车票
    TaxiTicket,
    /// 机票行程单
    FlightItinerary,
    /// 过路费发票
    TollInvoice,
    /// 定额发票
    QuotaInvoice,
    /// 其他
    Other,
}

impl InvoiceType {
    /// 从字符串解析发票类型
    pub fn from_str(s: &str) -> Self {
        match s.to_lowercase().as_str() {
            "vat_invoice" => InvoiceType::VatInvoice,
            "vat_common_invoice" => InvoiceType::VatCommonInvoice,
            "vat_electronic_invoice" => InvoiceType::VatElectronicInvoice,
            "vat_roll_invoice" => InvoiceType::VatRollInvoice,
            "train_ticket" => InvoiceType::TrainTicket,
            "taxi_ticket" => InvoiceType::TaxiTicket,
            "flight_itinerary" => InvoiceType::FlightItinerary,
            "toll_invoice" => InvoiceType::TollInvoice,
            "quota_invoice" => InvoiceType::QuotaInvoice,
            _ => InvoiceType::Other,
        }
    }

    /// 转换为数据库存储字符串
    pub fn as_str(&self) -> &'static str {
        match self {
            InvoiceType::VatInvoice => "vat_invoice",
            InvoiceType::VatCommonInvoice => "vat_common_invoice",
            InvoiceType::VatElectronicInvoice => "vat_electronic_invoice",
            InvoiceType::VatRollInvoice => "vat_roll_invoice",
            InvoiceType::TrainTicket => "train_ticket",
            InvoiceType::TaxiTicket => "taxi_ticket",
            InvoiceType::FlightItinerary => "flight_itinerary",
            InvoiceType::TollInvoice => "toll_invoice",
            InvoiceType::QuotaInvoice => "quota_invoice",
            InvoiceType::Other => "other",
        }
    }

    /// 获取中文显示名称
    pub fn display_name(&self) -> &'static str {
        match self {
            InvoiceType::VatInvoice => "增值税专用发票",
            InvoiceType::VatCommonInvoice => "增值税普通发票",
            InvoiceType::VatElectronicInvoice => "增值税电子普通发票",
            InvoiceType::VatRollInvoice => "增值税卷式发票",
            InvoiceType::TrainTicket => "火车票",
            InvoiceType::TaxiTicket => "出租车票",
            InvoiceType::FlightItinerary => "机票行程单",
            InvoiceType::TollInvoice => "过路费发票",
            InvoiceType::QuotaInvoice => "定额发票",
            InvoiceType::Other => "其他",
        }
    }
}

/// 发票数据模型
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Invoice {
    /// UUID 主键
    pub id: String,
    /// 发票类型
    pub invoice_type: InvoiceType,
    /// 发票代码
    pub invoice_code: Option<String>,
    /// 发票号码
    pub invoice_number: Option<String>,
    /// 开票日期 (YYYY-MM-DD)
    pub invoice_date: Option<String>,
    /// 不含税金额
    pub amount_without_tax: Option<f64>,
    /// 税额
    pub tax_amount: Option<f64>,
    /// 价税合计（主要金额字段）
    pub total_amount: f64,
    /// 购买方名称
    pub buyer_name: Option<String>,
    /// 购买方税号
    pub buyer_tax_number: Option<String>,
    /// 销售方名称
    pub seller_name: Option<String>,
    /// 销售方税号
    pub seller_tax_number: Option<String>,
    /// 商品名称（摘要）
    pub commodity_name: Option<String>,
    /// 商品明细 JSON
    pub commodity_detail: Option<String>,
    /// 校验码
    pub check_code: Option<String>,
    /// 机器编号
    pub machine_code: Option<String>,
    /// 原始文件路径
    pub original_file_path: Option<String>,
    /// 文件类型 (image/pdf)
    pub file_type: Option<String>,
    /// OCR 原始响应 JSON
    pub ocr_raw_response: Option<String>,
    /// OCR 置信度
    pub ocr_confidence: Option<f64>,
    /// 分类标签
    pub category: Option<String>,
    /// 备注
    pub remark: Option<String>,
    /// 是否已核验
    pub is_verified: bool,
    /// 创建时间 ISO8601
    pub created_at: String,
    /// 更新时间 ISO8601
    pub updated_at: String,
}

impl Invoice {
    /// 创建新发票
    pub fn new(invoice_type: InvoiceType, total_amount: f64) -> Self {
        let now = chrono::Utc::now().to_rfc3339();
        Self {
            id: uuid::Uuid::new_v4().to_string(),
            invoice_type,
            invoice_code: None,
            invoice_number: None,
            invoice_date: None,
            amount_without_tax: None,
            tax_amount: None,
            total_amount,
            buyer_name: None,
            buyer_tax_number: None,
            seller_name: None,
            seller_tax_number: None,
            commodity_name: None,
            commodity_detail: None,
            check_code: None,
            machine_code: None,
            original_file_path: None,
            file_type: None,
            ocr_raw_response: None,
            ocr_confidence: None,
            category: None,
            remark: None,
            is_verified: false,
            created_at: now.clone(),
            updated_at: now,
        }
    }
}
