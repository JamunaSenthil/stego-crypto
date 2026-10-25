import React, { useState, useRef, useEffect, MouseEvent } from 'react';
import { 
  EyeOff, Upload, Lock, Download, Trash2, Undo, Plus, 
  Check, RefreshCw, AlertTriangle, ArrowRight, Sparkles 
} from 'lucide-react';
import { DocumentScanner } from '../lib/documentScanner';
import { CryptoManager } from '../lib/crypto';
import { StegoManager } from '../lib/stego';
import { SAMPLE_DOCUMENTS } from '../lib/sampleDocuments';
import { RedactionMode } from '../types';
import confetti from 'canvas-confetti';

interface ManualBox {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
}

interface ManualRedactTabProps {
  onGoToDecrypt: (stegoDataUrl: string) => void;
}

export const ManualRedactTab: React.FC<ManualRedactTabProps> = ({ onGoToDecrypt }) => {
  const [docCanvas, setDocCanvas] = useState<HTMLCanvasElement | null>(null);
  const [docDataUrl, setDocDataUrl] = useState<string | null>(null);
  const [docName, setDocName] = useState<string>('Document.png');

  // Drawing state
  const [boxes, setBoxes] = useState<ManualBox[]>([]);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);
  const [currentDragBox, setCurrentDragBox] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

  // Redaction parameters
  const [redactionMode, setRedactionMode] = useState<RedactionMode>('black');
  const [password, setPassword] = useState<string>('');
  const [activeLabel, setActiveLabel] = useState<string>('Custom Region');

  // Execution & Output
  const [isSecuring, setIsSecuring] = useState<boolean>(false);
  const [stegoResultUrl, setStegoResultUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Default to invoice sample which has interesting custom regions (signatures, tables)
    const sample = SAMPLE_DOCUMENTS[2] || SAMPLE_DOCUMENTS[0];
    const { canvas } = sample.render();
    setDocCanvas(canvas);
    setDocDataUrl(canvas.toDataURL('image/png'));
    setDocName(`${sample.name.replace(/\s+/g, '_')}.png`);
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setDocName(file.name);
    setBoxes([]);
    setStegoResultUrl(null);
    setErrorMsg(null);

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
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  const getCanvasCoordinates = (e: MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current || !docCanvas) return null;
    const rect = containerRef.current.getBoundingClientRect();
    const scaleX = docCanvas.width / rect.width;
    const scaleY = docCanvas.height / rect.height;

    const x = Math.max(0, Math.min(docCanvas.width, (e.clientX - rect.left) * scaleX));
    const y = Math.max(0, Math.min(docCanvas.height, (e.clientY - rect.top) * scaleY));
    return { x, y };
  };

  const handleMouseDown = (e: MouseEvent<HTMLDivElement>) => {
    const coords = getCanvasCoordinates(e);
    if (!coords) return;
    setIsDrawing(true);
    setStartPoint(coords);
    setCurrentDragBox({ x: coords.x, y: coords.y, w: 0, h: 0 });
  };

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!isDrawing || !startPoint) return;
    const coords = getCanvasCoordinates(e);
    if (!coords) return;

    const x = Math.min(startPoint.x, coords.x);
    const y = Math.min(startPoint.y, coords.y);
    const w = Math.abs(coords.x - startPoint.x);
    const h = Math.abs(coords.y - startPoint.y);

    setCurrentDragBox({ x, y, w, h });
  };

  const handleMouseUp = () => {
    if (isDrawing && currentDragBox && currentDragBox.w > 10 && currentDragBox.h > 10) {
      setBoxes(prev => [
        ...prev,
        {
          id: `box-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          x: Math.round(currentDragBox.x),
          y: Math.round(currentDragBox.y),
          w: Math.round(currentDragBox.w),
          h: Math.round(currentDragBox.h),
          label: activeLabel || `Region ${prev.length + 1}`,
        },
      ]);
    }
    setIsDrawing(false);
    setStartPoint(null);
    setCurrentDragBox(null);
  };

  const removeBox = (id: string) => {
    setBoxes(prev => prev.filter(b => b.id !== id));
  };

  const undoLastBox = () => {
    setBoxes(prev => prev.slice(0, -1));
  };

  const handleManualSecure = async () => {
    if (!docCanvas) {
      setErrorMsg('No active document loaded.');
      return;
    }
    if (boxes.length === 0) {
      setErrorMsg('Draw at least one redaction box on the document.');
      return;
    }
    if (!password.trim()) {
      setErrorMsg('Encryption Key / Password is required.');
      return;
    }

    setIsSecuring(true);
    setErrorMsg(null);

    try {
      // 1. Redact regions and crop original unredacted image patches
      const { redactedCanvas, regions } = DocumentScanner.executeRedaction(
        docCanvas,
        boxes.map(b => ({
          x: b.x,
          y: b.y,
          w: b.w,
          h: b.h,
          type: 'Manual Redaction',
          label: b.label,
        })),
        redactionMode
      );

      // 2. Prepare slot payload
      const slotPayload = {
        version: 2,
        timestamp: Date.now(),
        regions,
      };
      const payloadBytes = new TextEncoder().encode(JSON.stringify(slotPayload));

      // 3. Encrypt slot payload
      const newSlotEncrypted = await CryptoManager.encrypt(payloadBytes, password);

      // 4. Multi-slot chaining support
      let allSlots: Uint8Array[] = [newSlotEncrypted];
      try {
        const redCtx = redactedCanvas.getContext('2d')!;
        const existingImgData = redCtx.getImageData(0, 0, redactedCanvas.width, redactedCanvas.height);
        const priorData = StegoManager.extractData(existingImgData);
        const priorSlots = CryptoManager.extractSlots(priorData);
        allSlots = [...priorSlots, newSlotEncrypted];
      } catch {
        // First slot
      }

      // 5. Wrap multislot & hide in LSB pixels
      const finalBundle = CryptoManager.wrapMultislot(allSlots);
      const redCtx = redactedCanvas.getContext('2d')!;
      const imgData = redCtx.getImageData(0, 0, redactedCanvas.width, redactedCanvas.height);
      const stegoResult = StegoManager.hideData(imgData, finalBundle);
      redCtx.putImageData(stegoResult.stegoImageData, 0, 0);

      const finalUrl = redactedCanvas.toDataURL('image/png');
      setStegoResultUrl(finalUrl);

      confetti({
        particleCount: 45,
        spread: 60,
        origin: { y: 0.7 },
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error executing manual redaction.';
      setErrorMsg(message);
    } finally {
      setIsSecuring(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Helper Banner */}
      <div className="bg-[#111827] border border-[#1E293B] rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-[#FF2A55]/20 border border-[#FF2A55]/30 flex items-center justify-center text-[#FF5C7A]">
            <EyeOff className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Manual Drag-to-Redact Canvas</h3>
            <p className="text-xs text-[#94A3B8]">
              Click and drag directly on any signature, face, stamp, or sensitive figure to mask and encrypt.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept="image/*"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="text-xs px-3 py-1.5 rounded-lg bg-[#1E293B] hover:bg-[#334155] text-[#CBD5E1] border border-[#334155] transition-all flex items-center space-x-1.5"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload Document</span>
          </button>
        </div>
      </div>

      {/* Main Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Interactive Canvas (7 Cols) */}
        <div className="lg:col-span-7 bg-[#111827] border border-[#1E293B] rounded-xl flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-[#1E293B] flex items-center justify-between bg-[#0E1524]">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-semibold text-white">{docName}</span>
              <span className="text-[10px] text-[#64748B]">
                {boxes.length} custom box{boxes.length === 1 ? '' : 'es'}
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={undoLastBox}
                disabled={boxes.length === 0}
                className="px-2 py-1 rounded text-xs bg-[#1E293B] hover:bg-[#334155] disabled:opacity-40 text-[#CBD5E1] flex items-center space-x-1"
                title="Undo last box"
              >
                <Undo className="w-3 h-3" />
                <span>Undo</span>
              </button>

              <button
                onClick={() => setBoxes([])}
                disabled={boxes.length === 0}
                className="px-2 py-1 rounded text-xs bg-[#1E293B] hover:bg-[#334155] disabled:opacity-40 text-[#FF5C7A] flex items-center space-x-1"
                title="Clear all"
              >
                <Trash2 className="w-3 h-3" />
                <span>Clear</span>
              </button>
            </div>
          </div>

          {/* Interactive Drawing Viewport */}
          <div className="flex-1 min-h-[460px] p-4 bg-[#080B12] overflow-auto flex items-center justify-center select-none cursor-crosshair">
            {docDataUrl && (
              <div
                ref={containerRef}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                className="relative shadow-2xl border border-[#334155]/40 select-none"
                style={{
                  width: docCanvas ? `${docCanvas.width}px` : 'auto',
                  height: docCanvas ? `${docCanvas.height}px` : 'auto',
                }}
              >
                <img
                  src={docDataUrl}
                  alt="Document for Manual Redaction"
                  className="w-full h-full block pointer-events-none"
                  draggable={false}
                />

                {/* Existing manual boxes */}
                {boxes.map(b => (
                  <div
                    key={b.id}
                    className="absolute bg-black/90 border-2 border-[#FF2A55] shadow-lg flex items-start justify-between p-1"
                    style={{
                      left: `${b.x}px`,
                      top: `${b.y}px`,
                      width: `${b.w}px`,
                      height: `${b.h}px`,
                    }}
                  >
                    <span className="text-[10px] font-mono text-[#FF5C7A] bg-black/80 px-1 rounded truncate max-w-[80%]">
                      {b.label}
                    </span>
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        removeBox(b.id);
                      }}
                      className="text-white/60 hover:text-[#FF2A55]"
                      title="Remove"
                    >
                      ×
                    </button>
                  </div>
                ))}

                {/* Current dragging box */}
                {isDrawing && currentDragBox && (
                  <div
                    className="absolute bg-[#FF2A55]/20 border-2 border-dashed border-[#00E5FF] pointer-events-none"
                    style={{
                      left: `${currentDragBox.x}px`,
                      top: `${currentDragBox.y}px`,
                      width: `${currentDragBox.w}px`,
                      height: `${currentDragBox.h}px`,
                    }}
                  />
                )}
              </div>
            )}
          </div>

          <div className="px-4 py-2 bg-[#0D1320] border-t border-[#1E293B] text-[11px] text-[#64748B] flex items-center justify-between">
            <span>Tip: Drag with mouse to define redaction boundaries</span>
            <span>Coordinates are preserved pixel-perfect for lossless restoration</span>
          </div>
        </div>

        {/* Right Form & Actions (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Label Presets & Box List */}
          <div className="bg-[#111827] border border-[#1E293B] rounded-xl p-4 space-y-3">
            <h4 className="text-xs font-semibold text-white">Redaction Target Preset Label</h4>
            <div className="flex flex-wrap gap-1.5">
              {['Signature', 'Face Photo', 'Doctor Notes', 'Account Number', 'Personal Address'].map(tag => (
                <button
                  key={tag}
                  onClick={() => setActiveLabel(tag)}
                  className={`text-[11px] px-2.5 py-1 rounded-lg border transition-all ${
                    activeLabel === tag
                      ? 'bg-[#00E5FF]/20 text-[#00E5FF] border-[#00E5FF]/50 font-medium'
                      : 'bg-[#1E293B] text-[#94A3B8] border-[#334155] hover:text-white'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>

            {/* Created boxes list */}
            <div className="pt-2 border-t border-[#1E293B]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-white">Drawn Boxes ({boxes.length})</span>
              </div>

              <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
                {boxes.length === 0 ? (
                  <div className="py-6 text-center text-xs text-[#64748B]">
                    No manual boxes drawn yet. Click & drag on the document.
                  </div>
                ) : (
                  boxes.map((b, i) => (
                    <div
                      key={b.id}
                      className="p-2 rounded-lg bg-[#0E1524] border border-[#1E293B] flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center space-x-2">
                        <span className="w-5 h-5 rounded bg-[#1E293B] text-[10px] font-mono text-[#00E5FF] flex items-center justify-center">
                          {i + 1}
                        </span>
                        <span className="text-white font-medium">{b.label}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-[10px] font-mono text-[#64748B]">
                          {b.w}×{b.h}px
                        </span>
                        <button
                          onClick={() => removeBox(b.id)}
                          className="text-[#64748B] hover:text-[#FF2A55]"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Form Controls Card */}
          <div className="bg-[#111827] border border-[#1E293B] rounded-xl p-4 space-y-4">
            <div>
              <label className="text-xs font-semibold text-white block mb-1.5">Redaction Visual Style</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setRedactionMode('black')}
                  className={`py-2 px-3 rounded-lg text-xs font-medium border flex items-center justify-center space-x-2 transition-all ${
                    redactionMode === 'black'
                      ? 'bg-black text-white border-[#00E5FF]/60'
                      : 'bg-[#1E293B] text-[#94A3B8] border-[#334155]'
                  }`}
                >
                  <div className="w-3 h-3 bg-black border border-white/40" />
                  <span>Solid Blackout</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRedactionMode('blur')}
                  className={`py-2 px-3 rounded-lg text-xs font-medium border flex items-center justify-center space-x-2 transition-all ${
                    redactionMode === 'blur'
                      ? 'bg-[#7C3AED]/20 text-[#A78BFA] border-[#7C3AED]'
                      : 'bg-[#1E293B] text-[#94A3B8] border-[#334155]'
                  }`}
                >
                  <div className="w-3 h-3 bg-gradient-to-tr from-cyan-400 to-purple-500 rounded-xs" />
                  <span>Mosaic Blur</span>
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-white flex items-center space-x-1.5 mb-1.5">
                <Lock className="w-3.5 h-3.5 text-[#00E5FF]" />
                <span>Authorization Password</span>
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter password to encrypt regions..."
                className="w-full bg-[#1E293B] text-white text-xs px-3 py-2.5 rounded-lg border border-[#334155] focus:outline-none focus:border-[#00E5FF] font-mono"
              />
            </div>

            {errorMsg && (
              <div className="p-3 rounded-lg bg-[#FF2A55]/10 border border-[#FF2A55]/30 flex items-start space-x-2 text-xs text-[#FF5C7A]">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            <button
              onClick={handleManualSecure}
              disabled={isSecuring || boxes.length === 0}
              className={`w-full py-3 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center space-x-2 transition-all shadow-lg ${
                isSecuring || boxes.length === 0
                  ? 'bg-[#1E293B] text-[#64748B] cursor-not-allowed border border-[#334155]'
                  : 'bg-gradient-to-r from-[#FF2A55] to-[#7C3AED] hover:opacity-95 text-white shadow-[#FF2A55]/20 cursor-pointer'
              }`}
            >
              {isSecuring ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Encrypting & Embedding Stego Data...</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  <span>Secure & Generate Stego Image</span>
                </>
              )}
            </button>
          </div>

          {/* Result Card */}
          {stegoResultUrl && (
            <div className="bg-[#111827] border border-[#00E676]/40 rounded-xl p-4 bg-gradient-to-b from-[#111827] to-[#0A2E1E]/30 space-y-3">
              <div className="flex items-center justify-between text-[#00E676]">
                <span className="text-xs font-bold uppercase tracking-wide">
                  ✓ Stego PNG Created Successfully
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#00E676]/20 border border-[#00E676]/30">
                  {boxes.length} zones
                </span>
              </div>

              <div className="flex items-center space-x-2">
                <a
                  href={stegoResultUrl}
                  download={`MANUAL_SECURED_${docName}`}
                  className="flex-1 py-2 px-3 rounded-lg bg-[#00E676] hover:bg-[#00C853] text-[#080B12] text-xs font-bold flex items-center justify-center space-x-1.5 transition-all shadow-md"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Stego PNG</span>
                </a>
                <button
                  onClick={() => onGoToDecrypt(stegoResultUrl)}
                  className="py-2 px-3 rounded-lg bg-[#1E293B] hover:bg-[#334155] text-[#CBD5E1] text-xs font-medium flex items-center space-x-1 border border-[#334155]"
                >
                  <span>Restore</span>
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
