// @ts-nocheck
import { useEffect, useId, useRef } from 'react';
import { getPlainTextFromRichText, normalizeRichTextHtml } from '../../utils/richText';

const TOOLBAR_ACTIONS = [
    { command: 'bold', label: 'Bold', text: 'B' },
    { command: 'italic', label: 'Italic', text: 'I' },
    { command: 'insertUnorderedList', label: 'Bullets', text: 'List' },
    { command: 'clear', label: 'Clear formatting', text: 'Clear' },
];

function RichTextEditor({
    label,
    value,
    onChange,
    error,
    hint,
    placeholder,
    required,
    id,
    className = '',
}) {
    const generatedId = useId().replace(/:/g, '');
    const editorId = id || `rich-text-editor-${generatedId}`;
    const editorRef = useRef(null);
    const normalizedValue = normalizeRichTextHtml(value);
    const isEmpty = getPlainTextFromRichText(normalizedValue).length === 0;

    useEffect(() => {
        if (!editorRef.current) return;
        if (editorRef.current.innerHTML !== normalizedValue) {
            editorRef.current.innerHTML = normalizedValue;
        }
    }, [normalizedValue]);

    const emitChange = () => {
        if (!editorRef.current || !onChange) return;

        const nextValue = normalizeRichTextHtml(editorRef.current.innerHTML);
        if (editorRef.current.innerHTML !== nextValue) {
            editorRef.current.innerHTML = nextValue;
        }
        onChange(nextValue);
    };

    const applyCommand = (command) => {
        if (!editorRef.current) return;

        editorRef.current.focus();

        if (command === 'clear') {
            editorRef.current.innerHTML = '';
            onChange?.('');
            return;
        }

        if (typeof document.execCommand === 'function') {
            document.execCommand(command, false, null);
            emitChange();
        }
    };

    return (
        <div className={`flex flex-col gap-1.5 ${className}`}>
            {label && (
                <label htmlFor={editorId} className="text-xs font-medium text-t-secondary uppercase tracking-wide">
                    {label}
                    {required && <span className="text-error ml-0.5">*</span>}
                </label>
            )}

            <div className={`border rounded-lg bg-white ${error ? 'border-error' : 'border-border'}`}>
                <div className="flex flex-wrap items-center gap-2 px-3 py-2 border-b border-border bg-gray-50 rounded-t-lg">
                    {TOOLBAR_ACTIONS.map((action) => (
                        <button
                            key={action.command}
                            type="button"
                            aria-label={action.label}
                            className="inline-flex min-w-8 items-center justify-center rounded-md border border-border bg-white px-2 py-1 text-xs font-semibold text-t-secondary hover:border-brand hover:text-brand"
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => applyCommand(action.command)}
                        >
                            {action.text}
                        </button>
                    ))}
                </div>

                <div className="relative">
                    {placeholder && isEmpty && (
                        <span className="pointer-events-none absolute left-3 top-3 text-sm text-t-muted">
                            {placeholder}
                        </span>
                    )}

                    <div
                        id={editorId}
                        ref={editorRef}
                        role="textbox"
                        aria-label={label}
                        aria-multiline="true"
                        contentEditable
                        suppressContentEditableWarning
                        className="min-h-36 px-3 py-3 text-sm text-t-primary outline-none"
                        onInput={emitChange}
                        onBlur={emitChange}
                    />
                </div>
            </div>

            {error && <span className="text-xs text-error">{error}</span>}
            {hint && !error && <span className="text-xs text-t-muted">{hint}</span>}
        </div>
    );
}

export default RichTextEditor;
