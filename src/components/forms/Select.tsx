// @ts-nocheck
import { ChevronDown } from 'lucide-react';

function Select({
    label,
    options = [],
    value,
    onChange,
    placeholder = 'Select...',
    error,
    disabled,
    required,
    name,
    id,
    className = '',
    ...props
}) {
    const selectId = id || name;

    return (
        <div className={`flex flex-col gap-1.5 ${className}`}>
            {label && (
                <label htmlFor={selectId} className="text-xs font-medium text-t-secondary uppercase tracking-wide">
                    {label}
                    {required && <span className="text-error ml-0.5">*</span>}
                </label>
            )}
            <div className="relative">
                <select
                    id={selectId}
                    name={name}
                    value={value}
                    onChange={onChange}
                    disabled={disabled}
                    className={`w-full px-3 py-2.5 text-sm bg-white border rounded-lg outline-none appearance-none pr-10 transition-colors ${error ? 'border-error' : 'border-border focus:border-brand'
                        } ${disabled ? 'bg-gray-50 text-t-muted cursor-not-allowed' : ''}`}
                    {...props}
                >
                    <option value="" disabled>{placeholder}</option>
                    {options.map((option) => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>
                <ChevronDown size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-t-muted pointer-events-none" />
            </div>
            {error && <span className="text-xs text-error">{error}</span>}
        </div>
    );
}

export default Select;
