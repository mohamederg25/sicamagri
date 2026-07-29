/**
 * Invoice PDF Generator — Facture pour tous les mouvements de stock
 * ===================================================================
 *
 * Generates a professional A4 PDF invoice ("Facture") for ALL movement types:
 *   - entree_stock       → "Bon d'entrée stock"     (ES)
 *   - sortie_pepiniere   → "Bon de sortie pépinière" (SP)
 *   - bon_passage        → "Bon de passage"          (BP)
 *   - test_germination   → "Fiche test germination"  (TG)
 *
 * Filename format: YYMMDD-XX.pdf  (e.g., 260729-SP.pdf)
 *
 * Uses jsPDF (already installed).
 */

import { jsPDF } from 'jspdf';

/* ═══════════════════════════════════════════════════════
   CONSTANTS
   ═══════════════════════════════════════════════════════ */

const BRAND = {
  primary:      '#B02020',
  primaryDark:  '#8A1A1A',
  secondary:    '#008030',
  accent:       '#D4C020',
  dark:         '#1A1A1A',
  gray:         '#6B7280',
  muted:        '#9CA3AF',
};

const MARGIN_L = 20;
const MARGIN_R = 20;
const PAGE_W = 210;
const PAGE_H = 297;
const FULL_W = PAGE_W - MARGIN_L - MARGIN_R;

/** Two-letter codes per movement type */
const TYPE_CODES = {
  entree_stock:     'ES',
  sortie_pepiniere: 'SP',
  bon_passage:      'BP',
  test_germination: 'TG',
};

/** Display labels per movement type */
const TYPE_LABELS = {
  entree_stock:     "BON D'ENTRÉE STOCK",
  sortie_pepiniere: 'BON DE SORTIE PÉPINIÈRE',
  bon_passage:      'BON DE PASSAGE / FACTURE',
  test_germination: 'FICHE TEST GERMINATION',
};

/** Accent colour per movement type */
const TYPE_COLORS = {
  entree_stock:     '#1565C0',
  sortie_pepiniere: '#008030',
  bon_passage:      '#8D6E00',
  test_germination: '#7c3aed',
};

/* ═══════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════ */

const fmtDate = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

const fmtNumber = (n) => {
  if (n == null) return '—';
  return Number(n).toLocaleString('fr-FR');
};

/**
 * Format a date to YYMMDD (e.g., 2026-07-29 → 260729).
 */
