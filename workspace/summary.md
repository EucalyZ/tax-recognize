# 发票识别桌面应用 - 开发计划

## 项目概述

将 Python 发票识别 demo 迁移到 Tauri 2 + React 19 桌面应用，支持多种发票类型识别、本地数据存储和 Excel 导出。

---

## 一、Python Demo 问题分析与改进

### 1.1 原 Demo 的问题

| 问题类型 | 具体问题 | 影响 |
|---------|---------|------|
| **职责耦合** | 单文件包含认证、OCR、文件处理、数据存储、导出等所有功能 | 难以维护和扩展 |
| **数据持久化** | 使用 JSON 文件存储，无事务支持 | 数据一致性风险，并发写入问题 |
| **错误处理** | 缺少统一的错误处理机制 | 部分失败时状态不一致 |
| **类型安全** | Python 弱类型，字段访问无编译期检查 | 运行时错误风险 |
| **扩展性** | 硬编码增值税发票类型，不支持多种发票 | 功能受限 |
| **配置管理** | API 密钥硬编码或环境变量 | 不便于用户配置 |
| **文件监听** | watchdog 实时监听，资源占用 | 桌面应用不需要此模式 |

### 1.2 改进方案

| 原问题 | 新设计改进 |
|-------|-----------|
| 职责耦合 | Rust 后端按模块拆分：ocr/db/export/file，职责单一 |
| JSON 存储 | SQLite 数据库，支持事务和索引 |
| 错误处理 | Rust Result + thiserror 统一错误类型，前端 toast 提示 |
| 类型安全 | Rust 强类型 + TypeScript interface 双端类型安全 |
| 扩展性 | 发票类型枚举 + 策略模式，易扩展新类型 |
| 配置管理 | 数据库配置表 + 设置页面，用户可视化配置 |
| 文件处理 | 用户主动导入（拖拽/选择），非实时监听 |

---

## 二、架构设计

### 2.1 整体架构

