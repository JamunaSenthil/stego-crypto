import { ScanWordBox } from './documentScanner';

export interface SampleDocDef {
  id: string;
  name: string;
  category: string;
  description: string;
  badge: string;
  render: () => { canvas: HTMLCanvasElement; wordBoxes: ScanWordBox[] };
}

export function createAadhaarSample(): { canvas: HTMLCanvasElement; wordBoxes: ScanWordBox[] } {
  const canvas = document.createElement('canvas');
  canvas.width = 750;
  canvas.height = 460;
  const ctx = canvas.getContext('2d')!;

  // Background
  const grad = ctx.createLinearGradient(0, 0, 750, 460);
  grad.addColorStop(0, '#FFFDF8');
  grad.addColorStop(1, '#FFF5EA');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 750, 460);

  // Border & Header
  ctx.strokeStyle = '#D4AF37';
  ctx.lineWidth = 4;
  ctx.strokeRect(10, 10, 730, 440);

  // Header band
  ctx.fillStyle = '#FF9933';
  ctx.fillRect(14, 14, 722, 10);
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(14, 24, 722, 10);
  ctx.fillStyle = '#138808';
  ctx.fillRect(14, 34, 722, 10);

  // Title
  ctx.fillStyle = '#8B0000';
  ctx.font = 'bold 20px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('भारत सरकार / GOVERNMENT OF INDIA', 375, 75);

  ctx.fillStyle = '#222222';
  ctx.font = '13px sans-serif';
  ctx.fillText('Unique Identification Authority of India (UIDAI)', 375, 95);
  ctx.textAlign = 'left';

  // Photo Box
  ctx.fillStyle = '#E2E8F0';
  ctx.fillRect(45, 120, 140, 175);
  ctx.strokeStyle = '#94A3B8';
  ctx.lineWidth = 2;
  ctx.strokeRect(45, 120, 140, 175);

  // Silhouette avatar in photo box
  ctx.fillStyle = '#64748B';
  ctx.beginPath();
  ctx.arc(115, 180, 36, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(115, 270, 56, Math.PI, 0);
  ctx.fill();

  ctx.font = '11px sans-serif';
  ctx.fillStyle = '#334155';
  ctx.fillText('PHOTO', 95, 290);

  // Text Fields
  const wordBoxes: ScanWordBox[] = [];

  const addText = (text: string, x: number, y: number, font = '15px sans-serif', color = '#1E293B') => {
    ctx.font = font;
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
    const metrics = ctx.measureText(text);
    wordBoxes.push({
      text,
      x,
      y: y - 14,
      w: Math.round(metrics.width),
      h: 18,
      confidence: 96,
    });
  };

  addText('Name:', 220, 145, 'bold 14px sans-serif', '#475569');
  addText('KESHAV KUMAR RAJESH', 280, 145, 'bold 16px sans-serif', '#0F172A');

  addText('DOB:', 220, 180, 'bold 14px sans-serif', '#475569');
  addText('14/05/1992', 270, 180, '15px sans-serif', '#0F172A');

  addText('Gender:', 420, 180, 'bold 14px sans-serif', '#475569');
  addText('MALE', 485, 180, '15px sans-serif', '#0F172A');

  addText('Mobile:', 220, 215, 'bold 14px sans-serif', '#475569');
  addText('9876543210', 280, 215, '15px sans-serif', '#0F172A');

  addText('Email:', 220, 250, 'bold 14px sans-serif', '#475569');
  addText('keshav.krk@identity.gov.in', 275, 250, '15px sans-serif', '#0F172A');

  // Aadhaar Number Section (Large Red Box)
  ctx.fillStyle = '#FEF2F2';
  ctx.fillRect(180, 310, 400, 60);
  ctx.strokeStyle = '#DC2626';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(180, 310, 400, 60);

  ctx.fillStyle = '#991B1B';
  ctx.font = 'bold 12px sans-serif';
  ctx.fillText('मेरा आधार, मेरी पहचान', 310, 328);

  // Aadhaar 12 Digits
  ctx.font = 'bold 24px monospace';
  ctx.fillStyle = '#111827';
  ctx.fillText('4920 8173 9021', 275, 356);

  wordBoxes.push({
    text: '4920 8173 9021',
    x: 270,
    y: 334,
    w: 220,
    h: 28,
    confidence: 99,
  });

  // Simulated QR Code
  ctx.fillStyle = '#111827';
  ctx.fillRect(600, 140, 110, 110);
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(610, 150, 90, 90);
  ctx.fillStyle = '#000000';
  for (let r = 0; r < 6; r++) {
    for (let c = 0; c < 6; c++) {
      if ((r + c) % 2 === 0 || (r * c) % 3 === 0) {
        ctx.fillRect(618 + c * 12, 158 + r * 12, 10, 10);
      }
    }
  }

  // Footer bar
  ctx.fillStyle = '#1E293B';
  ctx.font = 'italic 12px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Aadhaar is a proof of identity, not of citizenship.', 375, 420);

  return { canvas, wordBoxes };
}

