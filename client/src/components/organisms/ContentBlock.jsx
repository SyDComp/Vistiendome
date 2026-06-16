import React from 'react';
import { Link } from 'react-router-dom';
import Button from '../atoms/Button';
import SmartImage from '../atoms/SmartImage';
import './ContentBlock.css';

const ContentBlock = ({ block, onAction }) => {
    const {
        title,
        description,
        image,
        layout = 'image_right',
        styles = {},
        button
    } = block;

    const isImageRight = layout === 'image_right';

    // Helper to resolve image url
    const resolveImageUrl = (src) => {
        if (!src) return null;
        if (src.startsWith('http')) return src;
        // Prefix with API base URL for relative paths (like /static/uploads/...)
        const baseUrl = (import.meta.env.VITE_API_URL || '/api/v1').replace('/api/v1', '');
        const path = src.startsWith('/') ? src : `/${src}`;
        return `${baseUrl}${path}`;
    };

    const imageUrl = resolveImageUrl(image);

    // Custom styles
    const containerStyle = {
        backgroundColor: styles.backgroundColor || '#ffffff',
        color: styles.textColor || '#333333',
        textAlign: styles.textAlign || 'left'
    };

    const renderTextWithNewlines = (text) => {
        if (!text) return null;
        return text.split('\n').map((line, i) => (
            <React.Fragment key={i}>
                {line}
                {i < text.split('\n').length - 1 && <br />}
            </React.Fragment>
        ));
    };

    if (block.visible === false) return null;

    // Helper for text color contrast
    const getContrastYIQ = (hexcolor) => {
        if (!hexcolor) return '#ffffff';
        hexcolor = hexcolor.replace('#', '');
        var r = parseInt(hexcolor.substr(0, 2), 16);
        var g = parseInt(hexcolor.substr(2, 2), 16);
        var b = parseInt(hexcolor.substr(4, 2), 16);
        var yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
        return (yiq >= 128) ? '#000000' : '#ffffff';
    };

    const renderElement = (element, index) => {
        const key = element.id || index;
        switch (element.type) {
            case 'heading':
                return (
                    <h2 key={key} className="content-title" style={{ color: element.styles?.color, fontSize: element.styles?.fontSize, textAlign: element.styles?.textAlign || styles.textAlign || 'left', width: '100%' }}>
                        {renderTextWithNewlines(element.content)}
                    </h2>
                );
            case 'paragraph':
                return (
                    <p key={key} className="content-description" style={{ color: element.styles?.color, fontSize: element.styles?.fontSize, textAlign: element.styles?.textAlign || styles.textAlign || 'left', width: '100%' }}>
                        {renderTextWithNewlines(element.content)}
                    </p>
                );
            case 'image':
                return (
                    <div key={key} className="element-image-container" style={{
                        maxWidth: element.styles?.width || '100%',
                        width: '100%', // Ensure width is not 0 in flex environments
                        margin: '1rem 0'
                    }}>
                        <SmartImage 
                            src={resolveImageUrl(element.image)}
                            settings={element.image_settings}
                        />
                    </div>
                );
            case 'button_group':
                return (
                    <div key={key} className="content-actions" style={{ gap: '1rem', display: 'flex', flexWrap: 'wrap', justifyContent: styles.textAlign === 'center' ? 'center' : (styles.textAlign === 'right' ? 'flex-end' : 'flex-start') }}>
                        {element.buttons?.map((btn, btnIdx) => {
                            const textColor = btn.customColor ? getContrastYIQ(btn.customColor) : undefined;
                            const btnStyle = btn.customColor ? {
                                background: btn.variant === 'outline' ? 'transparent' : btn.customColor,
                                borderColor: btn.customColor,
                                color: btn.variant === 'outline' ? btn.customColor : textColor
                            } : {};

                            // External/Special Action Button
                            if (btn.linkType === 'product') {
                                return (
                                    <Button
                                        key={btnIdx}
                                        variant={btn.variant || 'primary'}
                                        style={btnStyle}
                                        onClick={() => onAction && onAction('open_product', btn.productId)}
                                    >
                                        {btn.text}
                                    </Button>
                                );
                            }

                            if (btn.linkType === 'workshop') {
                                return (
                                    <Button
                                        key={btnIdx}
                                        variant={btn.variant || 'primary'}
                                        style={btnStyle}
                                        onClick={() => onAction && onAction('open_workshop', btn.workshopId)}
                                    >
                                        {btn.text}
                                    </Button>
                                );
                            }

                            // Standard Link
                            return (
                                <Link key={btnIdx} to={btn.link || '#'}>
                                    <Button variant={btn.variant || 'primary'} style={btnStyle}>{btn.text}</Button>
                                </Link>
                            );
                        })}
                    </div>
                );
            case 'spacer':
                return <div key={key} style={{ height: element.styles?.height || '2rem' }} />;
            default:
                return null;
        }
    };

    // New "Page Builder" Mode
    if (block.elements && Array.isArray(block.elements)) {
        return (
            <section className={`content-block builder-section`} style={containerStyle}>
                <div className="builder-container" style={{
                    maxWidth: '1200px',
                    margin: '0 auto',
                    padding: '0 2rem',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: styles.textAlign === 'center' ? 'center' : (styles.textAlign === 'right' ? 'flex-end' : 'flex-start'),
                    textAlign: styles.textAlign || 'left'
                }}>
                    {block.elements.map((el, idx) => renderElement(el, idx))}
                </div>
            </section>
        )
    }

    // Legacy / Fixed Layout Mode (Backward Compatibility)
    return (
        <section className={`content-block ${layout}`} style={containerStyle}>
            <div className={`content-block-container ${isImageRight ? 'row' : 'row-reverse'}`} style={{
                justifyContent: styles.textAlign === 'center' ? 'center' : 'space-between'
            }}>

                {/* Text Content */}
                <div className="content-text-wrapper" style={{
                    alignItems: styles.textAlign === 'center' ? 'center' : (styles.textAlign === 'right' ? 'flex-end' : 'flex-start')
                }}>
                    {title && <h2 className="content-title">{renderTextWithNewlines(title)}</h2>}
                    {description && <p className="content-description">{description}</p>}

                    {button && button.text && (
                        <div className="content-actions">
                            {button.variant === 'link' ? (
                                <Link to={button.link || '#'} className="content-link">
                                    {button.text} →
                                </Link>
                            ) : (
                                <Link to={button.link || '#'}>
                                    <Button variant={button.variant || 'primary'}>{button.text}</Button>
                                </Link>
                            )}
                        </div>
                    )}
                </div>

                {/* Image Content */}
                <div className="content-image-wrapper" style={{ width: '100%', maxWidth: '500px' }}>
                    {imageUrl && (
                        <SmartImage 
                            src={imageUrl}
                            settings={block.image_settings}
                        />
                    )}
                </div>
            </div>
        </section>
    );
};

export default ContentBlock;
