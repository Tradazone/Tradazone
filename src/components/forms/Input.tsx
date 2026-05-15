// @ts-nocheck
function Input({
    label,
    type = 'text',
    placeholder,
    value,
    onChange,
    error,
    hint,
    disabled,
    required,
    name,
    id,
    className = '',
    ...props
}) {
    const inputId = id || name;

    return (
        <div className={`flex flex-col gap-1.5 ${className}`}>
            {label && (
                <label htmlFor={inputId} className="text-xs font-medium text-t-secondary uppercase tracking-wide">
                    {label}
                    {required && <span className="text-error ml-0.5">*</span>}
                </label>
            )}
            <input
                type={type}
                id={inputId}
                name={name}
                placeholder={placeholder}
                value={value}
                onChange={onChange}
                disabled={disabled}
                className={`w-full px-3 py-2.5 text-sm bg-white border rounded-lg outline-none transition-colors ${error
                        ? 'border-error focus:border-error'
                        : 'border-border focus:border-brand'
                    } ${disabled ? 'bg-gray-50 text-t-muted cursor-not-allowed' : ''}`}
                {...props}
            />
            {error && <span className="text-xs text-error">{error}</span>}
            {hint && !error && <span className="text-xs text-t-muted">{hint}</span>}
        </div>
    );
}

export default Input;
