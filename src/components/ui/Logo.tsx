// @ts-nocheck
import logoWhite from '../../assets/logo-white.png';
import logoBlue from '../../assets/logo-blue.png';

/**
 * Reusable brand logo.
 *
 * @param {"light"|"dark"} variant
 *   "light"  → blue logo  (for white / light backgrounds)
 *   "dark"   → white logo  (for blue / dark backgrounds)
 *   Defaults to "light".
 *
 * @param {string} className  Extra Tailwind classes (height, margin, etc.)
 */
function Logo({ variant = 'light', className = 'h-6 lg:h-7' }) {
    const src = variant === 'dark' ? logoWhite : logoBlue;

    return (
        <img
            src={src}
            alt="Tradazone"
            className={`object-contain ${className}`}
        />
    );
}

export default Logo;
