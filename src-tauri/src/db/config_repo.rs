use rusqlite::params;

use crate::error::AppResult;
use crate::models::config::Config;

/// 获取配置值
pub fn get_config(key: &str) -> AppResult<Option<String>> {
    let conn = super::get_connection()?;
    let mut stmt = conn.prepare("SELECT value FROM configs WHERE key = ?")?;

    let result = stmt.query_row(params![key], |row| row.get::<_, String>(0));

    match result {
        Ok(value) => Ok(Some(value)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(e.into()),
    }
}

/// 获取完整配置项
pub fn get_config_full(key: &str) -> AppResult<Option<Config>> {
    let conn = super::get_connection()?;
    let mut stmt = conn.prepare(
        "SELECT key, value, description, updated_at FROM configs WHERE key = ?",
    )?;

    let result = stmt.query_row(params![key], |row| {
        Ok(Config {
            key: row.get(0)?,
            value: row.get(1)?,
            description: row.get(2)?,
            updated_at: row.get(3)?,
        })
    });

    match result {
        Ok(config) => Ok(Some(config)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(e.into()),
    }
}

/// 设置配置值
pub fn set_config(key: &str, value: &str, description: Option<&str>) -> AppResult<()> {
    let conn = super::get_connection()?;
    let now = chrono::Utc::now().to_rfc3339();

    conn.execute(
        "INSERT INTO configs (key, value, description, updated_at) 
         VALUES (?1, ?2, ?3, ?4)
         ON CONFLICT(key) DO UPDATE SET 
            value = excluded.value,
            description = COALESCE(excluded.description, configs.description),
            updated_at = excluded.updated_at",
        params![key, value, description, now],
    )?;

    Ok(())
}

/// 删除配置项
pub fn delete_config(key: &str) -> AppResult<bool> {
    let conn = super::get_connection()?;
    let affected = conn.execute("DELETE FROM configs WHERE key = ?", params![key])?;
    Ok(affected > 0)
}

/// 获取所有配置
pub fn get_all_configs() -> AppResult<Vec<Config>> {
    let conn = super::get_connection()?;
    let mut stmt =
        conn.prepare("SELECT key, value, description, updated_at FROM configs")?;

    let configs = stmt.query_map([], |row| {
        Ok(Config {
            key: row.get(0)?,
            value: row.get(1)?,
            description: row.get(2)?,
            updated_at: row.get(3)?,
        })
    })?;

    let mut result = Vec::new();
    for config in configs {
        result.push(config?);
    }

    Ok(result)
}
