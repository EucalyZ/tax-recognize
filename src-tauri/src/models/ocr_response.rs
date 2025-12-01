use crate::models::invoice::{Invoice, InvoiceType};
use serde::{Deserialize, Serialize};

/// 百度 OCR Token 响应
#[derive(Debug, Deserialize)]
pub struct BaiduTokenResponse {
    pub access_token: String,
    pub expires_in: i64,
}

/// 百度 OCR 错误响应
#[derive(Debug, Deserialize)]
pub struct BaiduErrorResponse {
    pub error: Option<String>,
    pub error_description: Option<String>,
    pub error_code: Option<i32>,
    pub error_msg: Option<String>,
}

/// 增值税发票 OCR 响应
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VatInvoiceResponse {
    pub words_result: VatInvoiceWordsResult,
    pub words_result_num: Option<i32>,
    pub log_id: Option<i64>,
}

/// 增值税发票 OCR 字段
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct VatInvoiceWordsResult {
    #[serde(rename = "InvoiceCode")]
    pub invoice_code: Option<String>,
    #[serde(rename = "InvoiceNum")]
    pub invoice_num: Option<String>,
    #[serde(rename = "InvoiceDate")]
    pub invoice_date: Option<String>,
    #[serde(rename = "InvoiceType")]
    pub invoice_type: Option<String>,
    #[serde(rename = "CommodityName")]
    pub commodity_name: Option<Vec<CommodityItem>>,
    #[serde(rename = "CommodityAmount")]
    pub commodity_amount: Option<Vec<CommodityItem>>,
    #[serde(rename = "TotalAmount")]
    pub total_amount: Option<String>,
    #[serde(rename = "TotalTax")]
    pub total_tax: Option<String>,
    #[serde(rename = "AmountInFiguers")]
    pub amount_in_figures: Option<String>,
    #[serde(rename = "SellerName")]
    pub seller_name: Option<String>,
    #[serde(rename = "SellerRegisterNum")]
    pub seller_register_num: Option<String>,
    #[serde(rename = "SellerAddress")]
    pub seller_address: Option<String>,
    #[serde(rename = "SellerBank")]
    pub seller_bank: Option<String>,
    #[serde(rename = "PurchaserName")]
    pub purchaser_name: Option<String>,
    #[serde(rename = "PurchaserRegisterNum")]
    pub purchaser_register_num: Option<String>,
    #[serde(rename = "PurchaserAddress")]
    pub purchaser_address: Option<String>,
    #[serde(rename = "PurchaserBank")]
    pub purchaser_bank: Option<String>,
    #[serde(rename = "CheckCode")]
    pub check_code: Option<String>,
    #[serde(rename = "MachineCode")]
    pub machine_code: Option<String>,
    #[serde(rename = "Remarks")]
    pub remarks: Option<String>,
}

/// 商品项
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CommodityItem {
    pub word: String,
    pub row: Option<String>,
}

impl VatInvoiceResponse {
    /// 转换为 Invoice 模型
    pub fn to_invoice(
        &self,
        file_path: Option<&str>,
        file_type: Option<&str>,
        raw_json: &str,
    ) -> Invoice {
        let wr = &self.words_result;
        let invoice_type = Self::parse_invoice_type(wr.invoice_type.as_deref());
        let total = Self::parse_amount(wr.amount_in_figures.as_deref())
            .or_else(|| Self::parse_amount(wr.total_amount.as_deref()))
            .unwrap_or(0.0);

        let mut invoice = Invoice::new(invoice_type, total);

        invoice.invoice_code = wr.invoice_code.clone();
        invoice.invoice_number = wr.invoice_num.clone();
        invoice.invoice_date = Self::parse_date(wr.invoice_date.as_deref());
        invoice.amount_without_tax = Self::parse_amount(wr.total_amount.as_deref());
        invoice.tax_amount = Self::parse_amount(wr.total_tax.as_deref());
        invoice.buyer_name = wr.purchaser_name.clone();
        invoice.buyer_tax_number = wr.purchaser_register_num.clone();
        invoice.seller_name = wr.seller_name.clone();
        invoice.seller_tax_number = wr.seller_register_num.clone();
        invoice.commodity_name = Self::join_commodity_names(wr.commodity_name.as_ref());
        invoice.commodity_detail = Self::commodity_to_json(wr.commodity_name.as_ref());
        invoice.check_code = wr.check_code.clone();
        invoice.machine_code = wr.machine_code.clone();
        invoice.original_file_path = file_path.map(String::from);
        invoice.file_type = file_type.map(String::from);
        invoice.ocr_raw_response = Some(raw_json.to_string());
        invoice.remark = wr.remarks.clone();

        invoice
    }

    fn parse_invoice_type(type_str: Option<&str>) -> InvoiceType {
        match type_str {
            Some(s) if s.contains("专用") => InvoiceType::VatInvoice,
            Some(s) if s.contains("电子") => InvoiceType::VatElectronicInvoice,
            Some(s) if s.contains("卷") => InvoiceType::VatRollInvoice,
            Some(s) if s.contains("普通") => InvoiceType::VatCommonInvoice,
            _ => InvoiceType::VatCommonInvoice,
        }
    }

    fn parse_amount(s: Option<&str>) -> Option<f64> {
        s.and_then(|v| {
            let cleaned: String = v
                .chars()
                .filter(|c| c.is_ascii_digit() || *c == '.' || *c == '-')
                .collect();
            cleaned.parse().ok()
        })
    }

    fn parse_date(date_str: Option<&str>) -> Option<String> {
        date_str.map(|s| {
            s.replace("年", "-")
                .replace("月", "-")
                .replace("日", "")
                .trim()
                .to_string()
        })
    }

    fn join_commodity_names(items: Option<&Vec<CommodityItem>>) -> Option<String> {
        items.map(|list| {
            list.iter()
                .map(|item| item.word.as_str())
                .collect::<Vec<_>>()
                .join("; ")
        })
    }

    fn commodity_to_json(items: Option<&Vec<CommodityItem>>) -> Option<String> {
        items.and_then(|list| serde_json::to_string(list).ok())
    }
}
