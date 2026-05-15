// @ts-nocheck
import { useNavigate } from 'react-router-dom';

/**
 * Reusable empty state component for list pages.
 *
 * Props:
 *  - icon: Lucide icon component
 *  - title: string
 *  - description: string
 *  - actionLabel: string (button label)
 *  - actionPath: string (route to navigate to)
 */
function EmptyState({ icon: Icon, title, description, actionLabel, actionPath }) {
    const navigate = useNavigate();

    return (
        <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
            <div className="w-16 h-16 rounded-2xl bg-brand/8 flex items-center justify-center mb-5">
                {Icon && <Icon size={28} className="text-brand/60" strokeWidth={1.5} />}
            </div>
            <h3 className="text-base font-semibold text-t-primary mb-2">{title}</h3>
            <p className="text-sm text-t-muted max-w-xs mb-6">{description}</p>
            {actionLabel && actionPath && (
                <button
                    onClick={() => navigate(actionPath)}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 h-10 bg-brand text-white text-sm font-semibold hover:bg-brand-dark active:scale-95 transition-all shadow-sm shadow-brand/20"
                >
                    {actionLabel}
                </button>
            )}
        </div>
    );
}

export default EmptyState;
