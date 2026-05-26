const ABN_WEIGHTS = [10, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19] as const;

export function normaliseAbn(raw: string): string {
  return raw.replace(/[\s-]/g, "");
}

export type AbnValidationResult =
  | { valid: true; normalised: string }
  | { valid: false; error: string };

export function validateAbn(raw: string): AbnValidationResult {
  const normalised = normaliseAbn(raw);

  if (!/^\d{11}$/.test(normalised)) {
    return { valid: false, error: "ABN must be 11 digits" };
  }

  const digits = normalised.split("").map(Number);

  // Subtract 1 from first digit per ABN algorithm
  digits[0] -= 1;

  const sum = digits.reduce((acc, digit, i) => acc + digit * ABN_WEIGHTS[i], 0);

  if (sum % 89 !== 0) {
    return { valid: false, error: "That ABN doesn't look right — please check and try again" };
  }

  return { valid: true, normalised };
}
