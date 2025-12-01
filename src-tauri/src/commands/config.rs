use crate::db::config_repo;

/// 获取配置值
#[tauri::command]
pub fn get_config(key: String) -> Result<Option<String>, String> {
    config_repo::get_config(&key).map_err(|e| e.to_string())
}

/// 设置配置值
#[tauri::command]
pub fn set_config(
    key: String,
    value: String,
    description: Option<String>,
) -> Result<(), String> {
    config_repo::set_config(&key, &value, description.as_deref()).map_err(|e| e.to_string())
}

/// 删除配置项
#[tauri::command]
pub fn delete_config(key: String) -> Result<bool, String> {
    config_repo::delete_config(&key).map_err(|e| e.to_string())
}
