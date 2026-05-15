// @ts-nocheck
function InvoiceHeader() {
    return (
        <div className="flex items-start justify-between mb-12">
            {/* Tradazone Logo Mark */}
            <svg
                width="80"
                height="80"
                viewBox="0 0 501 501"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                style={{ borderRadius: '12px', display: 'block', flexShrink: 0 }}
            >
                <rect width="500.906" height="500.906" fill="#3C3CEF"/>
                <path d="M104.006 104H397.006V127.425H287.123V200.692H397.006V273.925H287.123V347.192H397.006V397H104.006V373.541H213.889V300.308H104.006V227.041H213.889V153.808H104.006V104Z" fill="white"/>
            </svg>

            {/* Invoice Title */}
            <h1 className="text-6xl font-light text-t-primary tracking-tight">
                Invoice
            </h1>
        </div>
    );
}

export default InvoiceHeader;
