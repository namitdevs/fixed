/**
 * Canonical Data Normalization Utilities
 * Normalizes heterogeneous data formats (phones, names, vehicles, dates, accounts)
 * into standardized representations while preserving raw values.
 */

export function normalizePhone(rawPhone: string): { canonical: string; raw: string } {
  const raw = rawPhone?.trim() || '';
  if (!raw) return { canonical: '', raw };

  // Remove spaces, hyphens, brackets, dots
  let cleaned = raw.replace(/[\s\-\(\)\.]/g, '');

  // If starts with 00, replace with +
  if (cleaned.startsWith('00')) {
    cleaned = '+' + cleaned.substring(2);
  }

  // If starts with 0 and length is 11 (Indian STD), convert 098... to +9198...
  if (cleaned.startsWith('0') && cleaned.length === 11) {
    cleaned = '+91' + cleaned.substring(1);
  } else if (!cleaned.startsWith('+')) {
    // If 10 digits, assume standard Indian mobile +91
    if (cleaned.length === 10) {
      cleaned = '+91' + cleaned;
    } else {
      cleaned = '+' + cleaned;
    }
  }

  return {
    canonical: cleaned,
    raw,
  };
}

export function normalizePersonName(rawName: string): { canonical: string; raw: string } {
  const raw = rawName?.trim() || '';
  if (!raw) return { canonical: '', raw };

  // Strip common honorifics/prefixes
  const cleaned = raw
    .replace(/^(mr\.|mrs\.|ms\.|shri|smt\.|dr\.|adv\.|inspector|constable|sub-inspector)\s+/i, '')
    .replace(/\s+/g, ' ')
    .trim();

  // Canonical is uppercase single-spaced
  const canonical = cleaned.toUpperCase();

  return {
    canonical,
    raw,
  };
}

export function normalizeVehiclePlate(rawPlate: string): { canonical: string; raw: string } {
  const raw = rawPlate?.trim() || '';
  if (!raw) return { canonical: '', raw };

  // Remove spaces, hyphens, dots and uppercase
  const canonical = raw.replace(/[\s\-\.]/g, '').toUpperCase();

  return {
    canonical,
    raw,
  };
}

export function normalizeAccountNumber(rawAccount: string): { canonical: string; raw: string } {
  const raw = rawAccount?.trim() || '';
  if (!raw) return { canonical: '', raw };

  const canonical = raw.replace(/[\s\-]/g, '').toUpperCase();

  return {
    canonical,
    raw,
  };
}

export function normalizeIsoDate(rawDate: string | Date | number): Date {
  if (!rawDate) return new Date();
  if (rawDate instanceof Date) return rawDate;

  const parsed = new Date(rawDate);
  if (!isNaN(parsed.getTime())) {
    return parsed;
  }

  // Handle DD-MM-YYYY or DD/MM/YYYY formats common in Indian police records
  if (typeof rawDate === 'string') {
    const parts = rawDate.split(/[\/\-\.]/);
    if (parts.length === 3) {
      const p0 = parseInt(parts[0], 10);
      const p1 = parseInt(parts[1], 10);
      const p2 = parseInt(parts[2], 10);
      if (p0 <= 31 && p1 <= 12 && p2 > 1900) {
        return new Date(p2, p1 - 1, p0);
      }
    }
  }

  return new Date();
}
