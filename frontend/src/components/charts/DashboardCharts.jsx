import { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import ChartCard from './ChartCard';
import { COLORS } from '../../constants/colors';

const STATUS_COLORS = {
  en_cours: '#92400e',
  pret: '#006625',
  recolte: '#1565C0',
  livre: '#008030',
  annule: '#991b1b',
};

const GERM_COLORS = ['#008030', '#8D6E00', '#B02020'];

/**
 * GerminationRateChart — Bar chart showing germination rate distribution.
 */
export const GerminationRateChart = ({ lots }) => {
  const data = useMemo(() => {
    const high = { name: '≥ 70% (Bon)', count: 0, color: '#008030' };
    const mid = { name: '40-69% (Moyen)', count: 0, color: '#8D6E00' };
    const low = { name: '< 40% (Faible)', count: 0, color: '#B02020' };

    (lots || []).forEach((lot) => {
      let rate = null;
      if (lot.tests && lot.tests.length > 0) {
        const t = lot.tests[0];
        if (t && t.grainesTestes > 0) rate = (t.grainesGermees / t.grainesTestes) * 100;
      } else if (lot.tauxManuel != null) {
        rate = lot.tauxManuel;
      }
      if (rate !== null) {
        if (rate >= 70) high.count++;
        else if (rate >= 40) mid.count++;
        else low.count++;
      }
    });

    return [high, mid, low];
  }, [lots]);

  const total = data.reduce((s, d) => s + d.count, 0);
  if (total === 0) return null;

  return (
    <ChartCard title="Distribution des taux de germination" icon="" filename="germination-distribution">
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#6b7280' }} />
          <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} allowDecimals={false} />
          <Tooltip
            contentStyle={{ borderRadius: '8px', border: '1px solid #C8E6C9', fontSize: '13px' }}
            formatter={(value, name) => [value, 'Lots']}
          />
          <Bar dataKey="count" radius={[6, 6, 0, 0]}>
            {data.map((entry, idx) => (
              <Cell key={idx} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
};

/**
 * LotsStatusChart — Pie chart showing lot status distribution.
 */
export const LotsStatusChart = ({ lots }) => {
  const data = useMemo(() => {
    const map = {};
    (lots || []).forEach((lot) => {
      const st = lot.statut || 'inconnu';
      map[st] = (map[st] || 0) + 1;
    });
    return Object.entries(map).map(([statut, count]) => ({
      name: {
        en_cours: 'En cours',
        pret: 'Prêt',
        recolte: 'Récolté',
        livre: 'Livré',
        annule: 'Annulé',
      }[statut] || statut,
      value: count,
      color: STATUS_COLORS[statut] || '#9ca3af',
    }));
  }, [lots]);

  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return null;

  return (
    <ChartCard title="Répartition des lots par statut" icon="" filename="lots-by-status">
      <ResponsiveContainer width="100%" height={250}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={90}
            paddingAngle={3}
            dataKey="value"
          >
            {data.map((entry, idx) => (
              <Cell key={idx} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ borderRadius: '8px', border: '1px solid #C8E6C9', fontSize: '13px' }}
            formatter={(value, name) => [value, name]}
          />
          <Legend
            verticalAlign="bottom"
            height={36}
            iconType="circle"
            formatter={(value) => <span style={{ fontSize: '12px', color: '#222222' }}>{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
    </ChartCard>
  );
};

/**
 * ProductionVolumeChart — Bar chart showing plants produced by variety.
 */
export const ProductionVolumeChart = ({ lots }) => {
  const data = useMemo(() => {
    const map = {};
    (lots || [])
      .filter(l => l.type === 'production')
      .forEach((lot) => {
        const v = lot.semis?.variete?.nom || lot.variete?.nom || 'Inconnu';
        map[v] = (map[v] || 0) + (lot.quantite || 0);
      });
    return Object.entries(map)
      .map(([name, plants]) => ({ name, plants }))
      .sort((a, b) => b.plants - a.plants)
      .slice(0, 10);
  }, [lots]);

  if (data.length === 0) return null;

  return (
    <ChartCard title="Volume de production par variété" icon="" filename="production-volume">
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 60, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis type="number" tick={{ fontSize: 11, fill: '#6b7280' }} />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fontSize: 11, fill: '#6b7280' }}
            width={80}
          />
          <Tooltip
            contentStyle={{ borderRadius: '8px', border: '1px solid #C8E6C9', fontSize: '13px' }}
            formatter={(value) => [value.toLocaleString('fr-FR'), 'Plants']}
          />
          <Bar dataKey="plants" fill={COLORS.primary} radius={[0, 6, 6, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
};

/**
 * DashboardCharts — All dashboard chart widgets composed together.
 */
const DashboardCharts = ({ lots }) => {
  const hasGermData = (lots || []).some(l => {
    if (l.tests && l.tests.length > 0) return true;
    if (l.tauxManuel != null) return true;
    return false;
  });

  const hasStatusData = (lots || []).length > 0;
  const hasProdData = (lots || []).filter(l => l.type === 'production').length > 0;

  if (!hasGermData && !hasStatusData && !hasProdData) return null;

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
      gap: '16px',
      padding: '16px 28px',
    }}>
      {hasGermData && <GerminationRateChart lots={lots} />}
      {hasStatusData && <LotsStatusChart lots={lots} />}
      {hasProdData && <ProductionVolumeChart lots={lots} />}
    </div>
  );
};

export default DashboardCharts;
