import PocketBase, { ClientResponseError } from "pocketbase";

const url = import.meta.env.VITE_POCKETBASE_URL ?? "http://127.0.0.1:8090";

export const pb = new PocketBase(url);

pb.autoCancellation(false);

/** Trim + lowercase so login matches how PocketBase stores emails. */
export function normalizeAuthEmail(email: string) {
  return email.trim().toLowerCase();
}

/** Human-readable message from PocketBase API errors (auth, validation, etc.). */
export function pocketBaseErrorMessage(err: unknown): string {
  if (err instanceof ClientResponseError) {
    const response = err.response as {
      message?: string;
      data?: Record<string, { message?: string } | unknown>;
    };
    if (response?.message) {
      return response.message;
    }
    const data = response?.data;
    if (data && typeof data === "object") {
      const parts: string[] = [];
      for (const [key, val] of Object.entries(data)) {
        if (
          val &&
          typeof val === "object" &&
          "message" in val &&
          typeof (val as { message: unknown }).message === "string"
        ) {
          parts.push(`${key}: ${(val as { message: string }).message}`);
        }
      }
      if (parts.length > 0) {
        return parts.join(" ");
      }
    }
    if (err.message) {
      return err.message;
    }
  }
  if (err instanceof Error) {
    return err.message;
  }
  return "Something went wrong";
}
