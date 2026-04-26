const API_BASE_URL = import.meta.env.PROD ? '/api' : 'http://localhost:3001/api';

export const api = {
  baseUrl: API_BASE_URL,
  getProjects: async () => {
    const response = await fetch(`${API_BASE_URL}/projects`);
    if (!response.ok) throw new Error('Failed to fetch projects');
    return response.json();
  },
  createProject: async (data) => {
    const response = await fetch(`${API_BASE_URL}/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create project');
    return response.json();
  },
  getProjectAnalytics: async (projectId) => {
    const response = await fetch(`${API_BASE_URL}/projects/${projectId}/analytics`);
    if (!response.ok) throw new Error('Failed to fetch analytics');
    return response.json();
  },
  getExpenses: async (projectId = '') => {
    const url = projectId ? `${API_BASE_URL}/expenses?projectId=${projectId}` : `${API_BASE_URL}/expenses`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch expenses');
    return response.json();
  },
  getContractors: async () => {
    const response = await fetch(`${API_BASE_URL}/contractors`);
    if (!response.ok) throw new Error('Failed to fetch contractors');
    return response.json();
  },
  createContractor: async (data) => {
    const response = await fetch(`${API_BASE_URL}/contractors`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create contractor');
    return response.json();
  },
  getOrders: async () => {
    const response = await fetch(`${API_BASE_URL}/orders`);
    if (!response.ok) throw new Error('Failed to fetch orders');
    return response.json();
  },
  createOrder: async (data) => {
    const response = await fetch(`${API_BASE_URL}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create order');
    return response.json();
  },
  getBudgets: async (projectId) => {
    const url = projectId ? `${API_BASE_URL}/budgets?projectId=${projectId}` : `${API_BASE_URL}/budgets`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch budgets');
    return response.json();
  },
  createBudget: async (data) => {
    const response = await fetch(`${API_BASE_URL}/budgets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create budget');
    return response.json();
  },
  createExpense: async (data) => {
    const response = await fetch(`${API_BASE_URL}/expenses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create expense');
    return response.json();
  }
};
