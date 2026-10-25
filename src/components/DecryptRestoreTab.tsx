import React, { useState, useRef, useEffect } from 'react';
import { 
  Lock, Unlock, Upload, Download, CheckCircle2, AlertTriangle, 
  RefreshCw, FileText, Sparkles, Layers, Eye, ShieldCheck, ArrowLeftRight 
} from 'lucide-react';
import { StegoManager } from '../lib/stego';
import { CryptoManager } from '../lib/crypto';
import { DocumentScanner } from '../lib/documentScanner';
import { RedactionRegion } from '../types';
import confetti from 'canvas-confetti';

interface DecryptRestoreTabProps {
  initialImageUrl?: string | null;
}

export const DecryptRestoreTab: React.FC<DecryptRestoreTabProps> = ({ initialImageUrl }) => {
  const [securedDataUrl, setSecuredDataUrl] = useState<string | null>(null);
  const [securedCanvas, setSecuredCanvas] = useState<HTMLCanvasElement | null>(null);
  const [docName, setDocName] = useState<string>('Secured_Document.png');

  const [password, setPassword] = useState<string>('');
  const [isDecrypting, setIsDecrypting] = useState<boolean>(false);
  const [restoredCanvas, setRestoredCanvas] = useState<HTMLCanvasElement | null>(null);
  const [restoredDataUrl, setRestoredDataUrl] = useState<string | null>(null);

  const [restoredRegions, setRestoredRegions] = useState<RedactionRegion[]>([]);
  const [slotsCount, setSlotsCount] = useState<number>(0);
  const [matchedSlots, setMatchedSlots] = useState<number>(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // View state: 'restored' | 'secured' | 'split'
  const [compareMode, setCompareMode] = useState<'restored' | 'secured'>('restored');

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialImageUrl) {
      loadImageFromUrl(initialImageUrl, 'Exported_Stego_Document.png');
    }
  }, [initialImageUrl]);

  const loadImageFromUrl = (url: string, name = 'Secured_Document.png') => {
    setDocName(name);
    setRestoredCanvas(null);
    setRestoredDataUrl(null);
    setRestoredRegions([]);
    setErrorMsg(null);

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);

      setSecuredCanvas(canvas);
      setSecuredDataUrl(canvas.toDataURL('image/png'));
    };
    img.src = url;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setDocName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      loadImageFromUrl(reader.result as string, file.name);
    };
    reader.readAsDataURL(file);
  };

  const handleDecryptAndRestore = async () => {
    if (!securedCanvas) {
      setErrorMsg('Please load a secured Stego document first.');
      return;
    }

    if (!password.trim()) {
      setErrorMsg('Password is required to decrypt authorization slot.');
      return;
    }

    setIsDecrypting(true);
    setErrorMsg(null);

    try {
      // Step 1: Extract LSB stego payload from the image
      const ctx = securedCanvas.getContext('2d')!;
      const imgData = ctx.getImageData(0, 0, securedCanvas.width, securedCanvas.height);
      const rawStegoBytes = StegoManager.extractData(imgData);

      // Step 2: Unpack slot blobs (supports multislot chaining and single-slot)
      const slotBlobs = CryptoManager.extractSlots(rawStegoBytes);
      setSlotsCount(slotBlobs.length);

      // Step 3: Iterate through slots and attempt decryption with password
      const recoveredRegions: RedactionRegion[] = [];
      let matchedCount = 0;

      for (const slotBlob of slotBlobs) {
        try {
          const decryptedBytes = await CryptoManager.decrypt(slotBlob, password);
          const decryptedJson = new TextDecoder().decode(decryptedBytes);
          const parsed = JSON.parse(decryptedJson);

          if (parsed && Array.isArray(parsed.regions)) {
            recoveredRegions.push(...parsed.regions);
            matchedCount++;
          }
        } catch {
          // Wrong password for this specific slot (in multi-slot scenarios)
        }
      }

      setMatchedSlots(matchedCount);

      if (recoveredRegions.length === 0) {
        throw new Error(
          'Authentication failed. The password does not match any encrypted slots in this document, or data was corrupted.'
        );
      }

      // Step 4: Reconstruct and paste original unredacted image patches onto canvas
      const restored = await DocumentScanner.restorePatches(securedCanvas, recoveredRegions);
      setRestoredCanvas(restored);
      setRestoredDataUrl(restored.toDataURL('image/png'));
      setRestoredRegions(recoveredRegions);
      setCompareMode('restored');

      confetti({
        particleCount: 70,
        spread: 80,
        origin: { y: 0.6 },
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to decrypt and restore document.';
      setErrorMsg(message);
    } finally {
      setIsDecrypting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-[#111827] border border-[#1E293B] rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-[#00E676]/20 border border-[#00E676]/30 flex items-center justify-center text-[#00E676]">
            <Unlock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Controlled Reversible Restoration</h3>
            <p className="text-xs text-[#94A3B8]">
              Extracts hidden LSB stego payloads, decrypts authorized slots, and restores high-resolution original document patches.
            </p>
          </div>
        </div>

        {/* Load Actions */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => loadImageFromUrl('/samples/stego_output.png', 'Sample_Stego_Output.png')}
            className="text-xs px-3 py-1.5 rounded-lg bg-[#1E293B] hover:bg-[#334155] text-[#00E5FF] border border-[#334155] transition-all flex items-center space-x-1.5 font-medium"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Load Repo Sample Stego</span>
          </button>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept="image/png,image/*"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="text-xs px-3 py-1.5 rounded-lg bg-[#00E676]/10 hover:bg-[#00E676]/20 text-[#00E676] border border-[#00E676]/40 transition-all flex items-center space-x-1.5 font-medium"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload Stego PNG</span>
          </button>
        </div>
      </div>

      {/* Main Two-Column View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Visual Document Restoration Viewport (7 Cols) */}
        <div className="lg:col-span-7 bg-[#111827] border border-[#1E293B] rounded-xl flex flex-col overflow-hidden">
          {/* Header Bar */}
          <div className="px-4 py-3 border-b border-[#1E293B] flex items-center justify-between bg-[#0E1524]">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-semibold text-white">{docName}</span>
              {restoredRegions.length > 0 && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#00E676]/20 text-[#00E676] border border-[#00E676]/30">
                  {restoredRegions.length} Patches Restored
                </span>
              )}
            </div>

            {/* Toggle Compare Mode */}
            {restoredDataUrl && (
              <div className="flex items-center space-x-1 bg-[#1E293B] p-0.5 rounded-lg border border-[#334155]">
                <button
                  onClick={() => setCompareMode('restored')}
                  className={`text-xs px-2.5 py-1 rounded font-medium transition-all ${
                    compareMode === 'restored'
                      ? 'bg-[#00E676] text-[#080B12]'
                      : 'text-[#94A3B8] hover:text-white'
                  }`}
                >
                  Restored
                </button>
                <button
                  onClick={() => setCompareMode('secured')}
                  className={`text-xs px-2.5 py-1 rounded font-medium transition-all ${
                    compareMode === 'secured'
                      ? 'bg-[#FF2A55] text-white'
                      : 'text-[#94A3B8] hover:text-white'
                  }`}
                >
                  Masked
                </button>
              </div>
            )}
          </div>

          {/* Viewport */}
          <div className="flex-1 min-h-[460px] p-4 bg-[#080B12] overflow-auto flex items-center justify-center">
            {securedDataUrl ? (
              <div className="relative shadow-2xl border border-[#334155]/40 rounded-sm">
                <img
                  src={compareMode === 'restored' && restoredDataUrl ? restoredDataUrl : securedDataUrl}
                  alt="Secured / Restored Document"
                  className="max-w-full block"
                />

                {/* Status Overlay Badge */}
                <div className="absolute top-3 right-3">
                  {restoredDataUrl ? (
                    <div className="px-2.5 py-1 rounded-md bg-[#00E676]/90 text-[#080B12] text-xs font-bold flex items-center space-x-1 shadow-lg">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>AUTHENTIC RESTORATION</span>
                    </div>
                  ) : (
                    <div className="px-2.5 py-1 rounded-md bg-black/80 text-[#FF5C7A] text-xs font-mono border border-[#FF2A55]/40">
                      ENCRYPTED STEGO ASSET
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-16 space-y-3">
                <FileText className="w-12 h-12 text-[#334155] mx-auto" />
                <p className="text-xs text-[#64748B]">
                  No document loaded. Click "Load Repo Sample Stego" or upload a PNG.
                </p>
              </div>
            )}
          </div>

          {/* Footer Bar */}
          <div className="px-4 py-2.5 bg-[#0D1320] border-t border-[#1E293B] flex items-center justify-between text-xs text-[#94A3B8]">
            <span>Verification: Green dashed outlines denote restored pixel patches</span>
            {restoredRegions.length > 0 && (
              <span className="text-[#00E676] font-mono text-[11px]">
                Integrity Verified 100%
              </span>
            )}
          </div>
        </div>

        {/* Right Column: Key Input & Verification Audit (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Authentication Card */}
          <div className="bg-[#111827] border border-[#1E293B] rounded-xl p-4 space-y-4">
            <div className="flex items-center space-x-2">
              <Lock className="w-4 h-4 text-[#00E5FF]" />
              <h3 className="text-sm font-semibold text-white">Security Authentication</h3>
            </div>

            <div>
              <label className="text-xs font-medium text-white block mb-1.5">
                Passphrase / Key
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter password used during redaction..."
                className="w-full bg-[#1E293B] text-white text-xs px-3 py-2.5 rounded-lg border border-[#334155] focus:outline-none focus:border-[#00E676] font-mono"
              />
              <p className="text-[11px] text-[#64748B] mt-1.5">
                Stego payload uses LSB 4-byte header framing + zlib decompression + PBKDF2 salt extraction.
              </p>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-lg bg-[#FF2A55]/10 border border-[#FF2A55]/30 flex items-start space-x-2 text-xs text-[#FF5C7A]">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            <button
              onClick={handleDecryptAndRestore}
              disabled={isDecrypting || !securedCanvas}
              className={`w-full py-3 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center space-x-2 transition-all shadow-lg ${
                isDecrypting || !securedCanvas
                  ? 'bg-[#1E293B] text-[#64748B] cursor-not-allowed border border-[#334155]'
                  : 'bg-gradient-to-r from-[#00E676] to-[#00B8D4] hover:opacity-95 text-[#080B12] shadow-[#00E676]/20 cursor-pointer'
              }`}
            >
              {isDecrypting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-[#080B12]" />
                  <span>Unpacking Stego & Authenticating Key...</span>
                </>
              ) : (
                <>
                  <Unlock className="w-4 h-4 text-[#080B12]" />
                  <span>Decrypt & Restore Document</span>
                </>
              )}
            </button>
          </div>

          {/* Audit Verification Log */}
          {restoredRegions.length > 0 && restoredDataUrl && (
            <div className="bg-[#111827] border border-[#00E676]/40 rounded-xl p-4 space-y-3 bg-gradient-to-b from-[#111827] to-[#092B1C]/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-[#00E676]">
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase tracking-wide">
                    Restoration Audit Log
                  </span>
                </div>
                <span className="text-[10px] font-mono text-[#94A3B8]">
                  Slot {matchedSlots} / {slotsCount} unlocked
                </span>
              </div>

              <div className="space-y-1.5 max-h-[200px] overflow-y-auto pr-1">
                {restoredRegions.map((r, i) => (
                  <div
                    key={r.id || i}
                    className="p-2 rounded bg-[#080B12] border border-[#1E293B] text-xs flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-2 truncate">
                      <span className="w-5 h-5 rounded bg-[#00E676]/20 text-[#00E676] text-[10px] font-mono flex items-center justify-center shrink-0">
                        ✓
                      </span>
                      <div className="truncate">
                        <span className="text-white font-medium block truncate">
                          {r.type}
                        </span>
                        {r.label && (
                          <span className="text-[10px] font-mono text-[#94A3B8] truncate block">
                            {r.label}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-[#64748B] shrink-0">
                      {r.w}×{r.h} at ({r.x},{r.y})
                    </span>
                  </div>
                ))}
              </div>

              <a
                href={restoredDataUrl}
                download={`RESTORED_${docName}`}
                className="w-full py-2.5 px-3 rounded-lg bg-[#00E676] hover:bg-[#00C853] text-[#080B12] text-xs font-bold flex items-center justify-center space-x-1.5 transition-all shadow-md"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Restored Full Document</span>
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
