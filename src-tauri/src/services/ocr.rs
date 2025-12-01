use crate::db::config_repo;
use crate::error::AppError;
use crate::models::config::config_keys;
use crate::models::ocr_response::{
    BaiduErrorResponse, BaiduTokenResponse, VatInvoiceResponse,
};
use crate::services::file::FileType;
use reqwest::Client;
use std::time::{Duration, SystemTime, UNIX_EPOCH};

const BAIDU_TOKEN_URL: &str = "https://aip.baidubce.com/oauth/2.0/token";
const BAIDU_VAT_INVOICE_URL: &str = "https://aip.baidubce.com/rest/2.0/ocr/v1/vat_invoice";
const BAIDU_INVOICE_URL: &str = "https://aip.baidubce.com/rest/2.0/ocr/v1/invoice";
const BAIDU_TRAIN_TICKET_URL: &str = "https://aip.baidubce.com/rest/2.0/ocr/v1/train_ticket";
const BAIDU_TAXI_RECEIPT_URL: &str = "https://aip.baidubce.com/rest/2.0/ocr/v1/taxi_receipt";
const BAIDU_AIR_TICKET_URL: &str = "https://aip.baidubce.com/rest/2.0/ocr/v1/air_ticket";

const REQUEST_TIMEOUT_SECS: u64 = 30;
const TOKEN_REFRESH_MARGIN_SECS: i64 = 3600;

pub struct OcrService {
    client: Client,
}

impl OcrService {
    pub fn new() -> Self {
        let client = Client::builder()
            .timeout(Duration::from_secs(REQUEST_TIMEOUT_SECS))
            .build()
            .unwrap_or_default();
        Self { client }
    }

    /// 获取 access_token，优先从数据库缓存获取，过期则刷新
    pub async fn get_access_token(
        &self,
        api_key: &str,
        secret_key: &str,
    ) -> Result<String, AppError> {
        if let Some(cached) = self.get_cached_token()? {
            return Ok(cached);
        }
        self.refresh_token(api_key, secret_key).await
    }

    fn get_cached_token(&self) -> Result<Option<String>, AppError> {
        let token = config_repo::get_config(config_keys::BAIDU_OCR_ACCESS_TOKEN)?;
        let expires = config_repo::get_config(config_keys::BAIDU_OCR_TOKEN_EXPIRES)?;

        if let (Some(token), Some(expires_str)) = (token, expires) {
            if let Ok(expires_ts) = expires_str.parse::<i64>() {
                let now = current_timestamp();
                if now < expires_ts - TOKEN_REFRESH_MARGIN_SECS {
                    return Ok(Some(token));
                }
            }
        }
        Ok(None)
    }

    async fn refresh_token(&self, api_key: &str, secret_key: &str) -> Result<String, AppError> {
        let url = format!(
            "{}?grant_type=client_credentials&client_id={}&client_secret={}",
            BAIDU_TOKEN_URL, api_key, secret_key
        );

        let response = self.client.post(&url).send().await.map_err(|e| {
            AppError::Ocr(format!("获取token请求失败: {}", e))
        })?;

        let status = response.status();
        let body = response.text().await.map_err(|e| {
            AppError::Ocr(format!("读取响应失败: {}", e))
        })?;

        if !status.is_success() {
            return Err(parse_error_response(&body));
        }

        let token_resp: BaiduTokenResponse = serde_json::from_str(&body).map_err(|e| {
            AppError::Ocr(format!("解析token响应失败: {}", e))
        })?;

        let expires_at = current_timestamp() + token_resp.expires_in;
        config_repo::set_config(
            config_keys::BAIDU_OCR_ACCESS_TOKEN,
            &token_resp.access_token,
            Some("百度OCR Access Token"),
        )?;
        config_repo::set_config(
            config_keys::BAIDU_OCR_TOKEN_EXPIRES,
            &expires_at.to_string(),
            Some("Token过期时间戳"),
        )?;

        Ok(token_resp.access_token)
    }

    /// 测试 API 连接
    pub async fn test_connection(
        &self,
        api_key: &str,
        secret_key: &str,
    ) -> Result<bool, AppError> {
        self.refresh_token(api_key, secret_key).await?;
        Ok(true)
    }

    /// 识别增值税发票
    pub async fn recognize_vat_invoice(
        &self,
        token: &str,
        file_base64: &str,
        file_type: &FileType,
    ) -> Result<VatInvoiceResponse, AppError> {
        self.call_ocr_api(BAIDU_VAT_INVOICE_URL, token, file_base64, file_type).await
    }

    /// 识别通用票据
    pub async fn recognize_invoice(
        &self,
        token: &str,
        file_base64: &str,
        file_type: &FileType,
    ) -> Result<serde_json::Value, AppError> {
        self.call_ocr_api(BAIDU_INVOICE_URL, token, file_base64, file_type).await
    }

    /// 识别火车票
    pub async fn recognize_train_ticket(
        &self,
        token: &str,
        file_base64: &str,
        file_type: &FileType,
    ) -> Result<serde_json::Value, AppError> {
        self.call_ocr_api(BAIDU_TRAIN_TICKET_URL, token, file_base64, file_type).await
    }

    /// 识别出租车票
    pub async fn recognize_taxi_receipt(
        &self,
        token: &str,
        file_base64: &str,
        file_type: &FileType,
    ) -> Result<serde_json::Value, AppError> {
        self.call_ocr_api(BAIDU_TAXI_RECEIPT_URL, token, file_base64, file_type).await
    }

    /// 识别机票行程单
    pub async fn recognize_air_ticket(
        &self,
        token: &str,
        file_base64: &str,
        file_type: &FileType,
    ) -> Result<serde_json::Value, AppError> {
        self.call_ocr_api(BAIDU_AIR_TICKET_URL, token, file_base64, file_type).await
    }

    async fn call_ocr_api<T: serde::de::DeserializeOwned>(
        &self,
        base_url: &str,
        token: &str,
        file_base64: &str,
        file_type: &FileType,
    ) -> Result<T, AppError> {
        let url = format!("{}?access_token={}", base_url, token);

        let params: Vec<(&str, &str)> = if *file_type == FileType::Pdf {
            vec![("pdf_file", file_base64)]
        } else {
            vec![("image", file_base64)]
        };

        let response = self
            .client
            .post(&url)
            .header("Content-Type", "application/x-www-form-urlencoded")
            .form(&params)
            .send()
            .await
            .map_err(|e| AppError::Ocr(format!("OCR请求失败: {}", e)))?;

        let status = response.status();
        let body = response.text().await.map_err(|e| {
            AppError::Ocr(format!("读取OCR响应失败: {}", e))
        })?;

        if !status.is_success() {
            return Err(parse_error_response(&body));
        }

        if let Ok(err) = serde_json::from_str::<BaiduErrorResponse>(&body) {
            if err.error_code.is_some() || err.error.is_some() {
                return Err(parse_error_response(&body));
            }
        }

        serde_json::from_str(&body).map_err(|e| {
            AppError::Ocr(format!("解析OCR响应失败: {}", e))
        })
    }
}

impl Default for OcrService {
    fn default() -> Self {
        Self::new()
    }
}

fn current_timestamp() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs() as i64
}

fn parse_error_response(body: &str) -> AppError {
    if let Ok(err) = serde_json::from_str::<BaiduErrorResponse>(body) {
        let msg = err
            .error_msg
            .or(err.error_description)
            .or(err.error)
            .unwrap_or_else(|| "未知错误".to_string());
        return AppError::Ocr(msg);
    }
    AppError::Ocr(format!("API错误: {}", body))
}
