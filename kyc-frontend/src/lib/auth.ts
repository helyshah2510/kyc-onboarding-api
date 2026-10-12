type TokenPayload = { role?: 'USER' | 'ADMIN'; exp?: number };

export function saveToken(token: string) {
  localStorage.setItem('token', token);
}

export function logout() {
  localStorage.removeItem('token');
}

function readPayload(): TokenPayload | null {
  const token = localStorage.getItem('token');
  if (!token) return null;

  try {
    const payload = token.split('.')[1];
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

// Returns the role, or null if there is no token or it has expired
export function getRole(): 'USER' | 'ADMIN' | null {
  const payload = readPayload();
  if (!payload) return null;

  // exp is in seconds, Date.now() is in milliseconds
  if (payload.exp && payload.exp * 1000 < Date.now()) {
    logout();
    return null;
  }

  return payload.role ?? null;
}