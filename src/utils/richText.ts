// @ts-nocheck
const ELEMENT_NODE = 1;
const COMMENT_NODE = 8;

const ALLOWED_TAGS = new Set([
    'BR',
    'DIV',
    'EM',
    'I',
    'LI',
    'OL',
    'P',
    'STRONG',
    'B',
    'UL',
]);

function unwrapElement(element) {
    const parent = element.parentNode;
    if (!parent) return;

    while (element.firstChild) {
        parent.insertBefore(element.firstChild, element);
    }
    parent.removeChild(element);
}

function moveChildren(source, target) {
    while (source.firstChild) {
        target.appendChild(source.firstChild);
    }
}

function sanitizeNodeTree(root, doc) {
    Array.from(root.childNodes).forEach((node) => {
        if (node.nodeType === COMMENT_NODE) {
            node.remove();
            return;
        }

        if (node.nodeType !== ELEMENT_NODE) {
            return;
        }

        sanitizeNodeTree(node, doc);

        const tagName = node.tagName.toUpperCase();

        if (tagName === 'SCRIPT' || tagName === 'STYLE') {
            node.remove();
            return;
        }

        Array.from(node.attributes).forEach((attribute) => {
            node.removeAttribute(attribute.name);
        });

        if (tagName === 'B') {
            const strong = doc.createElement('strong');
            moveChildren(node, strong);
            node.replaceWith(strong);
            return;
        }

        if (tagName === 'I') {
            const emphasis = doc.createElement('em');
            moveChildren(node, emphasis);
            node.replaceWith(emphasis);
            return;
        }

        if (!ALLOWED_TAGS.has(tagName)) {
            unwrapElement(node);
        }
    });
}

export function getPlainTextFromRichText(value = '') {
    const normalized = typeof value === 'string' ? value.trim() : '';
    if (!normalized) return '';

    if (typeof document === 'undefined') {
        return normalized.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    }

    const container = document.createElement('div');
    container.innerHTML = normalized;
    return container.textContent?.replace(/\s+/g, ' ').trim() || '';
}

export function normalizeRichTextHtml(value = '') {
    const raw = typeof value === 'string' ? value.trim() : '';
    if (!raw) return '';

    if (typeof document === 'undefined') {
        return raw;
    }

    const container = document.createElement('div');
    container.innerHTML = raw;
    sanitizeNodeTree(container, document);

    const normalized = container.innerHTML.trim();
    return getPlainTextFromRichText(normalized) ? normalized : '';
}

