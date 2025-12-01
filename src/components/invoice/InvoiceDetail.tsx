import { useEffect, useState, useCallback } from 'react';
import { Save, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Loading } from '../ui/Loading';
import { Invoice, InvoiceTypeLabels } from '../../types/invoice';
import { invoiceService } from '../../services/invoiceService';
import { formatAmount, formatDate, formatTaxNumber } from '../../utils/format';

interface InvoiceDetailProps {
  invoiceId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate?: () => void;
}

export function InvoiceDetail({
  invoiceId,
  isOpen,
  onClose,
  onUpdate,
}: InvoiceDetailProps) {
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // 可编辑字段
  const [category, setCategory] = useState('');
  const [remark, setRemark] = useState('');
  const [hasChanges, setHasChanges] = useState(false);

  /** 加载发票详情 */
  useEffect(() => {
    if (!invoiceId || !isOpen) {
      return;
    }

    const loadInvoice = async () => {
      setLoading(true);
      try {
        const data = await invoiceService.getInvoice(invoiceId);
        if (data) {
          setInvoice(data);
          setCategory(data.category || '');
          setRemark(data.remark || '');
          setHasChanges(false);
        } else {
          toast.error('发票不存在');
          onClose();
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : '加载发票详情失败';
        toast.error(message);
        onClose();
      } finally {
        setLoading(false);
      }
    };

    loadInvoice();
  }, [invoiceId, isOpen, onClose]);

  /** 处理分类变更 */
  const handleCategoryChange = useCallback((value: string) => {
    setCategory(value);
    setHasChanges(true);
  }, []);

  /** 处理备注变更 */
  const handleRemarkChange = useCallback((value: string) => {
    setRemark(value);
    setHasChanges(true);
  }, []);

  /** 保存更改 */
  const handleSave = useCallback(async () => {
    if (!invoice) return;

    setSaving(true);
    try {
      await invoiceService.updateInvoice({
        ...invoice,
        category,
        remark,
      });
      toast.success('保存成功');
      setHasChanges(false);
      onUpdate?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : '保存失败';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }, [invoice, category, remark, onUpdate]);

  /** 关闭时检查未保存更改 */
  const handleClose = useCallback(() => {
    if (hasChanges) {
      const confirmed = window.confirm('有未保存的更改，确定要关闭吗？');
      if (!confirmed) return;
    }
    setInvoice(null);
    setHasChanges(false);
    onClose();
  }, [hasChanges, onClose]);

  const footer = (
    <>
      <Button variant="ghost" onClick={handleClose}>
        关闭
      </Button>
      <Button onClick={handleSave} loading={saving} disabled={!hasChanges}>
        <Save className="h-4 w-4 mr-1.5" />
        保存
      </Button>
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="发票详情"
      footer={footer}
      size="2xl"
    >
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loading text="加载中..." />
        </div>
      ) : invoice ? (
        <div className="space-y-6">
          {/* 基本信息 */}
          <DetailSection title="基本信息">
            <DetailRow label="发票类型">
              <span className="inline-flex px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded">
                {InvoiceTypeLabels[invoice.invoiceType] || invoice.invoiceType}
              </span>
            </DetailRow>
            <DetailRow label="发票代码">{invoice.invoiceCode || '-'}</DetailRow>
            <DetailRow label="发票号码">{invoice.invoiceNumber || '-'}</DetailRow>
            <DetailRow label="开票日期">
              {formatDate(invoice.invoiceDate, 'long')}
            </DetailRow>
            <DetailRow label="校验码">{invoice.checkCode || '-'}</DetailRow>
          </DetailSection>

          {/* 金额信息 */}
          <DetailSection title="金额信息">
            <DetailRow label="不含税金额">
              {formatAmount(invoice.amountWithoutTax)}
            </DetailRow>
            <DetailRow label="税额">
              {formatAmount(invoice.taxAmount)}
            </DetailRow>
            <DetailRow label="价税合计" highlight>
              {formatAmount(invoice.totalAmount)}
            </DetailRow>
          </DetailSection>

          {/* 买卖方信息 */}
          <DetailSection title="买卖方信息">
            <DetailRow label="卖方名称">{invoice.sellerName || '-'}</DetailRow>
            <DetailRow label="卖方税号">
              {formatTaxNumber(invoice.sellerTaxNumber)}
            </DetailRow>
            <DetailRow label="买方名称">{invoice.buyerName || '-'}</DetailRow>
            <DetailRow label="买方税号">
              {formatTaxNumber(invoice.buyerTaxNumber)}
            </DetailRow>
          </DetailSection>

          {/* 商品信息 */}
          <DetailSection title="商品/服务信息">
            <DetailRow label="商品名称">{invoice.commodityName || '-'}</DetailRow>
            {invoice.commodityDetail && (
              <DetailRow label="商品明细">
                <pre className="text-sm text-gray-600 whitespace-pre-wrap">
                  {invoice.commodityDetail}
                </pre>
              </DetailRow>
            )}
          </DetailSection>

          {/* 分类和备注 - 可编辑 */}
          <DetailSection title="分类和备注">
            <div className="space-y-4">
              <Input
                label="分类"
                value={category}
                onChange={handleCategoryChange}
                placeholder="输入分类标签，如：差旅费、办公费等"
              />
              <div>
                <label className="block mb-1.5 text-sm font-medium text-gray-700">
                  备注
                </label>
                <textarea
                  value={remark}
                  onChange={(e) => handleRemarkChange(e.target.value)}
                  placeholder="输入备注信息"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </DetailSection>

          {/* 识别信息 */}
          <DetailSection title="识别信息" collapsible defaultCollapsed>
            <DetailRow label="识别置信度">
              {invoice.ocrConfidence
                ? `${(invoice.ocrConfidence * 100).toFixed(1)}%`
                : '-'}
            </DetailRow>
            <DetailRow label="原始文件">{invoice.originalFilePath || '-'}</DetailRow>
            <DetailRow label="创建时间">
              {formatDate(invoice.createdAt, 'full')}
            </DetailRow>
            <DetailRow label="更新时间">
              {formatDate(invoice.updatedAt, 'full')}
            </DetailRow>
            <DetailRow label="已核验">
              {invoice.isVerified ? (
                <span className="inline-flex items-center text-green-600">
                  <CheckCircle className="h-4 w-4 mr-1" />是
                </span>
              ) : (
                <span className="text-gray-500">否</span>
              )}
            </DetailRow>
          </DetailSection>
        </div>
      ) : null}
    </Modal>
  );
}