```
┌─────────────────────────────────────────────────────────────────┐
│                        React 前端                                │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐           │
│  │ 发票列表  │ │ 文件上传  │ │ 发票详情  │ │  设置    │           │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘           │
│       │            │            │            │                   │
│  ┌────┴────────────┴────────────┴────────────┴─────┐            │
│  │              Zustand Store                       │            │
│  │  invoiceStore / settingsStore / uiStore         │            │
│  └────────────────────┬────────────────────────────┘            │
└───────────────────────┼─────────────────────────────────────────┘
                        │ Tauri invoke
┌───────────────────────┼─────────────────────────────────────────┐
│                       ▼                                          │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                  Tauri Commands                          │    │
│  │  invoke_handler![invoice_*, config_*, export_*, file_*] │    │
│  └────────────────────┬────────────────────────────────────┘    │
│                       │                                          │
│  ┌────────┬───────────┼───────────┬────────────┐                │
│  │        │           │           │            │                │
│  ▼        ▼           ▼           ▼            ▼                │
│ ┌────┐ ┌─────┐ ┌──────────┐ ┌─────────┐ ┌──────────┐           │
│ │OCR │ │ DB  │ │  File    │ │ Export  │ │  Config  │           │
│ │模块│ │模块 │ │ 处理模块  │ │ 导出模块 │ │  配置模块 │           │
│ └─┬──┘ └──┬──┘ └────┬─────┘ └────┬────┘ └────┬─────┘           │
│   │       │         │            │           │                   │
│   │       └─────────┴────────────┴───────────┘                   │
│   │                 │                                            │
│   ▼                 ▼                                            │
│ ┌──────────┐    ┌──────────┐                                    │
│ │百度 OCR  │    │ SQLite   │                                    │
│ │  API     │    │ 数据库    │                                    │
│ └──────────┘    └──────────┘                                    │
│                        Rust 后端                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Rust 后端模块划分

```
src-tauri/src/
├── lib.rs              # 入口，注册所有 commands
├── main.rs             # 程序入口
├── commands/           # Tauri commands（薄层，委托给 services）
│   ├── mod.rs
│   ├── invoice.rs      # 发票相关命令
│   ├── config.rs       # 配置相关命令
│   ├── export.rs       # 导出相关命令
│   └── file.rs         # 文件处理命令
├── services/           # 业务逻辑层
│   ├── mod.rs
│   ├── ocr.rs          # OCR 服务（百度 API 封装）
│   ├── invoice.rs      # 发票业务逻辑
│   ├── export.rs       # Excel 导出服务
│   └── file.rs         # 文件处理服务（图片/PDF）
├── db/                 # 数据库层
│   ├── mod.rs
│   ├── connection.rs   # 连接管理
│   ├── schema.rs       # 表结构定义/迁移
│   ├── invoice_repo.rs # 发票数据访问
│   └── config_repo.rs  # 配置数据访问
├── models/             # 数据模型
│   ├── mod.rs
│   ├── invoice.rs      # 发票模型
│   ├── config.rs       # 配置模型
│   └── ocr_response.rs # OCR API 响应模型
└── error.rs            # 统一错误定义
```

### 2.3 React 前端结构

```
src/
├── main.tsx            # 入口
├── App.tsx             # 根组件
├── index.css           # 全局样式
├── components/         # 通用组件
│   ├── ui/             # 基础 UI 组件
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Modal.tsx
│   │   ├── Toast.tsx
│   │   └── Loading.tsx
│   ├── layout/         # 布局组件
│   │   ├── Sidebar.tsx
│   │   └── Header.tsx
│   └── invoice/        # 发票相关组件
│       ├── InvoiceTable.tsx
│       ├── InvoiceDetail.tsx
│       └── InvoiceCard.tsx
├── pages/              # 页面组件
│   ├── HomePage.tsx    # 主页（发票列表+上传）
│   ├── SettingsPage.tsx # 设置页
│   └── ExportPage.tsx  # 导出页
├── stores/             # Zustand stores
│   ├── invoiceStore.ts
│   ├── settingsStore.ts
│   └── uiStore.ts
├── services/           # Tauri 调用封装
│   ├── invoiceService.ts
│   ├── configService.ts
│   ├── exportService.ts
│   └── fileService.ts
├── types/              # TypeScript 类型定义
│   ├── invoice.ts
│   ├── config.ts
│   └── api.ts
├── hooks/              # 自定义 hooks
│   ├── useInvoices.ts
│   └── useDropzone.ts
└── utils/              # 工具函数
    ├── format.ts
    └── validators.ts
```

---

## 三、数据库设计

### 3.1 发票表 (invoices)

```sql
CREATE TABLE invoices (
    -- 主键
    id TEXT PRIMARY KEY,              -- UUID
    
    -- 基本信息
    invoice_type TEXT NOT NULL,       -- 发票类型枚举
    invoice_code TEXT,                -- 发票代码
    invoice_number TEXT,              -- 发票号码
    invoice_date TEXT,                -- 开票日期 (YYYY-MM-DD)
    
    -- 金额信息
    amount_without_tax REAL,          -- 不含税金额
    tax_amount REAL,                  -- 税额
    total_amount REAL NOT NULL,       -- 价税合计（主要金额字段）
    
    -- 购买方信息
    buyer_name TEXT,                  -- 购买方名称
    buyer_tax_number TEXT,            -- 购买方税号
    
    -- 销售方信息
    seller_name TEXT,                 -- 销售方名称
    seller_tax_number TEXT,           -- 销售方税号
    
    -- 商品/服务信息
    commodity_name TEXT,              -- 商品名称（摘要）
    commodity_detail TEXT,            -- 商品明细 JSON
    
    -- 验证信息
    check_code TEXT,                  -- 校验码
    machine_code TEXT,                -- 机器编号
    
    -- 文件信息
    original_file_path TEXT,          -- 原始文件路径
    file_type TEXT,                   -- 文件类型 (image/pdf)
    
    -- OCR 信息
    ocr_raw_response TEXT,            -- OCR 原始响应 JSON（用于调试/重新解析）
    ocr_confidence REAL,              -- OCR 置信度
    
    -- 业务字段（预留统计）
    category TEXT,                    -- 分类标签（用户自定义）
    remark TEXT,                      -- 备注
    is_verified INTEGER DEFAULT 0,    -- 是否已核验
    
    -- 元数据
    created_at TEXT NOT NULL,         -- 创建时间 ISO8601
    updated_at TEXT NOT NULL          -- 更新时间 ISO8601
);