const formatYYMMDD = (date) => {
  const d = date ? new Date(date) : new Date();
  if (isNaN(d.getTime())) return '000000';
  const y = String(d.getFullYear() % 100).padStart(2, '0');
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}${m}${day}`;
};

/* ═══════════════════════════════════════════════════════
   DRAWING HELPERS
   ═══════════════════════════════════════════════════════ */

const hexToRgb = (hex) => {
  const c = hex.replace('#', '');
  return [
    parseInt(c.substring(0, 2), 16),
    parseInt(c.substring(2, 4), 16),
    parseInt(c.substring(4, 6), 16),
  ];
};

const drawLine = (doc, y, color = '#d1d5db', width = 0.3) => {
  doc.setDrawColor(...hexToRgb(color));
  doc.setLineWidth(width);
  doc.line(MARGIN_L, y, PAGE_W - MARGIN_R, y);
};

const drawBlock = (doc, y, h, color) => {
  doc.setFillColor(...hexToRgb(color));
  doc.rect(0, y, PAGE_W, h, 'F');
};

/**
 * Draw the brand header common to all invoice types.
 * Returns the Y position after the header.
 */
const drawBrandHeader = (doc, y, type) => {
  const accent = TYPE_COLORS[type] || BRAND.primary;

  // Top accent bands
  drawBlock(doc, 0, 5, BRAND.primary);
  drawBlock(doc, 5, 1.2, accent);

  // Brand name
  doc.setFontSize(26);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...hexToRgb(BRAND.primary));
  doc.text('SICAM AGRI', MARGIN_L, y + 2);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...hexToRgb(BRAND.gray));
  doc.text('Production Agricole — Suivi & Gestion', MARGIN_L, y + 8.5);

  // Document type badge
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...hexToRgb(accent));
  doc.text(TYPE_LABELS[type] || 'DOCUMENT', PAGE_W - MARGIN_R, y + 5, { align: 'right' });

  y += 14;
  drawLine(doc, y);
  y += 6;

  return y;
};

/**
 * Draw the info table rows (key-value pairs).
 */
const drawInfoRows = (doc, startY, rows, altBg = '#F9FAFB') => {
  let y = startY;
  rows.forEach(([label, value], idx) => {
    const bgColor = idx % 2 === 0 ? altBg : '#FFFFFF';
    doc.setFillColor(...hexToRgb(bgColor));
    doc.rect(MARGIN_L, y - 4, FULL_W, 9, 'F');

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...hexToRgb(BRAND.gray));
    doc.text(label, MARGIN_L + 4, y);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...hexToRgb(BRAND.dark));
    doc.text(value, PAGE_W / 2, y);

    y += 9;
  });
  return y + 6;
};

/**
 * Draw the summary box with a total.
 */
const drawSummaryBox = (doc, y, label, total, accent) => {
  doc.setFillColor(...hexToRgb(accent === '#7c3aed' ? '#F3E8FF' : accent === '#8D6E00' ? '#FFFBEB' : '#F0FDF4'));
  doc.rect(MARGIN_L, y - 3, FULL_W, 18, 'F');

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...hexToRgb(accent));
  doc.text('RÉCAPITULATIF', MARGIN_L + 4, y + 1);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...hexToRgb(BRAND.dark));
  doc.text(label, MARGIN_L + 4, y + 10);
  doc.setTextColor(...hexToRgb(accent));
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(total, PAGE_W - MARGIN_R - 4, y + 10, { align: 'right' });

  return y + 22;
};

/**
 * Draw the page footer.
 */
const drawFooter = (doc, startY) => {
  const fy = startY || PAGE_H - 8;
  drawBlock(doc, fy, 8, '#1A1A1A');
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(200, 200, 200);
  doc.text('SICAM AGRI — Document confidentiel — Tous droits réservés', MARGIN_L, fy + 5);
  doc.setFontSize(7);
  doc.text('Page 1 / 1', PAGE_W - MARGIN_R, fy + 5, { align: 'right' });
};

/* ═══════════════════════════════════════════════════════
   UNIFIED MOVEMENT INVOICE GENERATOR
   ═══════════════════════════════════════════════════════ */

/**
 * Generate a professional invoice PDF for ANY stock movement type.
 *
 * @param {string} type - Movement type: 'entree_stock' | 'sortie_pepiniere' | 'bon_passage' | 'test_germination'
 * @param {Object} mouvement - The stock mouvement data (with populated fields)
 * @param {Object} stock - Parent StockSemence with populated fields { code, variete, fournisseur, ... }
 */
export const generateMovementInvoice = (type, mouvement, stock) => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  let y = MARGIN_L;

  // ── Header ──
  y = drawBrandHeader(doc, y, type);
  const accent = TYPE_COLORS[type] || BRAND.primary;

  // ── Movement date → YYMMDD for filename ──
  const dateObj = mouvement.dateMouvement || mouvement.dateTest || mouvement.createdAt || new Date();
  const yymmdd = formatYYMMDD(dateObj);
  const code = TYPE_CODES[type] || 'XX';

  // ── Document reference & Date ──
  const refLabel = mouvement.referenceBon || mouvement.code || mouvement.motif || `${yymmdd}${code}`;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...hexToRgb(BRAND.dark));
  doc.text('N° Document :', MARGIN_L, y);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...hexToRgb(accent));
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(`${yymmdd}${code}`, MARGIN_L + 28, y);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...hexToRgb(BRAND.dark));
  doc.text('Date :', PAGE_W / 2, y);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...hexToRgb(BRAND.gray));
  doc.text(fmtDate(dateObj), PAGE_W / 2 + 14, y);

  y += 10;

  // ── Creator & Destination ──
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...hexToRgb(BRAND.dark));
  doc.text('Créé par :', MARGIN_L, y);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...hexToRgb(BRAND.gray));
  doc.text(mouvement.createdBy?.nom || 'Système', MARGIN_L + 20, y);

  if (type === 'sortie_pepiniere' && mouvement.pepiniere) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...hexToRgb(BRAND.dark));
    const destLabel = 'Destination :';
    doc.text(destLabel, PAGE_W / 2, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...hexToRgb(BRAND.secondary));
    doc.text(mouvement.pepiniere.nom || '—', PAGE_W / 2 + doc.getTextWidth(destLabel) + 2, y);
  } else if (type === 'entree_stock' && mouvement.motif) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...hexToRgb(BRAND.dark));
    doc.text('Motif :', PAGE_W / 2, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...hexToRgb(BRAND.gray));
    doc.text(mouvement.motif, PAGE_W / 2 + 14, y);
  }

  y += 12;
  drawLine(doc, y, accent, 0.5);
  y += 8;

  // ── Info Rows ──
  let infoRows = [];

  // Common: stock info
  infoRows.push(['Lot semence', stock?.code || '—']);
  infoRows.push(['Variété', stock?.variete?.nom || '—']);

  if (stock?.fournisseur) {
    infoRows.push(['Fournisseur', stock.fournisseur.nom || '—']);
  }

  // Type-specific rows
  if (type === 'entree_stock') {
    infoRows.push(['Type', 'Entrée en stock']);
    infoRows.push(['Quantité reçue', `${fmtNumber(mouvement.quantite)} graines`]);
    infoRows.push(['Date réception', fmtDate(mouvement.dateMouvement)]);
    if (mouvement.motif) infoRows.push(['Motif', mouvement.motif]);
  } else if (type === 'sortie_pepiniere') {
    infoRows.push(['Type', 'Sortie en pépinière']);
    infoRows.push(['Quantité sortie', `${fmtNumber(mouvement.quantite)} graines`]);
    infoRows.push(['Pépinière destination', mouvement.pepiniere?.nom || '—']);
    infoRows.push(['Taux germination', stock.tauxGermination != null ? `${stock.tauxGermination}%` : 'Non défini']);
    if (mouvement.semisCree?.code) infoRows.push(['Semis créé', mouvement.semisCree.code]);
  } else if (type === 'bon_passage') {
    infoRows.push(['Type', 'Bon de passage (sortie externe)']);
    infoRows.push(['Quantité sortie', `${fmtNumber(mouvement.quantite)} graines`]);
    infoRows.push(['Référence bon', mouvement.referenceBon || '—']);
    infoRows.push(['Motif', mouvement.motif || 'Non spécifié']);
  } else if (type === 'test_germination') {
    infoRows.push(['Type', 'Test de germination']);
    infoRows.push(['Graines testées', `${fmtNumber(mouvement.quantite)} graines`]);
    infoRows.push(['Résultat', mouvement.motif || 'Non spécifié']);
    infoRows.push(['Date test', fmtDate(mouvement.dateMouvement)]);
  }

  const altBg = type === 'bon_passage' ? '#FFFBEB' : type === 'test_germination' ? '#F3E8FF' : '#F0FDF4';
  y = drawInfoRows(doc, y, infoRows, altBg);

  // ── Summary Box ──
  y = drawSummaryBox(doc, y - 3, 'Total :', `${fmtNumber(mouvement.quantite)} graines`, accent);

  // ── Footer note ──
  drawLine(doc, y, '#e5e7eb');
  y += 6;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(...hexToRgb(BRAND.muted));
  doc.text(
    'Document généré automatiquement par SICAM AGRI — Tous droits réservés.',
    MARGIN_L, y,
  );
  y += 10;

  // ── Bottom band ──
  drawFooter(doc);

  // ── Save with YYMMDD-XX.pdf format ──
  const filename = `${yymmdd}-${code}.pdf`;
  doc.save(filename);
};
