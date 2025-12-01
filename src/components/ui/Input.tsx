export interface InputProps {
  label?: string;
  error?: string;
  type?: 'text' | 'password' | 'number';
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
  id?: string;
  disabled?: boolean;
}

export function Input({
  label,
  error,
  type = 'text',
  placeholder,
  value,
  onChange,
  className = '',
  id,
  disabled = false,
}: InputProps) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

  const inputStyles = [
    'w-full px-3 py-2',
    'border rounded-lg',
    'transition-colors duration-200',
    'focus:outline-none focus:ring-2 focus:ring-offset-0',
    error
      ? 'border-red-500 focus:border-red-500 focus:ring-red-200'
      : 'border-gray-300 focus:border-blue-500 focus:ring-blue-200',
    disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white',
    className,
  ].join(' ');

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={inputId}
          className="block mb-1.5 text-sm font-medium text-gray-700"
        >
          {label}
        </label>
      )}
      <input
        id={inputId}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className={inputStyles}
      />
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}
