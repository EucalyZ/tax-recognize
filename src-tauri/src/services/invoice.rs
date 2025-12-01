use crate::db::{config_repo, invoice_repo};
use crate::error::AppError;
use crate::models::config::config_keys;
use crate::models::invoice::{Invoice, InvoiceType};
use crate::services::file::FileService;
use crate::services::ocr::OcrService;
use serde::{Deserialize, Serialize};
use std::path::Path;

/// 识别结果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RecognizeResult {
    pub file_path: String,
    pub success: bool,
    pub invoice: Option<Invoice>,
    pub error: Option<String>,
}

pub struct InvoiceService {
    ocr_service: OcrService,
}

impl InvoiceService {
    pub fn new() -> Self {
        Self {
            ocr_service: OcrService::new(),
        }
    }

    /// 获取 API 配置
    fn get_api_config() -> Result<(String, String), AppError> {
        let api_key = config_repo::get_config(config_keys::BAIDU_OCR_API_KEY)?
            .ok_or_else(|| AppError::Config("未配置百度OCR API Key".to_string()))?;
        let secret_key = config_repo::get_config(config_keys::BAIDU_OCR_SECRET_KEY)?
            .ok_or_else(|| AppError::Config("未配置百度OCR Secret Key".to_string()))?;
        Ok((api_key, secret_key))
    }

    /// 识别发票
    pub async fn recognize_invoice(
        &self,
        file_path: &str,
        invoice_type: Option<InvoiceType>,
    ) -> Result<Invoice, AppError> {
        let path = Path::new(file_path);
        let file_info = FileService::get_file_info(path)?;
        let image_base64 = FileService::read_image_as_base64(path)?;

        let (api_key, secret_key) = Self::get_api_config()?;
        let token = self
            .ocr_service
            .get_access_token(&api_key, &secret_key)
            .await?;

        let inv_type = invoice_type.unwrap_or(InvoiceType::VatCommonInvoice);
        let invoice = self
            .recognize_by_type(&token, &image_base64, inv_type, &file_info)
            .await?;

        Ok(invoice)
    }

    async fn recognize_by_type(
        &self,
        token: &str,
        image_base64: &str,
        invoice_type: InvoiceType,
        file_info: &crate::services::file::FileInfo,
    ) -> Result<Invoice, AppError> {
        match invoice_type {
            InvoiceType::VatInvoice
            | InvoiceType::VatCommonInvoice
            | InvoiceType::VatElectronicInvoice
            | InvoiceType::VatRollInvoice => {
                self.recognize_vat(token, image_base64, file_info).await
            }
            _ => self.recognize_generic(token, image_base64, file_info).await,
        }
    }

    async fn recognize_vat(
        &self,
        token: &str,
        image_base64: &str,
        file_info: &crate::services::file::FileInfo,
    ) -> Result<Invoice, AppError> {
        let response = self
            .ocr_service
            .recognize_vat_invoice(token, image_base64, &file_info.file_type)
            .await?;

        let raw_json = serde_json::to_string(&response).unwrap_or_default();
        let invoice = response.to_invoice(
            Some(&file_info.path),
            Some(file_info.file_type.as_str()),
            &raw_json,
        );

        Ok(invoice)
    }

    async fn recognize_generic(
        &self,
        token: &str,
        image_base64: &str,
        file_info: &crate::services::file::FileInfo,
    ) -> Result<Invoice, AppError> {
        let response = self
            .ocr_service
            .recognize_invoice(token, image_base64, &file_info.file_type)
            .await?;

        let raw_json = serde_json::to_string(&response).unwrap_or_default();
        let mut invoice = Invoice::new(InvoiceType::Other, 0.0);
        invoice.original_file_path = Some(file_info.path.clone());
        invoice.file_type = Some(file_info.file_type.as_str().to_string());
        invoice.ocr_raw_response = Some(raw_json);

        Ok(invoice)
    }

    /// 识别并保存发票
    pub async fn recognize_and_save(
        &self,
        file_path: &str,
        invoice_type: Option<InvoiceType>,
    ) -> Result<Invoice, AppError> {
        let invoice = self.recognize_invoice(file_path, invoice_type).await?;
        invoice_repo::insert(&invoice)?;
        Ok(invoice)
    }

    /// 批量识别
    pub async fn recognize_batch(
        &self,
        file_paths: &[String],
        invoice_type: Option<InvoiceType>,
    ) -> Vec<RecognizeResult> {
        let mut results = Vec::with_capacity(file_paths.len());

        for file_path in file_paths {
            let result = match self
                .recognize_and_save(file_path, invoice_type.clone())
                .await
            {
                Ok(invoice) => RecognizeResult {
                    file_path: file_path.clone(),
                    success: true,
                    invoice: Some(invoice),
                    error: None,
                },
                Err(e) => RecognizeResult {
                    file_path: file_path.clone(),
                    success: false,
                    invoice: None,
                    error: Some(e.to_string()),
                },
            };
            results.push(result);
        }

        results
    }

    /// 测试 OCR 连接
    pub async fn test_connection(
        &self,
        api_key: &str,
        secret_key: &str,
    ) -> Result<bool, AppError> {
        self.ocr_service.test_connection(api_key, secret_key).await
    }
}

impl Default for InvoiceService {
    fn default() -> Self {
        Self::new()
    }
}
