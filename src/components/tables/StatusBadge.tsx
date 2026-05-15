// @ts-nocheck
const statusConfig = {
    paid: { label: 'Paid', classes: 'bg-success-bg text-success' },
    unpaid: { label: 'Unpaid', classes: 'bg-warning-bg text-warning' },
    pending: { label: 'Pending', classes: 'bg-info-bg text-info' },
    overdue: { label: 'Overdue', classes: 'bg-error-bg text-error' },
    active: { label: 'Active', classes: 'bg-success-bg text-success' },
    inactive: { label: 'Inactive', classes: 'bg-gray-100 text-t-muted' },
    completed: { label: 'Completed', classes: 'bg-success-bg text-success' },
    cancelled: { label: 'Cancelled', classes: 'bg-error-bg text-error' },
    draft: { label: 'Draft', classes: 'bg-gray-100 text-t-muted' },
};

function StatusBadge({ status, className = '' }) {
    const config = statusConfig[status?.toLowerCase()] || {
        label: status,
        classes: 'bg-gray-100 text-t-muted'
    };

    return (
        <span className={`inline-flex items-center px-3 py-1 text-xs font-medium ${config.classes} ${className}`}>
            {config.label}
        </span>
    );
}

export default StatusBadge;
