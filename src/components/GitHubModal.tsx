import React, { useState } from 'react';
import { Github, Check, Copy, ExternalLink, ShieldCheck, Terminal, BookOpen, Layers } from 'lucide-react';

interface GitHubModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GitHubModal: React.FC<GitHubModalProps> = ({ isOpen, onClose }) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  if (!isOpen) return null;

  const gitCommands = [
    `# 1. Initialize local repository (or check status)
git init

# 2. Add all migrated Web Application source files
git add .

# 3. Commit with a clear summary
git commit -m "Port SecureGuard Stego-Crypto to modern Web App (React 19, TypeScript, WebCrypto, LSB Steganography)"

# 4. Link to your GitHub repository (replace with your repo URL)
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/stego-crypto-web.git

# 5. Push to your GitHub
git push -u origin main`,
  ];

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#111827] border border-[#1E293B] rounded-2xl max-w-2xl w-full p-6 space-y-5 shadow-2xl relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#64748B] hover:text-white p-1 rounded-lg"
        >
          ✕
        </button>

        {/* Header */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-[#1F2937] border border-[#374151] flex items-center justify-center text-white">
            <Github className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white flex items-center space-x-2">
              <span>Add Stego-Crypto to Your GitHub</span>
            </h2>
            <p className="text-xs text-[#94A3B8]">
              Source repository:{' '}
              <a
                href="https://github.com/keshavkrk/stego-crypto"
                target="_blank"
                rel="noreferrer"
                className="text-[#00E5FF] hover:underline inline-flex items-center space-x-0.5 font-mono"
              >
                <span>keshavkrk/stego-crypto</span>
                <ExternalLink className="w-3 h-3 ml-0.5" />
              </a>
            </p>
          </div>
        </div>

        {/* Migration Overview */}
        <div className="p-3.5 rounded-xl bg-[#080B12] border border-[#1E293B] space-y-2 text-xs">
          <div className="font-semibold text-white flex items-center space-x-1.5">
            <ShieldCheck className="w-4 h-4 text-[#00E676]" />
            <span>Architecture & Feature Parity</span>
          </div>
          <p className="text-[#94A3B8] leading-relaxed">
            This workspace contains the complete web adaptation of <strong className="text-white">keshavkrk/stego-crypto</strong>. The original Python CustomTkinter desktop app has been re-architected into a modern zero-install Web application:
          </p>
          <ul className="grid grid-cols-2 gap-2 pt-1 text-[11px] text-[#CBD5E1]">
            <li className="flex items-center space-x-1.5">
              <span className="text-[#00E676]">✓</span>
              <span>PBKDF2-HMAC-SHA256 & AES-256</span>
            </li>
            <li className="flex items-center space-x-1.5">
              <span className="text-[#00E676]">✓</span>
              <span>LSB 4-Byte Header & Zlib Framing</span>
            </li>
            <li className="flex items-center space-x-1.5">
              <span className="text-[#00E676]">✓</span>
              <span>Aadhaar, PAN, CC, Phone & Email OCR</span>
            </li>
            <li className="flex items-center space-x-1.5">
              <span className="text-[#00E676]">✓</span>
              <span>Multi-slot Chained Redaction</span>
            </li>
            <li className="flex items-center space-x-1.5">
              <span className="text-[#00E676]">✓</span>
              <span>Interactive Drag-to-Redact Canvas</span>
            </li>
            <li className="flex items-center space-x-1.5">
              <span className="text-[#00E676]">✓</span>
              <span>Reversible Pixel Patch Restoration</span>
            </li>
          </ul>
        </div>

        {/* Step-by-Step Push Instructions */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-white flex items-center space-x-1.5">
              <Terminal className="w-3.5 h-3.5 text-[#00E5FF]" />
              <span>Git Commands to Push to Your GitHub</span>
            </label>
            <button
              onClick={() => handleCopy(gitCommands[0], 0)}
              className="text-[11px] px-2.5 py-1 rounded bg-[#1E293B] hover:bg-[#334155] text-[#00E5FF] border border-[#00E5FF]/30 flex items-center space-x-1 transition-all"
            >
              {copiedIndex === 0 ? <Check className="w-3 h-3 text-[#00E676]" /> : <Copy className="w-3 h-3" />}
              <span>{copiedIndex === 0 ? 'Copied' : 'Copy Commands'}</span>
            </button>
          </div>

          <pre className="bg-[#080B12] p-3.5 rounded-xl border border-[#1E293B] text-[11px] font-mono text-[#A78BFA] overflow-x-auto whitespace-pre leading-relaxed select-all">
            {gitCommands[0]}
          </pre>
        </div>

        {/* Modal Footer */}
        <div className="flex justify-end pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-[#1E293B] hover:bg-[#334155] text-xs font-medium text-white transition-all"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
