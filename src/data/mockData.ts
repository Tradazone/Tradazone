// @ts-nocheck
// Mock data for Tradazone prototype
// This will be replaced with real backend API calls

export const mockCustomers = [
    {
        id: '1',
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+1 234 567 8900',
        address: '123 Main St, New York, NY',
        totalSpent: '1,500',
        currency: 'STRK',
        invoiceCount: 5,
        createdAt: '2024-01-15'
    },
    {
        id: '2',
        name: 'Jane Smith',
        email: 'jane@example.com',
        phone: '+1 234 567 8901',
        address: '456 Oak Ave, Los Angeles, CA',
        totalSpent: '2,300',
        currency: 'STRK',
        invoiceCount: 8,
        createdAt: '2024-02-01'
    },
    {
        id: '3',
        name: 'Bob Johnson',
        email: 'bob@example.com',
        phone: '+1 234 567 8902',
        address: '789 Pine Rd, Chicago, IL',
        totalSpent: '850',
        currency: 'STRK',
        invoiceCount: 3,
        createdAt: '2024-02-15'
    }
];

export const mockInvoices = [
    {
        id: 'INV-001',
        customer: 'John Doe',
        customerId: '1',
        amount: '500',
        currency: 'STRK',
        status: 'paid',
        dueDate: '2024-03-01',
        createdAt: '2024-02-15',
        items: [
            { name: 'Web Development', quantity: 1, price: '500' }
        ]
    },
    {
        id: 'INV-002',
        customer: 'Jane Smith',
        customerId: '2',
        amount: '1,200',
        currency: 'STRK',
        status: 'pending',
        dueDate: '2024-03-15',
        createdAt: '2024-02-20',
        items: [
            { name: 'UI Design', quantity: 2, price: '600' }
        ]
    },
    {
        id: 'INV-003',
        customer: 'Bob Johnson',
        customerId: '3',
        amount: '350',
        currency: 'STRK',
        status: 'unpaid',
        dueDate: '2024-02-28',
        createdAt: '2024-02-10',
        items: [
            { name: 'Consulting', quantity: 5, price: '70' }
        ]
    },
    {
        id: 'INV-004',
        customer: 'John Doe',
        customerId: '1',
        amount: '800',
        currency: 'STRK',
        status: 'overdue',
        dueDate: '2024-01-30',
        createdAt: '2024-01-15',
        items: [
            { name: 'Mobile App', quantity: 1, price: '800' }
        ]
    }
];

export const mockCheckouts = [
    {
        id: 'CHK-001',
        title: 'Premium Package',
        description: 'Full service web development package',
        amount: '200',
        currency: 'STRK',
        status: 'active',
        createdAt: '2024-02-01',
        paymentLink: 'https://pay.tradazone.com/CHK-001',
        views: 45,
        payments: 12
    },
    {
        id: 'CHK-002',
        title: 'Basic Consultation',
        description: 'One hour consultation session',
        amount: '50',
        currency: 'STRK',
        status: 'active',
        createdAt: '2024-02-10',
        paymentLink: 'https://pay.tradazone.com/CHK-002',
        views: 23,
        payments: 5
    },
    {
        id: 'CHK-003',
        title: 'Design Package',
        description: 'UI/UX design for web application',
        amount: '350',
        currency: 'STRK',
        status: 'inactive',
        createdAt: '2024-01-20',
        paymentLink: 'https://pay.tradazone.com/CHK-003',
        views: 67,
        payments: 8
    }
];

export const mockItems = [
    {
        id: '1',
        name: 'Web Development',
        description: 'Full stack web development services',
        type: 'service',
        price: '500',
        currency: 'STRK',
        unit: 'project'
    },
    {
        id: '2',
        name: 'UI Design',
        description: 'User interface design for web and mobile',
        type: 'service',
        price: '300',
        currency: 'STRK',
        unit: 'page'
    },
    {
        id: '3',
        name: 'Consulting',
        description: 'Technical consulting and advisory',
        type: 'service',
        price: '70',
        currency: 'STRK',
        unit: 'hour'
    },
    {
        id: '4',
        name: 'Logo Design',
        description: 'Professional logo and brand identity',
        type: 'service',
        price: '200',
        currency: 'STRK',
        unit: 'project'
    }
];

export const mockTransactions = [
    {
        id: '1',
        type: 'payment',
        description: 'Payment from John Doe',
        amount: '500',
        currency: 'STRK',
        date: '2024-02-20',
        status: 'completed'
    },
    {
        id: '2',
        type: 'payment',
        description: 'Payment from Jane Smith',
        amount: '1,200',
        currency: 'STRK',
        date: '2024-02-19',
        status: 'completed'
    },
    {
        id: '3',
        type: 'withdrawal',
        description: 'Withdrawal to Argent Wallet',
        amount: '1,000',
        currency: 'STRK',
        date: '2024-02-18',
        status: 'completed'
    }
];

export const mockDashboardStats = {
    walletBalance: '20',
    currency: 'STRK',
    receivables: '2,350',
    totalTransactions: 15,
    totalCustomers: 3
};