export function createPANCardSample(): { canvas: HTMLCanvasElement; wordBoxes: ScanWordBox[] } {
  const canvas = document.createElement('canvas');
  canvas.width = 750;
  canvas.height = 460;
  const ctx = canvas.getContext('2d')!;

  // Background
  const grad = ctx.createLinearGradient(0, 0, 750, 460);
  grad.addColorStop(0, '#E0F2FE');
  grad.addColorStop(1, '#BAE6FD');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 750, 460);

  // Border
  ctx.strokeStyle = '#0284C7';
  ctx.lineWidth = 3;
  ctx.strokeRect(12, 12, 726, 436);

  // Header
  ctx.fillStyle = '#0369A1';
  ctx.font = 'bold 18px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('INCOME TAX DEPARTMENT / आयकर विभाग', 375, 50);
  ctx.font = 'bold 14px sans-serif';
  ctx.fillText('GOVT. OF INDIA / भारत सरकार', 375, 74);
  ctx.textAlign = 'left';

  const wordBoxes: ScanWordBox[] = [];
  const addText = (text: string, x: number, y: number, font = '15px sans-serif', color = '#0F172A') => {
    ctx.font = font;
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
    const metrics = ctx.measureText(text);
    wordBoxes.push({
      text,
      x,
      y: y - 14,
      w: Math.round(metrics.width),
      h: 18,
      confidence: 97,
    });
  };

  // Photo
  ctx.fillStyle = '#CBD5E1';
  ctx.fillRect(50, 110, 130, 160);
  ctx.strokeStyle = '#475569';
  ctx.strokeRect(50, 110, 130, 160);

  // Labels & Values
  addText('Permanent Account Number Card', 220, 120, '13px sans-serif', '#475569');

  // PAN NUMBER (ABCDE1234F)
  addText('ABCDE1234F', 220, 155, 'bold 24px monospace', '#0369A1');

  addText("Name / नाम", 220, 195, '12px sans-serif', '#64748B');
  addText('KESHAV KUMAR', 220, 220, 'bold 16px sans-serif');

  addText("Father's Name / पिता का नाम", 220, 255, '12px sans-serif', '#64748B');
  addText('RAMESH KUMAR', 220, 280, 'bold 15px sans-serif');

  addText("Date of Birth / जन्म तिथि", 220, 315, '12px sans-serif', '#64748B');
  addText('14/05/1992', 220, 340, 'bold 15px sans-serif');

  // Signature box
  ctx.strokeStyle = '#334155';
  ctx.strokeRect(50, 310, 130, 50);
  ctx.font = 'italic 16px cursive';
  ctx.fillStyle = '#0F172A';
  ctx.fillText('Keshav Kumar', 60, 342);

  return { canvas, wordBoxes };
}

