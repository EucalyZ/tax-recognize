use crate::db::invoice_repo::{self, InvoiceFilter};
use crate::models::invoice::InvoiceType;
use crate::services::export::ExportService;
use serde::{Deserialize, Serialize};
use std::path::Path;

/// 导出结果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExportResult {
    pub file_path: String,
    pub count: u32,
}

/// 按 ID 列表导出发票到 Excel
#[tauri::command]
pub fn export_invoices(ids: Vec<String>, output_path: String) -> Result<ExportResult, String> {
    let invoices = invoice_repo::find_by_ids(&ids).map_err(|e| e.to_string())?;

    if invoices.is_empty() {
        return Err("没有找到要导出的发票".to_string());
    }

    let path = Path::new(&output_path);
    ExportService::export_to_excel(&invoices, path).map_err(|e| e.to_string())?;

    Ok(ExportResult {
        file_path: output_path,
        count: invoices.len() as u32,
    })
}

/// 按筛选条件导出所有发票到 Excel
#[tauri::command]
pub fn export_all_invoices(
    output_path: String,
    invoice_type: Option<String>,
    date_from: Option<String>,
    date_to: Option<String>,
    keyword: Option<String>,
    category: Option<String>,
) -> Result<ExportResult, String> {
    let filter = InvoiceFilter {
        invoice_type: invoice_type.map(|s| InvoiceType::from_str(&s)),
        date_from,
        date_to,
        amount_min: None,
        amount_max: None,
        keyword,
        category,
    };

    let invoices = invoice_repo::find_all_for_export(filter).map_err(|e| e.to_string())?;

    if invoices.is_empty() {
        return Err("没有找到要导出的发票".to_string());
    }

    let path = Path::new(&output_path);
    ExportService::export_to_excel(&invoices, path).map_err(|e| e.to_string())?;

    Ok(ExportResult {
        file_path: output_path,
        count: invoices.len() as u32,
    })
}
