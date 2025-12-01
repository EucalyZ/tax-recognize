use rusqlite::Connection;

use crate::error::AppResult;

/// 运行数据库迁移
pub fn run_migrations(conn: &Connection) -> AppResult<()> {
    create_invoices_table(conn)?;
    create_configs_table(conn)?;
    create_indexes(conn)?;
    create_views(conn)?;
    Ok(())
}

/// 创建发票表
fn create_invoices_table(conn: &Connection) -> AppResult<()> {
    conn.execute(
        "CREATE TABLE IF NOT EXISTS invoices (
            id TEXT PRIMARY KEY,
            invoice_type TEXT NOT NULL,
            invoice_code TEXT,
            invoice_number TEXT,
            invoice_date TEXT,
            amount_without_tax REAL,
            tax_amount REAL,
            total_amount REAL NOT NULL,
            buyer_name TEXT,
            buyer_tax_number TEXT,
            seller_name TEXT,
            seller_tax_number TEXT,
            commodity_name TEXT,
            commodity_detail TEXT,
            check_code TEXT,
            machine_code TEXT,
            original_file_path TEXT,
            file_type TEXT,
            ocr_raw_response TEXT,
            ocr_confidence REAL,
            category TEXT,
            remark TEXT,
            is_verified INTEGER DEFAULT 0,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )",
        [],
    )?;
    Ok(())
}

/// 创建配置表
fn create_configs_table(conn: &Connection) -> AppResult<()> {
    conn.execute(
        "CREATE TABLE IF NOT EXISTS configs (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL,
            description TEXT,
            updated_at TEXT NOT NULL
        )",
        [],
    )?;
    Ok(())
}

/// 创建索引
fn create_indexes(conn: &Connection) -> AppResult<()> {
    // 发票日期索引
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_invoices_date ON invoices(invoice_date)",
        [],
    )?;

    // 发票类型索引
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_invoices_type ON invoices(invoice_type)",
        [],
    )?;

    // 金额索引
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_invoices_amount ON invoices(total_amount)",
        [],
    )?;

    // 销售方索引
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_invoices_seller ON invoices(seller_name)",
        [],
    )?;

    // 分类索引
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_invoices_category ON invoices(category)",
        [],
    )?;

    Ok(())
}

/// 创建统计视图（预留）
fn create_views(conn: &Connection) -> AppResult<()> {
    // 月度统计视图
    conn.execute(
        "CREATE VIEW IF NOT EXISTS v_monthly_stats AS
        SELECT 
            strftime('%Y-%m', invoice_date) as month,
            invoice_type,
            COUNT(*) as count,
            SUM(total_amount) as total_amount,
            SUM(tax_amount) as total_tax
        FROM invoices
        WHERE invoice_date IS NOT NULL
        GROUP BY strftime('%Y-%m', invoice_date), invoice_type",
        [],
    )?;

    // 分类统计视图
    conn.execute(
        "CREATE VIEW IF NOT EXISTS v_category_stats AS
        SELECT 
            category,
            COUNT(*) as count,
            SUM(total_amount) as total_amount
        FROM invoices
        GROUP BY category",
        [],
    )?;

    Ok(())
}
