/**
 * Invoice PDF Generator — Facture pour sorties de stock
 * =======================================================
 *
 * Generates a professional A4 PDF invoice ("Facture / Bon de sortie")
 * for:
 *   - sortie_pepiniere  → "Bon de sortie pépinière"
 *   - bon_passage       → "Facture de sortie externe / Bon de passage"
 *
 * Uses jsPDF + jspdf-autotable (already installed).
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
const PAGE_W = 210; // A4 width in mm
const PAGE_H = 297; // A4 height in mm
const FULL_W = PAGE_W - MARGIN_L - MARGIN_R; // 170mm

/* ═══════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════ */

const fmtFr = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
};

const fmtDateTime = (d) => {
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

/* ═══════════════════════════════════════════════════════
   DRAWING HELPERS
   ═══════════════════════════════════════════════════════ */

/**
 * Convert hex color to RGB array for jsPDF.
 */
const hexToRgb = (hex) => {
  const c = hex.replace('#', '');
  return [
    parseInt(c.substring(0, 2), 16),
    parseInt(c.substring(2, 4), 16),
    parseInt(c.substring(4, 6), 16),
  ];
};

/**
 * Draw a horizontal separator line.
 */
const drawLine = (doc, y, color = '#d1d5db', width = 0.3) => {
  doc.setDrawColor(...hexToRgb(color));
  doc.setLineWidth(width);
  doc.line(MARGIN_L, y, PAGE_W - MARGIN_R, y);
};

/**
 * Draw a coloured block (for header/footer bands).
 */
const drawBlock = (doc, y, h, color) => {
  doc.setFillColor(...hexToRgb(color));
  doc.rect(0, y, PAGE_W, h, 'F');
};

/* ═══════════════════════════════════════════════════════
   MAIN EXPORT FUNCTIONS
   ═══════════════════════════════════════════════════════ */

/**
 * Generate an invoice PDF for a "sortie pépinière" (Semis).
 *
 * @param {Object} semis - Semis object with populated fields
 *   { code, variete: { nom }, pepiniere: { nom }, quantite,
 *     tauxGermination, createdAt, createdBy: { nom }, motif }
 * @param {Object} [stockInfo] - Optional parent stock info
 *   { code, fournisseur: { nom }, quantiteRestante }
 */
export const generateSemisInvoice = (semis, stockInfo) => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  let y = MARGIN_L;

  // ── Top accent band ──
  drawBlock(doc, 0, 5, BRAND.primary);
  drawBlock(doc, 5, 1.2, BRAND.secondary);

  // ── Brand & Title ──
  doc.setFontSize(26);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...hexToRgb(BRAND.primary));
  doc.text('SICAM AGRI', MARGIN_L, y + 2);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...hexToRgb(BRAND.gray));
  doc.text('Production Agricole — Suivi & Gestion', MARGIN_L, y + 8.5);

  // Right-aligned document type badge
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...hexToRgb(BRAND.secondary));
  doc.text('BON DE SORTIE PÉPINIÈRE', PAGE_W - MARGIN_R, y + 5, { align: 'right' });

  y += 14;

  // ── Document reference & Date ──
  drawLine(doc, y);
  y += 6;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...hexToRgb(BRAND.dark));
  doc.text('N° Facture / Bon :', MARGIN_L, y);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...hexToRgb(BRAND.primary));
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(semis.code || '—', MARGIN_L + 38, y);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...hexToRgb(BRAND.dark));
  doc.text('Date :', PAGE_W / 2, y);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...hexToRgb(BRAND.gray));
  doc.text(fmtDateTime(semis.createdAt), PAGE_W / 2 + 14, y);

  y += 10;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...hexToRgb(BRAND.dark));
  doc.text('Émis par :', MARGIN_L, y);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...hexToRgb(BRAND.gray));
  doc.text(semis.createdBy?.nom || 'Système', MARGIN_L + 20, y);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...hexToRgb(BRAND.dark));
  const destLabel = 'Destination (pépinière) :';
  doc.text(destLabel, PAGE_W / 2, y);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...hexToRgb(BRAND.secondary));
  doc.text(semis.pepiniere?.nom || '—', PAGE_W / 2 + doc.getTextWidth(destLabel) + 2, y);

  y += 12;
  drawLine(doc, y, BRAND.secondary, 0.5);
  y += 8;

  // ── Info Table ──
  const infoRows = [
    ['Variété', semis.variete?.nom || '—'],
    ['Quantité de graines', `${fmtNumber(semis.quantite)} graines`],
    ['Taux de germination', semis.tauxGermination != null ? `${semis.tauxGermination}%` : 'Non défini'],
    ['Plants estimés', semis.tauxGermination != null
      ? `${fmtNumber(Math.round((semis.quantite * semis.tauxGermination) / 100))} plants`
      : '—'],
  ];

  if (stockInfo) {
    infoRows.push(['Lot semence source', stockInfo.code || '—']);
    if (stockInfo.fournisseur) {
      infoRows.push(['Fournisseur', stockInfo.fournisseur.nom || '—']);
    }
  }

  if (semis.motif) {
    infoRows.push(['Motif', semis.motif]);
  }

  // Draw info rows as a styled table
  infoRows.forEach(([label, value], idx) => {
    const bgColor = idx % 2 === 0 ? '#F9FAFB' : '#FFFFFF';
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

  y += 6;

  // ── Summary Box ──
  drawBlock(doc, y - 3, 18, '#F0FDF4');
  doc.setFillColor(...hexToRgb('#F0FDF4'));
  doc.rect(MARGIN_L, y - 3, FULL_W, 18, 'F');

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...hexToRgb(BRAND.secondary));
  doc.text('RÉCAPITULATIF', MARGIN_L + 4, y + 1);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...hexToRgb(BRAND.dark));
  doc.text(`Total graines sorties :`, MARGIN_L + 4, y + 10);
  doc.setTextColor(...hexToRgb(BRAND.primary));
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(`${fmtNumber(semis.quantite)}`, PAGE_W - MARGIN_R - 4, y + 10, { align: 'right' });

  y += 22;

  // ── Footer note ──
  drawLine(doc, y, '#e5e7eb');
  y += 6;

  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(...hexToRgb(BRAND.muted));
  doc.text(
    'Ce document sert de justificatif de sortie de stock pour la pépinière désignée.',
    MARGIN_L, y,
  );
  doc.text(
    'Document généré automatiquement par SICAM AGRI.',
    MARGIN_L, y + 4,
  );
  y += 10;

  // ── Bottom band ──
  drawBlock(doc, PAGE_H - 8, 8, '#1A1A1A');
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(200, 200, 200);
  doc.text('SICAM AGRI — Document confidentiel — Tous droits réservés', MARGIN_L, PAGE_H - 3);
  doc.setFontSize(7);
  doc.text(`Page 1 / 1`, PAGE_W - MARGIN_R, PAGE_H - 3, { align: 'right' });

  // ── Save ──
  const filename = `facture-sortie-pepiniere-${semis.code || 'semis'}.pdf`;
  doc.save(filename);
};

