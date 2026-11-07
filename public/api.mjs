export async function api(path, { method = 'GET', body } = {}) {
  const multipart = body instanceof FormData;
  const response = await fetch(`/api${path}`, {
    method, credentials: 'same-origin',
    headers: { 'X-Requested-With': 'classroom', ...(!multipart && body !== undefined ? { 'Content-Type': 'application/json' } : {}) },
    body: body === undefined ? undefined : multipart ? body : JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error || `Request failed (${response.status}).`);
    error.status = response.status;
    throw error;
  }
  return data;
}

export async function upload(classId, purpose, file) {
  if (!file?.size) return null;
  if (file.size > 8 * 1024 * 1024) throw new Error('Images must be 8 MB or smaller.');
  const body = new FormData();
  body.set('purpose', purpose);
  body.set('file', file, file.name || 'whiteboard.png');
  return (await api(`/classes/${classId}/files`, { method: 'POST', body })).id;
}
