use serde::Serialize;

/// 应用统一错误类型
#[derive(Debug, thiserror::Error)]
pub enum AppError {
    #[error("数据库错误: {0}")]
    Database(#[from] rusqlite::Error),

    #[error("IO 错误: {0}")]
    Io(#[from] std::io::Error),

    #[error("OCR 错误: {0}")]
    Ocr(String),

    #[error("配置错误: {0}")]
    Config(String),

    #[error("文件处理错误: {0}")]
    FileProcess(String),

    #[error("序列化错误: {0}")]
    Serialization(String),

    #[error("网络请求错误: {0}")]
    Request(String),
}

impl From<reqwest::Error> for AppError {
    fn from(err: reqwest::Error) -> Self {
        AppError::Request(err.to_string())
    }
}

impl From<serde_json::Error> for AppError {
    fn from(err: serde_json::Error) -> Self {
        AppError::Serialization(err.to_string())
    }
}

/// 为 Tauri command 返回值实现 Serialize
impl Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        use serde::ser::SerializeStruct;

        let mut state = serializer.serialize_struct("AppError", 2)?;
        state.serialize_field("type", &self.error_type())?;
        state.serialize_field("message", &self.to_string())?;
        state.end()
    }
}

impl AppError {
    /// 获取错误类型标识
    fn error_type(&self) -> &'static str {
        match self {
            AppError::Database(_) => "database",
            AppError::Io(_) => "io",
            AppError::Ocr(_) => "ocr",
            AppError::Config(_) => "config",
            AppError::FileProcess(_) => "file_process",
            AppError::Serialization(_) => "serialization",
            AppError::Request(_) => "request",
        }
    }
}

/// 应用结果类型别名
pub type AppResult<T> = Result<T, AppError>;
