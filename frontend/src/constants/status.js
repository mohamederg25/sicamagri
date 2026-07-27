/**
 * Status & Role Configuration Constants
 * ======================================
 *
 * Centralized definitions for all status badges, role labels,
 * and enum values used across the frontend.
 *
 * Usage:
 *   import { PRODUCTION_RECORD_STATUS, ROLE_LABELS } from '../constants/status';
 *   const cfg = PRODUCTION_RECORD_STATUS[record.statut]; // { label, bg, color, border }
 */

// ── Production Record Status ──
export const PRODUCTION_RECORD_STATUS = {
  // Lot production statuses (directly on Lot model)
  planifie: { label: 'Planifié', bg: '#f3f4f6', color: '#222222', border: '#e5e7eb' },
  en_attente_semis: { label: 'En attente semis', bg: '#fef3c7', color: '#92400e', border: '#fde68a' },
  semis_termine: { label: 'Semis terminé', bg: '#dcfce7', color: '#166534', border: '#bbf7d0' },
  germination_j7: { label: 'Germination J+7', bg: '#f0fdf4', color: '#166534', border: '#bbf7d0' },
  germination_j14: { label: 'Germination J+14', bg: '#f0fdf4', color: '#166534', border: '#bbf7d0' },
  germination_j21: { label: 'Germination J+21', bg: '#f0fdf4', color: '#166534', border: '#bbf7d0' },
  croissance: { label: 'En croissance', bg: '#dbeafe', color: '#1e40af', border: '#bfdbfe' },
  recolte_en_cours: { label: 'Récolte en cours', bg: '#fef3c7', color: '#92400e', border: '#fde68a' },
  recolte: { label: 'Récolté', bg: '#dcfce7', color: '#065f46', border: '#a7f3d0' },
  pret: { label: 'Prêt', bg: '#dcfce7', color: '#065f46', border: '#a7f3d0' },
  livre: { label: 'Livré', bg: '#f0fdf4', color: '#065f46', border: '#a7f3d0' },
  annule: { label: 'Annulé', bg: '#fee2e2', color: '#991b1b', border: '#fecaca' },
};

// ── Phytosanitaire Intervention Type ──
export const PHYTO_TYPE = {
  curative:   { label: 'Curatif',   bg: '#fee2e2', color: '#991b1b', border: '#fecaca' },
  preventive: { label: 'Préventif', bg: '#dbeafe', color: '#1e40af', border: '#bfdbfe' },
};

// ── Semis Status ──
export const SEMIS_STATUS = {
  prevue:    { label: 'Prévue',    bg: '#dbeafe', color: '#1e40af', border: '#bfdbfe' },
  en_cours:  { label: 'En cours',  bg: '#fef3c7', color: '#92400e', border: '#fde68a' },
  realisee:  { label: 'Réalisée',  bg: '#dcfce7', color: '#166534', border: '#bbf7d0' },
  annulee:   { label: 'Annulée',   bg: '#fee2e2', color: '#991b1b', border: '#fecaca' },
};

// ── Semis Stock Status ──
export const STOCK_STATUS = {
  disponible: { label: 'Disponible', bg: '#E8F5E9', color: '#008840', border: '#C8E6C9' },
  en_usage:   { label: 'En usage',   bg: '#FFF8E1', color: '#8D6E00', border: '#FFE082' },
  epuise:     { label: 'Épuisé',     bg: '#FFEBEE', color: '#B02020', border: '#FFCDD2' },
};

// ── Lot Types ──
export const LOT_TYPES = {
  production: { label: 'Production', bg: '#dcfce7', color: '#166534' },
};

// ── Variete Status ──
export const VARIETE_STATUS = {
  active:   { label: 'Active',   bg: '#d1fae5', color: '#065f46', borderColor: '#a7f3d0' },
  inactive: { label: 'Inactive', bg: '#f3f4f6', color: '#222222', borderColor: '#e5e7eb' },
};

// ── Pepiniere Status ──
export const PEPINIERE_STATUS = {
  actif:     { label: 'Actif',     bg: '#E8F5E9', color: '#008840', border: '#C8E6C9' },
  'non actif': { label: 'Non actif', bg: '#FFF8E1', color: '#8D6E00', border: '#FFE082' },
};

// ── User Roles ──
export const ROLE_LABELS = {
  admin:     'Administrateur',
  ingenieur: 'Ingénieur',
  employe:   'Employé',
  visiteur:  'Visiteur',
};

export const ROLE_BADGE = {
  admin:     { label: 'Admin',     bg: '#ede9fe', color: '#7c3aed', border: '#ddd6fe' },
  ingenieur: { label: 'Ingénieur', bg: '#E8F5E9', color: '#008840', border: '#C8E6C9' },
  employe:   { label: 'Employé',   bg: '#E3F2FD', color: '#1565C0', border: '#BBDEFB' },
  visiteur:  { label: 'Visiteur',  bg: '#f3f4f6', color: '#222222', border: '#e5e7eb' },
};

// ── Germination Rate Colors ──
export const GERMINATION_COLORS = {
  high:  { bg: '#E8F5E9', color: '#008840' },
  mid:   { bg: '#FFF8E1', color: '#8D6E00' },
  low:   { bg: '#FFEBEE', color: '#B02020' },
};

export const getGerminationStyle = (rate) => {
  if (rate == null) return { bg: '#f3f4f6', color: '#111111' };
  if (rate >= 70) return GERMINATION_COLORS.high;
  if (rate >= 40) return GERMINATION_COLORS.mid;
  return GERMINATION_COLORS.low;
};

// ── Germination Rate Limit (for progress bar) ──
export const GERMINATION_RATE_LIMITS = { HIGH: 70, MID: 40 };
