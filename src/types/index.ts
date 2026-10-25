export type Severity = 'high' | 'medium' | 'low';

export type RedactionMode = 'black' | 'blur';

export interface BoundingBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface PIIPatternDef {
  name: string;
  pattern: RegExp;
  severity: Severity;
  validator?: (match: string) => boolean;
  description: string;
}

export interface PIIDetection {
  id: string;
  type: string;
  value: string;
  severity: Severity;
  bbox: BoundingBox;
  confidence: number;
  selected: boolean;
  wordBoxes?: Array<{ text: string; x: number; y: number; w: number; h: number }>;
}

export interface RedactionRegion {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  type: string;
  imageData: string; // Base64 PNG data URL of the original patch
  label?: string;
  timestamp?: number;
}

export interface SlotPayload {
  version: 2;
  timestamp: number;
  authorNote?: string;
  regions: RedactionRegion[];
}

export interface MultislotWrapper {
  format: 'multislot';
  slots: string[]; // array of base64-encoded encrypted blobs
}

export interface RestorationRegionInfo {
  id: string;
  type: string;
  x: number;
  y: number;
  w: number;
  h: number;
  label?: string;
}

export interface DecryptionResult {
  success: boolean;
  matchedSlots: number;
  totalSlots: number;
  regions: RedactionRegion[];
  restoredImageUrl?: string;
  error?: string;
}

export interface StegoAnalysis {
  hasStegoHeader: boolean;
  payloadLengthBytes: number;
  maxCapacityBytes: number;
  capacityUtilizationPercent: number;
  isMultislot: boolean;
  slotCount: number;
  dimensions: { width: number; height: number };
}
