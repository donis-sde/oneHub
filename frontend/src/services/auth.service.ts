import { apiGet, apiPost } from "@/lib/api-client"
import type {
  AuthMeResponse,
  AuthStatusResponse,
  SigninResponse,
  SignupResponse,
} from "@/types/auth"

export const authService = {
  signin: (body: { email: string; password: string }) =>
    apiPost<SigninResponse>("/api/auth/signin", body),

  signup: (body: { email: string; password: string }) =>
    apiPost<SignupResponse>("/api/auth/signup", body),

  signout: () => apiPost<Record<string, never>>("/api/auth/signout"),

  me: () => apiGet<AuthMeResponse>("/api/auth/me"),

  checkStatus: () => apiGet<AuthStatusResponse>("/api/auth/checkStatus"),
}
