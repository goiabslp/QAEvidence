
import { User, ArchivedTicket, BugReport } from '../types';

const API_URL = 'http://localhost:3001/api';

// Helper para headers
const getHeaders = () => ({
  'Content-Type': 'application/json',
});

export const api = {
  // --- AUTH & USERS ---
  login: async (acronym: string) => {
    const res = await fetch(`${API_URL}/login`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ acronym }),
    });
    if (!res.ok) throw new Error('Login failed');
    return res.json();
  },

  getUsers: async () => {
    const res = await fetch(`${API_URL}/users`);
    return res.json();
  },

  createUser: async (user: User) => {
    const res = await fetch(`${API_URL}/users`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(user),
    });
    return res.json();
  },

  updateUser: async (user: User) => {
    const res = await fetch(`${API_URL}/users/${user.id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(user),
    });
    return res.json();
  },

  deleteUser: async (id: string) => {
    await fetch(`${API_URL}/users/${id}`, { method: 'DELETE' });
  },

  // --- TICKETS (EVIDENCES) ---
  getTickets: async () => {
    const res = await fetch(`${API_URL}/tickets`);
    return res.json();
  },

  createTicket: async (ticket: ArchivedTicket) => {
    const res = await fetch(`${API_URL}/tickets`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(ticket),
    });
    return res.json();
  },

  updateTicket: async (ticket: ArchivedTicket) => {
    const res = await fetch(`${API_URL}/tickets/${ticket.id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(ticket),
    });
    return res.json();
  },

  deleteTicket: async (id: string) => {
    await fetch(`${API_URL}/tickets/${id}`, { method: 'DELETE' });
  },

  // --- BUGS ---
  getBugs: async () => {
    const res = await fetch(`${API_URL}/bugs`);
    return res.json();
  },

  createBug: async (bug: BugReport) => {
    const res = await fetch(`${API_URL}/bugs`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(bug),
    });
    return res.json();
  },

  updateBug: async (bug: BugReport) => {
    const res = await fetch(`${API_URL}/bugs/${bug.id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(bug),
    });
    return res.json();
  },

  deleteBug: async (id: string) => {
    await fetch(`${API_URL}/bugs/${id}`, { method: 'DELETE' });
  }
};
