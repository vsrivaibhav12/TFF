'use client';
import dynamic from 'next/dynamic';

export const DynamicBarChart = dynamic(() => import('./bar-chart'), { ssr: false });
export const DynamicLineChart = dynamic(() => import('./line-chart'), { ssr: false });
export const DynamicPieChart = dynamic(() => import('./pie-chart'), { ssr: false });
export const DynamicStackedBarChart = dynamic(() => import('./stacked-bar-chart'), { ssr: false });
