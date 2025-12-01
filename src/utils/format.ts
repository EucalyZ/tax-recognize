/**
 * 格式化金额
 * @param amount 金额数值
 * @param options 格式化选项
 */
export function formatAmount(
  amount: number | undefined | null,
  options: {
    currency?: string;
    decimals?: number;
    fallback?: string;
  } = {}
): string {
  const { currency = '¥', decimals = 2, fallback = '-' } = options;

  if (amount === undefined || amount === null) {
    return fallback;
  }

  const formatted = amount.toLocaleString('zh-CN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return `${currency}${formatted}`;
}

/**
 * 格式化日期
 * @param dateStr 日期字符串 (ISO 8601 或 YYYY-MM-DD)
 * @param format 输出格式
 */
export function formatDate(
  dateStr: string | undefined | null,
  format: 'short' | 'long' | 'full' = 'short'
): string {
  if (!dateStr) {
    return '-';
  }

  try {
    const date = new Date(dateStr);

    if (isNaN(date.getTime())) {
      return dateStr;
    }

    const options: Intl.DateTimeFormatOptions =
      format === 'short'
        ? { year: 'numeric', month: '2-digit', day: '2-digit' }
        : format === 'long'
        ? { year: 'numeric', month: 'long', day: 'numeric' }
        : {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          };

    return date.toLocaleDateString('zh-CN', options);
  } catch {
    return dateStr;
  }
}

/**
 * 格式化文件大小
 * @param bytes 字节数
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';

  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${units[i]}`;
}

/**
 * 截断文本
 * @param text 原始文本
 * @param maxLength 最大长度
 * @param suffix 截断后缀
 */
export function truncateText(
  text: string | undefined | null,
  maxLength: number,
  suffix = '...'
): string {
  if (!text) {
    return '';
  }

  if (text.length <= maxLength) {
    return text;
  }

  return text.slice(0, maxLength - suffix.length) + suffix;
}

/**
 * 格式化税号（添加空格分隔）
 * @param taxNumber 税号
 */
export function formatTaxNumber(taxNumber: string | undefined | null): string {
  if (!taxNumber) {
    return '-';
  }

  // 每4位添加空格
  return taxNumber.replace(/(.{4})/g, '$1 ').trim();
}
