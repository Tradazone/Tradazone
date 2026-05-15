// @ts-nocheck
function Button({
    children,
    variant = 'primary',
    size = 'medium',
    icon: Icon,
    iconPosition = 'left',
    disabled,
    loading,
    type = 'button',
    onClick,
    className = '',
    ...props
}) {
    const baseClasses = 'inline-flex items-center justify-center gap-2 font-semibold text-sm transition-all active:scale-95';

    const variantClasses = {
        primary: 'bg-brand text-white hover:bg-brand-dark',
        secondary: 'bg-white text-t-primary border border-border hover:bg-gray-50',
        danger: 'bg-error text-white hover:bg-red-600',
        ghost: 'bg-transparent text-t-secondary hover:bg-gray-100',
    };

    const sizeClasses = {
        small: 'px-3 py-2 h-9 text-xs',
        medium: 'px-4 py-2.5 h-10',
        large: 'px-5 py-3 h-12',
    };

    return (
        <button
            type={type}
            className={`${baseClasses} ${variantClasses[variant] || variantClasses.primary} ${sizeClasses[size] || sizeClasses.medium} ${disabled || loading ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
            disabled={disabled || loading}
            onClick={onClick}
            {...props}
        >
            {loading && <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />}
            {Icon && iconPosition === 'left' && <Icon size={18} />}
            {children && <span>{children}</span>}
            {Icon && iconPosition === 'right' && <Icon size={18} />}
        </button>
    );
}

export default Button;
