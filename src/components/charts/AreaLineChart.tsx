import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from 'recharts';

interface AreaLineChartProps {
  data: { date: string; value: number; label?: string }[];
  dataKey?: string;
  title?: string;
  height?: number;
  color?: string;
  showGrid?: boolean;
  showLegend?: boolean;
  valueFormatter?: (value: number) => string;
  averageLine?: boolean;
}

export function AreaLineChart({
  data,
  dataKey = 'value',
  title,
  height = 300,
  color = '#22d3ee',
  showGrid = true,
  showLegend = false,
  valueFormatter = (v) => v.toLocaleString(),
  averageLine = false,
}: AreaLineChartProps) {
  const average = data.length > 0
    ? data.reduce((sum, d) => sum + d.value, 0) / data.length
    : 0;

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
        <LineChart
          data={data}
          margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
        >
          {showGrid && (
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="var(--theme-table-border)"
              strokeOpacity={0.5}
            />
          )}
          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            tick={{ fill: 'var(--theme-content-text-muted)', fontSize: 11 }}
            interval="preserveStartEnd"
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: 'var(--theme-content-text-muted)', fontSize: 11 }}
            tickFormatter={valueFormatter}
            width={60}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--theme-card-bg)',
              border: '1px solid var(--theme-card-border)',
              borderRadius: '8px',
              color: 'var(--theme-content-text)',
            }}
            labelStyle={{ color: 'var(--theme-content-text-muted)' }}
            formatter={(value: number) => [valueFormatter(value), title || 'Значение']}
            cursor={{ stroke: 'rgba(0, 0, 0, 0.3)', strokeWidth: 1, fill: 'rgba(0, 0, 0, 0.15)' }}
          />
          {showLegend && <Legend />}
          {averageLine && average > 0 && (
            <ReferenceLine
              y={average}
              stroke="#f59e0b"
              strokeDasharray="3 3"
              label={{
                value: `Среднее: ${valueFormatter(average)}`,
                fill: '#f59e0b',
                fontSize: 11,
              }}
            />
          )}
          <Line
            type="monotone"
            dataKey={dataKey}
            stroke={color}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: color }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default AreaLineChart;
