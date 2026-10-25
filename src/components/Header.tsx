import React from 'react';
import { ShieldCheck, Lock, EyeOff, Cpu, Github, ExternalLink, Sparkles } from 'lucide-react';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenGitHubModal: () => void;
  onOpenSamplesModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  onOpenGitHubModal,
  onOpenSamplesModal,
}) => {
  const tabs = [
    { id: 'scan', label: 'Smart Scan & Redact', icon: Sparkles },
    { id: 'manual', label: 'Manual Redaction', icon: EyeOff },
    { id: 'decrypt', label: 'Decrypt & Restore', icon: Lock },
    { id: 'analyzer', label: 'Stego Analyzer', icon: Cpu },
  ];

  return (
    <header className="border-b border-[#1E293B] bg-[#0B0F19] sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#7C3AED] via-[#00E5FF] to-[#00E676] p-0.5 shadow-lg shadow-[#00E5FF]/10 flex items-center justify-center">
              <div className="w-full h-full bg-[#080B12] rounded-[10px] flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-[#00E5FF]" />
              </div>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-lg text-white tracking-tight">SecureGuard AI</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#7C3AED]/20 text-[#A78BFA] border border-[#7C3AED]/40">
                  STEGO-CRYPT v2.0
                </span>
              </div>
              <p className="text-xs text-[#94A3B8]">Controlled Redaction • AES-256 • LSB Steganography</p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="hidden md:flex items-center space-x-1 bg-[#111827] p-1 rounded-xl border border-[#1E293B]">
            {tabs.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-[#7C3AED] to-[#6366F1] text-white shadow-md shadow-[#7C3AED]/25'
                      : 'text-[#94A3B8] hover:text-white hover:bg-[#1E293B]/60'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Right Action buttons */}
          <div className="flex items-center space-x-2">
            <button
              onClick={onOpenSamplesModal}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[#1A2332] text-[#00E5FF] hover:bg-[#1A2332]/80 border border-[#00E5FF]/30 transition-all flex items-center space-x-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Sample Docs</span>
            </button>

            <button
              onClick={onOpenGitHubModal}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[#1F2937] text-white hover:bg-[#374151] border border-[#374151] transition-all flex items-center space-x-1.5"
              title="Add to GitHub & Repo Info"
            >
              <Github className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Add to GitHub</span>
            </button>
          </div>
        </div>

        {/* Mobile Tab bar */}
        <div className="flex md:hidden overflow-x-auto py-2 space-x-1 border-t border-[#1E293B]/50">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-[#7C3AED] text-white'
                    : 'text-[#94A3B8] hover:text-white hover:bg-[#1E293B]'
                }`}
              >
                <Icon className="w-3 h-3" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
