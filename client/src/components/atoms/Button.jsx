import './Button.css';

export default function Button({
    children,
    variant = 'primary',
    size = 'md',
    onClick,
    disabled = false,
    type = 'button',
    fullWidth = false,
    style = {}
}) {
    const classes = [
        'btn',
        `btn--${variant}`,
        `btn--${size}`,
        fullWidth && 'btn--full-width',
        disabled && 'btn--disabled'
    ].filter(Boolean).join(' ');

    return (
        <button
            type={type}
            className={classes}
            onClick={onClick}
            disabled={disabled}
            style={style}
        >
            {children}
        </button>
    );
}
