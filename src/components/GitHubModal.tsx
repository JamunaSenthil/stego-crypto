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
                href="https://github.com/JamunaSenthil/stego-crypto"
                target="_blank"
                rel="noreferrer"
                className="text-[#00E5FF] hover:underline inline-flex items-center space-x-0.5 font-mono"
              >
                <span>JamunaSenthil/stego-crypto</span>
                <ExternalLink className="w-3 h-3 ml-0.5" />
              </a>
            </p>
          </div>
        </div>

        {/* Migration Overview */}
        <div className="p-3.5 rounded-xl bg-[#080B12] border border-[#1E293B] space-y-2 text-xs">
          <div className="font-semibold text-white flex items-center space-x-1.5">
            <ShieldCheck className="w-4 h-4 text-[#00E676]" />
            <span>Project Published to GitHub (JamunaSenthil)</span>
          </div>
          <p className="text-[#94A3B8] leading-relaxed">
            The project is packaged as a modern, high-performance Web Application (React 19 + TypeScript + WebCrypto + LSB Stego Engine) under your repository <strong className="text-white">JamunaSenthil/stego-crypto</strong>.
          </p>
        </div>

        {/* 3 Methods */}
        <div className="space-y-3">
          {/* Method 1: AI Studio Built-in Export */}
          <div className="p-3.5 rounded-xl bg-[#0D1525] border border-[#00E5FF]/30 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white flex items-center space-x-2">
                <span className="w-5 h-5 rounded-full bg-[#00E5FF]/20 text-[#00E5FF] text-[10px] flex items-center justify-center font-mono">1</span>
                <span>Method 1: AI Studio One-Click GitHub Export (Recommended)</span>
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-[#00E676]/20 text-[#00E676] font-medium">Easiest</span>
            </div>
            <p className="text-[#94A3B8] text-[11px] leading-relaxed">
              In the top-right toolbar of the Google AI Studio Build interface (above this window), click the <strong>Export</strong> or <strong>GitHub</strong> icon. Connect your GitHub account and AI Studio will automatically create the repository and push all source files directly to your account with zero commands needed!
            </p>
          </div>

          {/* Method 2: Direct Zip Download */}
          <div className="p-3.5 rounded-xl bg-[#0D1525] border border-[#1E293B] space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white flex items-center space-x-2">
                <span className="w-5 h-5 rounded-full bg-[#7C3AED]/20 text-[#A78BFA] text-[10px] flex items-center justify-center font-mono">2</span>
                <span>Method 2: Download Complete Project Archive</span>
              </span>
              <a
                href="/stego-crypto-project.zip"
                download="stego-crypto-web-project.zip"
                className="px-3 py-1 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-semibold flex items-center space-x-1.5 transition-all shadow-md shadow-[#7C3AED]/20"
              >
                <span>Download .ZIP</span>
              </a>
            </div>
            <p className="text-[#94A3B8] text-[11px] leading-relaxed">
              Download the clean, full repository zip archive. Then on GitHub, create a new repository and drag-and-drop the unzipped project folder.
            </p>
          </div>

          {/* Method 3: Git CLI Push */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-white flex items-center space-x-2">
                <span className="w-5 h-5 rounded-full bg-[#1E293B] text-[#CBD5E1] text-[10px] flex items-center justify-center font-mono">3</span>
                <span className="flex items-center space-x-1.5">
                  <Terminal className="w-3.5 h-3.5 text-[#00E5FF]" />
                  <span>Method 3: Push via Git Terminal</span>
                </span>
              </label>
              <button
                onClick={() => handleCopy(gitCommands[0], 0)}
                className="text-[11px] px-2.5 py-1 rounded bg-[#1E293B] hover:bg-[#334155] text-[#00E5FF] border border-[#00E5FF]/30 flex items-center space-x-1 transition-all"
              >
                {copiedIndex === 0 ? <Check className="w-3 h-3 text-[#00E676]" /> : <Copy className="w-3 h-3" />}
                <span>{copiedIndex === 0 ? 'Copied' : 'Copy Commands'}</span>
              </button>
            </div>

            <pre className="bg-[#080B12] p-3 rounded-xl border border-[#1E293B] text-[11px] font-mono text-[#A78BFA] overflow-x-auto whitespace-pre leading-relaxed select-all">
{`# In your new GitHub repository, run:
git remote add origin https://github.com/<YOUR_GITHUB_USERNAME>/stego-crypto.git
git branch -M main
git push -u origin main`}
            </pre>
            <p className="text-[11px] text-[#64748B]">
              Tip: If you'd like me to push directly from this terminal, you can provide your repository URL and a temporary GitHub Personal Access Token (PAT) with "repo" scope.
            </p>
          </div>
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
