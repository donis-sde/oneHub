import axios, {
  type AxiosError,
  type AxiosInstance,
  type AxiosRequestConfig,
} from "axios"

import { env } from "@/config/env"
import type { ApiErrorBody } from "@/types/api"

const MAX_RETRIES = 2
const RETRY_DELAY_MS = 500

export class ApiClientError extends Error {
  status: number
  body: ApiErrorBody

  constructor(message: string, status: number, body: ApiErrorBody = {}) {
    super(message)
    this.name = "ApiClientError"
    this.status = status
    this.body = body
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function extractErrorMessage(body: ApiErrorBody, fallback: string): string {
  return body.error ?? body.err ?? body.message ?? fallback
}

export const apiClient: AxiosInstance = axios.create({
  baseURL: env.apiBaseUrl || undefined,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 60_000,
})

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiErrorBody>) => {
    const config = error.config as (AxiosRequestConfig & { _retryCount?: number }) | undefined

    if (
      config &&
      (!error.response || error.response.status >= 500) &&
      (config._retryCount ?? 0) < MAX_RETRIES
    ) {
      config._retryCount = (config._retryCount ?? 0) + 1
      await sleep(RETRY_DELAY_MS * config._retryCount)
      return apiClient.request(config)
    }

    const status = error.response?.status ?? 0
    const body = error.response?.data ?? {}
    const message = extractErrorMessage(body, error.message || "Request failed")

    if (status === 401 || message.includes("unauthorized")) {
      window.dispatchEvent(new CustomEvent("auth:unauthorized"))
    }

    return Promise.reject(new ApiClientError(message, status, body))
  },
)

export async function apiGet<T>(url: string, params?: Record<string, unknown>): Promise<T> {
  const { data } = await apiClient.get<T>(url, { params })
  return data
}

export async function apiPost<T>(url: string, body?: unknown): Promise<T> {
  const { data } = await apiClient.post<T>(url, body)
  return data
}

export async function apiPut<T>(url: string, body?: unknown): Promise<T> {
  const { data } = await apiClient.put<T>(url, body)
  return data
}

export async function apiPatch<T>(url: string, body?: unknown): Promise<T> {
  const { data } = await apiClient.patch<T>(url, body)
  return data
}

export async function apiDelete<T>(url: string, body?: unknown): Promise<T> {
  const { data } = await apiClient.delete<T>(url, { data: body })
  return data
}
