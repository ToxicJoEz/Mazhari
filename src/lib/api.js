export async function apiRequest(path, { token, ...options } = {}) {
  const response = await fetch('/api' + path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: 'Bearer ' + token } : {}),
      ...options.headers,
    },
  });
  const data = await response.json().catch(() => null);
  if (!response.ok || !data?.success) {
    const error = new Error(
      data?.message || 'Unable to reach the account service. Please try again.',
    );
    error.status = response.status;
    error.data = data;
    throw error;
  }
  return data;
}
