use crate::db::invoice_repo;
use crate::models::invoice::{Invoice, InvoiceType};
use crate::services::invoice::{InvoiceService, RecognizeResult};

/// 获取发票详情
#[tauri::command]
pub fn get_invoice(id: String) -> Result<Option<Invoice>, String> {
    invoice_repo::find_by_id(&id).map_err(|e| e.to_string())
}

/// 删除发票
#[tauri::command]
pub fn delete_invoice(id: String) -> Result<bool, String> {
    invoice_repo::delete(&id).map_err(|e| e.to_string())
}

/// 批量删除发票
#[tauri::command]
pub fn delete_invoices(ids: Vec<String>) -> Result<u32, String> {
    invoice_repo::delete_batch(&ids).map_err(|e| e.to_string())
}

/// 识别发票
#[tauri::command]
pub async fn recognize_invoice(
    file_path: String,
    invoice_type: Option<String>,
) -> Result<Invoice, String> {
    let service = InvoiceService::new();
    let inv_type = invoice_type.map(|s| InvoiceType::from_str(&s));
    service
        .recognize_invoice(&file_path, inv_type)
        .await
        .map_err(|e| e.to_string())
}

/// 识别并保存发票
#[tauri::command]
pub async fn recognize_and_save_invoice(
    file_path: String,
    invoice_type: Option<String>,
) -> Result<Invoice, String> {
    let service = InvoiceService::new();
    let inv_type = invoice_type.map(|s| InvoiceType::from_str(&s));
    service
        .recognize_and_save(&file_path, inv_type)
        .await
        .map_err(|e| e.to_string())
}

/// 批量识别发票
#[tauri::command]
pub async fn recognize_invoices_batch(
    file_paths: Vec<String>,
    invoice_type: Option<String>,
) -> Result<Vec<RecognizeResult>, String> {
    let service = InvoiceService::new();
    let inv_type = invoice_type.map(|s| InvoiceType::from_str(&s));
    Ok(service.recognize_batch(&file_paths, inv_type).await)
}

/// 测试 OCR 连接
#[tauri::command]
pub async fn test_ocr_connection(
    api_key: String,
    secret_key: String,
) -> Result<bool, String> {
    let service = InvoiceService::new();
    service
        .test_connection(&api_key, &secret_key)
        .await
        .map_err(|e| e.to_string())
}

/// 更新发票
#[tauri::command]
pub fn update_invoice(invoice: Invoice) -> Result<(), String> {
    invoice_repo::update(&invoice).map_err(|e| e.to_string())
}

/// 获取发票列表
#[tauri::command]
pub fn get_invoices(
    page: u32,
    page_size: u32,
    invoice_type: Option<String>,
    date_from: Option<String>,
    date_to: Option<String>,
    keyword: Option<String>,
) -> Result<crate::db::invoice_repo::PagedResult<Invoice>, String> {
    let filter = crate::db::invoice_repo::InvoiceFilter {
        invoice_type: invoice_type.map(|s| InvoiceType::from_str(&s)),
        date_from,
        date_to,
        amount_min: None,
        amount_max: None,
        keyword,
        category: None,
    };
    let pagination = crate::db::invoice_repo::Pagination { page, page_size };
    invoice_repo::find_all(filter, pagination).map_err(|e| e.to_string())
}
