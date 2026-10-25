import React, { useState, useRef, useEffect } from 'react';
import { 
  Upload, Sparkles, Shield, Lock, Eye, EyeOff, CheckSquare, 
  Square, Download, AlertTriangle, ArrowRight, RefreshCw, ZoomIn, ZoomOut, Maximize2 
} from 'lucide-react';
import { DocumentScanner, ScanWordBox } from '../lib/documentScanner';
import { CryptoManager } from '../lib/crypto';
import { StegoManager } from '../lib/stego';
import { PIIDetection, RedactionMode, Severity } from '../types';
import { SAMPLE_DOCUMENTS } from '../lib/sampleDocuments';
import confetti from 'canvas-confetti';

interface SmartScanTabProps {
  onGoToDecrypt: (stegoDataUrl: string) => void;
  onSelectSampleRequested?: boolean;
}

export const SmartScanTab: React.FC<SmartScanTabProps> = ({ onGoToDecrypt }) => {
  const [docCanvas, setDocCanvas] = useState<HTMLCanvasElement | null>(null);
  const [docDataUrl, setDocDataUrl] = useState<string | null>(null);
  const [docName, setDocName] = useState<string>('Aadhaar_ID_Sample.png');
  const [wordBoxes, setWordBoxes] = useState<ScanWordBox[]>([]);

  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [detections, setDetections] = useState<PIIDetection[]>([]);
  const [showOverlays, setShowOverlays] = useState<boolean>(true);
  const [zoomLevel, setZoomLevel] = useState<number>(1);

  // Redaction parameters
  const [redactionMode, setRedactionMode] = useState<RedactionMode>('black');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);

  // Output state
  const [isSecuring, setIsSecuring] = useState<boolean>(false);
  const [stegoResultUrl, setStegoResultUrl] = useState<string | null>(null);
  const [stegoStats, setStegoStats] = useState<{
    capacityBytes: number;
    usedBytes: number;
    compressedSize: number;
    regionsCount: number;
  } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initial load: start with Aadhaar sample
  useEffect(() => {
    loadSampleDoc(SAMPLE_DOCUMENTS[0].id);
  }, []);

  const loadSampleDoc = async (sampleId: string) => {
    const sample = SAMPLE_DOCUMENTS.find(s => s.id === sampleId) || SAMPLE_DOCUMENTS[0];
    const { canvas, wordBoxes: sampleWordBoxes } = sample.render();
    setDocCanvas(canvas);
    setDocDataUrl(canvas.toDataURL('image/png'));
    setDocName(`${sample.name.replace(/\s+/g, '_')}.png`);
    setWordBoxes(sampleWordBoxes);
    setStegoResultUrl(null);
    setStegoStats(null);
    setErrorMsg(null);

    // Auto trigger smart scan
    await runSmartScan(canvas, sampleWordBoxes);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setDocName(file.name);
    setErrorMsg(null);
    setStegoResultUrl(null);
    setStegoStats(null);

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0);

        setDocCanvas(canvas);
        setDocDataUrl(canvas.toDataURL('image/png'));
        setWordBoxes([]);
        runSmartScan(canvas);
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  const runSmartScan = async (canvas: HTMLCanvasElement, presetBoxes?: ScanWordBox[]) => {
    setIsScanning(true);
    setErrorMsg(null);
    try {
      const scanner = new DocumentScanner();
      const results = await scanner.scanCanvas(canvas, presetBoxes || wordBoxes);
      setDetections(results);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to scan document.';
      setErrorMsg(message);
    } finally {
      setIsScanning(false);
    }
  };

  const toggleDetection = (id: string) => {
    setDetections(prev =>
      prev.map(d => (d.id === id ? { ...d, selected: !d.selected } : d))
    );
  };

  const selectAll = (selected: boolean) => {
    setDetections(prev => prev.map(d => ({ ...d, selected })));
  };

  const selectHighSeverityOnly = () => {
    setDetections(prev =>
      prev.map(d => ({ ...d, selected: d.severity === 'high' }))
    );
  };

  const handleSecureAndExport = async () => {
    if (!docCanvas) {
      setErrorMsg('No active document loaded.');
      return;
    }

    if (!password.trim()) {
      setErrorMsg('Encryption Key / Password is required to secure sensitive regions.');
      return;
    }

    const selectedDets = detections.filter(d => d.selected);
    if (selectedDets.length === 0) {
      setErrorMsg('Please select at least one sensitive region to redact.');
      return;
    }

    setIsSecuring(true);
    setErrorMsg(null);

    try {
      // 1. Redact regions and extract original cropped image patches
      const { redactedCanvas, regions } = DocumentScanner.executeRedaction(
        docCanvas,
        selectedDets.map(d => ({
          x: d.bbox.x,
          y: d.bbox.y,
          w: d.bbox.w,
          h: d.bbox.h,
          type: d.type,
          label: d.value,
        })),
        redactionMode
      );

      // 2. Prepare slot payload
      const slotPayload = {
        version: 2,
        timestamp: Date.now(),
        regions: regions,
      };

      const payloadBytes = new TextEncoder().encode(JSON.stringify(slotPayload));

      // 3. Encrypt payload using AES-256-GCM + PBKDF2
      const newSlotEncrypted = await CryptoManager.encrypt(payloadBytes, password);

      // 4. Check if the source canvas already has prior stego slots (multi-slot chaining!)
      let allSlots: Uint8Array[] = [newSlotEncrypted];
      try {
        const redCtx = redactedCanvas.getContext('2d')!;
        const existingImgData = redCtx.getImageData(0, 0, redactedCanvas.width, redactedCanvas.height);
        const priorData = StegoManager.extractData(existingImgData);
        const priorSlots = CryptoManager.extractSlots(priorData);
        allSlots = [...priorSlots, newSlotEncrypted];
      } catch {
        // No prior stego slots, this is slot 1
      }

      // 5. Wrap all slots into multislot bundle
      const finalBundle = CryptoManager.wrapMultislot(allSlots);

      // 6. Embed into LSB Steganography of the redacted canvas
      const redCtx = redactedCanvas.getContext('2d')!;
      const imgData = redCtx.getImageData(0, 0, redactedCanvas.width, redactedCanvas.height);
      const stegoResult = StegoManager.hideData(imgData, finalBundle);

      // Put stego pixel data back onto redacted canvas
      redCtx.putImageData(stegoResult.stegoImageData, 0, 0);

      const finalDataUrl = redactedCanvas.toDataURL('image/png');
      setStegoResultUrl(finalDataUrl);
      setStegoStats({
        capacityBytes: stegoResult.capacity,
        usedBytes: stegoResult.totalEmbeddedBytes,
        compressedSize: stegoResult.compressedSize,
        regionsCount: regions.length,
      });

      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 },
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error during encryption/steganography process.';
      setErrorMsg(message);
    } finally {
      setIsSecuring(false);
    }
  };

  const getSeverityBadge = (sev: Severity) => {
    switch (sev) {
      case 'high':
        return (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-[#FF2A55]/20 text-[#FF5C7A] border border-[#FF2A55]/40">
            HIGH
          </span>
        );
      case 'medium':
        return (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-[#FFB300]/20 text-[#FFD54F] border border-[#FFB300]/40">
            MED
          </span>
        );
      case 'low':
        return (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-[#00E5FF]/20 text-[#80F4FF] border border-[#00E5FF]/40">
            LOW
          </span>
        );
    }
  };

  const selectedCount = detections.filter(d => d.selected).length;
  const imageCapacity = docCanvas ? StegoManager.calculateCapacity(docCanvas.width, docCanvas.height) : 0;

  return (
    <div className="space-y-6">
      {/* Sample Selector Banner */}
      <div className="bg-[#111827] border border-[#1E293B] rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-[#7C3AED]/20 border border-[#7C3AED]/30 flex items-center justify-center text-[#A78BFA]">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Smart OCR Document Scanner</h3>
            <p className="text-xs text-[#94A3B8]">
              Automated PII detection for Indian Aadhaar, PAN Cards, Passports, Phones, Emails & Credit Cards.
            </p>
          </div>
        </div>

        {/* Sample Document Quick Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-[#64748B] font-medium mr-1">Preloaded:</span>
          {SAMPLE_DOCUMENTS.map(sample => (
            <button
              key={sample.id}
              onClick={() => loadSampleDoc(sample.id)}
              className="text-xs px-2.5 py-1.5 rounded-lg bg-[#1E293B] hover:bg-[#334155] text-[#CBD5E1] border border-[#334155] transition-all flex items-center space-x-1"
            >
              <span>{sample.name.split(' ')[1] || sample.name}</span>
            </button>
          ))}

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept="image/*"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="text-xs px-3 py-1.5 rounded-lg bg-[#00E5FF]/10 hover:bg-[#00E5FF]/20 text-[#00E5FF] border border-[#00E5FF]/40 transition-all flex items-center space-x-1.5 font-medium"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload Image</span>
          </button>
        </div>
      </div>

      {/* Main Two-Column Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Visual Document Preview (7 Cols) */}
        <div className="lg:col-span-7 bg-[#111827] border border-[#1E293B] rounded-xl flex flex-col overflow-hidden">
          {/* Canvas Toolbar */}
          <div className="px-4 py-3 border-b border-[#1E293B] flex items-center justify-between bg-[#0E1524]">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-semibold text-white truncate max-w-[200px]">
                {docName}
              </span>
              {docCanvas && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#1E293B] text-[#94A3B8]">
                  {docCanvas.width} × {docCanvas.height} px
                </span>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowOverlays(!showOverlays)}
                className={`text-xs px-2 py-1 rounded border transition-all flex items-center space-x-1 ${
                  showOverlays
                    ? 'bg-[#00E5FF]/10 text-[#00E5FF] border-[#00E5FF]/30'
                    : 'bg-[#1E293B] text-[#64748B] border-[#334155]'
                }`}
                title="Toggle Bounding Boxes"
              >
                {showOverlays ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                <span className="text-[11px]">Boxes</span>
              </button>

              <button
                onClick={() => setZoomLevel(prev => Math.max(0.6, prev - 0.2))}
                className="p-1 rounded bg-[#1E293B] hover:bg-[#334155] text-[#CBD5E1]"
                title="Zoom Out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="text-xs font-mono text-[#94A3B8] w-10 text-center">
                {Math.round(zoomLevel * 100)}%
              </span>
              <button
                onClick={() => setZoomLevel(prev => Math.min(2, prev + 0.2))}
                className="p-1 rounded bg-[#1E293B] hover:bg-[#334155] text-[#CBD5E1]"
                title="Zoom In"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setZoomLevel(1)}
                className="p-1 rounded bg-[#1E293B] hover:bg-[#334155] text-[#CBD5E1]"
                title="Reset Zoom"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Canvas Viewport */}
          <div
            ref={canvasContainerRef}
            className="flex-1 min-h-[460px] max-h-[560px] p-4 bg-[#080B12] overflow-auto flex items-center justify-center relative select-none"
          >
            {isScanning && (
              <div className="absolute inset-0 bg-[#080B12]/80 backdrop-blur-sm z-20 flex flex-col items-center justify-center space-y-3">
                <RefreshCw className="w-8 h-8 text-[#00E5FF] animate-spin" />
                <span className="text-xs font-medium text-white tracking-wide">
                  Analyzing document OCR & PII patterns...
                </span>
              </div>
            )}

            {docDataUrl && (
              <div
                className="relative shadow-2xl rounded-sm transition-transform duration-100 ease-out border border-[#334155]/40"
                style={{
                  transform: `scale(${zoomLevel})`,
                  transformOrigin: 'center center',
                }}
              >
                <img
                  src={docDataUrl}
                  alt="Original Document"
                  className="max-w-none block pointer-events-none"
                />

                {/* Overlaid Redaction Boxes */}
                {showOverlays &&
                  detections.map(det => {
                    const isSelected = det.selected;
                    const borderColor =
                      det.severity === 'high'
                        ? '#FF2A55'
                        : det.severity === 'medium'
                        ? '#FFB300'
                        : '#00E5FF';

                    return (
                      <div
                        key={det.id}
                        onClick={() => toggleDetection(det.id)}
                        className={`absolute cursor-pointer transition-all duration-150 ${
                          isSelected
                            ? 'bg-black/85 ring-2 ring-offset-1 ring-offset-black ring-[#00E5FF]'
                            : 'bg-transparent border-2 border-dashed opacity-50 hover:opacity-100'
                        }`}
                        style={{
                          left: `${det.bbox.x}px`,
                          top: `${det.bbox.y}px`,
                          width: `${det.bbox.w}px`,
                          height: `${det.bbox.h}px`,
                          borderColor: isSelected ? 'transparent' : borderColor,
                        }}
                        title={`${det.type}: ${det.value} (Click to toggle)`}
                      >
                        {/* Label Badge */}
                        <div
                          className={`absolute -top-5 left-0 px-1.5 py-0.5 rounded text-[9px] font-mono whitespace-nowrap pointer-events-none ${
                            isSelected
                              ? 'bg-black text-[#00E5FF] border border-[#00E5FF]/40'
                              : 'bg-black/80 text-white/70'
                          }`}
                        >
                          {det.type}
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>

          {/* Stego Capacity Footer */}
          <div className="px-4 py-2.5 bg-[#0D1320] border-t border-[#1E293B] flex items-center justify-between text-xs text-[#94A3B8]">
            <div className="flex items-center space-x-2">
              <span className="font-semibold text-white">LSB Capacity:</span>
              <span className="font-mono text-[#00E5FF]">
                {(imageCapacity / 1024).toFixed(1)} KB
              </span>
              <span>(lossless PNG bits)</span>
            </div>
            <div className="text-[11px] text-[#64748B]">
              Multi-slot chaining enabled • Non-destructive
            </div>
          </div>
        </div>

        {/* Right Column: PII Detections & Securing Controls (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Detections List Card */}
          <div className="bg-[#111827] border border-[#1E293B] rounded-xl p-4 flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-[#1E293B]">
              <div className="flex items-center space-x-2">
                <Shield className="w-4 h-4 text-[#00E5FF]" />
                <h3 className="text-sm font-semibold text-white">Sensitive Regions</h3>
                <span className="text-xs px-2 py-0.5 rounded-full bg-[#1E293B] text-[#94A3B8] font-mono">
                  {selectedCount} / {detections.length}
                </span>
              </div>

              {/* Bulk Select actions */}
              <div className="flex items-center space-x-1.5">
                <button
                  onClick={() => selectAll(true)}
                  className="text-[11px] px-2 py-1 rounded bg-[#1E293B] hover:bg-[#334155] text-[#CBD5E1]"
                >
                  All
                </button>
                <button
                  onClick={selectHighSeverityOnly}
                  className="text-[11px] px-2 py-1 rounded bg-[#FF2A55]/10 text-[#FF5C7A] hover:bg-[#FF2A55]/20 border border-[#FF2A55]/30"
                >
                  High Only
                </button>
                <button
                  onClick={() => selectAll(false)}
                  className="text-[11px] px-2 py-1 rounded bg-[#1E293B] hover:bg-[#334155] text-[#94A3B8]"
                >
                  Clear
                </button>
              </div>
            </div>

            {/* Scrollable list */}
            <div className="mt-3 space-y-2 max-h-[220px] overflow-y-auto pr-1">
              {detections.length === 0 ? (
                <div className="py-8 text-center text-xs text-[#64748B]">
                  No PII targets detected. Use Sample Docs or upload a new image.
                </div>
              ) : (
                detections.map(det => (
                  <div
                    key={det.id}
                    onClick={() => toggleDetection(det.id)}
                    className={`p-2.5 rounded-lg border cursor-pointer transition-all flex items-center justify-between ${
                      det.selected
                        ? 'bg-[#1A2332] border-[#00E5FF]/40 text-white'
                        : 'bg-[#0E1524] border-[#1E293B] text-[#94A3B8] opacity-70 hover:opacity-100'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5 min-w-0">
                      {det.selected ? (
                        <CheckSquare className="w-4 h-4 text-[#00E5FF] shrink-0" />
                      ) : (
                        <Square className="w-4 h-4 text-[#64748B] shrink-0" />
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-medium text-white truncate">
                            {det.type}
                          </span>
                          {getSeverityBadge(det.severity)}
                        </div>
                        <div className="text-[11px] font-mono text-[#94A3B8] truncate">
                          {det.value}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-[10px] font-mono text-[#64748B]">
                        {det.bbox.w}×{det.bbox.h}px
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Redaction Style & Encryption Form Card */}
          <div className="bg-[#111827] border border-[#1E293B] rounded-xl p-4 space-y-4">
            {/* Redaction Mode Switcher */}
            <div>
              <label className="text-xs font-semibold text-white block mb-1.5">
                Redaction Visual Style
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setRedactionMode('black')}
                  className={`py-2 px-3 rounded-lg text-xs font-medium border flex items-center justify-center space-x-2 transition-all ${
                    redactionMode === 'black'
                      ? 'bg-[#000000] text-white border-[#00E5FF]/60 shadow-sm'
                      : 'bg-[#1E293B] text-[#94A3B8] border-[#334155]'
                  }`}
                >
                  <div className="w-3 h-3 bg-black border border-white/40 rounded-xs" />
                  <span>Solid Blackout</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRedactionMode('blur')}
                  className={`py-2 px-3 rounded-lg text-xs font-medium border flex items-center justify-center space-x-2 transition-all ${
                    redactionMode === 'blur'
                      ? 'bg-[#7C3AED]/20 text-[#A78BFA] border-[#7C3AED] shadow-sm'
                      : 'bg-[#1E293B] text-[#94A3B8] border-[#334155]'
                  }`}
                >
                  <div className="w-3 h-3 bg-gradient-to-tr from-cyan-400 to-purple-500 rounded-xs opacity-80" />
                  <span>Mosaic Pixel Blur</span>
                </button>
              </div>
            </div>

            {/* Password / Encryption Key */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-white flex items-center space-x-1.5">
                  <Lock className="w-3.5 h-3.5 text-[#00E5FF]" />
                  <span>Passphrase / Key</span>
                </label>
                <span className="text-[10px] text-[#64748B]">Required to unlock & restore</span>
              </div>

              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter secret authorization password..."
                  className="w-full bg-[#1E293B] text-white text-xs px-3 py-2.5 rounded-lg border border-[#334155] focus:outline-none focus:border-[#00E5FF] pr-10 font-mono transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-2.5 text-[#94A3B8] hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              <p className="text-[11px] text-[#64748B] mt-1.5">
                Encrypted via PBKDF2-HMAC-SHA256 (100k iter) + AES-256-GCM.
              </p>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-lg bg-[#FF2A55]/10 border border-[#FF2A55]/30 flex items-start space-x-2 text-xs text-[#FF5C7A]">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Action CTA Button */}
            <button
              onClick={handleSecureAndExport}
              disabled={isSecuring || selectedCount === 0}
              className={`w-full py-3 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center space-x-2 transition-all shadow-lg ${
                isSecuring || selectedCount === 0
                  ? 'bg-[#1E293B] text-[#64748B] cursor-not-allowed border border-[#334155]'
                  : 'bg-gradient-to-r from-[#FF2A55] via-[#E61A41] to-[#7C3AED] hover:opacity-95 text-white shadow-[#FF2A55]/20 cursor-pointer'
              }`}
            >
              {isSecuring ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Securing & Embedding Stego Payload...</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  <span>Redact & Embed Stego Payload</span>
                </>
              )}
            </button>
          </div>

          {/* Success Result Card */}
          {stegoResultUrl && stegoStats && (
            <div className="bg-[#111827] border border-[#00E676]/40 rounded-xl p-4 bg-gradient-to-b from-[#111827] to-[#0A2E1E]/30 space-y-3 animate-in fade-in duration-300">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-[#00E676]">
                  <Shield className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase tracking-wide">
                    Document Secured Losslessly
                  </span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#00E676]/20 text-[#00E676] border border-[#00E676]/30">
                  PNG Stego
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs bg-[#080B12]/80 p-2.5 rounded-lg border border-[#1E293B]">
                <div>
                  <span className="text-[#64748B] text-[10px] block">Redacted Regions</span>
                  <span className="font-semibold text-white">{stegoStats.regionsCount} zones</span>
                </div>
                <div>
                  <span className="text-[#64748B] text-[10px] block">Payload Embedded</span>
                  <span className="font-mono text-[#00E5FF]">
                    {(stegoStats.usedBytes / 1024).toFixed(2)} KB
                  </span>
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <a
                  href={stegoResultUrl}
                  download={`SECURED_${docName}`}
                  className="flex-1 py-2 px-3 rounded-lg bg-[#00E676] hover:bg-[#00C853] text-[#080B12] text-xs font-bold flex items-center justify-center space-x-1.5 transition-all shadow-md shadow-[#00E676]/20"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Stego PNG</span>
                </a>

                <button
                  onClick={() => onGoToDecrypt(stegoResultUrl)}
                  className="py-2 px-3 rounded-lg bg-[#1E293B] hover:bg-[#334155] text-[#CBD5E1] text-xs font-medium flex items-center space-x-1.5 border border-[#334155] transition-all"
                >
                  <span>Test Restore</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
