import { useState, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import { autoTable } from 'jspdf-autotable';

/* ═══════════════════════════════════════════════════
   STYLE CONSTANTS
   ═══════════════════════════════════════════════════ */

const BRAND = {
  primary:    '#B02020',
  primaryDark:'#8A1A1A',
  secondary:  '#008030',
  accent:     '#D4C020',
  dark:       '#1A1A1A',
  gray:       '#6B7280',
  lightGray:  '#F3F4F6',
  white:      '#FFFFFF',
  text:       '#1F2937',
  muted:      '#9CA3AF',
};

const LOGO_W = 30;  // mm
const LOGO_H = 21;  // mm
const LOGO_SMALL_W = 22;
const LOGO_SMALL_H = 15;

const MARGIN_L = 14;
const MARGIN_R = 14;

/* ═══════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════ */

const fmtDate = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

const fetchImageAsBase64 = async (url) => {
  try {
    const r = await fetch(url);
    const blob = await r.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
};

/**
 * Compute simple summary stats from the data.
 */
const computeSummary = (data, columns) => {
  const numericCols = [];
  columns.forEach((col, idx) => {
    const vals = data.map((row) => {
      const v = col.accessor.split('.').reduce((o, k) => o?.[k], row);
      if (v === '' || v === null || v === undefined) return null;
      const n = Number(v);
      return !isNaN(n) ? n : null;
    }).filter((v) => v !== null);
    if (vals.length > 0) {
      numericCols.push({
        idx,
        header: col.header,
        total: vals.reduce((a, b) => a + b, 0),
        avg: Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100) / 100,
        max: Math.max(...vals),
        min: Math.min(...vals),
        count: vals.length,
      });
    }
  });
  return numericCols;
};

/* ═══════════════════════════════════════════════════
   BUTTON BASE STYLE
   ═══════════════════════════════════════════════════ */

const btnBase = {
  padding: '8px 14px',
  border: '1px solid #d1d5db',
  borderRadius: '8px',
  fontSize: '13px',
  fontWeight: 600,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  transition: 'all 0.15s ease',
  fontFamily: 'inherit',
};

/* ═══════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════ */

const ExportButton = ({ filename = 'export', columns, data, user, mapRow }) => {
  const [open, setOpen] = useState(false);
  const [logo1, setLogo1] = useState(null);
  const [logo2, setLogo2] = useState(null);

  useEffect(() => {
    Promise.all([
      fetchImageAsBase64('/icon.jpeg'),
      fetchImageAsBase64('/icon2.jpeg'),
    ]).then(([a, b]) => { setLogo1(a); setLogo2(b); });
  }, []);

  /* ── Data helpers ── */

  const headers = useMemo(() => columns.map((c) => c.header), [columns]);
  const colCount = Math.max(headers.length, 1);

  const getRows = () => {
    if (mapRow) return data.map(mapRow);
    return data.map((row) =>
      columns.map((col) => {
        const val = col.accessor.split('.').reduce((o, k) => o?.[k], row);
        return val !== null && val !== undefined && val !== '' ? String(val) : '—';
      })
    );
  };

  const extractorName = user?.nom || 'Inconnu';
  const extractionDate = fmtDate(new Date());
  const summary = useMemo(() => computeSummary(data, columns), [data, columns]);

  /* ═════════════════════════════════════════════════
     HELPERS
     ═════════════════════════════════════════════════ */

  /** Detect image format from the data URL */
  const detectFormat = (dataUrl) => {
    if (!dataUrl) return 'JPEG';
    if (dataUrl.startsWith('data:image/png')) return 'PNG';
    if (dataUrl.startsWith('data:image/jpeg') || dataUrl.startsWith('data:image/jpg')) return 'JPEG';
    if (dataUrl.startsWith('data:image/gif')) return 'GIF';
    if (dataUrl.startsWith('data:image/webp')) return 'WEBP';
    return 'JPEG';
  };

  /* ═════════════════════════════════════════════════
     PDF EXPORT — Professional Design
     ═════════════════════════════════════════════════ */

  const [pdfExporting, setPdfExporting] = useState(false);
  const [pdfError, setPdfError] = useState(null);
  const [pdfSuccess, setPdfSuccess] = useState(false);

  const exportPDF = async () => {
    setPdfExporting(true);
    setPdfError(null);
    try {
      const rows = getRows();
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const pw = doc.internal.pageSize.getWidth();
      const ph = doc.internal.pageSize.getHeight();

      // ── Background overlay ──
      doc.setFillColor(250, 251, 252);
      doc.rect(0, 0, pw, 44, 'F');

      // ── Top thick accent bar ──
      doc.setFillColor(176, 32, 32);
      doc.rect(0, 0, pw, 3.5, 'F');

      // ── Secondary accent stripe ──
      doc.setFillColor(0, 136, 64);
      doc.rect(0, 40, pw, 1.2, 'F');

      // ── Subtle left-side accent band ──
      doc.setFillColor(176, 32, 32);
      doc.rect(0, 0, 2.5, 44, 'F');

      // ── Header section ──
      let y = 10;

      // Logo left
      const imgSrc = logo1 || logo2;
      const imgFormat = detectFormat(imgSrc);
      if (imgSrc) {
        doc.addImage(imgSrc, imgFormat, MARGIN_L, y - 2, LOGO_W, LOGO_H);
      }
      // Small secondary logo right
      if (logo2 && logo2 !== logo1) {
        doc.addImage(logo2, imgFormat, pw - MARGIN_R - LOGO_SMALL_W, y - 3, LOGO_SMALL_W, LOGO_SMALL_H);
      } else if (imgSrc) {
        doc.addImage(imgSrc, imgFormat, pw - MARGIN_R - LOGO_SMALL_W, y - 3, LOGO_SMALL_W, LOGO_SMALL_H);
      }

      // Company name — centred, large, bold
      doc.setFontSize(22);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(176, 32, 32);
      doc.text('SICAM AGRI', pw / 2, y + 1, { align: 'center' });

      // Subtitle
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(150, 150, 150);
      doc.text('Production Agricole — Suivi & Gestion', pw / 2, y + 8, { align: 'center' });

      // Document title
      const title = filename.replace(/-/g, ' ').toUpperCase();
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(55, 65, 81);
      doc.text(title, pw / 2, y + 16, { align: 'center' });

      // Decorative double line under title
      const tw = doc.getTextWidth(title);
      const cx = pw / 2;
      doc.setDrawColor(176, 32, 32);
      doc.setLineWidth(0.7);
      doc.line(cx - tw / 2, y + 18.5, cx + tw / 2, y + 18.5);
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.3);
      doc.line(cx - tw / 2, y + 19.5, cx + tw / 2, y + 19.5);

      // Extraction metadata box — positioned left of the secondary logo to avoid overlap
      const infoX = pw - MARGIN_R - LOGO_SMALL_W - 4;
      const infoLabelX = infoX - 58;
      doc.setFontSize(6.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(120, 120, 120);
      doc.text('Extrait par :', infoLabelX, y + 0.5, { align: 'left' });
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(55, 65, 81);
      doc.text(extractorName, infoX, y + 0.5, { align: 'right' });

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(120, 120, 120);
      doc.text('Date :', infoLabelX, y + 5, { align: 'left' });
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(55, 65, 81);
      doc.text(extractionDate, infoX, y + 5, { align: 'right' });

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(120, 120, 120);
      doc.text('Enreg. :', infoLabelX, y + 9.5, { align: 'left' });
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(55, 65, 81);
      doc.text(`${data.length}`, infoX, y + 9.5, { align: 'right' });

      // ── Summary Box ──
      let sy = 46;
      if (summary.length > 0) {
        doc.setFillColor(245, 247, 250);
        doc.roundedRect(MARGIN_L, sy, pw - MARGIN_L - MARGIN_R, 12, 2, 2, 'F');
        doc.setDrawColor(220, 220, 220);
        doc.setLineWidth(0.3);
        doc.roundedRect(MARGIN_L, sy, pw - MARGIN_L - MARGIN_R, 12, 2, 2, 'S');

        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(100, 100, 100);
        doc.text('RÉSUMÉ', MARGIN_L + 3, sy + 3.5);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.5);
        let sx = MARGIN_L + 3;
        summary.forEach((s, i) => {
          const txt = `${s.header}: ${s.total.toLocaleString('fr-FR')}  (moy: ${s.avg.toLocaleString('fr-FR')})`;
          doc.setTextColor(55, 65, 81);
          doc.text(txt, sx, sy + 8.5);
          sx += doc.getTextWidth(txt) + 16;
          if (sx > pw - MARGIN_R - 30) sx = MARGIN_L + 3; // wrap
        });
        sy += 16;
      }

      // ── Compute which columns are numeric for alignment ──
      const numericCols = new Set();
      if (rows.length > 0 && headers.length > 0) {
        for (let c = 0; c < headers.length; c++) {
          const vals = rows.map(r => r[c]);
          if (vals.some(v => v !== '' && v !== '-' && v !== '—' && !isNaN(Number(v)))) {
            numericCols.add(c);
          }
        }
      }

      // ── Enhanced Data Table ──
      const tableResult = autoTable(doc, {
        head: [headers],
        body: rows,
        startY: sy + 2,
        styles: {
          fontSize: 7.5,
          cellPadding: { top: 4, right: 6, bottom: 4, left: 6 },
          font: 'helvetica',
          textColor: [40, 45, 50],
          lineColor: [210, 215, 220],
          lineWidth: 0.2,
          valign: 'middle',
        },
        headStyles: {
          fillColor: [176, 32, 32],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 7.5,
          halign: 'center',
          lineColor: [140, 20, 20],
          lineWidth: 0.4,
        },
        alternateRowStyles: {
          fillColor: [247, 249, 251],
        },
        columnStyles: {
          0: { fontStyle: 'bold', textColor: [176, 32, 32], cellPadding: { left: 8 } },
        },
        margin: { left: MARGIN_L, right: MARGIN_R },
        tableLineColor: [200, 205, 210],
        tableLineWidth: 0.3,
        showHead: 'firstPage',
        didParseCell: (cell) => {
          // Right-align numeric columns (both header & body)
          if (numericCols.has(cell.column.index) && cell.styles) {
            cell.styles.halign = 'right';
            if (cell.section === 'body') {
              cell.styles.textColor = [31, 41, 55];
            }
          }
        },
      });

      // ── Page footer (per-page) ──
      const pc = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pc; i++) {
        doc.setPage(i);
        doc.setFontSize(6);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(180, 180, 180);
        doc.text(`Page ${i} / ${pc}`, pw - MARGIN_R, ph - 11, { align: 'right' });

        // Subtle footer bar on each page
        doc.setDrawColor(230, 232, 235);
        doc.setLineWidth(0.15);
        doc.line(MARGIN_L, ph - 15, pw - MARGIN_R, ph - 15);
        doc.setFontSize(5);
        doc.setTextColor(200, 200, 200);
        doc.text('SICAM AGRI — Document confidentiel', MARGIN_L, ph - 6);
      }

      doc.save(`${filename}.pdf`);
      setPdfSuccess(true);
      setTimeout(() => setPdfSuccess(false), 3000);
      setOpen(false);
    } catch (err) {
      console.error('PDF export error:', err);
      const msg = err.message || 'Erreur lors de l\'export PDF';
      setPdfError(`Erreur : ${msg}`);
      setTimeout(() => setPdfError(null), 8000);
    } finally {
      setPdfExporting(false);
    }
  };

  /* ═════════════════════════════════════════════════
     EXCEL EXPORT — Styled with ExcelJS
     ═════════════════════════════════════════════════ */

  const exportExcel = async () => {
    const rows = getRows();
    try {
      const mod = await import('exceljs');
      const ExcelJS = mod.default || mod;
      const wb = new ExcelJS.Workbook();
      wb.creator = extractorName;
      wb.created = new Date();

      const ws = wb.addWorksheet('Data');

      // ── Column widths ──
      ws.columns = columns.map((col) => ({
        header: col.header,
        key: col.accessor,
        width: Math.max(col.header.length * 2.2, 14),
      }));

      // ── Colours ──
      const primaryArgb = 'FFB02020';
      const primaryDarkArgb = 'FF8A1A1A';
      const secondaryArgb = 'FF008840';
      const lightBgArgb = 'FFF8F9FA';
      const whiteArgb = 'FFFFFFFF';
      const textArgb = 'FF1F2937';
      const mutedArgb = 'FF9CA3AF';

      // ── Helper to add a styled row ──
      let rowIdx = 1;

      const addBrandRow = (text, font, fill, alignment) => {
        const r = ws.getRow(rowIdx);
        r.height = font.size > 12 ? 30 : 22;
        const cell = r.getCell(1);
        cell.value = text;
        cell.font = { name: 'Calibri', ...font };
        cell.fill = fill ? { type: 'pattern', pattern: 'solid', fgColor: { argb: fill } } : undefined;
        cell.alignment = { horizontal: alignment?.h || 'center', vertical: 'middle', wrapText: true };
        // Merge across all columns
        ws.mergeCells(rowIdx, 1, rowIdx, colCount);
        rowIdx++;
        return r;
      };

      // ── 7. Branding header ──
      addBrandRow('SICAM AGRI', { size: 18, bold: true, color: { argb: primaryArgb } }, null);
      addBrandRow('Production Agricole — Suivi & Gestion', { size: 10, italic: true, color: { argb: mutedArgb } }, null);
      addBrandRow('', null, null); // spacer

      // ── Extraction info ──
      const infoRows = [
        [`Extrait par : ${extractorName}`],
        [`Date : ${extractionDate}`],
        [`Enregistrements : ${data.length}`],
      ];
      infoRows.forEach(([txt]) => {
        addBrandRow(txt, { size: 10, color: { argb: textArgb } }, null);
      });

      // ── Summary section (if numeric columns) ──
      if (summary.length > 0) {
        addBrandRow('', null, null); // spacer
        addBrandRow('RÉSUMÉ STATISTIQUE', { size: 11, bold: true, color: { argb: primaryArgb } }, 'FFF2F2F2');

        summary.forEach((s) => {
          const txt = `${s.header}  →  Total: ${s.total.toLocaleString('fr-FR')}  |  Moyenne: ${s.avg.toLocaleString('fr-FR')}  |  Max: ${s.max.toLocaleString('fr-FR')}  |  Min: ${s.min.toLocaleString('fr-FR')}`;
          addBrandRow(txt, { size: 9.5, color: { argb: textArgb } }, 'FFF9FAFB');
        });
      }

      // ── Spacer before table ──
      addBrandRow('', null, null);

      // ── Data table header ──
      const headerRow = ws.getRow(rowIdx);
      headerRow.height = 28;
      columns.forEach((col, idx) => {
        const cell = headerRow.getCell(idx + 1);
        cell.value = col.header;
        cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: whiteArgb } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: primaryArgb } };
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        cell.border = {
          top: { style: 'medium', color: { argb: primaryDarkArgb } },
          bottom: { style: 'medium', color: { argb: primaryDarkArgb } },
          left: { style: 'thin', color: { argb: primaryDarkArgb } },
          right: { style: 'thin', color: { argb: primaryDarkArgb } },
        };
      });
      rowIdx++;

      // ── Data rows ──
      rows.forEach((rowData, r) => {
        const excelRow = ws.getRow(rowIdx);
        excelRow.height = 22;
        const isEven = r % 2 === 0;

        rowData.forEach((cellVal, c) => {
          const cell = excelRow.getCell(c + 1);
          cell.value = cellVal;
          cell.font = {
            name: 'Calibri',
            size: 10,
            color: { argb: c === 0 && !isNaN(Number(cellVal)) ? primaryArgb : textArgb },
            bold: c === 0,
          };
          cell.fill = isEven
            ? { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF7F9FB' } }
            : { type: 'pattern', pattern: 'solid', fgColor: { argb: whiteArgb } };

          // Alignment — numbers right, text left
          const isNumeric = !isNaN(Number(cellVal)) && cellVal !== '' && cellVal !== '-';
          cell.alignment = {
            horizontal: isNumeric ? 'right' : 'left',
            vertical: 'middle',
          };

          cell.border = {
            top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
            bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
            left: { style: 'thin', color: { argb: 'FFF0F0F0' } },
            right: { style: 'thin', color: { argb: 'FFF0F0F0' } },
          };
        });
        rowIdx++;
      });

      // ── Footer row ──
      addBrandRow('', null, null);
      addBrandRow(
        `Document généré par ${extractorName} — SICAM AGRI — ${data.length} enregistrement(s)`,
        { size: 8.5, italic: true, color: { argb: mutedArgb } },
        null
      );

      // ── Auto-fit column widths based on content ──
      if (ws.columnCount > 0) {
        columns.forEach((col, idx) => {
          let maxLen = col.header.length;
          rows.forEach((r) => {
            const val = r[idx] || '';
            maxLen = Math.max(maxLen, val.length);
          });
          const colRef = ws.getColumn(idx + 1);
          if (colRef) colRef.width = Math.min(Math.max(maxLen * 1.15 + 3, 14), 45);
        });
      }

      // ── Save ──
      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);

      setOpen(false);
    } catch (err) {
      console.error('Excel export error:', err);
      // Fallback to simple XLSX export
      const wsData = [
        ['SICAM AGRI'],
        [`Extrait par : ${extractorName}`],
        [`Date : ${extractionDate}`],
        [],
        headers,
        ...rows,
      ];
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      ws['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: colCount - 1 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: colCount - 1 } },
        { s: { r: 2, c: 0 }, e: { r: 2, c: colCount - 1 } },
      ];
      ws['!cols'] = columns.map((col) => ({ wch: Math.max(col.header.length * 2, 12) }));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Data');
      XLSX.writeFile(wb, `${filename}.xlsx`);
      setOpen(false);
    }
  };

  /* ═════════════════════════════════════════════════
     RENDER — Dropdown UI
     ═════════════════════════════════════════════════ */

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => setOpen(!open)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        style={btnBase}
        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f9fafb'; e.currentTarget.style.borderColor = '#9ca3af'; }}
        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'white'; e.currentTarget.style.borderColor = '#d1d5db'; }}
        aria-haspopup="true"
        aria-expanded={open}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        Exporter
      </button>
      {pdfSuccess && (
        <div style={{
          position: 'absolute',
          bottom: '100%',
          left: '50%',
          transform: 'translateX(-50%)',
          marginBottom: '8px',
          backgroundColor: '#dcfce7',
          color: '#006625',
          border: '1px solid #bbf7d0',
          borderRadius: '8px',
          padding: '8px 14px',
          fontSize: '12px',
          fontWeight: 600,
          whiteSpace: 'nowrap',
          zIndex: 50,
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        }}>
           PDF exporté avec succès
        </div>
      )}
      {pdfError && (
        <div style={{
          position: 'absolute',
          bottom: '100%',
          left: '50%',
          transform: 'translateX(-50%)',
          marginBottom: '8px',
          backgroundColor: '#fee2e2',
          color: '#991b1b',
          border: '1px solid #fecaca',
          borderRadius: '8px',
          padding: '8px 14px',
          fontSize: '12px',
          fontWeight: 600,
          whiteSpace: 'nowrap',
          zIndex: 50,
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        }}>
           {pdfError}
        </div>
      )}
      {open && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            marginTop: '4px',
            backgroundColor: 'white',
            border: '1px solid #C8E6C9',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            zIndex: 40,
            minWidth: '170px',
            overflow: 'hidden',
          }}
        >
          <button
            onClick={exportExcel}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              width: '100%',
              padding: '10px 16px',
              border: 'none',
              background: 'none',
              fontSize: '14px',
              fontWeight: 500,
              color: '#111111',
              cursor: 'pointer',
              textAlign: 'left',
              fontFamily: 'inherit',
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#008030" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
            <rect x="2" y="3" width="20" height="18" rx="2" ry="2" />
            <line x1="16" y1="3" x2="16" y2="21" />
            <line x1="8" y1="3" x2="8" y2="21" />
            <line x1="3" y1="9" x2="7" y2="9" />
            <line x1="3" y1="15" x2="7" y2="15" />
            <line x1="17" y1="9" x2="21" y2="9" />
            <line x1="17" y1="15" x2="21" y2="15" />
          </svg>
            <span>Excel (.xlsx)</span>
            <span style={{ marginLeft: 'auto', fontSize: '10px', color: '#111111' }}>Formaté</span>
          </button>
          <div style={{ height: '1px', backgroundColor: '#f0f0f0' }} />
          <button
            onClick={exportPDF}
            disabled={pdfExporting}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              width: '100%',
              padding: '10px 16px',
              border: 'none',
              background: 'none',
              fontSize: '14px',
              fontWeight: 500,
              color: pdfExporting ? '#9ca3af' : '#374151',
              cursor: pdfExporting ? 'not-allowed' : 'pointer',
              textAlign: 'left',
              fontFamily: 'inherit',
            }}
            onMouseEnter={(e) => { if (!pdfExporting) e.currentTarget.style.backgroundColor = '#f9fafb'; }}
            onMouseLeave={(e) => { if (!pdfExporting) e.currentTarget.style.backgroundColor = 'transparent'; }}
          >
            {pdfExporting ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#B02020" strokeWidth="2" style={{ flexShrink: 0, animation: 'spin 1s linear infinite' }}>
                <circle cx="12" cy="12" r="10" strokeOpacity="0.3" />
                <path d="M12 2a10 10 0 0 1 10 10" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#B02020" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
            )}
            <span>{pdfExporting ? 'Génération...' : 'PDF (.pdf)'}</span>
            <span style={{ marginLeft: 'auto', fontSize: '10px', color: pdfExporting ? '#9ca3af' : '#9ca3af' }}>{pdfExporting ? 'En cours...' : 'Rapport'}</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default ExportButton;
