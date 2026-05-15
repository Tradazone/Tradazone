// @ts-nocheck
function Toggle({
    label,
    checked,
    onChange,
    disabled,
    name,
    id,
    className = '',
    ...props
}) {
    const toggleId = id || name;

    return (
        <label className={`inline-flex items-center gap-3 cursor-pointer ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}>
            <input
                type="checkbox"
                id={toggleId}
                name={name}
                checked={checked}
                onChange={onChange}
                disabled={disabled}
                className="sr-only peer"
                {...props}
            />
            <div className="relative w-10 h-5 bg-border-medium rounded-full peer-checked:bg-brand transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:w-4 after:h-4 after:transition-transform peer-checked:after:translate-x-5" />
            {label && <span className="text-sm text-t-primary">{label}</span>}
        </label>
    );
}

export default Toggle;