-- 索引
CREATE INDEX idx_invoices_date ON invoices(invoice_date);
CREATE INDEX idx_invoices_type ON invoices(invoice_type);
CREATE INDEX idx_invoices_amount ON invoices(total_amount);
CREATE INDEX idx_invoices_seller ON invoices(seller_name);
CREATE INDEX idx_invoices_category ON invoices(category);
```

### 3.2 发票类型枚举

```rust
pub enum InvoiceType {
    VatInvoice,           // 增值税专用发票
    VatCommonInvoice,     // 增值税普通发票
    VatElectronicInvoice, // 增值税电子普通发票
    VatRollInvoice,       // 增值税卷式发票
    TrainTicket,          // 火车票
    TaxiTicket,           // 出租车票
    FlightItinerary,      // 机票行程单
    TollInvoice,          // 过路费发票
    QuotaInvoice,         // 定额发票
    Other,                // 其他
}
```

### 3.3 配置表 (configs)

```sql
CREATE TABLE configs (
    key TEXT PRIMARY KEY,      -- 配置键
    value TEXT NOT NULL,       -- 配置值（JSON 格式）
    description TEXT,          -- 配置描述
    updated_at TEXT NOT NULL   -- 更新时间
);

-- 预置配置项
-- baidu_ocr_api_key: API Key
-- baidu_ocr_secret_key: Secret Key
-- baidu_ocr_access_token: Access Token（缓存）
-- baidu_ocr_token_expires: Token 过期时间
-- export_default_path: 默认导出路径
-- export_template: 导出模板配置
```

### 3.4 统计预留视图

```sql
-- 月度统计视图（预留）
CREATE VIEW IF NOT EXISTS v_monthly_stats AS
SELECT 
    strftime('%Y-%m', invoice_date) as month,
    invoice_type,
    COUNT(*) as count,
    SUM(total_amount) as total_amount,
    SUM(tax_amount) as total_tax
FROM invoices
WHERE invoice_date IS NOT NULL
GROUP BY strftime('%Y-%m', invoice_date), invoice_type;

-- 分类统计视图（预留）
CREATE VIEW IF NOT EXISTS v_category_stats AS
SELECT 
    category,
    COUNT(*) as count,
    SUM(total_amount) as total_amount
FROM invoices
GROUP BY category;
```

---

## 四、核心功能模块设计

### 4.1 OCR 模块

**职责**: 封装百度 OCR API，支持多种发票类型识别

```rust
// services/ocr.rs
pub struct OcrService {
    client: reqwest::Client,
    config_repo: ConfigRepo,
}

impl OcrService {
    /// 获取/刷新 access_token
    pub async fn get_access_token(&self) -> Result<String>;
    
    /// 识别发票（自动选择 API）
    pub async fn recognize(&self, image_base64: &str, invoice_type: Option<InvoiceType>) 
        -> Result<OcrResponse>;
    
    /// 增值税发票识别
    async fn recognize_vat_invoice(&self, token: &str, image: &str) -> Result<VatInvoiceResponse>;
    
    /// 通用发票识别（混合类型）
    async fn recognize_mixed_invoice(&self, token: &str, image: &str) -> Result<MixedInvoiceResponse>;
    
    /// 火车票识别
    async fn recognize_train_ticket(&self, token: &str, image: &str) -> Result<TrainTicketResponse>;
    
    // ... 其他发票类型
}
```

**百度 OCR API 端点**:
- 增值税发票: `https://aip.baidubce.com/rest/2.0/ocr/v1/vat_invoice`
- 通用发票: `https://aip.baidubce.com/rest/2.0/ocr/v1/invoice`
- 火车票: `https://aip.baidubce.com/rest/2.0/ocr/v1/train_ticket`
- 混合票据: `https://aip.baidubce.com/rest/2.0/ocr/v1/mixed_receipt`

