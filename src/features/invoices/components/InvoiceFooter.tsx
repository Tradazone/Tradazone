// @ts-nocheck
function InvoiceFooter({ notes = '', paymentLink = '' }) {
    return (
        <>
            {/* Notes + Payment Section */}
            <div className="flex justify-between items-start border-t border-gray-200 pt-6 pb-16">
                <div>
                    <h3 className="text-sm font-bold text-t-primary mb-1">Notes</h3>
                    <p className="text-sm text-t-muted">{notes || 'Sender'}</p>
                </div>

                <div className="text-right">
                    <p className="text-sm font-semibold text-t-primary mb-2">Pay for the service</p>
                    <a
                        href={paymentLink || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center gap-2 px-4 py-2.5 h-10 bg-brand text-white text-sm font-semibold no-underline"
                    >
                        {/* Logo mark icon */}
                        <svg
                            width="16"
                            height="16"
                            viewBox="0 0 501 501"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                            style={{ borderRadius: '3px', flexShrink: 0 }}
                        >
                            <rect width="500.906" height="500.906" fill="white" fillOpacity="0.25"/>
                            <path d="M104.006 104H397.006V127.425H287.123V200.692H397.006V273.925H287.123V347.192H397.006V397H104.006V373.541H213.889V300.308H104.006V227.041H213.889V153.808H104.006V104Z" fill="white"/>
                        </svg>
                        Pay here
                    </a>
                </div>
            </div>

            {/* Bottom Branding */}
            <div className="flex items-center justify-between mt-auto pt-8">
                <div className="flex items-center gap-2">
                    {/* Logo mark */}
                    <svg
                        width="32"
                        height="32"
                        viewBox="0 0 501 501"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        style={{ borderRadius: '6px', display: 'block', flexShrink: 0 }}
                    >
                        <rect width="500.906" height="500.906" fill="#3C3CEF"/>
                        <path d="M104.006 104H397.006V127.425H287.123V200.692H397.006V273.925H287.123V347.192H397.006V397H104.006V373.541H213.889V300.308H104.006V227.041H213.889V153.808H104.006V104Z" fill="white"/>
                    </svg>
                    <span className="text-sm font-bold text-brand">tradazone</span>
                </div>
                <span className="text-sm text-t-secondary">Tradazone.com</span>
            </div>
        </>
    );
}

export default InvoiceFooter;
