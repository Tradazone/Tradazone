// @ts-nocheck
const FIAT_SYMBOLS = { USD: '$', EUR: '€', GBP: '£', NGN: '₦' };

/**
 * Generates and downloads a Tradazone payment receipt as a PDF.
 *
 * @param {object} opts
 * @param {string}  opts.id              - Invoice or checkout ID
 * @param {string}  [opts.merchantName]  - Merchant display name
 * @param {string}  [opts.customerEmail] - Customer email address
 * @param {Array}   [opts.items]         - Line items [{ name, quantity, price }]
 * @param {number|string} [opts.fiatAmount]    - Amount in fiat (display only)
 * @param {string}  [opts.fiatCurrency]  - 'USD' | 'EUR' | 'GBP' | 'NGN'
 * @param {string}  opts.cryptoAmount    - Amount in selected crypto
 * @param {string}  opts.selectedCrypto  - 'STRK' | 'ETH' | 'XLM'
 * @param {string}  [opts.txHash]        - On-chain transaction hash
 * @param {string}  [opts.network]       - Network name
 * @param {string}  [opts.paidAt]        - ISO date string of payment
 */
export async function generateReceipt({
    id,
    merchantName,
    customerEmail,
    items = [],
    fiatAmount,
    fiatCurrency = 'USD',
    cryptoAmount,
    selectedCrypto,
    txHash,
    network,
    paidAt,
}) {
    const html2pdf   = (await import('html2pdf.js')).default;
    const symbol     = FIAT_SYMBOLS[fiatCurrency] || fiatCurrency;
    const dateStr    = paidAt ? new Date(paidAt).toLocaleString() : new Date().toLocaleString();
    const networkLabel = network
        ? network.charAt(0).toUpperCase() + network.slice(1)
        : selectedCrypto;

    const itemRows = items.map(item => `
        <tr>
            <td style="padding:9px 0;border-bottom:1px solid #eee;font-size:13px;">${item.name}</td>
            <td style="padding:9px 0;border-bottom:1px solid #eee;font-size:13px;text-align:center;">${item.quantity}</td>
            <td style="padding:9px 0;border-bottom:1px solid #eee;font-size:13px;text-align:right;">${item.price}</td>
        </tr>
    `).join('');

    const html = `
        <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:620px;margin:0 auto;padding:48px 56px;color:#1a1a1a;background:#fff;">

            <!-- Header -->
            <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #3d3cf5;padding-bottom:24px;margin-bottom:28px;">
                <div>
                    <div style="font-size:22px;font-weight:800;color:#3d3cf5;letter-spacing:-0.5px;">&#8801;tradazone</div>
                    <div style="font-size:11px;color:#999;margin-top:5px;text-transform:uppercase;letter-spacing:1.2px;">Payment Receipt</div>
                </div>
                <div style="text-align:right;">
                    <div style="font-size:11px;color:#999;margin-bottom:3px;">Receipt #</div>
                    <div style="font-size:15px;font-weight:700;">${id}</div>
                    <div style="font-size:11px;color:#999;margin-top:5px;">${dateStr}</div>
                </div>
            </div>

            <!-- Status badge -->
            <div style="display:inline-block;background:#dcfce7;color:#15803d;padding:5px 16px;font-size:11px;font-weight:700;letter-spacing:0.8px;border-radius:100px;margin-bottom:24px;">
                PAYMENT CONFIRMED
            </div>

            <!-- Parties -->
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;background:#f5f5ff;border-radius:8px;padding:18px 20px;margin-bottom:28px;">
                <div>
                    <div style="font-size:10px;color:#888;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:4px;">From</div>
                    <div style="font-size:13px;font-weight:600;">${merchantName || 'Tradazone'}</div>
                </div>
                <div>
                    <div style="font-size:10px;color:#888;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:4px;">Billed To</div>
                    <div style="font-size:13px;font-weight:600;">${customerEmail || '&#8212;'}</div>
                </div>
            </div>

            ${items.length > 0 ? `
            <!-- Items table -->
            <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
                <thead>
                    <tr style="border-bottom:2px solid #eee;">
                        <th style="text-align:left;font-size:10px;color:#888;text-transform:uppercase;letter-spacing:0.8px;padding-bottom:8px;">Item</th>
                        <th style="text-align:center;font-size:10px;color:#888;text-transform:uppercase;letter-spacing:0.8px;padding-bottom:8px;">Qty</th>
                        <th style="text-align:right;font-size:10px;color:#888;text-transform:uppercase;letter-spacing:0.8px;padding-bottom:8px;">Price</th>
                    </tr>
                </thead>
                <tbody>${itemRows}</tbody>
            </table>
            ` : ''}

            <!-- Amount summary -->
            <div style="border-top:2px solid #eee;padding-top:16px;margin-bottom:24px;">
                ${fiatAmount ? `
                <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
                    <span style="font-size:13px;color:#666;">Invoice amount</span>
                    <span style="font-size:13px;">${symbol}${parseFloat(fiatAmount).toFixed(2)} ${fiatCurrency}</span>
                </div>
                ` : ''}
                <div style="display:flex;justify-content:space-between;align-items:center;">
                    <span style="font-size:15px;font-weight:700;">Amount paid</span>
                    <span style="font-size:17px;font-weight:800;color:#3d3cf5;">${cryptoAmount} ${selectedCrypto}</span>
                </div>
            </div>

            <!-- Transaction details -->
            <div style="background:#f0f0ff;border-radius:8px;padding:18px 20px;margin-bottom:32px;">
                <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1.2px;color:#3d3cf5;margin-bottom:14px;">
                    Transaction Details
                </div>
                <div style="display:flex;gap:40px;margin-bottom:${txHash ? '14px' : '0'};">
                    <div>
                        <div style="font-size:10px;color:#888;margin-bottom:3px;">Network</div>
                        <div style="font-size:13px;font-weight:600;">${networkLabel}</div>
                    </div>
                    <div>
                        <div style="font-size:10px;color:#888;margin-bottom:3px;">Status</div>
                        <div style="font-size:13px;font-weight:600;color:#15803d;">Confirmed</div>
                    </div>
                </div>
                ${txHash ? `
                <div>
                    <div style="font-size:10px;color:#888;margin-bottom:5px;">Transaction Hash</div>
                    <div style="font-size:10px;font-family:monospace;word-break:break-all;background:#fff;padding:8px 12px;border-radius:4px;color:#444;">${txHash}</div>
                </div>
                ` : ''}
            </div>

            <!-- Footer -->
            <div style="text-align:center;border-top:1px solid #eee;padding-top:20px;">
                <div style="font-size:11px;color:#bbb;">Automated receipt generated by Tradazone &bull; Payments verified on-chain</div>
            </div>
        </div>
    `;

    const wrapper = document.createElement('div');
    wrapper.innerHTML = html;
    Object.assign(wrapper.style, { position: 'fixed', left: '-9999px', top: '0' });
    document.body.appendChild(wrapper);

    try {
        await html2pdf()
            .set({
                margin: 0,
                filename: `tradazone-receipt-${id}.pdf`,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2, useCORS: true },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
            })
            .from(wrapper.firstChild)
            .save();
    } finally {
        document.body.removeChild(wrapper);
    }
}
