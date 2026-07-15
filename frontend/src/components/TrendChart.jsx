import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useTheme } from "../context/ThemeContext";

const PALETTE = {
  light: { line: "#2a78d6", grid: "#e1e0d9", axis: "#898781", dotRing: "#ffffff" },
  dark: { line: "#5b9bd8", grid: "#2d3340", axis: "#8b93a1", dotRing: "#111827" },
};

function formatDate(d) {
  return new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function ChartTooltip({ active, payload, unit }) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded shadow px-3 py-2 text-sm">
      <p className="text-gray-500 dark:text-gray-400">{new Date(point.date).toLocaleDateString()}</p>
      <p className="font-medium text-gray-900 dark:text-gray-100">
        {point.value} {unit || ""}
      </p>
    </div>
  );
}

export default function TrendChart({ series }) {
  const { theme } = useTheme();
  const colors = PALETTE[theme] || PALETTE.light;
  const data = series.points.map((p) => ({ date: p.date, value: p.value }));

  return (
    <div className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 rounded-lg p-4">
      <h3 className="font-semibold capitalize mb-2 text-gray-900 dark:text-gray-100">
        {series.test_name}{" "}
        {series.unit && (
          <span className="text-gray-400 dark:text-gray-500 text-sm font-normal">({series.unit})</span>
        )}
      </h3>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid stroke={colors.grid} strokeDasharray="0" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={formatDate}
            stroke={colors.axis}
            tick={{ fontSize: 12, fill: colors.axis }}
            axisLine={{ stroke: colors.axis }}
            tickLine={false}
          />
          <YAxis
            stroke={colors.axis}
            tick={{ fontSize: 12, fill: colors.axis }}
            axisLine={false}
            tickLine={false}
            width={40}
          />
          <Tooltip content={<ChartTooltip unit={series.unit} />} />
          <Line
            type="monotone"
            dataKey="value"
            stroke={colors.line}
            strokeWidth={2}
            dot={{ r: 4, fill: colors.line, stroke: colors.dotRing, strokeWidth: 2 }}
            activeDot={{ r: 5, fill: colors.line, stroke: colors.dotRing, strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
