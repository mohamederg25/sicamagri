import { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend, Cell,
} from 'recharts';
import ChartCard from './ChartCard';
import { COLORS } from '../../constants/colors';

/**
 * ProductionTrendChart — Line chart showing plants harvested over time (by month).
 */
const ProductionTrendChart = ({ lots }) => {
  const data = useMemo(() => {
    const map = {};
    (lots || []).forEach((lot) => {
      const d = lot.dateRecolte || lot.updatedAt;
      if (!d) return;
      const date = new Date(d);
      const sortKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!map[sortKey]) {
        map[sortKey] = {
          month: date.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' }),
          plantes: 0,
          lots: 0,
          sortKey,
        };
      }
      map[sortKey].plantes += lot.nombrePlantsProduits || lot.quantite || 0;
      map[sortKey].lots += 1;
    });
    return Object.values(map).sort((a, b) => a.sortKey.localeCompare(b.sortKey));
  }, [lots]);

  if (data.length === 0) return null;

  return (
    <ChartCard title="Tendance de production" icon="" filename="production-trend">
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#6b7280' }} />
          <YAxis
            yAxisId="left"
            tick={{ fontSize: 11, fill: '#6b7280' }}
            label={{ value: 'Plantes', angle: -90, position: 'insideLeft', style: { fontSize: 11, fill: '#6b7280' } }}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={{ fontSize: 11, fill: '#6b7280' }}
            label={{ value: 'Lots', angle: 90, position: 'insideRight', style: { fontSize: 11, fill: '#6b7280' } }}
          />
          <Tooltip
            contentStyle={{ borderRadius: '8px', border: '1px solid #C8E6C9', fontSize: '13px' }}
          />
          <Legend
            verticalAlign="bottom"
            height={30}
            formatter={(value) => <span style={{ fontSize: '12px', color: '#222222' }}>{value}</span>}
          />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="plantes"
            name="Plantes produites"
            stroke={COLORS.primary}
            strokeWidth={2}
            dot={{ fill: COLORS.primary, r: 4 }}
            activeDot={{ r: 6 }}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="lots"
            name="Nombre de lots"
            stroke={COLORS.secondary}
            strokeWidth={2}
            dot={{ fill: COLORS.secondary, r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  );
};

/**
 * GerminationRateTrendChart — Bar chart showing germination rates across lots.
 */
const GerminationRateTrendChart = ({ lots }) => {
  const data = useMemo(() => {
    const items = (lots || [])
      .map((lot) => {
        let rate = null;
        if (lot.tests && lot.tests.length > 0) {
          const t = lot.tests[0];
          if (t && t.grainesTestes > 0) rate = Math.round((t.grainesGermees / t.grainesTestes) * 100);
        } else if (lot.tauxManuel != null) {
          rate = lot.tauxManuel;
        }
        if (rate == null) return null;
        return {
          code: lot.code || lot.semis?.variete?.nom || '-',
          taux: rate,
          variete: lot.semis?.variete?.nom || lot.variete?.nom || '-',
          pepiniere: lot.semis?.pepiniere?.nom || lot.pepiniere?.nom || '-',
        };
      })
      .filter(Boolean)
      .slice(0, 15);

    return items.reverse();
  }, [lots]);

  if (data.length === 0) return null;

  return (
    <ChartCard title="Taux de germination par lot" icon="" filename="germination-rates">
      <ResponsiveContainer width="100%" height={Math.max(200, data.length * 30)}>
        <BarChart data={data} layout="vertical" margin={{ top: 5, right: 20, left: 50, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: '#6b7280' }} />
          <YAxis
            type="category"
            dataKey="code"
            tick={{ fontSize: 10, fill: '#6b7280' }}
            width={70}
          />
          <Tooltip
            contentStyle={{ borderRadius: '8px', border: '1px solid #C8E6C9', fontSize: '13px' }}
            formatter={(value, name, props) => [`${value}%`, `Taux (${props.payload.variete})`]}
          />
          <Bar
            dataKey="taux"
            name="Taux de germination (%)"
            radius={[0, 6, 6, 0]}
          >
            {data.map((entry, idx) => {
              let fill = '#B02020';
              if (entry.taux >= 70) fill = '#008030';
              else if (entry.taux >= 40) fill = '#8D6E00';
              return (
                <Cell key={idx} fill={fill} />
              );
            })}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
};

/**
 * DeliveryVolumeChart — Bar chart showing delivery volumes by lot.
 */
const DeliveryVolumeChart = ({ lots }) => {
  const data = useMemo(() => {
    const delivered = (lots || [])
      .filter(l => l.quantiteLivree != null && l.quantiteLivree > 0)
      .map(l => ({
        code: l.code || l.semis?.variete?.nom || '-',
        livree: l.quantiteLivree,
        produite: l.nombrePlantsProduits || 0,
        variete: l.semis?.variete?.nom || l.variete?.nom || '-',
      }))
      .slice(0, 12);

    return delivered.reverse();
  }, [lots]);

  if (data.length === 0) return null;

  return (
    <ChartCard title="Volumes livrés vs produits" icon="" filename="delivery-volumes">
      <ResponsiveContainer width="100%" height={Math.max(200, data.length * 35)}>
        <BarChart data={data} layout="vertical" margin={{ top: 5, right: 20, left: 50, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis type="number" tick={{ fontSize: 11, fill: '#6b7280' }} />
          <YAxis type="category" dataKey="code" tick={{ fontSize: 10, fill: '#6b7280' }} width={70} />
          <Tooltip
            contentStyle={{ borderRadius: '8px', border: '1px solid #C8E6C9', fontSize: '13px' }}
            formatter={(value) => [value.toLocaleString('fr-FR'), '']}
          />
          <Legend
            verticalAlign="bottom"
            height={30}
            formatter={(value) => <span style={{ fontSize: '12px', color: '#222222' }}>{value}</span>}
          />
          <Bar dataKey="produite" name="Produite" fill={COLORS.secondary} radius={[0, 4, 4, 0]} />
          <Bar dataKey="livree" name="Livrée" fill={COLORS.primary} radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
};

/**
 * HistoryCharts — All history page chart widgets composed together.
 */
const HistoryCharts = ({ lots }) => {
  const hasHarvestData = (lots || []).filter(l => l.dateRecolte).length > 0;
  const hasGermData = (lots || []).some(l => {
    if (l.tests && l.tests.length > 0) return true;
    if (l.tauxManuel != null) return true;
    return false;
  });
  const hasDeliveryData = (lots || []).filter(l => l.quantiteLivree != null).length > 0;

  if (!hasHarvestData && !hasGermData && !hasDeliveryData) return null;

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
      gap: '16px',
      marginBottom: '24px',
    }}>
      {hasHarvestData && <ProductionTrendChart lots={lots} />}
      {hasGermData && <GerminationRateTrendChart lots={lots} />}
      {hasDeliveryData && <DeliveryVolumeChart lots={lots} />}
    </div>
  );
};

export default HistoryCharts;