/**
 * Generate an invoice PDF for a "bon de passage" (external exit).
 *
 * @param {Object} mouvement - StockMouvement object with populated fields
 *   { referenceBon, quantite, motif, dateMouvement,
 *     createdBy: { nom }, pepiniere, semisCree }
 * @param {Object} stock - Parent StockSemence with populated fields
 *   { code, variete: { nom }, fournisseur: { nom } }
 */
export const generateBonPassageInvoice = (mouvement, stock) => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  let y = MARGIN_L;

  // ── Top accent band ──
  drawBlock(doc, 0, 5, BRAND.primary);
  drawBlock(doc, 5, 1.2, '#8D6E00'); // amber accent for bon de passage

  // ── Brand & Title ──
  doc.setFontSize(26);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...hexToRgb(BRAND.primary));
  doc.text('SICAM AGRI', MARGIN_L, y + 2);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...hexToRgb(BRAND.gray));
  doc.text('Production Agricole — Suivi & Gestion', MARGIN_L, y + 8.5);

  // Right-aligned document type badge
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...hexToRgb('#8D6E00'));
  doc.text('BON DE PASSAGE / FACTURE', PAGE_W - MARGIN_R, y + 5, { align: 'right' });

  y += 14;

  // ── Document reference & Date ──
  drawLine(doc, y);
  y += 6;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...hexToRgb(BRAND.dark));
  doc.text('Réf. Bon :', MARGIN_L, y);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...hexToRgb('#8D6E00'));
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(mouvement.referenceBon || '—', MARGIN_L + 22, y);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...hexToRgb(BRAND.dark));
  doc.text('Date de sortie :', PAGE_W / 2, y);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...hexToRgb(BRAND.gray));
  doc.text(fmtDateTime(mouvement.dateMouvement), PAGE_W / 2 + 28, y);

  y += 10;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...hexToRgb(BRAND.dark));
  doc.text('Créé par :', MARGIN_L, y);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...hexToRgb(BRAND.gray));
  doc.text(mouvement.createdBy?.nom || 'Système', MARGIN_L + 18, y);

  y += 12;
  drawLine(doc, y, '#8D6E00', 0.5);
  y += 8;

  // ── Info Table ──
  const infoRows = [
    ['Variété', stock?.variete?.nom || '—'],
    ['Lot semence source', stock?.code || '—'],
    ['Quantité de graines', `${fmtNumber(mouvement.quantite)} graines`],
    ['Motif', mouvement.motif || 'Non spécifié'],
    ['Référence bon', mouvement.referenceBon || '—'],
  ];

  if (stock?.fournisseur) {
    infoRows.push(['Fournisseur', stock.fournisseur.nom || '—']);
  }

  // Draw info rows as a styled table
  infoRows.forEach(([label, value], idx) => {
    const bgColor = idx % 2 === 0 ? '#FFFBEB' : '#FFFFFF';
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

  y += 6;

  // ── Summary Box ──
  doc.setFillColor(...hexToRgb('#FFFBEB'));
  doc.rect(MARGIN_L, y - 3, FULL_W, 18, 'F');

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...hexToRgb('#8D6E00'));
  doc.text('RÉCAPITULATIF', MARGIN_L + 4, y + 1);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...hexToRgb(BRAND.dark));
  doc.text(`Total graines sorties :`, MARGIN_L + 4, y + 10);
  doc.setTextColor(...hexToRgb('#8D6E00'));
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(`${fmtNumber(mouvement.quantite)}`, PAGE_W - MARGIN_R - 4, y + 10, { align: 'right' });

  y += 22;

  // ── Footer note ──
  drawLine(doc, y, '#e5e7eb');
  y += 6;

  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(...hexToRgb(BRAND.muted));
  doc.text(
    'Ce document sert de justificatif de sortie de stock externe (bon de passage).',
    MARGIN_L, y,
  );
  doc.text(
    'Document généré automatiquement par SICAM AGRI.',
    MARGIN_L, y + 4,
  );
  y += 10;

  // ── Bottom band ──
  drawBlock(doc, PAGE_H - 8, 8, '#1A1A1A');
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(200, 200, 200);
  doc.text('SICAM AGRI — Document confidentiel — Tous droits réservés', MARGIN_L, PAGE_H - 3);
  doc.setFontSize(7);
  doc.text(`Page 1 / 1`, PAGE_W - MARGIN_R, PAGE_H - 3, { align: 'right' });

  // ── Save ──
  const ref = mouvement.referenceBon || `mvt-${mouvement._id?.slice(-6) || '000000'}`;
  const filename = `facture-bon-passage-${ref}.pdf`;
  doc.save(filename);
};
