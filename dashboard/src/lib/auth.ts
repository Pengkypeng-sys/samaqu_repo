import { api } from './api';

export async function login(email: string, password: string) {
  const { data } = await api.post('/auth/login', { email, password });
  localStorage.setItem('token', data.access_token);
  localStorage.setItem('role', data.role);
  return data;
}

export function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('role');
  window.location.href = '/login';
}

export function getRole(): string | null {
  return typeof window !== 'undefined' ? localStorage.getItem('role') : null;
}

export function isLoggedIn(): boolean {
  return typeof window !== 'undefined' ? !!localStorage.getItem('token') : false;
}
