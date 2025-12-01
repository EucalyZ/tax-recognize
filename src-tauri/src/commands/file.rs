use crate::services::file::{FileInfo, FileService};
use std::path::Path;

/// 验证文件
#[tauri::command]
pub fn validate_file(file_path: String) -> Result<FileInfo, String> {
    let path = Path::new(&file_path);
    FileService::get_file_info(path).map_err(|e| e.to_string())
}

/// 获取文件 base64
#[tauri::command]
pub fn get_file_base64(file_path: String) -> Result<String, String> {
    let path = Path::new(&file_path);
    FileService::read_image_as_base64(path).map_err(|e| e.to_string())
}

/// 获取支持的文件扩展名
#[tauri::command]
pub fn get_supported_extensions() -> Vec<&'static str> {
    FileService::supported_extensions()
}
