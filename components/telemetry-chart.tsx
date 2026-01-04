"use client";

import { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';

interface TelemetryChartProps {
    data: any[];
}

export function TelemetryChart({ data }: TelemetryChartProps) {
    const chartData = useMemo(() => {
        if (!data) return [];
        return [...data].sort((a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime()).map(d => ({
            ...d,
            timeStr: format(new Date(d.ts), 'HH:mm')
        }));
    }, [data]);

    if (!chartData.length) return (
        <div className="h-full flex items-center justify-center text-slate-400 text-sm">
            No data available
        </div>
    );

    return (
        <div className="flex-1 w-full min-h-0">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
                    <XAxis
                        dataKey="timeStr"
                        minTickGap={30}
                        fontSize={10}
                        stroke="#94a3b8"
                        tickLine={false}
                        axisLine={{ stroke: 'rgba(0,0,0,0.1)' }}
                    />
                    <YAxis
                        yAxisId="left"
                        domain={['auto', 'auto']}
                        fontSize={10}
                        stroke="#94a3b8"
                        tickLine={false}
                        axisLine={{ stroke: 'rgba(0,0,0,0.1)' }}
                    />
                    <YAxis
                        yAxisId="right"
                        orientation="right"
                        domain={[0, 100]}
                        fontSize={10}
                        stroke="#94a3b8"
                        tickLine={false}
                        axisLine={{ stroke: 'rgba(0,0,0,0.1)' }}
                    />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: 'rgba(255, 255, 255, 0.95)',
                            borderRadius: '12px',
                            border: '1px solid rgba(0,0,0,0.08)',
                            fontSize: '12px',
                            boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
                            backdropFilter: 'blur(12px)'
                        }}
                        itemStyle={{ color: '#0f172a', fontSize: '12px' }}
                        labelStyle={{ color: '#64748b', fontSize: '11px', marginBottom: '4px' }}
                    />
                    <Line
                        yAxisId="left"
                        type="monotone"
                        dataKey="temp_c"
                        stroke="url(#tempGradient)"
                        name="Temperature"
                        dot={false}
                        strokeWidth={2.5}
                    />
                    <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="hum_pct"
                        stroke="url(#humGradient)"
                        name="Humidity"
                        dot={false}
                        strokeWidth={2.5}
                    />
                    <defs>
                        <linearGradient id="tempGradient" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor="#f97316" />
                            <stop offset="100%" stopColor="#ef4444" />
                        </linearGradient>
                        <linearGradient id="humGradient" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor="#06b6d4" />
                            <stop offset="100%" stopColor="#3b82f6" />
                        </linearGradient>
                    </defs>
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}
