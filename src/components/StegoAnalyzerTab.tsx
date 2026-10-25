import React, { useState, useEffect, useRef } from 'react';
import { Cpu, Upload, Eye, Layers, ShieldCheck, AlertCircle, BarChart3, Sparkles } from 'lucide-react';
import { StegoManager } from '../lib/stego';
import { CryptoManager } from '../lib/crypto';

export const StegoAnalyzerTab: React.FC = () => {
  const [currentCanvas, setCurrentCanvas] = useState<HTMLCanvasElement | null>(null);
  const [currentDataUrl, setCurrentDataUrl] = useState<string | null>(null);
  const [lsbDataUrl, setLsbDataUrl] = useState<string | null>(null);
  const [docName, setDocName] = useState<string>('stego_output.png');

  const [viewMode, setViewMode] = useState<'normal' | 'lsb'>('lsb');
  const [analysis, setAnalysis] = useState<{
    hasStego: boolean;
    payloadLength: number;
    capacity: number;
    utilizationPercent: number;
    width: number;
    height: number;
    totalPixels: number;
    multislotInfo?: { isMultislot: boolean; slotCount: number };
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Load default sample
    loadAnalyzeImage('/samples/stego_output.png', 'stego_output.png');
  }, []);

  const loadAnalyzeImage = (url: string, name: string) => {
    setDocName(name);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);

      setCurrentCanvas(canvas);
      setCurrentDataUrl(canvas.toDataURL('image/png'));

      // Perform Stego Analysis
      const imgData = ctx.getImageData(0, 0, img.width, img.height);
      const stats = StegoManager.inspect(imgData);

      // Check multislot if payload exists
      let multislotInfo = { isMultislot: false, slotCount: 0 };
      if (stats.hasStego) {
        try {
          const raw = StegoManager.extractData(imgData);
          const slots = CryptoManager.extractSlots(raw);
          multislotInfo = {
            isMultislot: slots.length > 1,
            slotCount: slots.length,
          };
        } catch {
          // not parsable without decrypt
        }
      }

      setAnalysis({
        ...stats,
        width: img.width,
        height: img.height,
        totalPixels: img.width * img.height,
        multislotInfo,
      });

      // Generate LSB Bit Plane Visualizer
      const lsbImageData = StegoManager.generateLSBVisualization(imgData);
      const lsbCanvas = document.createElement('canvas');
      lsbCanvas.width = img.width;
      lsbCanvas.height = img.height;
      const lsbCtx = lsbCanvas.getContext('2d')!;
      lsbCtx.putImageData(lsbImageData, 0, 0);
      setLsbDataUrl(lsbCanvas.toDataURL('image/png'));
    };
    img.src = url;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      loadAnalyzeImage(reader.result as string, file.name);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-[#111827] border border-[#1E293B] rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-[#00E5FF]/20 border border-[#00E5FF]/30 flex items-center justify-center text-[#00E5FF]">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">LSB Stego Inspector & Bit-Plane Visualizer</h3>
            <p className="text-xs text-[#94A3B8]">
              Examine the 0th bit plane to detect steganographic variance, header framing, and payload capacity.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => loadAnalyzeImage('/samples/test_image.png', 'test_image.png')}
            className="text-xs px-2.5 py-1.5 rounded-lg bg-[#1E293B] hover:bg-[#334155] text-[#CBD5E1] border border-[#334155] transition-all flex items-center space-x-1"
          >
            <span>Raw Cover Image</span>
          </button>
          <button
            onClick={() => loadAnalyzeImage('/samples/stego_output.png', 'stego_output.png')}
            className="text-xs px-2.5 py-1.5 rounded-lg bg-[#00E5FF]/10 text-[#00E5FF] hover:bg-[#00E5FF]/20 border border-[#00E5FF]/30 transition-all flex items-center space-x-1"
          >
            <span>Stego Output Sample</span>
          </button>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept="image/*"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="text-xs px-3 py-1.5 rounded-lg bg-[#1E293B] hover:bg-[#334155] text-white border border-[#334155] transition-all flex items-center space-x-1.5 font-medium"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload Image</span>
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Viewport (7 Cols) */}
        <div className="lg:col-span-7 bg-[#111827] border border-[#1E293B] rounded-xl flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-[#1E293B] flex items-center justify-between bg-[#0E1524]">
            <span className="text-xs font-semibold text-white">{docName}</span>

            {/* Mode Switcher */}
            <div className="flex items-center space-x-1 bg-[#1E293B] p-0.5 rounded-lg border border-[#334155]">
              <button
                onClick={() => setViewMode('lsb')}
                className={`text-xs px-2.5 py-1 rounded font-medium transition-all ${
                  viewMode === 'lsb'
                    ? 'bg-[#00E5FF] text-[#080B12]'
                    : 'text-[#94A3B8] hover:text-white'
                }`}
              >
                LSB Bit Plane
              </button>
              <button
                onClick={() => setViewMode('normal')}
                className={`text-xs px-2.5 py-1 rounded font-medium transition-all ${
                  viewMode === 'normal'
                    ? 'bg-[#7C3AED] text-white'
                    : 'text-[#94A3B8] hover:text-white'
                }`}
              >
                Normal RGB
              </button>
            </div>
          </div>

          <div className="flex-1 min-h-[460px] p-4 bg-[#080B12] overflow-auto flex items-center justify-center">
            {viewMode === 'lsb' && lsbDataUrl ? (
              <div className="relative border border-[#00E5FF]/30 shadow-2xl">
                <img src={lsbDataUrl} alt="LSB Bit Plane" className="max-w-full block" />
                <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/80 text-[10px] font-mono text-[#00E5FF] border border-[#00E5FF]/40">
                  LSB Contrast Map (0th Bit)
                </div>
              </div>
            ) : currentDataUrl ? (
              <div className="relative border border-[#1E293B] shadow-2xl">
                <img src={currentDataUrl} alt="Normal View" className="max-w-full block" />
              </div>
            ) : null}
          </div>

          <div className="px-4 py-2 bg-[#0D1320] border-t border-[#1E293B] text-[11px] text-[#64748B]">
            In the LSB Bit Plane view, natural image noise appears pseudo-random, while unwritten areas or constant pixels exhibit solid or banded structures.
          </div>
        </div>

        {/* Right: Metrics & Analysis Card (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          {analysis && (
            <div className="bg-[#111827] border border-[#1E293B] rounded-xl p-4 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#1E293B]">
                <div className="flex items-center space-x-2">
                  <BarChart3 className="w-4 h-4 text-[#00E5FF]" />
                  <h3 className="text-sm font-semibold text-white">Stego Header & Capacity</h3>
                </div>
                {analysis.hasStego ? (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#00E676]/20 text-[#00E676] border border-[#00E676]/30">
                    PAYLOAD DETECTED
                  </span>
                ) : (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#64748B]/20 text-[#94A3B8] border border-[#64748B]/30">
                    NO HEADER FOUND
                  </span>
                )}
              </div>

              {/* Capacity Progress Bar */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#94A3B8]">Capacity Utilization</span>
                  <span className="font-mono text-white">
                    {analysis.utilizationPercent.toFixed(2)}%
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-[#1E293B] overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#00E5FF] to-[#7C3AED] transition-all duration-300"
                    style={{ width: `${Math.min(100, Math.max(1, analysis.utilizationPercent))}%` }}
                  />
                </div>
              </div>

              {/* Data Table */}
              <div className="space-y-2 bg-[#080B12] p-3 rounded-lg border border-[#1E293B] text-xs">
                <div className="flex justify-between">
                  <span className="text-[#64748B]">Dimensions</span>
                  <span className="font-mono text-white">
                    {analysis.width} × {analysis.height} px
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#64748B]">Total Pixels</span>
                  <span className="font-mono text-white">
                    {analysis.totalPixels.toLocaleString()} px
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#64748B]">Max LSB Capacity</span>
                  <span className="font-mono text-[#00E5FF]">
                    {(analysis.capacity / 1024).toFixed(2)} KB ({analysis.capacity.toLocaleString()} bytes)
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#64748B]">Payload (Compressed)</span>
                  <span className="font-mono text-[#A78BFA]">
                    {analysis.hasStego
                      ? `${(analysis.payloadLength / 1024).toFixed(2)} KB (${analysis.payloadLength.toLocaleString()} bytes)`
                      : '0 bytes'}
                  </span>
                </div>
                {analysis.multislotInfo && (
                  <div className="flex justify-between border-t border-[#1E293B] pt-2">
                    <span className="text-[#64748B]">Chained Slot Architecture</span>
                    <span className="font-mono text-[#00E676]">
                      {analysis.multislotInfo.isMultislot
                        ? `Multi-slot (${analysis.multislotInfo.slotCount} keys)`
                        : 'Single Slot'}
                    </span>
                  </div>
                )}
              </div>

              {/* Info Box */}
              <div className="p-3 rounded-lg bg-[#0E1524] border border-[#1E293B] text-xs text-[#94A3B8] space-y-1.5">
                <div className="font-semibold text-white flex items-center space-x-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#00E5FF]" />
                  <span>Security Guarantee</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  Stego payloads are compressed via zlib and encrypted via authenticated AES-256-GCM. An attacker inspecting the image cannot distinguish embedded ciphertext bits from naturally occurring camera noise.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
