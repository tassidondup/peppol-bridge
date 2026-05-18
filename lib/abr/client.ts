import type { AbrResponse } from "./types";

const ABR_BASE_URL = "https://abr.business.gov.au/json/AbnDetails.aspx";
const CALLBACK_NAME = "callback";

function unwrapJsonp(raw: string): unknown {
  // ABR returns: callback({...}) — strip the wrapper before parsing
  const prefix = `${CALLBACK_NAME}(`;
  const trimmed = raw.trim();

  if (!trimmed.startsWith(prefix) || !trimmed.endsWith(")")) {
    throw new Error("Unexpected ABR response format — JSONP wrapper not found");
  }

  const json = trimmed.slice(prefix.length, -1);
  return JSON.parse(json);
}

export async function fetchAbrDetails(normalised_abn: string): Promise<AbrResponse> {
  const guid = process.env.ABR_GUID;
  if (!guid) {
    throw new Error("ABR_GUID environment variable is not set");
  }

  const url = new URL(ABR_BASE_URL);
  url.searchParams.set("abn", normalised_abn);
  url.searchParams.set("callback", CALLBACK_NAME);
  url.searchParams.set("guid", guid);

  const response = await fetch(url.toString(), {
    // No caching at the fetch layer — we manage TTL ourselves via abn_lookup_cache
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`ABR API HTTP error: ${response.status}`);
  }

  const raw = await response.text();
  const parsed = unwrapJsonp(raw) as AbrResponse;

  if (parsed.Message && parsed.Message.trim() !== "") {
    throw new Error(`ABR API error: ${parsed.Message}`);
  }

  return parsed;
}
