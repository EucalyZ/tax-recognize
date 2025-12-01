use serde::{Deserialize, Serialize};

use crate::models::invoice::InvoiceType;

/// 筛选条件
#[derive(Debug, Clone, Default)]
pub struct InvoiceFilter {
    pub invoice_type: Option<InvoiceType>,
    pub date_from: Option<String>,
    pub date_to: Option<String>,
    pub amount_min: Option<f64>,
    pub amount_max: Option<f64>,
    pub keyword: Option<String>,
    pub category: Option<String>,
}

/// 分页参数
#[derive(Debug, Clone)]
pub struct Pagination {
    pub page: u32,
    pub page_size: u32,
}

/// 分页结果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PagedResult<T> {
    pub items: Vec<T>,
    pub total: u32,
    pub page: u32,
    pub page_size: u32,
    pub total_pages: u32,
}