### 4.2 文件处理模块

**职责**: 处理图片和 PDF 文件导入

```rust
// services/file.rs
pub struct FileService;

impl FileService {
    /// 读取图片并转 base64
    pub fn read_image_as_base64(path: &Path) -> Result<String>;
    
    /// PDF 转图片（每页一张）
    pub fn pdf_to_images(pdf_path: &Path) -> Result<Vec<Vec<u8>>>;
    
    /// 验证文件类型
    pub fn validate_file_type(path: &Path) -> Result<FileType>;
    
    /// 压缩图片（如果过大）
    pub fn compress_image_if_needed(image_data: &[u8], max_size: usize) -> Result<Vec<u8>>;
}
```

### 4.3 数据管理模块

**职责**: 发票 CRUD 操作

```rust
// db/invoice_repo.rs
pub struct InvoiceRepo {
    conn: Connection,
}

impl InvoiceRepo {
    /// 插入发票
    pub fn insert(&self, invoice: &Invoice) -> Result<()>;
    
    /// 批量插入
    pub fn insert_batch(&self, invoices: &[Invoice]) -> Result<()>;
    
    /// 查询列表（分页+筛选）
    pub fn find_all(&self, filter: InvoiceFilter, pagination: Pagination) -> Result<PagedResult<Invoice>>;
    
    /// 按 ID 查询
    pub fn find_by_id(&self, id: &str) -> Result<Option<Invoice>>;
    
    /// 更新发票
    pub fn update(&self, invoice: &Invoice) -> Result<()>;
    
    /// 删除发票
    pub fn delete(&self, id: &str) -> Result<()>;
    
    /// 批量删除
    pub fn delete_batch(&self, ids: &[String]) -> Result<()>;
    
    /// 检查重复（按发票代码+号码）
    pub fn check_duplicate(&self, code: &str, number: &str) -> Result<bool>;
}

// 筛选条件
pub struct InvoiceFilter {
    pub invoice_type: Option<InvoiceType>,
    pub date_from: Option<String>,
    pub date_to: Option<String>,
    pub amount_min: Option<f64>,
    pub amount_max: Option<f64>,
    pub keyword: Option<String>,  // 搜索商品名、备注等
    pub category: Option<String>,
}
```

### 4.4 导出模块

**职责**: Excel 导出

```rust
// services/export.rs
pub struct ExportService;

impl ExportService {
    /// 导出发票列表到 Excel
    pub fn export_to_excel(invoices: &[Invoice], output_path: &Path) -> Result<()>;
    
    /// 按模板导出
    pub fn export_with_template(invoices: &[Invoice], template: ExportTemplate, output_path: &Path) 
        -> Result<()>;
}

// 导出模板配置
pub struct ExportTemplate {
    pub columns: Vec<ExportColumn>,  // 要导出的列
    pub date_format: String,
    pub include_header: bool,
}
```

---

## 五、前端界面规划

### 5.1 主界面布局

```
┌────────────────────────────────────────────────────────────┐
│  [Logo] 发票识别助手                         [设置] [导出] │ <- Header
├────────────┬───────────────────────────────────────────────┤
│            │                                               │
│  📋 发票   │  ┌─────────────────────────────────────────┐ │
│            │  │         拖拽文件到此处上传               │ │
│  ⚙️ 设置   │  │      或点击选择图片/PDF文件             │ │
│            │  └─────────────────────────────────────────┘ │
│  📊 统计   │                                               │
│  (预留)    │  ┌─ 筛选条件 ──────────────────────────────┐ │
│            │  │ 类型[▼] 日期[____~____] 金额[___~___]   │ │
│            │  │ 搜索[___________________] [搜索]        │ │
│            │  └─────────────────────────────────────────┘ │
│            │                                               │
│            │  ┌─ 发票列表 ──────────────────────────────┐ │
│            │  │ □ 日期     类型     金额    卖方   操作  │ │
│            │  │ ☑ 2024-01 增值税   ¥1000   A公司  [👁][🗑]│ │
│            │  │ □ 2024-01 电子票   ¥500    B公司  [👁][🗑]│ │
│            │  │ ...                                      │ │
│            │  └─────────────────────────────────────────┘ │
│            │  [批量删除]  [批量导出]     < 1 2 3 ... 10 > │
│            │                                               │
└────────────┴───────────────────────────────────────────────┘
           Sidebar                     Main Content
```

