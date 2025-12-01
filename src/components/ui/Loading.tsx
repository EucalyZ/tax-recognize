import { Loader2 } from 'lucide-react';

export interface LoadingProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
}

const sizeStyles: Record<NonNullable<LoadingProps['size']>, { icon: string; text: string }> = {
  sm: { icon: 'h-4 w-4', text: 'text-sm' },
  md: { icon: 'h-6 w-6', text: 'text-base' },
  lg: { icon: 'h-8 w-8', text: 'text-lg' },
};

export function Loading({ size = 'md', text }: LoadingProps) {
  const styles = sizeStyles[size];

  return (
    <div className="flex flex-col items-center justify-center gap-2">
      <Loader2 className={`${styles.icon} animate-spin text-blue-600`} />
      {text && (
        <span className={`${styles.text} text-gray-600`}>{text}</span>
      )}
    </div>
  );
}

/**
 * 全屏加载状态
 */
export function FullScreenLoading({ text = '加载中...' }: { text?: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80">
      <Loading size="lg" text={text} />
    </div>
  );
}

/**
 * 内联加载状态（用于按钮等场景）
 */
export function InlineLoading({ size = 'sm' }: { size?: 'sm' | 'md' }) {
  const iconSize = size === 'sm' ? 'h-4 w-4' : 'h-5 w-5';
  return <Loader2 className={`${iconSize} animate-spin`} />;
}
