import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
} from 'recharts';

interface BarChartProps {
  data: { name: string; value: number; color?: string }[];
  title?: string;
  height?: number;
  color?: string;
  showGrid?: boolean;
  showLegend?: boolean;
  layout?: 'horizontal' | 'vertical';
  valueFormatter?: (value: number) => string;
  barSize?: number;
}

const COLORS = [
  '#22d3ee', '#8b5cf6', '#22c55e', '#f59e0b', '#ef4444',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1',
];

export function BarChart({
  data,
  title,
  height = 300,
  color,
  showGrid = true,
  showLegend = false,
  layout = 'horizontal',
  valueFormatter = (v) => v.toLocaleString(),
  barSize,
}: BarChartProps) {
  const isVertical = layout === 'vertical';

  if (!data || data.length === 0) {
    return (
      <div className="w-full flex items-center justify-center" style={{ height, color: 'var(--theme-content-text-muted)' }}>
        Нет данных
      </div>
    );
  }

  const chartHeight = title ? height - 30 : height;

  return (
    <div className="w-full" style={{ height, minHeight: height }}>
      {title && (
        <h3 className="text-sm font-medium mb-2" style={{ color: 'var(--theme-content-text-muted)' }}>
          {title}
        </h3>
      )}
      <ResponsiveContainer width="100%" height={chartHeight}>
        <RechartsBarChart
          data={data}
          layout={isVertical ? 'vertical' : 'horizontal'}
          margin={{ top: 5, right: 20, left: isVertical ? 80 : 10, bottom: 5 }}
        >
          {showGrid && (
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="var(--theme-table-border)"
              strokeOpacity={0.5}
            />
          )}
          {isVertical ? (
            <>
              <XAxis
                type="number"
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'var(--theme-content-text-muted)', fontSize: 11 }}
                tickFormatter={valueFormatter}
              />
              <YAxis
                type="category"
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'var(--theme-content-text-muted)', fontSize: 11 }}
                width={70}
              />
            </>
          ) : (
            <>
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'var(--theme-content-text-muted)', fontSize: 11 }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'var(--theme-content-text-muted)', fontSize: 11 }}
                tickFormatter={valueFormatter}
                width={60}
              />
            </>
          )}
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--theme-card-bg)',
              border: '1px solid var(--theme-card-border)',
              borderRadius: '8px',
              color: 'var(--theme-content-text)',
            }}
            labelStyle={{ color: 'var(--theme-content-text-muted)' }}
            formatter={(value: number) => [valueFormatter(value), 'Значение']}
            cursor={{ fill: 'rgba(0, 0, 0, 0.3)' }}
          />
          {showLegend && <Legend />}
          <Bar
            dataKey="value"
            fill={color || COLORS[0]}
            barSize={barSize}
            radius={[4, 4, 0, 0]}
          >
            {!color && data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.color || COLORS[index % COLORS.length]}
              />
            ))}
          </Bar>
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default BarChart;
