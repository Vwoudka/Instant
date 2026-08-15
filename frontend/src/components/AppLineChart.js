import React from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { useTheme } from 'styled-components';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler);

function buildGradient(ctx, area, color) {
  if (!area) return `${color}22`;
  const g = ctx.createLinearGradient(0, area.top, 0, area.bottom);
  g.addColorStop(0, `${color}66`);
  g.addColorStop(1, `${color}00`);
  return g;
}

// Theme-aware Chart.js line chart used by both the Dashboard and History pages.
export default function AppLineChart({
  labels,
  series,
  height = 300,
  yTitle = 'Power (W)',
  y2Title = 'Voltage (V)',
}) {
  const theme = useTheme();

  const datasets = (series || []).map((s) => ({
    label: s.label,
    data: s.data,
    borderColor: s.color,
    backgroundColor: s.fill
      ? (ctx) => buildGradient(ctx.chart.ctx, ctx.chart.chartArea, s.color)
      : 'transparent',
    fill: !!s.fill,
    tension: 0.35,
    borderWidth: s.borderWidth || 2,
    pointRadius: 0,
    pointHitRadius: 10,
    yAxisID: s.yAxisID || 'y',
  }));

  const data = { labels, datasets };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 500, easing: 'easeOutQuart' },
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: {
        labels: { color: theme.text, usePointStyle: true, boxWidth: 8, font: { size: 11 } },
      },
      tooltip: {
        backgroundColor: theme.bg2,
        titleColor: theme.text,
        bodyColor: theme.text,
        borderColor: theme.panelBorder,
        borderWidth: 1,
        padding: 10,
      },
    },
    scales: {
      x: {
        ticks: { color: theme.textDim, maxTicksLimit: 10, font: { size: 10 } },
        grid: { color: theme.panelBorder },
      },
      y: {
        ticks: { color: theme.textDim, font: { size: 10 } },
        grid: { color: theme.panelBorder },
        title: { display: true, text: yTitle, color: theme.textDim, font: { size: 10 } },
      },
      y1: {
        position: 'right',
        ticks: { color: theme.textDim, font: { size: 10 } },
        grid: { drawOnChartArea: false },
        title: { display: true, text: y2Title, color: theme.textDim, font: { size: 10 } },
      },
    },
  };

  return (
    <div style={{ height, position: 'relative' }}>
      <Line data={data} options={options} />
    </div>
  );
}
