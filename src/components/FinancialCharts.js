'use client';

import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid,
  Legend
} from 'recharts';
import { useLanguage } from '@/context/LanguageContext';

export default function FinancialCharts({ data }) {
  const { t } = useLanguage();
  const { sources, recentWithdrawals } = data;

  // Pie Chart: Distribution by Source
  const pieData = sources.map(s => ({
    name: s.contact_name,
    value: s.total_amount
  }));

  // Bar Chart: Recent Withdrawals
  const barData = [...recentWithdrawals].reverse().map(w => ({
    name: w.month_label || w.withdrawal_date.split('-')[1],
    amount: w.amount
  }));

  const COLORS = [
    'var(--accent-primary)', 
    'var(--accent-secondary)', 
    'var(--accent-emerald)', 
    'var(--accent-amber)', 
    'var(--accent-rose)'
  ];

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="custom-tooltip" style={{ 
          background: 'var(--bg-card)', 
          padding: '10px', 
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-md)',
          boxShadow: 'var(--shadow-lg)'
        }}>
          <p className="label" style={{ fontWeight: 600, color: 'var(--text-heading)', margin: 0 }}>{`${payload[0].name}`}</p>
          <p className="intro" style={{ color: 'var(--accent-primary)', margin: 0 }}>{`${payload[0].value.toLocaleString()}`}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="grid-2 mt-lg animate-in stagger-3">
      {/* Income Distribution Pie */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">{t('incomeDistribution')}</h2>
        </div>
        <div style={{ width: '100%', height: 300 }}>
          <ResponsiveContainer>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend verticalAlign="bottom" height={36}/>
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Monthly Withdrawal Trends */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">{t('withdrawalTrends')}</h2>
        </div>
        <div style={{ width: '100%', height: 300 }}>
          <ResponsiveContainer>
            <BarChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: 'var(--text-muted)', fontSize: 12 }} 
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
                tickFormatter={(value) => `${value > 1000 ? (value/1000) + 'k' : value}`}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--bg-hover)' }} />
              <Bar 
                dataKey="amount" 
                fill="var(--accent-primary)" 
                radius={[4, 4, 0, 0]} 
                barSize={30}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