### 5.2 页面规划

#### 5.2.1 首页 (HomePage)

- **文件上传区**: react-dropzone 实现拖拽上传
- **筛选条件栏**: 类型、日期范围、金额范围、关键字搜索
- **发票表格**: tanstack/react-table 实现
  - 列: 选择框、日期、类型、金额、商品名、卖方、操作
  - 支持排序、多选
- **分页**: 底部分页控件
- **批量操作**: 批量删除、批量导出

#### 5.2.2 发票详情 (Modal)

- 发票图片预览
- 完整发票信息展示
- 编辑功能（修改分类、备注）
- 重新识别按钮

#### 5.2.3 设置页 (SettingsPage)

- 百度 OCR API 配置
  - API Key 输入
  - Secret Key 输入
  - 测试连接按钮
- 导出配置
  - 默认导出路径
  - 导出列选择
- 数据管理
  - 数据库路径显示
  - 清空数据按钮（带确认）

### 5.3 状态管理 (Zustand)

```typescript
// invoiceStore.ts
interface InvoiceStore {
  // 状态
  invoices: Invoice[];
  selectedIds: string[];
  filter: InvoiceFilter;
  pagination: Pagination;
  loading: boolean;
  
  // 操作
  fetchInvoices: () => Promise<void>;
  addInvoice: (file: File) => Promise<void>;
  deleteInvoice: (id: string) => Promise<void>;
  updateFilter: (filter: Partial<InvoiceFilter>) => void;
  selectInvoice: (id: string) => void;
  selectAll: () => void;
  clearSelection: () => void;
}

// settingsStore.ts
interface SettingsStore {
  apiKey: string;
  secretKey: string;
  accessToken: string | null;
  exportPath: string;
  
  saveApiConfig: (key: string, secret: string) => Promise<void>;
  testConnection: () => Promise<boolean>;
  loadSettings: () => Promise<void>;
}

// uiStore.ts
interface UIStore {
  sidebarOpen: boolean;
  detailModalOpen: boolean;
  selectedInvoiceId: string | null;
  
  toggleSidebar: () => void;
  openDetail: (id: string) => void;
  closeDetail: () => void;
}
```

---

## 六、开发阶段划分

### Phase 1: 基础架构 (预计 2-3 天)

**目标**: 建立项目骨架，打通前后端数据流

| 任务 | Owner | 优先级 |
|-----|-------|-------|
| 1.1 创建 Rust 模块结构 | code-writer | P0 |
| 1.2 实现数据库初始化和迁移 | code-writer | P0 |
| 1.3 实现配置 CRUD | code-writer | P0 |
| 1.4 创建前端目录结构 | code-writer | P0 |
| 1.5 实现基础 UI 组件 | code-writer | P0 |
| 1.6 实现 Zustand stores 骨架 | code-writer | P0 |
| 1.7 打通前后端调用示例 | code-writer | P0 |

### Phase 2: OCR 核心功能 (预计 2-3 天)

**目标**: 实现发票识别核心流程

| 任务 | Owner | 优先级 |
|-----|-------|-------|
| 2.1 实现百度 OCR 认证 | code-writer | P0 |
| 2.2 实现增值税发票识别 | code-writer | P0 |
| 2.3 实现响应解析和数据模型映射 | code-writer | P0 |
| 2.4 实现文件读取和 base64 编码 | code-writer | P0 |
| 2.5 实现 PDF 转图片 | code-writer | P1 |
| 2.6 添加更多发票类型支持 | code-writer | P1 |

### Phase 3: 前端界面 (预计 3-4 天)

**目标**: 完成主要用户界面

