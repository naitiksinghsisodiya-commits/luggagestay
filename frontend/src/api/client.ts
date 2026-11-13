import axios from "axios";

export const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || "/api" });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("ls_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Normalizes backend error payloads (zod flatten() or a plain { error } string)
// into a single readable message for toasts/inline errors.
export function extractErrorMessage(err: unknown): string {
  const anyErr = err as any;
  const data = anyErr?.response?.data;
  if (!data) return "Something went wrong. Please try again.";
  if (typeof data.error === "string") return data.error;
  if (data.error?.fieldErrors) {
    const first = Object.values(data.error.fieldErrors).flat()[0];
    if (typeof first === "string") return first;
  }
  return "Something went wrong. Please try again.";
}
