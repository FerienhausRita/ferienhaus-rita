"use client";

import { useMemo } from "react";

interface RevenueChartProps {
  data: { month: string; revenue: number }[];
}

const MONTH_LABELS = [
  "Jan", "Feb", "Mär", "Apr", "Mai", "Jun",
  "Jul", "Aug", "Sep", "Okt", "Nov", "Dez",
];

function formatEur(value: number): string {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(value % 1000 === 0 ? 0 : 1)}k`;
  }
  return `${value}`;
}

export default function RevenueChart({ data }: RevenueChartProps) {
  const {
    maxRevenue,
    yTicks,
    currentMonth,
  } = useMemo(() => {
    const now = new Date();
    const cm = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const max = Math.max(...data.map((d) => d.revenue), 1);

    // Compute nice y-axis ticks
    const magnitude = Math.pow(10, Math.floor(Math.log10(max)));
    let step = magnitude;
    if (max / step < 3) step = magnitude / 2;
    if (max / step > 6) step = magnitude * 2;
    step = Math.max(step, 1);

    const ticks: number[] = [];
    for (let v = 0; v <= max * 1.15; v += step) {
      ticks.push(Math.round(v));
    }
    // Ensure at least the max is covered
    if (ticks[ticks.length - 1] < max) {
      ticks.push(ticks[ticks.length - 1] + Math.round(step));
    }

    return { maxRevenue: ticks[ticks.length - 1] || 1, yTicks: ticks, currentMonth: cm };
  }, [data]);

  // Layout constants
  const width = 700;
  const height = 250;
  const paddingLeft = 55;
  const paddingRight = 15;
  const paddingTop = 15;
  const paddingBottom = 35;
  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;
  const barWidth = chartWidth / data.length;
  const barInnerWidth = Math.min(barWidth * 0.6, 40);

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full"
        style={{ minWidth: 400, maxHeight: 280 }}
        role="img"
        aria-label="Monatlicher Umsatz der letzten 12 Monate"
      >
        {/* Y-axis grid lines and labels */}
        {yTicks.map((tick) => {
          const y = paddingTop + chartHeight - (tick / maxRevenue) * chartHeight;
          return (
            <g key={tick}>
              <line
                x1={paddingLeft}
                y1={y}
                x2={width - paddingRight}
                y2={y}
                stroke="#e7e5e4"
                strokeWidth={1}
              />
              <text
                x={paddingLeft - 8}
                y={y + 4}
                textAnchor="end"
                className="fill-stone-400"
                fontSize={11}
              >
                {formatEur(tick)} €
              </text>
            </g>
          );
        })}

        {/* Bars */}
        {data.map((d, i) => {
          const barHeight =
            d.revenue > 0
              ? Math.max((d.revenue / maxRevenue) * chartHeight, 2)
              : 0;
          const x = paddingLeft + i * barWidth + (barWidth - barInnerWidth) / 2;
          const y = paddingTop + chartHeight - barHeight;
          const isCurrent = d.month === currentMonth;
          const monthIndex = parseInt(d.month.split("-")[1], 10) - 1;
          const label = MONTH_LABELS[monthIndex] ?? d.month;

          return (
            <g key={d.month}>
              {/* Bar */}
              {d.revenue > 0 && (
                <rect
                  x={x}
                  y={y}
                  width={barInnerWidth}
                  height={barHeight}
                  rx={3}
                  fill={isCurrent ? "#3b6b4a" : "#5a9a6e"}
                  className="transition-opacity hover:opacity-80"
                >
                  <title>
                    {label}: {new Intl.NumberFormat("de-AT", { style: "currency", currency: "EUR" }).format(d.revenue)}
                  </title>
                </rect>
              )}

              {/* Month label */}
              <text
                x={paddingLeft + i * barWidth + barWidth / 2}
                y={height - 8}
                textAnchor="middle"
                className={isCurrent ? "fill-stone-900 font-semibold" : "fill-stone-400"}
                fontSize={11}
              >
                {label}
              </text>
            </g>
          );
        })}

        {/* Baseline */}
        <line
          x1={paddingLeft}
          y1={paddingTop + chartHeight}
          x2={width - paddingRight}
          y2={paddingTop + chartHeight}
          stroke="#d6d3d1"
          strokeWidth={1}
        />
      </svg>
    </div>
  );
}
