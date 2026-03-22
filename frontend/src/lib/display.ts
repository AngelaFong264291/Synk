import { pb } from "./pocketbase";
import type {
  DocumentRecord,
  DocumentRecordWithExpand,
  DocumentVersionRecord,
  DocumentVersionRecordWithExpand,
  UserRecord,
} from "./types";

function pickFirstTimestamp(
  ...values: Array<string | number | undefined | null>
): string | number | undefined {
  for (const v of values) {
    if (v == null || v === "") {
      continue;
    }
    if (typeof v === "number" && Number.isFinite(v)) {
      return v;
    }
    if (typeof v === "string" && v.trim() !== "") {
      return v.trim();
    }
  }
  return undefined;
}

function parsePocketBaseTime(value: string): number {
  const s = value.trim();
  if (/^\d{4}-\d{2}-\d{2} [\d.:]/.test(s)) {
    const withT = s.replace(" ", "T");
    const t = Date.parse(withT);
    if (!Number.isNaN(t)) {
      return t;
    }
  }
  return Date.parse(s);
}

export function formatRecordDateTime(
  value: string | number | undefined | null,
): string {
  if (value == null || value === "") {
    return "Unknown";
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? "Unknown" : d.toLocaleString();
  }
  const raw = String(value).trim();
  if (!raw) {
    return "Unknown";
  }
  const t = parsePocketBaseTime(raw);
  if (Number.isNaN(t)) {
    return raw;
  }
  return new Date(t).toLocaleString();
}

export function formatDocumentTimestamp(
  doc: { updated?: string; created?: string } | null | undefined,
): string {
  return formatRecordDateTime(pickFirstTimestamp(doc?.updated, doc?.created));
}

export function documentOwnerEmail(
  document: DocumentRecord | DocumentRecordWithExpand,
): string {
  const ownerUser = "expand" in document ? document.expand?.owner : undefined;
  if (ownerUser?.email) {
    return ownerUser.email;
  }
  const self = pb.authStore.record as UserRecord | null;
  if (self && document.owner === self.id && self.email) {
    return self.email;
  }
  if (ownerUser?.name?.trim()) {
    return ownerUser.name.trim();
  }
  return document.owner;
}

export function versionAuthorEmail(
  version: DocumentVersionRecord | DocumentVersionRecordWithExpand,
): string {
  const authorUser = "expand" in version ? version.expand?.author : undefined;
  if (authorUser?.email) {
    return authorUser.email;
  }
  const self = pb.authStore.record as UserRecord | null;
  if (self && version.author === self.id && self.email) {
    return self.email;
  }
  if (authorUser?.name?.trim()) {
    return authorUser.name.trim();
  }
  return version.author;
}