| 任务 | Owner | 优先级 |
|-----|-------|-------|
| 3.1 实现布局组件 (Sidebar/Header) | code-writer | P0 |
| 3.2 实现文件上传组件 | code-writer | P0 |
| 3.3 实现发票列表表格 | code-writer | P0 |
| 3.4 实现筛选条件栏 | code-writer | P0 |
| 3.5 实现发票详情 Modal | code-writer | P1 |
| 3.6 实现设置页面 | code-writer | P0 |
| 3.7 实现 Toast 通知 | code-writer | P1 |

### Phase 4: 数据管理和导出 (预计 2 天)

**目标**: 完善数据操作和导出功能

| 任务 | Owner | 优先级 |
|-----|-------|-------|
| 4.1 实现发票 CRUD 完整流程 | code-writer | P0 |
| 4.2 实现批量操作 | code-writer | P1 |
| 4.3 实现 Excel 导出 | code-writer | P0 |
| 4.4 实现分页和筛选 | code-writer | P1 |

### Phase 5: 完善和测试 (预计 2 天)

**目标**: 完善体验，修复问题

| 任务 | Owner | 优先级 |
|-----|-------|-------|
| 5.1 错误处理完善 | code-writer | P0 |
| 5.2 加载状态和空状态 | code-writer | P1 |
| 5.3 数据验证 | code-writer | P1 |
| 5.4 集成测试 | test-writer | P1 |
| 5.5 代码 Review | code-reviewer | P1 |

---

## 七、Tauri Commands 清单

### 发票相关

```rust
#[tauri::command]
async fn recognize_invoice(file_path: String, invoice_type: Option<String>) -> Result<Invoice, String>;

#[tauri::command]
async fn recognize_invoice_from_base64(base64: String, invoice_type: Option<String>) -> Result<Invoice, String>;

#[tauri::command]
fn get_invoices(filter: InvoiceFilter, page: u32, page_size: u32) -> Result<PagedResult<Invoice>, String>;

#[tauri::command]
fn get_invoice(id: String) -> Result<Option<Invoice>, String>;

#[tauri::command]
fn update_invoice(invoice: Invoice) -> Result<(), String>;

#[tauri::command]
fn delete_invoice(id: String) -> Result<(), String>;

#[tauri::command]
fn delete_invoices(ids: Vec<String>) -> Result<(), String>;
```

### 配置相关

```rust
#[tauri::command]
fn get_config(key: String) -> Result<Option<String>, String>;

#[tauri::command]
fn set_config(key: String, value: String) -> Result<(), String>;

#[tauri::command]
async fn test_ocr_connection(api_key: String, secret_key: String) -> Result<bool, String>;
```

### 导出相关

```rust
#[tauri::command]
fn export_invoices(ids: Vec<String>, output_path: String) -> Result<String, String>;

#[tauri::command]
fn export_all_invoices(filter: InvoiceFilter, output_path: String) -> Result<String, String>;
```

### 文件相关

```rust
#[tauri::command]
fn validate_file(file_path: String) -> Result<FileInfo, String>;
```

---

## 八、风险和注意事项

### 技术风险

| 风险 | 影响 | 缓解措施 |
|-----|------|---------|
| PDF 转图片依赖复杂 | 可能需要额外依赖 | 优先支持图片，PDF 作为 P1 |
| 百度 OCR API 调用频率限制 | 批量识别可能触发限流 | 添加请求间隔，支持重试 |
| 大文件处理性能 | 大图片/PDF 可能卡顿 | 异步处理，进度显示 |

### 安全注意

- API 密钥存储：存数据库而非代码，不在日志中输出
- 文件路径：验证路径合法性，防止路径遍历

### 后续扩展预留

- 统计报表：预留 category 字段和统计视图
- 批量导入：当前设计支持批量，可后续优化 UI
- 云同步：当前本地存储，结构支持后续扩展

---

## 九、当前状态

- **项目阶段**: 规划完成，待开发
- **下一步**: Phase 1 - 基础架构搭建
- **阻塞项**: 无

---

*最后更新: 2024-12-01*