/** 详情区块组件 */
interface DetailSectionProps {
  title: string;
  children: React.ReactNode;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
}

function DetailSection({
  title,
  children,
  collapsible = false,
  defaultCollapsed = false,
}: DetailSectionProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <div
        className={`
          flex items-center justify-between
          px-4 py-2.5 bg-gray-50
          ${collapsible ? 'cursor-pointer' : ''}
        `}
        onClick={collapsible ? () => setCollapsed(!collapsed) : undefined}
      >
        <h3 className="text-sm font-medium text-gray-700">{title}</h3>
        {collapsible && (
          <span className="text-xs text-gray-500">
            {collapsed ? '展开' : '收起'}
          </span>
        )}
      </div>
      {!collapsed && (
        <div className="px-4 py-3 space-y-2">{children}</div>
      )}
    </div>
  );
}

/** 详情行组件 */
interface DetailRowProps {
  label: string;
  children: React.ReactNode;
  highlight?: boolean;
}

function DetailRow({ label, children, highlight = false }: DetailRowProps) {
  return (
    <div className="flex items-start">
      <span className="w-24 flex-shrink-0 text-sm text-gray-500">{label}</span>
      <span
        className={`
          text-sm flex-1
          ${highlight ? 'font-semibold text-blue-600' : 'text-gray-700'}
        `}
      >
        {children}
      </span>
    </div>
  );
}
