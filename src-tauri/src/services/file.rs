use crate::error::AppError;
use base64::{engine::general_purpose::STANDARD, Engine};
use image::GenericImageView;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;

const MAX_IMAGE_SIZE: usize = 4 * 1024 * 1024; // 4MB
const SUPPORTED_IMAGE_EXTENSIONS: [&str; 4] = ["jpg", "jpeg", "png", "bmp"];
const SUPPORTED_PDF_EXTENSION: &str = "pdf";

/// 文件类型枚举
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum FileType {
    Jpeg,
    Png,
    Bmp,
    Pdf,
}

impl FileType {
    pub fn as_str(&self) -> &'static str {
        match self {
            FileType::Jpeg => "jpeg",
            FileType::Png => "png",
            FileType::Bmp => "bmp",
            FileType::Pdf => "pdf",
        }
    }
}

/// 文件信息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileInfo {
    pub path: String,
    pub file_type: FileType,
    pub size: u64,
    pub name: String,
}

pub struct FileService;

impl FileService {
    /// 读取图片文件并转换为 base64
    pub fn read_image_as_base64(path: &Path) -> Result<String, AppError> {
        let file_type = Self::validate_file_type(path)?;
        let data = fs::read(path).map_err(|e| {
            AppError::FileProcess(format!("读取文件失败: {}", e))
        })?;

        let processed = if file_type != FileType::Pdf && data.len() > MAX_IMAGE_SIZE {
            Self::compress_image(&data)?
        } else {
            data
        };

        Ok(STANDARD.encode(&processed))
    }

    /// 验证文件类型
    pub fn validate_file_type(path: &Path) -> Result<FileType, AppError> {
        let extension = path
            .extension()
            .and_then(|e| e.to_str())
            .map(|e| e.to_lowercase())
            .ok_or_else(|| AppError::FileProcess("无法获取文件扩展名".to_string()))?;

        match extension.as_str() {
            "jpg" | "jpeg" => Ok(FileType::Jpeg),
            "png" => Ok(FileType::Png),
            "bmp" => Ok(FileType::Bmp),
            "pdf" => Ok(FileType::Pdf),
            _ => Err(AppError::FileProcess(format!(
                "不支持的文件类型: {}，支持: {:?}, {}",
                extension, SUPPORTED_IMAGE_EXTENSIONS, SUPPORTED_PDF_EXTENSION
            ))),
        }
    }

    /// 获取文件信息
    pub fn get_file_info(path: &Path) -> Result<FileInfo, AppError> {
        let file_type = Self::validate_file_type(path)?;
        let metadata = fs::metadata(path).map_err(|e| {
            AppError::FileProcess(format!("获取文件信息失败: {}", e))
        })?;

        let name = path
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("unknown")
            .to_string();

        Ok(FileInfo {
            path: path.to_string_lossy().to_string(),
            file_type,
            size: metadata.len(),
            name,
        })
    }

    /// 压缩图片（如果超过限制大小）
    fn compress_image(data: &[u8]) -> Result<Vec<u8>, AppError> {
        let img = image::load_from_memory(data).map_err(|e| {
            AppError::FileProcess(format!("加载图片失败: {}", e))
        })?;

        let (width, height) = img.dimensions();
        let scale = Self::calculate_scale(data.len(), width, height);

        let new_width = (width as f64 * scale) as u32;
        let new_height = (height as f64 * scale) as u32;

        let resized = img.resize(
            new_width,
            new_height,
            image::imageops::FilterType::Lanczos3,
        );

        let mut buffer = Vec::new();
        let mut cursor = std::io::Cursor::new(&mut buffer);

        resized
            .write_to(&mut cursor, image::ImageFormat::Jpeg)
            .map_err(|e| AppError::FileProcess(format!("压缩图片失败: {}", e)))?;

        Ok(buffer)
    }

    fn calculate_scale(current_size: usize, _width: u32, _height: u32) -> f64 {
        let ratio = MAX_IMAGE_SIZE as f64 / current_size as f64;
        let scale = ratio.sqrt();
        scale.min(1.0).max(0.1)
    }

    /// 检查文件是否存在
    pub fn file_exists(path: &Path) -> bool {
        path.exists() && path.is_file()
    }

    /// 获取支持的文件扩展名列表
    pub fn supported_extensions() -> Vec<&'static str> {
        let mut exts: Vec<&str> = SUPPORTED_IMAGE_EXTENSIONS.to_vec();
        exts.push(SUPPORTED_PDF_EXTENSION);
        exts
    }
}
