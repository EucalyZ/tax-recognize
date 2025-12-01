use rusqlite::params;
use serde::{Deserialize, Serialize};

use crate::error::AppResult;
use crate::models::invoice::{Invoice, InvoiceType};

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

/// 插入发票
pub fn insert(invoice: &Invoice) -> AppResult<()> {
    let conn = super::get_connection()?;

    conn.execute(
        "INSERT INTO invoices (
            id, invoice_type, invoice_code, invoice_number, invoice_date,
            amount_without_tax, tax_amount, total_amount,
            buyer_name, buyer_tax_number, seller_name, seller_tax_number,
            commodity_name, commodity_detail, check_code, machine_code,
            original_file_path, file_type, ocr_raw_response, ocr_confidence,
            category, remark, is_verified, created_at, updated_at
        ) VALUES (
            ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10,
            ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20,
            ?21, ?22, ?23, ?24, ?25
        )",
        params![
            invoice.id,
            invoice.invoice_type.as_str(),
            invoice.invoice_code,
            invoice.invoice_number,
            invoice.invoice_date,
            invoice.amount_without_tax,
            invoice.tax_amount,
            invoice.total_amount,
            invoice.buyer_name,
            invoice.buyer_tax_number,
            invoice.seller_name,
            invoice.seller_tax_number,
            invoice.commodity_name,
            invoice.commodity_detail,
            invoice.check_code,
            invoice.machine_code,
            invoice.original_file_path,
            invoice.file_type,
            invoice.ocr_raw_response,
            invoice.ocr_confidence,
            invoice.category,
            invoice.remark,
            invoice.is_verified as i32,
            invoice.created_at,
            invoice.updated_at,
        ],
    )?;

    Ok(())
}

