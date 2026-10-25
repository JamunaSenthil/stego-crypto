import { PIIDetection, RedactionMode, RedactionRegion } from '../types';
import { PIIDetector } from './piiDetector';

export interface ScanWordBox {
  text: string;
  x: number;
  y: number;
  w: number;
  h: number;
  confidence: number;
}

export class DocumentScanner {
  private piiDetector: PIIDetector;

  constructor() {
    this.piiDetector = new PIIDetector();
  }

  /**
   * Scans a document canvas for text boxes and sensitive PII.
   */
  public async scanCanvas(
    canvas: HTMLCanvasElement,
    knownWordBoxes?: ScanWordBox[]
  ): Promise<PIIDetection[]> {
    const wordBoxes = knownWordBoxes && knownWordBoxes.length > 0 
      ? knownWordBoxes 
      : this.detectTextBlocksFromCanvas(canvas);

    const detections: PIIDetection[] = [];
    const usedWordIndices = new Set<number>();

    // 1. Single word detection
    wordBoxes.forEach((wb, idx) => {
      const match = this.piiDetector.detectInWord(wb.text);
      if (match) {
        usedWordIndices.add(idx);
        detections.push({
          id: `det-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          type: match.type,
          value: wb.text,
          severity: match.severity,
          confidence: wb.confidence,
          selected: true,
          bbox: {
            x: Math.max(0, wb.x - 4),
            y: Math.max(0, wb.y - 3),
            w: wb.w + 8,
            h: wb.h + 6,
          },
          wordBoxes: [wb],
        });
      }
    });

    // 2. Multi-word line grouping (e.g., Aadhaar "1234 5678 9012" or "DOB: 15/08/1990")
    const lines = this.groupIntoLines(wordBoxes);
    for (const line of lines) {
      const lineText = line.map(w => w.text).join(' ');
      const piiMatches = this.piiDetector.detect(lineText);

      for (const m of piiMatches) {
        const matchingWords = this.findMatchingWords(line, lineText, m.start, m.end);
        if (matchingWords.length > 0) {
          const mergedBox = this.mergeBoxes(matchingWords);
          // Check if already covered
          const isDup = detections.some(d => 
            Math.abs(d.bbox.x - mergedBox.x) < 15 && 
            Math.abs(d.bbox.y - mergedBox.y) < 15 && 
            d.type === m.type
          );

          if (!isDup) {
            detections.push({
              id: `det-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
              type: m.type,
              value: m.value,
              severity: m.severity,
              confidence: Math.min(...matchingWords.map(w => w.confidence)),
              selected: true,
              bbox: mergedBox,
              wordBoxes: matchingWords,
            });
          }
        }
      }
    }

