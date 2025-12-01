use once_cell::sync::OnceCell;
use rusqlite::Connection;
use std::path::PathBuf;
use std::sync::Mutex;

use crate::error::{AppError, AppResult};

/// 全局数据库连接
static DB_CONNECTION: OnceCell<Mutex<Connection>> = OnceCell::new();

/// 获取数据库文件路径
fn get_db_path() -> AppResult<PathBuf> {
    let data_dir = dirs::data_local_dir()
        .ok_or_else(|| AppError::Config("无法获取用户数据目录".to_string()))?;

    let app_dir = data_dir.join("tax-recognize");

    // 确保目录存在
    if !app_dir.exists() {
        std::fs::create_dir_all(&app_dir)?;
    }

    Ok(app_dir.join("data.db"))
}

/// 初始化数据库连接
pub fn init_database() -> AppResult<()> {
    let db_path = get_db_path()?;
    let conn = Connection::open(&db_path)?;

    // 启用外键约束
    conn.execute_batch("PRAGMA foreign_keys = ON;")?;

    // 运行数据库迁移
    super::schema::run_migrations(&conn)?;

    DB_CONNECTION
        .set(Mutex::new(conn))
        .map_err(|_| AppError::Database(rusqlite::Error::InvalidQuery))?;

    Ok(())
}

/// 获取数据库连接
pub fn get_connection() -> AppResult<std::sync::MutexGuard<'static, Connection>> {
    DB_CONNECTION
        .get()
        .ok_or_else(|| AppError::Config("数据库未初始化".to_string()))?
        .lock()
        .map_err(|_| AppError::Database(rusqlite::Error::InvalidQuery))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_get_db_path() {
        let path = get_db_path();
        assert!(path.is_ok());
        let path = path.unwrap();
        assert!(path.to_string_lossy().contains("tax-recognize"));
    }
}
