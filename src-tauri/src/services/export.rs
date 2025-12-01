use crate::error::AppError;
use crate::models::invoice::Invoice;
use rust_xlsxwriter::{Format, Workbook};
use std::path::Path;

/// 导出服务
pub struct ExportService;

impl ExportService {
    /// 导出发票到 Excel 文件
    pub fn export_to_excel(invoices: &[Invoice], output_path: &Path) -> Result<String, AppError> {
        let mut workbook = Workbook::new();
        let worksheet = workbook.add_worksheet();

        // 设置表头格式
        let header_format = Format::new()
            .set_bold()
            .set_background_color(rust_xlsxwriter::Color::RGB(0xDCE6F1));

        // 写入表头
        let headers = Self::get_headers();
        for (col, header) in headers.iter().enumerate() {
            worksheet
                .write_string_with_format(0, col as u16, *header, &header_format)
                .map_err(|e| AppError::FileProcess(e.to_string()))?;
        }

        // 写入数据行
        for (row_idx, invoice) in invoices.iter().enumerate() {
            let row = (row_idx + 1) as u32;
            Self::write_invoice_row(worksheet, row, invoice)?;
        }

        // 设置列宽
        Self::set_column_widths(worksheet)?;

        // 保存文件
        workbook
            .save(output_path)
            .map_err(|e| AppError::FileProcess(e.to_string()))?;

        Ok(output_path.to_string_lossy().to_string())
    }

    /// 获取表头列表
    fn get_headers() -> Vec<&'static str> {
        vec![
            "发票类型",
            "发票代码",
            "发票号码",
            "开票日期",
            "价税合计",
            "不含税金额",
            "税额",
            "销售方名称",
            "销售方税号",
            "购买方名称",
            "购买方税号",
            "商品名称",
            "分类",
            "备注",
        ]
    }

    /// 写入单行发票数据
    fn write_invoice_row(
        worksheet: &mut rust_xlsxwriter::Worksheet,
        row: u32,
        invoice: &Invoice,
    ) -> Result<(), AppError> {
        let mut col: u16 = 0;

        // 发票类型
        worksheet
            .write_string(row, col, invoice.invoice_type.display_name())
            .map_err(|e| AppError::FileProcess(e.to_string()))?;
        col += 1;

        // 发票代码
        worksheet
            .write_string(row, col, invoice.invoice_code.as_deref().unwrap_or(""))
            .map_err(|e| AppError::FileProcess(e.to_string()))?;
        col += 1;

        // 发票号码
        worksheet
            .write_string(row, col, invoice.invoice_number.as_deref().unwrap_or(""))
            .map_err(|e| AppError::FileProcess(e.to_string()))?;
        col += 1;

        // 开票日期
        worksheet
            .write_string(row, col, invoice.invoice_date.as_deref().unwrap_or(""))
            .map_err(|e| AppError::FileProcess(e.to_string()))?;
        col += 1;

        // 价税合计
        worksheet
            .write_number(row, col, invoice.total_amount)
            .map_err(|e| AppError::FileProcess(e.to_string()))?;
        col += 1;

        // 不含税金额
        if let Some(amount) = invoice.amount_without_tax {
            worksheet
                .write_number(row, col, amount)
                .map_err(|e| AppError::FileProcess(e.to_string()))?;
        }
        col += 1;

        // 税额
        if let Some(tax) = invoice.tax_amount {
            worksheet
                .write_number(row, col, tax)
                .map_err(|e| AppError::FileProcess(e.to_string()))?;
        }
        col += 1;

        // 销售方名称
        worksheet
            .write_string(row, col, invoice.seller_name.as_deref().unwrap_or(""))
            .map_err(|e| AppError::FileProcess(e.to_string()))?;
        col += 1;

        // 销售方税号
        worksheet
            .write_string(row, col, invoice.seller_tax_number.as_deref().unwrap_or(""))
            .map_err(|e| AppError::FileProcess(e.to_string()))?;
        col += 1;

        // 购买方名称
        worksheet
            .write_string(row, col, invoice.buyer_name.as_deref().unwrap_or(""))
            .map_err(|e| AppError::FileProcess(e.to_string()))?;
        col += 1;

        // 购买方税号
        worksheet
            .write_string(row, col, invoice.buyer_tax_number.as_deref().unwrap_or(""))
            .map_err(|e| AppError::FileProcess(e.to_string()))?;
        col += 1;

        // 商品名称
        worksheet
            .write_string(row, col, invoice.commodity_name.as_deref().unwrap_or(""))
            .map_err(|e| AppError::FileProcess(e.to_string()))?;
        col += 1;

        // 分类
        worksheet
            .write_string(row, col, invoice.category.as_deref().unwrap_or(""))
            .map_err(|e| AppError::FileProcess(e.to_string()))?;
        col += 1;

        // 备注
        worksheet
            .write_string(row, col, invoice.remark.as_deref().unwrap_or(""))
            .map_err(|e| AppError::FileProcess(e.to_string()))?;

        Ok(())
    }

    /// 设置列宽
    fn set_column_widths(worksheet: &mut rust_xlsxwriter::Worksheet) -> Result<(), AppError> {
        let widths: Vec<f64> = vec![
            18.0, // 发票类型
            14.0, // 发票代码
            12.0, // 发票号码
            12.0, // 开票日期
            12.0, // 价税合计
            12.0, // 不含税金额
            10.0, // 税额
            25.0, // 销售方名称
            20.0, // 销售方税号
            25.0, // 购买方名称
            20.0, // 购买方税号
            30.0, // 商品名称
            12.0, // 分类
            20.0, // 备注
        ];

        for (col, width) in widths.iter().enumerate() {
            worksheet
                .set_column_width(col as u16, *width)
                .map_err(|e| AppError::FileProcess(e.to_string()))?;
        }

        Ok(())
    }
}
