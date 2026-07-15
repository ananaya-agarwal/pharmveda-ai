// In dev, Vite proxies /api to localhost:8000 (see vite.config.js). In production
// the frontend and backend are separate deployments, so this must point at the
// real API URL via a build-time env var.
const BASE_URL = import.meta.env.VITE_API_URL || "/api";

async function request(path, options = {}) {
  const response = await fetch(`${BASE_URL}${path}`, {
    credentials: "include",
    headers: options.body instanceof FormData ? undefined : { "Content-Type": "application/json" },
    ...options,
  });

  if (!response.ok) {
    let detail = response.statusText;
    try {
      const data = await response.json();
      detail = data.detail || detail;
    } catch {
      // ignore non-JSON error bodies
    }
    throw new Error(detail);
  }

  if (response.status === 204) return null;
  return response.json();
}

// Reads a streamed plain-text response chunk by chunk, calling onChunk(chunkText,
// fullTextSoFar) as each piece arrives so the UI can render progressively instead
// of waiting for the whole response.
async function streamRequest(path, options = {}, onChunk) {
  const response = await fetch(`${BASE_URL}${path}`, {
    credentials: "include",
    headers: options.body instanceof FormData ? undefined : { "Content-Type": "application/json" },
    ...options,
  });

  if (!response.ok) {
    let detail = response.statusText;
    try {
      const data = await response.json();
      detail = data.detail || detail;
    } catch {
      // ignore non-JSON error bodies
    }
    throw new Error(detail);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let full = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const text = decoder.decode(value, { stream: true });
    if (text) {
      full += text;
      onChunk(text, full);
    }
  }
  return full;
}

export const api = {
  register: (email, password) =>
    request("/auth/register", { method: "POST", body: JSON.stringify({ email, password }) }),
  login: (email, password) =>
    request("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  logout: () => request("/auth/logout", { method: "POST" }),
  me: () => request("/auth/me"),

  uploadDocument: (file) => {
    const form = new FormData();
    form.append("file", file);
    return request("/documents", { method: "POST", body: form });
  },
  listDocuments: () => request("/documents"),
  getDocument: (id) => request(`/documents/${id}`),
  explainDocument: (id, onChunk) =>
    streamRequest(`/documents/${id}/explain`, { method: "POST" }, onChunk),
  updateMedicine: (docId, medId, payload) =>
    request(`/documents/${docId}/medicines/${medId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  deleteMedicine: (docId, medId) =>
    request(`/documents/${docId}/medicines/${medId}`, { method: "DELETE" }),
  updateLabValue: (docId, labId, payload) =>
    request(`/documents/${docId}/lab-values/${labId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  deleteLabValue: (docId, labId) =>
    request(`/documents/${docId}/lab-values/${labId}`, { method: "DELETE" }),

  getTimeline: () => request("/timeline"),
  getTrends: () => request("/trends"),
  getInteractions: () => request("/interactions"),
  askChat: (question, onChunk) =>
    streamRequest("/chat", { method: "POST", body: JSON.stringify({ question }) }, onChunk),
};
