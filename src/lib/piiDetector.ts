import { PIIPatternDef, Severity } from '../types';

/**
 * Validates credit card number with Luhn algorithm
 */
export function luhnCheck(numberStr: string): boolean {
  const digits = numberStr.replace(/\D/g, '').split('').map(Number);
  if (digits.length < 13 || digits.length > 19) return false;

  let checksum = 0;
  const reverse = digits.slice().reverse();
  for (let i = 0; i < reverse.length; i++) {
    let d = reverse[i];
    if (i % 2 === 1) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    checksum += d;
  }
  return checksum % 10 === 0;
}

export const DEFAULT_PII_PATTERNS: PIIPatternDef[] = [
  {
    name: 'Aadhaar Number',
    pattern: /\b\d{4}[\s\-]?\d{4}[\s\-]?\d{4}\b/g,
    severity: 'high',
    description: '12-digit Indian National Identity Number',
    validator: (m: string) => m.replace(/[\s\-]/g, '').length === 12,
  },
  {
    name: 'PAN Card',
    pattern: /\b[A-Z]{5}\d{4}[A-Z]\b/g,
    severity: 'high',
    description: 'Indian Income Tax Permanent Account Number',
  },
  {
    name: 'Indian Phone / Mobile',
    pattern: /(?:\+91[\s\-]?)?(?:\(?0?\)?[\s\-]?)?\b[6-9]\d{4}[\s\-]?\d{5}\b/g,
    severity: 'high',
    description: 'Indian 10-digit mobile number starting with 6-9',
  },
  {
    name: 'Credit / Debit Card',
    pattern: /\b(?:\d{4}[\s\-]?){3}\d{4}\b/g,
    severity: 'high',
    description: '16-digit Payment Card Number (Luhn verified)',
    validator: (m: string) => luhnCheck(m),
  },
  {
    name: 'Email Address',
    pattern: /\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b/g,
    severity: 'medium',
    description: 'Personal or Corporate Email Address',
  },
  {
    name: 'Indian Passport',
    pattern: /\b[A-Z]\d{7}\b/g,
    severity: 'high',
    description: 'Indian Republic Passport Number',
  },
  {
    name: 'US Social Security (SSN)',
    pattern: /\b\d{3}-\d{2}-\d{4}\b/g,
    severity: 'high',
    description: 'US 9-digit Social Security Number',
  },
  {
    name: 'Date of Birth / Date',
    pattern: /\b(?:0?[1-9]|[12]\d|3[01])[/\-.](?:0?[1-9]|1[0-2])[/\-.](?:19|20)\d{2}\b/g,
    severity: 'low',
    description: 'Date timestamp in DD/MM/YYYY format',
  },
  {
    name: 'ISO Date',
    pattern: /\b(?:19|20)\d{2}[/\-.](?:0?[1-9]|1[0-2])[/\-.](?:0?[1-9]|[12]\d|3[01])\b/g,
    severity: 'low',
    description: 'Date timestamp in YYYY-MM-DD format',
  },
  {
    name: 'Indian Postal Pincode',
    pattern: /\b[1-9]\d{5}\b/g,
    severity: 'low',
    description: '6-digit Indian Postal Area Code',
  },
];

export class PIIDetector {
  private patterns: PIIPatternDef[];

  constructor(customPatterns: PIIPatternDef[] = []) {
    this.patterns = [...DEFAULT_PII_PATTERNS, ...customPatterns];
  }

  public detect(text: string): Array<{
    type: string;
    value: string;
    severity: Severity;
    start: number;
    end: number;
  }> {
    const results: Array<{
      type: string;
      value: string;
      severity: Severity;
      start: number;
      end: number;
    }> = [];

    for (const p of this.patterns) {
      // Reset regex index
      p.pattern.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = p.pattern.exec(text)) !== null) {
        const val = match[0];
        if (p.validator && !p.validator(val)) {
          continue;
        }
        results.push({
          type: p.name,
          value: val,
          severity: p.severity,
          start: match.index,
          end: match.index + val.length,
        });
      }
    }

    // Deduplicate
    const seen = new Set<string>();
    return results.filter(item => {
      const key = `${item.start}-${item.end}-${item.type}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  public detectInWord(word: string): { type: string; severity: Severity } | null {
    for (const p of this.patterns) {
      p.pattern.lastIndex = 0;
      if (p.pattern.test(word)) {
        if (!p.validator || p.validator(word)) {
          return { type: p.name, severity: p.severity };
        }
      }
    }
    return null;
  }
}