    // Deduplicate overlapping bounding boxes
    return this.deduplicateDetections(detections);
  }

  /**
   * Group word boxes into horizontal lines based on Y-axis proximity
   */
  private groupIntoLines(boxes: ScanWordBox[], yThreshold = 18): ScanWordBox[][] {
    if (!boxes.length) return [];
    const sorted = [...boxes].sort((a, b) => a.y - b.y || a.x - b.x);
    const lines: ScanWordBox[][] = [];
    let currentLine: ScanWordBox[] = [sorted[0]];

    for (let i = 1; i < sorted.length; i++) {
      const b = sorted[i];
      if (Math.abs(b.y - currentLine[0].y) <= yThreshold) {
        currentLine.push(b);
      } else {
        lines.push(currentLine.sort((a, b) => a.x - b.x));
        currentLine = [b];
      }
    }
    if (currentLine.length) {
      lines.push(currentLine.sort((a, b) => a.x - b.x));
    }
    return lines;
  }

  private findMatchingWords(
    lineWords: ScanWordBox[],
    lineText: string,
    start: number,
    end: number
  ): ScanWordBox[] {
    const matched: ScanWordBox[] = [];
    let charPos = 0;
    for (const w of lineWords) {
      const wStart = charPos;
      const wEnd = charPos + w.text.length;
      if (wEnd > start && wStart < end) {
        matched.push(w);
      }
      charPos = wEnd + 1; // account for space
    }
    return matched;
  }

  private mergeBoxes(boxes: ScanWordBox[], padding = 4): { x: number; y: number; w: number; h: number } {
    const xMin = Math.max(0, Math.min(...boxes.map(b => b.x)) - padding);
    const yMin = Math.max(0, Math.min(...boxes.map(b => b.y)) - padding);
    const xMax = Math.max(...boxes.map(b => b.x + b.w)) + padding;
    const yMax = Math.max(...boxes.map(b => b.y + b.h)) + padding;
    return {
      x: Math.round(xMin),
      y: Math.round(yMin),
      w: Math.round(xMax - xMin),
      h: Math.round(yMax - yMin),
    };
  }

  private deduplicateDetections(detections: PIIDetection[]): PIIDetection[] {
    const filtered: PIIDetection[] = [];
    for (let i = 0; i < detections.length; i++) {
      let isContained = false;
      const a = detections[i].bbox;
      for (let j = 0; j < detections.length; j++) {
        if (i === j) continue;
        const b = detections[j].bbox;
        if (
          b.x <= a.x &&
          b.y <= a.y &&
          b.x + b.w >= a.x + a.w &&
          b.y + b.h >= a.y + a.h &&
          i > j
        ) {
          isContained = true;
          break;
        }
      }
      if (!isContained) {
        filtered.push(detections[i]);
      }
    }
    return filtered;
  }

  /**
   * Fast canvas text-block detector for generic uploaded images
   */
  private detectTextBlocksFromCanvas(canvas: HTMLCanvasElement): ScanWordBox[] {
    const ctx = canvas.getContext('2d');
    if (!ctx) return [];
    const width = canvas.width;
    const height = canvas.height;
    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;

    // Detect dark horizontal text runs on light background
    const boxes: ScanWordBox[] = [];
    const stepY = 12;
    const stepX = 8;

    for (let y = 20; y < height - 20; y += stepY) {
      let inTextRun = false;
      let startX = 0;

      for (let x = 10; x < width - 10; x += stepX) {
        const offset = (y * width + x) * 4;
        const r = data[offset];
        const g = data[offset + 1];
        const b = data[offset + 2];
        const brightness = (r * 299 + g * 587 + b * 114) / 1000;

        // Dark text on document background (or high local contrast)
        const isTextCandidate = brightness < 110;

        if (isTextCandidate && !inTextRun) {
          inTextRun = true;
          startX = x;
        } else if (!isTextCandidate && inTextRun) {
          inTextRun = false;
          const runWidth = x - startX;
          if (runWidth >= 28 && runWidth <= 350) {
            boxes.push({
              text: `SCAN_ITEM_${boxes.length + 1}`,
              x: startX,
              y: y - 8,
              w: runWidth,
              h: 18,
              confidence: 85,
            });
          }
        }
      }
    }

    return boxes.slice(0, 30);
  }

  /**
   * Redacts target bounding boxes on canvas and extracts original patches for encryption
   */
  public static executeRedaction(
    sourceCanvas: HTMLCanvasElement,
    detectionsToRedact: Array<{ x: number; y: number; w: number; h: number; type: string; label?: string }>,
    mode: RedactionMode = 'black'
  ): {
    redactedCanvas: HTMLCanvasElement;
    regions: RedactionRegion[];
  } {
    const w = sourceCanvas.width;
    const h = sourceCanvas.height;

    // Clone source canvas
    const redactedCanvas = document.createElement('canvas');
    redactedCanvas.width = w;
    redactedCanvas.height = h;
    const redCtx = redactedCanvas.getContext('2d')!;
    redCtx.drawImage(sourceCanvas, 0, 0);

    const regions: RedactionRegion[] = [];

    // Helper patch canvas for saving unredacted image crops
    const patchCanvas = document.createElement('canvas');
    const patchCtx = patchCanvas.getContext('2d')!;

    for (const d of detectionsToRedact) {
      const rx = Math.max(0, Math.min(w - 1, Math.round(d.x)));
      const ry = Math.max(0, Math.min(h - 1, Math.round(d.y)));
      const rw = Math.min(w - rx, Math.round(d.w));
      const rh = Math.min(h - ry, Math.round(d.h));

      if (rw <= 0 || rh <= 0) continue;

      // 1. Crop original unredacted image patch
      patchCanvas.width = rw;
      patchCanvas.height = rh;
      patchCtx.clearRect(0, 0, rw, rh);
      patchCtx.drawImage(sourceCanvas, rx, ry, rw, rh, 0, 0, rw, rh);
      const patchDataUrl = patchCanvas.toDataURL('image/png');

      regions.push({
        id: `reg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        x: rx,
        y: ry,
        w: rw,
        h: rh,
        type: d.type,
        label: d.label,
        imageData: patchDataUrl,
        timestamp: Date.now(),
      });

      // 2. Draw redaction on redacted canvas
      if (mode === 'black') {
        redCtx.fillStyle = '#000000';
        redCtx.fillRect(rx, ry, rw, rh);
      } else {
        // Mosaic / Heavy Gaussian Blur effect
        const sampleSize = Math.max(8, Math.floor(Math.min(rw, rh) / 3));
        const tempBlurCanvas = document.createElement('canvas');
        tempBlurCanvas.width = Math.max(1, Math.floor(rw / sampleSize));
        tempBlurCanvas.height = Math.max(1, Math.floor(rh / sampleSize));
        const bCtx = tempBlurCanvas.getContext('2d')!;
        bCtx.drawImage(sourceCanvas, rx, ry, rw, rh, 0, 0, tempBlurCanvas.width, tempBlurCanvas.height);

        redCtx.imageSmoothingEnabled = false;
        redCtx.drawImage(tempBlurCanvas, 0, 0, tempBlurCanvas.width, tempBlurCanvas.height, rx, ry, rw, rh);
        redCtx.imageSmoothingEnabled = true;
      }
    }

    return { redactedCanvas, regions };
  }

  /**
   * Restores unredacted image patches onto canvas
   */
  public static async restorePatches(
    securedCanvas: HTMLCanvasElement,
    regions: RedactionRegion[]
  ): Promise<HTMLCanvasElement> {
    const restoredCanvas = document.createElement('canvas');
    restoredCanvas.width = securedCanvas.width;
    restoredCanvas.height = securedCanvas.height;
    const ctx = restoredCanvas.getContext('2d')!;
    ctx.drawImage(securedCanvas, 0, 0);

    for (const r of regions) {
      await new Promise<void>((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          // Paste restored patch
          ctx.drawImage(img, r.x, r.y, r.w, r.h);

          // Draw subtle high-tech verification border around restored area
          ctx.strokeStyle = '#00E676';
          ctx.lineWidth = 2;
          ctx.setLineDash([4, 4]);
          ctx.strokeRect(r.x, r.y, r.w, r.h);
          ctx.setLineDash([]);
          resolve();
        };
        img.onerror = () => reject(new Error(`Failed to load patch image data for ${r.type}`));
        img.src = r.imageData;
      });
    }

    return restoredCanvas;
  }
}