/// 按 ID 查询
pub fn find_by_id(id: &str) -> AppResult<Option<Invoice>> {
    let conn = super::get_connection()?;
    let mut stmt = conn.prepare("SELECT * FROM invoices WHERE id = ?")?;

    let result = stmt.query_row(params![id], row_to_invoice);

    match result {
        Ok(invoice) => Ok(Some(invoice)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(e.into()),
    }
}

/// 查询发票列表（分页+筛选）
pub fn find_all(filter: InvoiceFilter, pagination: Pagination) -> AppResult<PagedResult<Invoice>> {
    let conn = super::get_connection()?;
    let (where_clause, params) = build_where_clause(&filter);

    let count_sql = format!("SELECT COUNT(*) FROM invoices {}", where_clause);
    let param_refs: Vec<&dyn rusqlite::ToSql> = params.iter().map(|s| s as &dyn rusqlite::ToSql).collect();
    let total: u32 = conn.query_row(&count_sql, param_refs.as_slice(), |row| row.get(0))?;

    let offset = (pagination.page.saturating_sub(1)) * pagination.page_size;
    let query_sql = format!(
        "SELECT * FROM invoices {} ORDER BY created_at DESC LIMIT {} OFFSET {}",
        where_clause, pagination.page_size, offset
    );

    let mut stmt = conn.prepare(&query_sql)?;
    let invoices = stmt
        .query_map(param_refs.as_slice(), row_to_invoice)?
        .filter_map(|r| r.ok())
        .collect();

    let total_pages = if total == 0 { 0 } else { (total + pagination.page_size - 1) / pagination.page_size };

    Ok(PagedResult {
        items: invoices,
        total,
        page: pagination.page,
        page_size: pagination.page_size,
        total_pages,
    })
}

/// 更新发票
pub fn update(invoice: &Invoice) -> AppResult<()> {
    let conn = super::get_connection()?;
    let now = chrono::Utc::now().to_rfc3339();

    conn.execute(
        "UPDATE invoices SET
            invoice_type = ?2, invoice_code = ?3, invoice_number = ?4, invoice_date = ?5,
            amount_without_tax = ?6, tax_amount = ?7, total_amount = ?8,
            buyer_name = ?9, buyer_tax_number = ?10, seller_name = ?11, seller_tax_number = ?12,
            commodity_name = ?13, commodity_detail = ?14, check_code = ?15, machine_code = ?16,
            category = ?17, remark = ?18, is_verified = ?19, updated_at = ?20
        WHERE id = ?1",
        params![
            invoice.id,
            invoice.invoice_type.as_str(),
            invoice.invoice_code,
            invoice.invoice_number,
            invoice.invoice_date,
            invoice.amount_without_tax,
            invoice.tax_amount,
            invoice.total_amount,
            invoice.buyer_name,
            invoice.buyer_tax_number,
            invoice.seller_name,
            invoice.seller_tax_number,
            invoice.commodity_name,
            invoice.commodity_detail,
            invoice.check_code,
            invoice.machine_code,
            invoice.category,
            invoice.remark,
            invoice.is_verified as i32,
            now,
        ],
    )?;

    Ok(())
}

/// 删除发票
pub fn delete(id: &str) -> AppResult<bool> {
    let conn = super::get_connection()?;
    let affected = conn.execute("DELETE FROM invoices WHERE id = ?", params![id])?;
    Ok(affected > 0)
}

/// 批量删除
pub fn delete_batch(ids: &[String]) -> AppResult<u32> {
    let conn = super::get_connection()?;
    let placeholders: Vec<&str> = ids.iter().map(|_| "?").collect();
    let sql = format!(
        "DELETE FROM invoices WHERE id IN ({})",
        placeholders.join(", ")
    );

    let params: Vec<&dyn rusqlite::ToSql> = ids.iter().map(|s| s as &dyn rusqlite::ToSql).collect();
    let affected = conn.execute(&sql, params.as_slice())?;
    Ok(affected as u32)
}

/// 按 ID 列表查询发票
pub fn find_by_ids(ids: &[String]) -> AppResult<Vec<Invoice>> {
    if ids.is_empty() {
        return Ok(Vec::new());
    }

    let conn = super::get_connection()?;
    let placeholders: Vec<&str> = ids.iter().map(|_| "?").collect();
    let sql = format!(
        "SELECT * FROM invoices WHERE id IN ({}) ORDER BY created_at DESC",
        placeholders.join(", ")
    );

    let params: Vec<&dyn rusqlite::ToSql> = ids.iter().map(|s| s as &dyn rusqlite::ToSql).collect();
    let mut stmt = conn.prepare(&sql)?;
    let invoices = stmt
        .query_map(params.as_slice(), row_to_invoice)?
        .filter_map(|r| r.ok())
        .collect();

    Ok(invoices)
}

/// 按筛选条件查询所有发票（无分页，用于导出）
pub fn find_all_for_export(filter: InvoiceFilter) -> AppResult<Vec<Invoice>> {
    let conn = super::get_connection()?;
    let (where_clause, params) = build_where_clause(&filter);

    let query_sql = format!(
        "SELECT * FROM invoices {} ORDER BY created_at DESC",
        where_clause
    );

    let param_refs: Vec<&dyn rusqlite::ToSql> = params.iter().map(|s| s as &dyn rusqlite::ToSql).collect();
    let mut stmt = conn.prepare(&query_sql)?;
    let invoices = stmt
        .query_map(param_refs.as_slice(), row_to_invoice)?
        .filter_map(|r| r.ok())
        .collect();

    Ok(invoices)
}

fn build_where_clause(filter: &InvoiceFilter) -> (String, Vec<String>) {
    let mut conditions: Vec<String> = Vec::new();
    let mut params: Vec<String> = Vec::new();

    if let Some(ref inv_type) = filter.invoice_type {
        conditions.push("invoice_type = ?".to_string());
        params.push(inv_type.as_str().to_string());
    }
    if let Some(ref date_from) = filter.date_from {
        conditions.push("invoice_date >= ?".to_string());
        params.push(date_from.clone());
    }
    if let Some(ref date_to) = filter.date_to {
        conditions.push("invoice_date <= ?".to_string());
        params.push(date_to.clone());
    }
    if let Some(ref keyword) = filter.keyword {
        conditions.push("(commodity_name LIKE ? OR seller_name LIKE ? OR remark LIKE ?)".to_string());
        let like = format!("%{}%", keyword);
        params.push(like.clone());
        params.push(like.clone());
        params.push(like);
    }
    if let Some(ref category) = filter.category {
        conditions.push("category = ?".to_string());
        params.push(category.clone());
    }

    let where_clause = if conditions.is_empty() {
        String::new()
    } else {
        format!("WHERE {}", conditions.join(" AND "))
    };

    (where_clause, params)
}

fn row_to_invoice(row: &rusqlite::Row) -> rusqlite::Result<Invoice> {
    let invoice_type_str: String = row.get("invoice_type")?;
    let is_verified: i32 = row.get("is_verified")?;

    Ok(Invoice {
        id: row.get("id")?,
        invoice_type: InvoiceType::from_str(&invoice_type_str),
        invoice_code: row.get("invoice_code")?,
        invoice_number: row.get("invoice_number")?,
        invoice_date: row.get("invoice_date")?,
        amount_without_tax: row.get("amount_without_tax")?,
        tax_amount: row.get("tax_amount")?,
        total_amount: row.get("total_amount")?,
        buyer_name: row.get("buyer_name")?,
        buyer_tax_number: row.get("buyer_tax_number")?,
        seller_name: row.get("seller_name")?,
        seller_tax_number: row.get("seller_tax_number")?,
        commodity_name: row.get("commodity_name")?,
        commodity_detail: row.get("commodity_detail")?,
        check_code: row.get("check_code")?,
        machine_code: row.get("machine_code")?,
        original_file_path: row.get("original_file_path")?,
        file_type: row.get("file_type")?,
        ocr_raw_response: row.get("ocr_raw_response")?,
        ocr_confidence: row.get("ocr_confidence")?,
        category: row.get("category")?,
        remark: row.get("remark")?,
        is_verified: is_verified != 0,
        created_at: row.get("created_at")?,
        updated_at: row.get("updated_at")?,
    })
}
