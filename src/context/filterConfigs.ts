// @ts-nocheck
// Filter configurations for different data types
// Defines searchable/sortable fields for useFilteredData hook

export const CUSTOMER_FILTER_CONFIG = {
  searchableFields: ['name', 'email', 'phone'],
  sortableFields: ['name', 'email', 'totalSpent', 'invoiceCount', 'createdAt'],
  statusField: null,
  amountField: null,
  dateFields: { from: 'createdAt', to: 'createdAt' }
};

export const INVOICE_FILTER_CONFIG = {
  searchableFields: ['id', 'customer'],
  sortableFields: ['id', 'customer', 'amount', 'dueDate', 'createdAt'],
  statusField: 'status',
  amountField: 'amount',
  dateFields: { from: 'createdAt', to: 'dueDate' }
};

export const ITEM_FILTER_CONFIG = {
  searchableFields: ['name', 'description'],
  sortableFields: ['name', 'price', 'type'],
  statusField: null,
  amountField: 'price',
  dateFields: null
};

export const CHECKOUT_FILTER_CONFIG = {
  searchableFields: ['id', 'title', 'description'],
  sortableFields: ['id', 'title', 'amount', 'createdAt'],
  statusField: 'status',
  amountField: 'amount',
  dateFields: { from: 'createdAt', to: 'createdAt' }
};

