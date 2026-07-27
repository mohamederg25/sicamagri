/**
 * DashboardKpis — Role-specific KPI components
 * 
 * Each role gets a different set of KPIs relevant to their permissions.
 */
import KpiGrid from '../../../components/common/KpiGrid';
import { COLORS } from '../../../constants/colors';

export const AdminKpis = ({ s }) => {
  const kpis = [
    { label: 'Pépinières', value: s.totalPepinieres, sub: `${s.pepActives} actives`, border: COLORS.primary, icon: '' },
    { label: 'Variétés', value: s.totalVarietes, sub: `${s.varActives} actives`, border: COLORS.success, icon: '' },
    { label: 'Lots', value: s.totalLots, sub: `${s.lotsTest} tests · ${s.lotsProd} productions`, border: COLORS.blue, icon: '' },
    {
      label: 'Semis en Cours', value: s.semisActifs,
      sub: `${s.semisPrevus} prévus · ${s.semisRealises} réalisés`,
      border: s.semisActifs > 0 ? COLORS.orange : COLORS.gray, icon: '',
    },
    {
      label: 'Taux Germination',
      value: s.avgGermination !== null ? `${s.avgGermination.toFixed(1)}%` : '—',
      sub: s.avgGermination !== null ? `Basé sur ${s.lotsAvecTaux} lots` : 'Aucun test',
      border: s.avgGermination !== null
        ? s.avgGermination >= 70 ? COLORS.success : s.avgGermination >= 40 ? COLORS.orange : COLORS.danger
        : COLORS.gray,
      icon: '',
    },
  ];
  return <KpiGrid items={kpis} />;
};

export const IngenieurKpis = ({ s }) => {
  const kpis = [
    { label: 'Mes Pépinières', value: s.totalPepinieres, sub: 'Assignées', border: COLORS.primary, icon: '' },
    { label: 'Lots', value: s.totalLots, sub: 'Dans mes sites', border: COLORS.blue, icon: '' },
    {
      label: 'Semis en Cours', value: s.semisActifs,
      sub: s.totalSemis > 0 ? `${((s.semisActifs / s.totalSemis) * 100).toFixed(0)}% des semis` : 'Aucun',
      border: s.semisActifs > 0 ? COLORS.orange : COLORS.gray, icon: '',
    },
    {
      label: 'Taux Germination Moyen',
      value: s.avgGermination !== null ? `${s.avgGermination.toFixed(1)}%` : '—',
      sub: s.avgGermination !== null ? `${s.lotsAvecTaux} lots testés` : 'Aucun test',
      border: s.avgGermination !== null
        ? s.avgGermination >= 70 ? COLORS.success : s.avgGermination >= 40 ? COLORS.orange : COLORS.danger
        : COLORS.gray,
      icon: '',
    },
  ];
  return <KpiGrid items={kpis} />;
};

export const EmployeKpis = ({ s }) => {
  const kpis = [
    { label: 'Pépinières', value: s.totalPepinieres, sub: 'Sites de production', border: COLORS.success, icon: '' },
    { label: 'Variétés', value: s.totalVarietes, sub: 'En culture', border: '#1565C0', icon: '' },
    {
      label: 'Semis', value: s.totalSemis,
      sub: `${s.semisActifs} en cours · ${s.semisPrevus} prévus`,
      border: COLORS.orange, icon: '',
    },
    {
      label: 'Taux Utilisation',
      value: s.tauxUtilisationGlobal !== null ? `${s.tauxUtilisationGlobal}%` : '—',
      sub: 'Moyen stock semences',
      border: s.tauxUtilisationGlobal !== null
        ? s.tauxUtilisationGlobal >= 70 ? COLORS.primary : s.tauxUtilisationGlobal >= 40 ? COLORS.orange : COLORS.success
        : COLORS.gray,
      icon: '',
    },
  ];
  return <KpiGrid items={kpis} />;
};

export const VisiteurKpis = ({ s }) => {
  const kpis = [
    { label: 'Pépinières', value: s.totalPepinieres, sub: 'Sites de production', border: COLORS.primary, icon: '' },
    { label: 'Variétés', value: s.totalVarietes, sub: 'Cultivars enregistrés', border: COLORS.success, icon: '' },
    { label: 'Lots', value: s.totalLots, sub: 'Enregistrés au total', border: COLORS.blue, icon: '' },
  ];
  return <KpiGrid items={kpis} />;
};
