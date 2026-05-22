'use client';
import EChartsWrapper from '@/components/charts/echarts-wrapper';
import type { EChartsOption } from '@/components/charts/echarts-setup';

interface Props {
  categories: string[];
  series: { name: string; data: number[]; color?: string }[];
  height?: number;
}

export default function ComplianceBarChart({ categories, series, height = 280 }: Props) {
  const option: EChartsOption = {
    tooltip: { trigger: 'axis' },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: { type: 'category', data: categories, axisLabel: { color: '#71717A' } },
    yAxis: { type: 'value', axisLabel: { color: '#71717A' } },
    series: series.map((s) => ({
      name: s.name,
      type: 'bar',
      data: s.data,
      itemStyle: s.color ? { color: s.color } : undefined,
      barMaxWidth: 36,
    })),
    legend: { bottom: 0, textStyle: { color: '#71717A' } },
    color: ['#10B981', '#F59E0B', '#EF4444', '#0D9488'],
  };
  return <EChartsWrapper option={option} height={height} />;
}
