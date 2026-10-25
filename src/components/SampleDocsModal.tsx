import React from 'react';
import { SAMPLE_DOCUMENTS, SampleDocDef } from '../lib/sampleDocuments';
import { Sparkles, FileText, Check, ArrowRight } from 'lucide-react';

interface SampleDocsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSample: (sampleId: string) => void;
}

export const SampleDocsModal: React.FC<SampleDocsModalProps> = ({
  isOpen,
  onClose,
  onSelectSample,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#111827] border border-[#1E293B] rounded-2xl max-w-xl w-full p-6 space-y-5 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#64748B] hover:text-white p-1 rounded-lg"
        >
          ✕
        </button>

        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-[#00E5FF]/20 border border-[#00E5FF]/30 flex items-center justify-center text-[#00E5FF]">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Pre-Loaded Test Documents</h2>
            <p className="text-xs text-[#94A3B8]">
              Select a sample document with realistic sensitive data to test smart scan and reversible redaction.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {SAMPLE_DOCUMENTS.map(doc => (
            <div
              key={doc.id}
              onClick={() => {
                onSelectSample(doc.id);
                onClose();
              }}
              className="p-4 rounded-xl bg-[#080B12] hover:bg-[#1A2332] border border-[#1E293B] hover:border-[#00E5FF]/50 cursor-pointer transition-all flex items-center justify-between group"
            >
              <div className="flex items-start space-x-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-[#1E293B] flex items-center justify-center text-[#CBD5E1] shrink-0 mt-0.5">
                  <FileText className="w-4 h-4 text-[#00E5FF]" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-semibold text-white group-hover:text-[#00E5FF] transition-colors">
                      {doc.name}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#7C3AED]/20 text-[#A78BFA] border border-[#7C3AED]/30">
                      {doc.badge}
                    </span>
                  </div>
                  <p className="text-xs text-[#94A3B8] mt-0.5 truncate">{doc.description}</p>
                </div>
              </div>

              <div className="w-8 h-8 rounded-lg bg-[#1E293B] group-hover:bg-[#00E5FF] group-hover:text-[#080B12] text-[#94A3B8] flex items-center justify-center transition-all shrink-0">
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-[#1E293B] hover:bg-[#334155] text-xs font-medium text-white transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
