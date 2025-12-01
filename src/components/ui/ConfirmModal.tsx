import { Modal } from './Modal';
import { Button } from './Button';
import { AlertTriangle } from 'lucide-react';

export interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  loading?: boolean;
}

const variantStyles = {
  danger: {
    icon: 'text-red-500 bg-red-100',
    button: 'danger' as const,
  },
  warning: {
    icon: 'text-yellow-500 bg-yellow-100',
    button: 'primary' as const,
  },
  info: {
    icon: 'text-blue-500 bg-blue-100',
    button: 'primary' as const,
  },
};

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = '确定',
  cancelText = '取消',
  variant = 'danger',
  loading = false,
}: ConfirmModalProps) {
  const styles = variantStyles[variant];

  const footer = (
    <>
      <Button variant="ghost" onClick={onClose} disabled={loading}>
        {cancelText}
      </Button>
      <Button variant={styles.button} onClick={onConfirm} loading={loading}>
        {confirmText}
      </Button>
    </>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} footer={footer} size="sm">
      <div className="flex items-start gap-4">
        <div className={`p-2 rounded-full ${styles.icon}`}>
          <AlertTriangle className="h-5 w-5" />
        </div>
        <p className="text-gray-600 pt-1">{message}</p>
      </div>
    </Modal>
  );
}
