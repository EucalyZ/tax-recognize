pub mod commands;
pub mod db;
pub mod error;
pub mod models;
pub mod services;

use commands::{
    delete_config, delete_invoice, delete_invoices, export_all_invoices, export_invoices,
    get_config, get_file_base64, get_invoice, get_invoices, get_supported_extensions,
    recognize_and_save_invoice, recognize_invoice, recognize_invoices_batch, set_config,
    test_ocr_connection, update_invoice, validate_file,
};

/// 应用初始化
fn setup_app() -> Result<(), Box<dyn std::error::Error>> {
    db::init_database()?;
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .setup(|_app| {
            setup_app()?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // 配置相关
            get_config,
            set_config,
            delete_config,
            // 发票相关
            get_invoice,
            get_invoices,
            delete_invoice,
            delete_invoices,
            update_invoice,
            recognize_invoice,
            recognize_and_save_invoice,
            recognize_invoices_batch,
            test_ocr_connection,
            // 导出相关
            export_invoices,
            export_all_invoices,
            // 文件相关
            validate_file,
            get_file_base64,
            get_supported_extensions,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
