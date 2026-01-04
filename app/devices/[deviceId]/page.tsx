"use client";

import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import api from "@/lib/axios";
import { ArrowLeft, Thermometer, Droplets, Flame, Wind, RotateCw, Power, RefreshCcw, Brain, Sparkles, Lightbulb, Wifi, Zap, Clock, Activity } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import clsx from "clsx";
import { TelemetryChart } from "@/components/telemetry-chart";

interface DeviceStats {
    max_temp_c?: number;
    avg_temp_c?: number;
    max_hum_pct?: number;
    avg_hum_pct?: number;
}

interface AnalysisResult {
    status: string;
    temperature_status: string;
    humidity_status: string;
    summary_for_farmer: string;
    recommended_action: string;
}

function formatUptime(seconds: number) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
}

export default function DeviceDetailPage() {
    const params = useParams();
    const router = useRouter();
    const deviceId = params.deviceId as string;

    const { data: device, isLoading: loadingDevice } = useQuery({
        queryKey: ["device", deviceId],
        queryFn: async () => {
            const res = await api.get(`/devices/${deviceId}`);
            return res.data;
        },
        refetchInterval: 5000
    });

    const { data: history } = useQuery({
        queryKey: ["device-history", deviceId],
        queryFn: async () => {
            const res = await api.get(`/devices/${deviceId}/telemetry?limit=50`);
            return res.data;
        },
        refetchInterval: 10000
    });

    const cmdMutation = useMutation({
        mutationFn: async (payload: { cmd: string, params?: any }) => {
            await api.post(`/devices/${deviceId}/cmd`, payload);
        }
    });

    const handleSendCmd = (cmd: string, params: any = {}) => {
        cmdMutation.mutate({ cmd, params });
    };

    const { data: stats } = useQuery<DeviceStats>({
        queryKey: ["device-stats", deviceId],
        queryFn: async () => {
            const res = await api.get(`/devices/${deviceId}/stats`);
            return res.data;
        },
        enabled: !!deviceId
    });

    const [analyzing, setAnalyzing] = useState(false);
    const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);

    const handleAnalyze = async () => {
        try {
            setAnalyzing(true);
            const res = await api.post(`/devices/${deviceId}/analyze`);
            setAnalysis(res.data);
        } catch (e) {
            console.error(e);
        } finally {
            setAnalyzing(false);
        }
    };

    if (loadingDevice) return (
        <div className="h-screen mesh-gradient flex items-center justify-center">
            <motion.div
                className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600"
                animate={{ rotate: 360, scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
            />
        </div>
    );

    const t = device?.latest_telemetry || {};
    const isOnline = new Date().getTime() - new Date(device?.last_seen || 0).getTime() < 120000;

    return (
        <div className="min-h-screen mesh-gradient pb-24 relative overflow-hidden">
            {/* Background Glows */}
            <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-indigo-400/10 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute bottom-40 right-0 w-[300px] h-[300px] bg-purple-400/8 rounded-full blur-[80px] pointer-events-none" />

            {/* Header */}
            <header className="sticky top-0 z-20 glass-card mx-4 mt-4 rounded-2xl px-4 py-4 flex items-center gap-4">
                <motion.button
                    onClick={() => router.back()}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="p-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-600 transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                </motion.button>
                <div className="flex-1">
                    <h1 className="text-lg font-bold text-slate-900">{device?.model}</h1>
                    <p className="text-xs text-slate-500 font-mono">{device?.device_id}</p>
                </div>
                <div className={clsx(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold",
                    isOnline
                        ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                        : "bg-red-50 text-red-600 border border-red-200"
                )}>
                    <Wifi className="w-3 h-3" />
                    {isOnline ? "Online" : "Offline"}
                </div>
            </header>

            <main className="p-4 space-y-6 relative z-10">

                {/* Main Temperature Display */}
                <motion.div
                    className="flex justify-center py-8"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                >
                    <div className="relative">
                        {/* Animated Ring */}
                        <motion.div
                            className="absolute inset-0 rounded-full border-2 border-indigo-200"
                            animate={{ rotate: 360 }}
                            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                        />
                        <motion.div
                            className="absolute inset-4 rounded-full border border-dashed border-purple-200"
                            animate={{ rotate: -360 }}
                            transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                        />

                        <div className="w-56 h-56 rounded-full glass-card flex flex-col items-center justify-center shadow-lg shadow-indigo-500/10">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center mb-3 shadow-md shadow-orange-500/20">
                                <Thermometer className="w-6 h-6 text-white" />
                            </div>
                            <h2 className="text-5xl font-bold text-slate-900 tracking-tighter">{t.temp_c?.toFixed(1) ?? "--"}°</h2>
                            <p className="text-slate-500 text-sm uppercase tracking-widest mt-1">Temperature</p>
                        </div>
                    </div>
                </motion.div>

                {/* Secondary Stats */}
                <div className="grid grid-cols-3 gap-3">
                    <motion.div
                        className="glass-card p-4 rounded-2xl flex flex-col items-center"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                    >
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center mb-2 shadow-md shadow-blue-500/20">
                            <Droplets className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-2xl font-bold text-slate-900">{t.hum_pct?.toFixed(0) ?? "--"}%</span>
                        <span className="text-[10px] text-slate-500 uppercase">Humidity</span>
                    </motion.div>
                    <motion.div
                        className="glass-card p-4 rounded-2xl flex flex-col items-center"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.15 }}
                    >
                        <div className={clsx("w-10 h-10 rounded-xl flex items-center justify-center mb-2 shadow-md", t.turning_motor ? "bg-gradient-to-br from-emerald-500 to-teal-500 shadow-emerald-500/20" : "bg-slate-200")}>
                            <RotateCw className={clsx("w-5 h-5 text-white", t.turning_motor && "animate-spin")} />
                        </div>
                        <span className="text-2xl font-bold text-slate-900">{t.turning_motor ? "ON" : "OFF"}</span>
                        <span className="text-[10px] text-slate-500 uppercase">Motor</span>
                    </motion.div>
                    <motion.div
                        className="glass-card p-4 rounded-2xl flex flex-col items-center"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                    >
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center mb-2 shadow-md shadow-indigo-500/20">
                            <Clock className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-lg font-bold text-slate-900 font-mono">{t.uptime_s ? formatUptime(t.uptime_s) : "--"}</span>
                        <span className="text-[10px] text-slate-500 uppercase">Uptime</span>
                    </motion.div>
                </div>

                {/* Actuator Status Grid */}
                <motion.div
                    className="glass-card p-4 rounded-2xl"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25 }}
                >
                    <h3 className="text-xs text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <Activity className="w-4 h-4 text-indigo-500" />
                        Actuator Status
                    </h3>
                    <div className="grid grid-cols-4 gap-2">
                        {[
                            { key: 'primary_heater', label: 'Pri Heat', Icon: Flame, bgOn: 'bg-orange-50', borderOn: 'border-orange-200', textOn: 'text-orange-600' },
                            { key: 'secondary_heater', label: 'Sec Heat', Icon: Flame, bgOn: 'bg-orange-50', borderOn: 'border-orange-200', textOn: 'text-orange-600' },
                            { key: 'exhaust_fan', label: 'Exhaust', Icon: Wind, bgOn: 'bg-cyan-50', borderOn: 'border-cyan-200', textOn: 'text-cyan-600' },
                            { key: 'fan', label: 'Fan', Icon: Wind, bgOn: 'bg-blue-50', borderOn: 'border-blue-200', textOn: 'text-blue-600' },
                            { key: 'sv_valve', label: 'Valve', Icon: Droplets, bgOn: 'bg-purple-50', borderOn: 'border-purple-200', textOn: 'text-purple-600' },
                            { key: 'turning_motor', label: 'Motor', Icon: RotateCw, bgOn: 'bg-green-50', borderOn: 'border-green-200', textOn: 'text-green-600' },
                            { key: 'door_light', label: 'Light', Icon: Lightbulb, bgOn: 'bg-yellow-50', borderOn: 'border-yellow-200', textOn: 'text-yellow-600' },
                            { key: 'limit_switch', label: 'Limit', Icon: Power, bgOn: 'bg-amber-50', borderOn: 'border-amber-200', textOn: 'text-amber-600' },
                        ].map(({ key, label, Icon, bgOn, borderOn, textOn }) => (
                            <div key={key} className={clsx(
                                "flex flex-col items-center p-2 rounded-xl text-[9px] transition-all border",
                                t[key]
                                    ? `${bgOn} ${borderOn} ${textOn}`
                                    : "bg-slate-50 border-slate-100 text-slate-400"
                            )}>
                                <Icon className="w-4 h-4 mb-1" />
                                <span className="font-bold">{t[key] ? "ON" : "OFF"}</span>
                                <span className="text-[8px] opacity-70">{label}</span>
                            </div>
                        ))}
                    </div>
                    {t.ip && (
                        <div className="mt-3 pt-3 border-t border-slate-100 text-center">
                            <span className="text-xs text-slate-500">IP: </span>
                            <span className="text-xs text-indigo-600 font-mono">{t.ip}</span>
                        </div>
                    )}
                </motion.div>

                {/* AI Analysis */}
                <motion.div
                    className="space-y-4"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                >
                    {!analysis && (
                        <motion.button
                            onClick={handleAnalyze}
                            disabled={analyzing}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="w-full bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 bg-[length:200%_100%] text-white p-4 rounded-2xl shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-3 font-semibold hover:bg-[position:100%_0] transition-all"
                        >
                            {analyzing ? <RefreshCcw className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                            {analyzing ? "Analyzing Incubator..." : "Analyze Health with AI"}
                        </motion.button>
                    )}

                    <AnimatePresence>
                        {analysis && (
                            <motion.div
                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className={clsx("p-5 rounded-2xl border",
                                    analysis.status === 'NORMAL' ? "bg-emerald-50 border-emerald-200" :
                                        analysis.status === 'CAUTION' ? "bg-amber-50 border-amber-200" :
                                            "bg-red-50 border-red-200"
                                )}
                            >
                                <div className="flex items-center gap-3 mb-3">
                                    <div className={clsx("w-10 h-10 rounded-xl flex items-center justify-center",
                                        analysis.status === 'NORMAL' ? "bg-emerald-100" :
                                            analysis.status === 'CAUTION' ? "bg-amber-100" : "bg-red-100"
                                    )}>
                                        <Brain className={clsx("w-5 h-5",
                                            analysis.status === 'NORMAL' ? "text-emerald-600" :
                                                analysis.status === 'CAUTION' ? "text-amber-600" : "text-red-600"
                                        )} />
                                    </div>
                                    <h3 className={clsx("font-bold text-lg",
                                        analysis.status === 'NORMAL' ? "text-emerald-700" :
                                            analysis.status === 'CAUTION' ? "text-amber-700" : "text-red-700"
                                    )}>{analysis.status}</h3>
                                </div>
                                <p className="text-sm text-slate-700 mb-4 leading-relaxed">{analysis.summary_for_farmer}</p>
                                <div className="bg-white/60 p-3 rounded-xl border border-black/5">
                                    <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Recommendation</span>
                                    <p className="text-sm font-medium text-slate-800">{analysis.recommended_action}</p>
                                </div>
                                <button onClick={() => setAnalysis(null)} className="text-xs text-slate-400 mt-3 hover:text-slate-600 underline">Dismiss</button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>

                {/* Stats */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.35 }}
                >
                    <h3 className="text-xs text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                        <Zap className="w-4 h-4 text-indigo-500" />
                        Today's Statistics
                    </h3>
                    <div className="grid grid-cols-4 gap-2">
                        <div className="bg-white/80 border border-slate-100 p-3 rounded-xl flex flex-col items-center shadow-sm">
                            <span className="text-[10px] text-slate-400">Max Temp</span>
                            <span className="font-bold text-slate-900">{stats?.max_temp_c?.toFixed(1) ?? "--"}°</span>
                        </div>
                        <div className="bg-white/80 border border-slate-100 p-3 rounded-xl flex flex-col items-center shadow-sm">
                            <span className="text-[10px] text-slate-400">Avg Temp</span>
                            <span className="font-bold text-slate-900">{stats?.avg_temp_c?.toFixed(1) ?? "--"}°</span>
                        </div>
                        <div className="bg-white/80 border border-slate-100 p-3 rounded-xl flex flex-col items-center shadow-sm">
                            <span className="text-[10px] text-slate-400">Max Hum</span>
                            <span className="font-bold text-slate-900">{stats?.max_hum_pct?.toFixed(0) ?? "--"}%</span>
                        </div>
                        <div className="bg-white/80 border border-slate-100 p-3 rounded-xl flex flex-col items-center shadow-sm">
                            <span className="text-[10px] text-slate-400">Avg Hum</span>
                            <span className="font-bold text-slate-900">{stats?.avg_hum_pct?.toFixed(0) ?? "--"}%</span>
                        </div>
                    </div>
                </motion.div>

                {/* Chart */}
                <motion.div
                    className="glass-card p-4 h-64 rounded-2xl flex flex-col"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                >
                    <h3 className="text-xs text-slate-500 mb-4 uppercase tracking-widest flex items-center gap-2 flex-none">
                        <span>Environment History</span>
                        <div className="flex gap-3 ml-auto">
                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-500"></span><span className="text-slate-400">Temp</span></span>
                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-cyan-500"></span><span className="text-slate-400">Hum</span></span>
                        </div>
                    </h3>
                    <TelemetryChart data={history} />
                </motion.div>

                {/* Device Controls */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.45 }}
                >
                    <h3 className="text-xs text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <Power className="w-4 h-4 text-indigo-500" />
                        Device Controls
                    </h3>
                    <div className="grid grid-cols-2 gap-3 mb-4">
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.95 }}
                            className={clsx("p-4 rounded-2xl flex flex-col items-center gap-2 transition-all border",
                                t.primary_heater ? "bg-orange-50 border-orange-200" : "bg-white border-slate-200"
                            )}
                            onClick={() => handleSendCmd("PRIMARY_HEATER", { state: !t.primary_heater })}
                        >
                            <Flame className={clsx("w-7 h-7", t.primary_heater ? "text-orange-500" : "text-slate-400")} />
                            <span className="text-xs text-slate-700 font-medium">Pri Heater</span>
                            <span className={clsx("text-[10px] font-bold", t.primary_heater ? "text-orange-600" : "text-slate-400")}>{t.primary_heater ? "ON" : "OFF"}</span>
                        </motion.button>
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.95 }}
                            className={clsx("p-4 rounded-2xl flex flex-col items-center gap-2 transition-all border",
                                t.secondary_heater ? "bg-orange-50 border-orange-200" : "bg-white border-slate-200"
                            )}
                            onClick={() => handleSendCmd("SECONDARY_HEATER", { state: !t.secondary_heater })}
                        >
                            <Flame className={clsx("w-7 h-7", t.secondary_heater ? "text-orange-500" : "text-slate-400")} />
                            <span className="text-xs text-slate-700 font-medium">Sec Heater</span>
                            <span className={clsx("text-[10px] font-bold", t.secondary_heater ? "text-orange-600" : "text-slate-400")}>{t.secondary_heater ? "ON" : "OFF"}</span>
                        </motion.button>
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.95 }}
                            className={clsx("p-4 rounded-2xl flex flex-col items-center gap-2 transition-all border",
                                t.door_light ? "bg-yellow-50 border-yellow-200" : "bg-white border-slate-200"
                            )}
                            onClick={() => handleSendCmd("DOOR_LIGHT", { state: !t.door_light })}
                        >
                            <Lightbulb className={clsx("w-7 h-7", t.door_light ? "text-yellow-500" : "text-slate-400")} />
                            <span className="text-xs text-slate-700 font-medium">Door Light</span>
                            <span className={clsx("text-[10px] font-bold", t.door_light ? "text-yellow-600" : "text-slate-400")}>{t.door_light ? "ON" : "OFF"}</span>
                        </motion.button>
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.95 }}
                            className={clsx("p-4 rounded-2xl flex flex-col items-center gap-2 transition-all border",
                                t.sv_valve ? "bg-purple-50 border-purple-200" : "bg-white border-slate-200"
                            )}
                            onClick={() => handleSendCmd("SV_VALVE", { state: !t.sv_valve })}
                        >
                            <Droplets className={clsx("w-7 h-7", t.sv_valve ? "text-purple-500" : "text-slate-400")} />
                            <span className="text-xs text-slate-700 font-medium">SV Valve</span>
                            <span className={clsx("text-[10px] font-bold", t.sv_valve ? "text-purple-600" : "text-slate-400")}>{t.sv_valve ? "ON" : "OFF"}</span>
                        </motion.button>
                    </div>

                    {/* <h4 className="text-xs text-slate-400 mb-3">System Controls</h4>
                    <div className="grid grid-cols-2 gap-3">
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.95 }}
                            className="bg-white border border-slate-200 p-4 rounded-2xl flex flex-col items-center gap-2 hover:border-green-200 hover:bg-green-50 transition-all"
                            onClick={() => handleSendCmd("TURN_MOTOR", { dir: 'right' })}
                        >
                            <RotateCw className="w-6 h-6 text-emerald-500" />
                            <span className="text-xs text-slate-700 font-medium">Rotate Tray</span>
                        </motion.button>
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.95 }}
                            className="bg-white border border-slate-200 p-4 rounded-2xl flex flex-col items-center gap-2 hover:border-red-200 hover:bg-red-50 transition-all"
                            onClick={() => handleSendCmd("REBOOT")}
                        >
                            <Power className="w-6 h-6 text-red-500" />
                            <span className="text-xs text-slate-700 font-medium">Reboot</span>
                        </motion.button>
                    </div> */}
                </motion.div>
            </main>

            {/* Bottom Fade */}
            <div className="fixed bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[#f8fafc] to-transparent pointer-events-none z-10" />
        </div>
    );
}
