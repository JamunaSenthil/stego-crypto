/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Header } from './components/Header';
import { SmartScanTab } from './components/SmartScanTab';
import { ManualRedactTab } from './components/ManualRedactTab';
import { DecryptRestoreTab } from './components/DecryptRestoreTab';
import { StegoAnalyzerTab } from './components/StegoAnalyzerTab';
import { GitHubModal } from './components/GitHubModal';
import { SampleDocsModal } from './components/SampleDocsModal';
import { ShieldCheck, Lock, Github, CheckCircle2, Terminal } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('scan');
  const [isGitHubModalOpen, setIsGitHubModalOpen] = useState<boolean>(false);
  const [isSampleDocsModalOpen, setIsSampleDocsModalOpen] = useState<boolean>(false);
  const [stegoImageForDecrypt, setStegoImageForDecrypt] = useState<string | null>(null);

  const handleJumpToDecrypt = (stegoDataUrl: string) => {
    setStegoImageForDecrypt(stegoDataUrl);
    setActiveTab('decrypt');
  };

  const handleSelectSampleFromModal = (sampleId: string) => {
    setActiveTab('scan');
  };

  return (
    <div className="min-h-screen bg-[#080B12] text-[#F8FAFC] flex flex-col font-sans selection:bg-[#00E5FF]/20 selection:text-[#00E5FF]">
      {/* Top Application Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenGitHubModal={() => setIsGitHubModalOpen(true)}
        onOpenSamplesModal={() => setIsSampleDocsModalOpen(true)}
      />

      {/* Main Tab Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'scan' && (
          <SmartScanTab onGoToDecrypt={handleJumpToDecrypt} />
        )}
        {activeTab === 'manual' && (
          <ManualRedactTab onGoToDecrypt={handleJumpToDecrypt} />
        )}
        {activeTab === 'decrypt' && (
          <DecryptRestoreTab initialImageUrl={stegoImageForDecrypt} />
        )}
        {activeTab === 'analyzer' && (
          <StegoAnalyzerTab />
        )}
      </main>

      {/* Bottom Status & Diagnostics Bar */}
      <footer className="border-t border-[#1E293B] bg-[#0A0E17] py-2 px-4 text-xs text-[#94A3B8]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-[#00E676] animate-pulse" />
              <span className="font-mono text-[11px] text-[#CBD5E1]">
                ENGINE ACTIVE: SECUREGUARD AI
              </span>
            </div>
            <span className="text-[#334155]">•</span>
            <span className="text-[11px] text-[#64748B] hidden md:inline">
              Repository:{' '}
              <a
                href="https://github.com/JamunaSenthil/stego-crypto"
                target="_blank"
                rel="noreferrer"
                className="text-[#94A3B8] hover:text-[#00E5FF] underline"
              >
                JamunaSenthil/stego-crypto
              </a>
            </span>
          </div>

          <div className="flex items-center space-x-4 text-[11px] font-mono text-[#64748B]">
            <span>AES-256-GCM</span>
            <span>PBKDF2-HMAC-SHA256</span>
            <span>LSB-ZLIB-4B</span>
            <button
              onClick={() => setIsGitHubModalOpen(true)}
              className="text-[#00E5FF] hover:underline flex items-center space-x-1"
            >
              <Github className="w-3 h-3" />
              <span>Export Guide</span>
            </button>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <GitHubModal
        isOpen={isGitHubModalOpen}
        onClose={() => setIsGitHubModalOpen(false)}
      />
      <SampleDocsModal
        isOpen={isSampleDocsModalOpen}
        onClose={() => setIsSampleDocsModalOpen(false)}
        onSelectSample={handleSelectSampleFromModal}
      />
    </div>
  );
}
