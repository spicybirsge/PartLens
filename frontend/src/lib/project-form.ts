export const MAX_GLB_FILE_SIZE = 25 * 1024 * 1024

type ApiRecord = Record<string, unknown>

export function getApiErrorMessage(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== "object") return fallback

  const response = payload as ApiRecord
  if (typeof response.message === "string") return response.message

  if (Array.isArray(response.errors)) {
    const firstError = response.errors[0]
    if (firstError && typeof firstError === "object") {
      const message = (firstError as ApiRecord).msg
      if (typeof message === "string") return message
    }
  }

  return fallback
}

export async function readJsonResponse(response: Response): Promise<unknown> {
  try {
    return await response.json()
  } catch {
    return null
  }
}

export function getGlbFileError(file: File | null) {
  if (!file) return "Choose a GLB model to continue."
  if (!file.name.toLowerCase().endsWith(".glb")) {
    return "Choose a file with the .glb extension."
  }
  if (file.size > MAX_GLB_FILE_SIZE) {
    return "The model must be 25 MB or smaller."
  }
  return undefined
}

export function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
