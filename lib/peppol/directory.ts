export interface PeppolDirectoryResult {
  isRegistered: boolean;
  participantId: string;
}

const AU_SCHEME_ID = "0151";
const DIRECTORY_BASE_URL = "https://directory.peppol.eu";

export function buildParticipantId(abn: string): string {
  return `iso6523-actorid-upis::${AU_SCHEME_ID}:${abn}`;
}

export async function checkPeppolRegistration(
  normalisedAbn: string,
): Promise<PeppolDirectoryResult> {
  const baseUrl =
    process.env.PEPPOL_DIRECTORY_BASE_URL ?? DIRECTORY_BASE_URL;

  const participantId = buildParticipantId(normalisedAbn);
  const encodedId = encodeURIComponent(participantId);
  const url = `${baseUrl}/search/1.0/json?participant=${encodedId}`;

  const response = await fetch(url, {
    cache: "no-store",
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`Peppol Directory HTTP error: ${response.status}`);
  }

  const json = (await response.json()) as { "total-result-count": number };

  return {
    isRegistered: json["total-result-count"] > 0,
    participantId,
  };
}