export function createMedicalInvoiceSample(): { canvas: HTMLCanvasElement; wordBoxes: ScanWordBox[] } {
  const canvas = document.createElement('canvas');
  canvas.width = 800;
  canvas.height = 540;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, 800, 540);

  ctx.strokeStyle = '#CBD5E1';
  ctx.lineWidth = 1;
  ctx.strokeRect(20, 20, 760, 500);

  // Clinic Header
  ctx.fillStyle = '#0F766E';
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText('APOLLO SUPER SPECIALITY HEALTHCARE', 40, 60);

  ctx.fillStyle = '#64748B';
  ctx.font = '12px sans-serif';
  ctx.fillText('Confidential Patient Discharge Summary & Financial Bill', 40, 82);

  const wordBoxes: ScanWordBox[] = [];
  const addText = (text: string, x: number, y: number, font = '14px sans-serif', color = '#1E293B') => {
    ctx.font = font;
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
    const metrics = ctx.measureText(text);
    wordBoxes.push({
      text,
      x,
      y: y - 14,
      w: Math.round(metrics.width),
      h: 18,
      confidence: 95,
    });
  };

  addText('Invoice No: #INV-2026-9042', 540, 60, '13px monospace', '#475569');
  addText('Date:', 540, 82, '13px sans-serif', '#64748B');
  addText('25/10/2026', 585, 82, '13px sans-serif');

  // Divider
  ctx.strokeStyle = '#0F766E';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(40, 100);
  ctx.lineTo(760, 100);
  ctx.stroke();

  // Patient Info section
  addText('Patient Name:', 40, 135, 'bold 13px sans-serif', '#475569');
  addText('Jamuna Senthil', 150, 135, 'bold 14px sans-serif');

  addText('Email:', 40, 170, 'bold 13px sans-serif', '#475569');
  addText('jamunasenthil009@gmail.com', 150, 170, '14px sans-serif');

  addText('Phone:', 40, 205, 'bold 13px sans-serif', '#475569');
  addText('9443218902', 150, 205, '14px sans-serif');

  addText('Aadhaar ID:', 40, 240, 'bold 13px sans-serif', '#475569');
  addText('7821 4452 9012', 150, 240, 'bold 14px monospace', '#B91C1C');

  addText('Payment Card:', 40, 275, 'bold 13px sans-serif', '#475569');
  addText('4111 1111 1111 1111', 150, 275, 'bold 14px monospace', '#1D4ED8');

  addText('Postal Code:', 40, 310, 'bold 13px sans-serif', '#475569');
  addText('600028', 150, 310, '14px sans-serif');

  // Diagnosis table
  ctx.fillStyle = '#F8FAFC';
  ctx.fillRect(40, 340, 720, 110);
  ctx.strokeStyle = '#E2E8F0';
  ctx.strokeRect(40, 340, 720, 110);

  ctx.fillStyle = '#0F172A';
  ctx.font = 'bold 13px sans-serif';
  ctx.fillText('Procedure / Consultation', 60, 365);
  ctx.fillText('Cost', 680, 365);

  ctx.font = '13px sans-serif';
  ctx.fillStyle = '#334155';
  ctx.fillText('1. Magnetic Resonance Imaging (MRI - Cervical Spine)', 60, 395);
  ctx.fillText('₹ 18,500.00', 670, 395);

  ctx.fillText('2. Specialized Neuro Consultation & Diagnostics', 60, 425);
  ctx.fillText('₹ 30,000.00', 670, 425);

  ctx.font = 'bold 15px sans-serif';
  ctx.fillStyle = '#047857';
  ctx.fillText('Total Paid (Full Settlement): ₹ 48,500.00', 440, 485);

  return { canvas, wordBoxes };
}

export const SAMPLE_DOCUMENTS: SampleDocDef[] = [
  {
    id: 'sample-aadhaar',
    name: 'Indian Aadhaar Identity Card',
    category: 'Government ID',
    description: 'Contains 12-digit Aadhaar Number, DOB, Mobile, and Email',
    badge: 'High PII',
    render: createAadhaarSample,
  },
  {
    id: 'sample-pan',
    name: 'Income Tax PAN Card',
    category: 'Tax ID',
    description: 'Contains 10-char PAN (ABCDE1234F), Name, and DOB',
    badge: 'Critical PII',
    render: createPANCardSample,
  },
  {
    id: 'sample-invoice',
    name: 'Hospital Medical & Financial Bill',
    category: 'Healthcare',
    description: 'Contains Patient Email, Aadhaar, Credit Card (Visa), & Mobile',
    badge: 'Multi-PII',
    render: createMedicalInvoiceSample,
  },
];
