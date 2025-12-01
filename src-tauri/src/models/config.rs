use serde::{Deserialize, Serialize};

/// 配置项模型
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Config {
    /// 配置键
    pub key: String,
    /// 配置值（JSON 格式）
    pub value: String,
    /// 配置描述
    pub description: Option<String>,
    /// 更新时间 ISO8601
    pub updated_at: String,
}

impl Config {
    /// 创建新配置项
    pub fn new(key: impl Into<String>, value: impl Into<String>) -> Self {
        Self {
            key: key.into(),
            value: value.into(),
            description: None,
            updated_at: chrono::Utc::now().to_rfc3339(),
        }
    }

    /// 创建带描述的配置项
    pub fn with_description(
        key: impl Into<String>,
        value: impl Into<String>,
        description: impl Into<String>,
    ) -> Self {
        Self {
            key: key.into(),
            value: value.into(),
            description: Some(description.into()),
            updated_at: chrono::Utc::now().to_rfc3339(),
        }
    }
}

/// 预定义的配置键常量
pub mod config_keys {
    /// 百度 OCR API Key
    pub const BAIDU_OCR_API_KEY: &str = "baidu_ocr_api_key";
    /// 百度 OCR Secret Key
    pub const BAIDU_OCR_SECRET_KEY: &str = "baidu_ocr_secret_key";
    /// 百度 OCR Access Token（缓存）
    pub const BAIDU_OCR_ACCESS_TOKEN: &str = "baidu_ocr_access_token";
    /// Token 过期时间
    pub const BAIDU_OCR_TOKEN_EXPIRES: &str = "baidu_ocr_token_expires";
    /// 默认导出路径
    pub const EXPORT_DEFAULT_PATH: &str = "export_default_path";
    /// 导出模板配置
    pub const EXPORT_TEMPLATE: &str = "export_template";
}
