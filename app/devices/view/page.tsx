"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import api from "@/lib/axios";
import { ArrowLeft, Thermometer, Droplets, Flame, Wind, RotateCw, Power, RefreshCcw, Brain, Sparkles, Lightbulb, Wifi, Zap, Clock, Activity, Settings } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, Suspense } from "react";
import clsx from "clsx";
import { TelemetryChart } from "@/components/telemetry-chart";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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

function DeviceDetailContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const deviceId = searchParams.get("id");

    const { data: device, isLoading: loadingDevice } = useQuery({
        queryKey: ["device", deviceId],
        queryFn: async () => {
            if (!deviceId) return null;
            const res = await api.get(`/devices/${deviceId}`);
            return res.data;
        },
        enabled: !!deviceId,
        refetchInterval: 5000
    });

    const { data: history } = useQuery({
        queryKey: ["device-history", deviceId],
        queryFn: async () => {
            if (!deviceId) return [];
            const res = await api.get(`/devices/${deviceId}/telemetry?limit=50`);
            return res.data;
        },
        enabled: !!deviceId,
        refetchInterval: 10000
    });

    const queryClient = useQueryClient();

    const cmdMutation = useMutation({
        mutationFn: async (payload: { cmd: string, params?: any }) => {
            if (!deviceId) return;
            await api.post(`/devices/${deviceId}/cmd`, payload);
        },
        onMutate: async (newCmd) => {
            if (!deviceId) return;
            // Cancel any outgoing refetches
            await queryClient.cancelQueries({ queryKey: ['device', deviceId] });

            // Snapshot previous value
            const previousDevice = queryClient.getQueryData(['device', deviceId]);

            // Optimistically update
            queryClient.setQueryData(['device', deviceId], (old: any) => {
                if (!old) return old;
                const newTelemetry = { ...old.latest_telemetry };

                if (newCmd.cmd === "PRIMARY_HEATER") newTelemetry.primary_heater = newCmd.params.state;
                else if (newCmd.cmd === "SECONDARY_HEATER") newTelemetry.secondary_heater = newCmd.params.state;
                else if (newCmd.cmd === "FAN") newTelemetry.fan = newCmd.params.state;
                else if (newCmd.cmd === "SV_VALVE") newTelemetry.sv_valve = newCmd.params.state;
                else if (newCmd.cmd === "DOOR_LIGHT") newTelemetry.door_light = newCmd.params.state;

                return {
                    ...old,
                    latest_telemetry: newTelemetry
                };
            });

            return { previousDevice };
        },
        onError: (err, newCmd, context) => {
            queryClient.setQueryData(['device', deviceId], context?.previousDevice);
            alert("Failed to send command");
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['device', deviceId] });
        }
    });

    const handleSendCmd = (cmd: string, params: any = {}) => {
        cmdMutation.mutate({ cmd, params });
    };

    const { data: stats } = useQuery<DeviceStats>({
        queryKey: ["device-stats", deviceId],
        queryFn: async () => {
            if (!deviceId) return {};
            const res = await api.get(`/devices/${deviceId}/stats`);
            return res.data;
        },
        enabled: !!deviceId
    });

    const [analyzing, setAnalyzing] = useState(false);
    const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);

    const handleAnalyze = async () => {
        if (!deviceId) return;
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

    // Settings Dialog State
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);
    const [editTempLow, setEditTempLow] = useState<number | "">(device?.temp_low ?? "");
    const [editTempHigh, setEditTempHigh] = useState<number | "">(device?.temp_high ?? "");
    const [editHumidityTemp, setEditHumidityTemp] = useState<number | "">(device?.humidity_temp ?? "");
    const [editSensor1Offset, setEditSensor1Offset] = useState<number | "">(device?.sensor1_offset ?? 0);
    const [editSensor2Offset, setEditSensor2Offset] = useState<number | "">(device?.sensor2_offset ?? 0);
    const [editMotorMode, setEditMotorMode] = useState<number>(device?.motor_mode ?? 0);
    const [editTimerSec, setEditTimerSec] = useState<number | "">(device?.timer_sec ?? "");

    const handleUpdateSettings = async () => {
        if (!deviceId) return;
        setIsUpdating(true);
        try {
            // Save settings to database
            await api.put(`/devices/${deviceId}`, {
                temp_low: editTempLow === "" ? null : editTempLow,
                temp_high: editTempHigh === "" ? null : editTempHigh,
                humidity_temp: editHumidityTemp === "" ? null : editHumidityTemp,
                sensor1_offset: editSensor1Offset === "" ? null : editSensor1Offset,
                sensor2_offset: editSensor2Offset === "" ? null : editSensor2Offset,
                motor_mode: editMotorMode,
                timer_sec: editTimerSec === "" ? null : editTimerSec,
            });

            // Send SET_CONFIG command to device via MQTT
            await api.post(`/devices/${deviceId}/cmd`, {
                cmd: "SET_CONFIG",
                params: {
                    temp_low: editTempLow === "" ? null : editTempLow,
                    temp_high: editTempHigh === "" ? null : editTempHigh,
                    humidity_temp: editHumidityTemp === "" ? null : editHumidityTemp,
                    sensor1_offset: editSensor1Offset === "" ? null : editSensor1Offset,
                    sensor2_offset: editSensor2Offset === "" ? null : editSensor2Offset,
                    motor_mode: editMotorMode,
                    timer_sec: editTimerSec === "" ? null : editTimerSec,
                }
            });

            await queryClient.invalidateQueries({ queryKey: ['device', deviceId] });
            setIsSettingsOpen(false);
        } catch (error) {
            console.error("Failed to update settings", error);
            alert("Failed to update settings");
        } finally {
            setIsUpdating(false);
        }
    };

    if (loadingDevice || !deviceId) return (
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
                <motion.button
                    onClick={() => setIsSettingsOpen(true)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="p-2.5 bg-indigo-50 hover:bg-indigo-100 rounded-xl text-indigo-600 transition-colors"
                >
                    <Settings className="w-5 h-5" />
                </motion.button>
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
                        <span className="text-2xl font-bold text-slate-900">{t.hum_pct?.toFixed(1) ?? "--"}°F</span>
                        <span className="text-[10px] text-slate-500 uppercase">Sensor 2</span>
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
                            <span className="text-[10px] text-slate-400">Max S2</span>
                            <span className="font-bold text-slate-900">{stats?.max_hum_pct?.toFixed(1) ?? "--"}°F</span>
                        </div>
                        <div className="bg-white/80 border border-slate-100 p-3 rounded-xl flex flex-col items-center shadow-sm">
                            <span className="text-[10px] text-slate-400">Avg S2</span>
                            <span className="font-bold text-slate-900">{stats?.avg_hum_pct?.toFixed(1) ?? "--"}°F</span>
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
                    <div className="grid grid-cols-1 gap-3 mb-4">
                        {/* Primary Heater */}
                        <div className="bg-white border border-slate-200 p-4 rounded-2xl flex items-center justify-between shadow-sm">
                            <div className="flex items-center gap-3">
                                <div className={clsx("p-2 rounded-full", t.primary_heater ? "bg-orange-100" : "bg-slate-100")}>
                                    <Flame className={clsx("w-5 h-5", t.primary_heater ? "text-orange-600" : "text-slate-400")} />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-sm font-semibold text-slate-900">Primary Heater</span>
                                    <span className="text-[10px] text-slate-500">{t.primary_heater ? "Heating" : "Idle"}</span>
                                </div>
                            </div>
                            <Switch
                                checked={!!t.primary_heater}
                                onCheckedChange={(val) => handleSendCmd("PRIMARY_HEATER", { state: val })}
                            />
                        </div>

                        {/* Secondary Heater */}
                        <div className="bg-white border border-slate-200 p-4 rounded-2xl flex items-center justify-between shadow-sm">
                            <div className="flex items-center gap-3">
                                <div className={clsx("p-2 rounded-full", t.secondary_heater ? "bg-orange-100" : "bg-slate-100")}>
                                    <Flame className={clsx("w-5 h-5", t.secondary_heater ? "text-orange-600" : "text-slate-400")} />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-sm font-semibold text-slate-900">Secondary Heater</span>
                                    <span className="text-[10px] text-slate-500">{t.secondary_heater ? "Heating" : "Idle"}</span>
                                </div>
                            </div>
                            <Switch
                                checked={!!t.secondary_heater}
                                onCheckedChange={(val) => handleSendCmd("SECONDARY_HEATER", { state: val })}
                            />
                        </div>

                        {/* Fan (Replaced Door Light) */}
                        <div className="bg-white border border-slate-200 p-4 rounded-2xl flex items-center justify-between shadow-sm">
                            <div className="flex items-center gap-3">
                                <div className={clsx("p-2 rounded-full", t.fan ? "bg-blue-100" : "bg-slate-100")}>
                                    <Wind className={clsx("w-5 h-5", t.fan ? "text-blue-600" : "text-slate-400")} />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-sm font-semibold text-slate-900">Circulation Fan</span>
                                    <span className="text-[10px] text-slate-500">{t.fan ? "Active" : "Stopped"}</span>
                                </div>
                            </div>
                            <Switch
                                checked={!!t.fan}
                                onCheckedChange={(val) => handleSendCmd("FAN", { state: val })}
                            />
                        </div>

                        {/* SV Valve */}
                        <div className="bg-white border border-slate-200 p-4 rounded-2xl flex items-center justify-between shadow-sm">
                            <div className="flex items-center gap-3">
                                <div className={clsx("p-2 rounded-full", t.sv_valve ? "bg-purple-100" : "bg-slate-100")}>
                                    <Droplets className={clsx("w-5 h-5", t.sv_valve ? "text-purple-600" : "text-slate-400")} />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-sm font-semibold text-slate-900">SV Valve</span>
                                    <span className="text-[10px] text-slate-500">{t.sv_valve ? "Open" : "Closed"}</span>
                                </div>
                            </div>
                            <Switch
                                checked={!!t.sv_valve}
                                onCheckedChange={(val) => handleSendCmd("SV_VALVE", { state: val })}
                            />
                        </div>
                    </div>
                </motion.div>
            </main>

            {/* Settings Dialog */}
            <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
                <DialogContent className="max-w-[95vw] max-h-[85vh] overflow-y-auto rounded-3xl p-0 border-0">
                    {/* Header with Gradient */}
                    <div className="sticky top-0 z-10 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 p-6 rounded-t-3xl">
                        <DialogTitle className="text-white text-xl font-bold">Incubator Settings</DialogTitle>
                        <DialogDescription className="text-indigo-100 text-sm mt-1">Configure temperature, humidity, and motor settings</DialogDescription>
                    </div>

                    <div className="p-5 space-y-4">
                        {/* Temperature Thresholds */}
                        <div className="glass-card p-4 rounded-2xl">
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
                                    <Thermometer className="w-4 h-4 text-white" />
                                </div>
                                <h4 className="text-sm font-bold text-slate-900">Temperature Thresholds</h4>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-2">
                                    <Label htmlFor="temp-low" className="text-xs text-slate-600 font-semibold">Low Threshold</Label>
                                    <Input
                                        id="temp-low"
                                        type="number"
                                        step="0.1"
                                        value={editTempLow}
                                        onChange={(e) => setEditTempLow(e.target.value ? parseFloat(e.target.value) : "")}
                                        className="h-11 rounded-xl border-slate-200 bg-white"
                                    />
                                    <p className="text-[10px] text-slate-500">Heaters ON below this</p>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="temp-high" className="text-xs text-slate-600 font-semibold">High Threshold</Label>
                                    <Input
                                        id="temp-high"
                                        type="number"
                                        step="0.1"
                                        value={editTempHigh}
                                        onChange={(e) => setEditTempHigh(e.target.value ? parseFloat(e.target.value) : "")}
                                        className="h-11 rounded-xl border-slate-200 bg-white"
                                    />
                                    <p className="text-[10px] text-slate-500">Heaters OFF above this</p>
                                </div>
                            </div>
                        </div>

                        {/* Cooling Threshold */}
                        <div className="glass-card p-4 rounded-2xl">
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                                    <Droplets className="w-4 h-4 text-white" />
                                </div>
                                <h4 className="text-sm font-bold text-slate-900">Cooling Threshold</h4>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="humidity-temp" className="text-xs text-slate-600 font-semibold">Sensor 2 Threshold</Label>
                                <Input
                                    id="humidity-temp"
                                    type="number"
                                    step="0.1"
                                    value={editHumidityTemp}
                                    onChange={(e) => setEditHumidityTemp(e.target.value ? parseFloat(e.target.value) : "")}
                                    className="h-11 rounded-xl border-slate-200 bg-white"
                                />
                                <p className="text-[10px] text-slate-500">Cooling ON above this</p>
                            </div>
                        </div>

                        {/* Sensor Calibration */}
                        <div className="glass-card p-4 rounded-2xl">
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                                    <Activity className="w-4 h-4 text-white" />
                                </div>
                                <h4 className="text-sm font-bold text-slate-900">Sensor Calibration</h4>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-2">
                                    <Label htmlFor="sensor1-offset" className="text-xs text-slate-600 font-semibold">Sensor 1 Offset</Label>
                                    <Input
                                        id="sensor1-offset"
                                        type="number"
                                        step="0.1"
                                        value={editSensor1Offset}
                                        onChange={(e) => setEditSensor1Offset(e.target.value ? parseFloat(e.target.value) : "")}
                                        className="h-11 rounded-xl border-slate-200 bg-white"
                                    />
                                    <p className="text-[10px] text-slate-500">Add/subtract (°F)</p>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="sensor2-offset" className="text-xs text-slate-600 font-semibold">Sensor 2 Offset</Label>
                                    <Input
                                        id="sensor2-offset"
                                        type="number"
                                        step="0.1"
                                        value={editSensor2Offset}
                                        onChange={(e) => setEditSensor2Offset(e.target.value ? parseFloat(e.target.value) : "")}
                                        className="h-11 rounded-xl border-slate-200 bg-white"
                                    />
                                    <p className="text-[10px] text-slate-500">Add/subtract (°F)</p>
                                </div>
                            </div>
                        </div>

                        {/* Motor Control */}
                        <div className="glass-card p-4 rounded-2xl">
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-green-500 to-teal-500 flex items-center justify-center">
                                    <RotateCw className="w-4 h-4 text-white" />
                                </div>
                                <h4 className="text-sm font-bold text-slate-900">Motor Control</h4>
                            </div>
                            <div className="space-y-3">
                                <div className="space-y-2">
                                    <Label htmlFor="motor-mode" className="text-xs text-slate-600 font-semibold">Motor Mode</Label>
                                    <select
                                        id="motor-mode"
                                        className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-900"
                                        value={editMotorMode}
                                        onChange={(e) => setEditMotorMode(parseInt(e.target.value))}
                                    >
                                        <option value={0}>Timer (Toggle ON/OFF)</option>
                                        <option value={1}>Always ON</option>
                                    </select>
                                </div>
                                {editMotorMode === 0 && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="space-y-2 bg-indigo-50/50 p-4 rounded-xl border border-indigo-100"
                                    >
                                        <Label htmlFor="timer" className="text-xs text-indigo-900 font-semibold">Timer Interval (seconds)</Label>
                                        <Input
                                            id="timer"
                                            type="number"
                                            step="1"
                                            value={editTimerSec}
                                            onChange={(e) => setEditTimerSec(e.target.value ? parseInt(e.target.value) : "")}
                                            className="h-11 rounded-xl border-indigo-200 bg-white"
                                        />
                                        <p className="text-[10px] text-indigo-600">Motor toggles every X seconds</p>
                                    </motion.div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="sticky bottom-0 p-5 bg-white border-t border-slate-100 rounded-b-3xl flex gap-3">
                        <motion.button
                            onClick={() => setIsSettingsOpen(false)}
                            whileTap={{ scale: 0.95 }}
                            className="flex-1 px-4 py-3 bg-slate-100 text-slate-700 rounded-xl font-semibold hover:bg-slate-200 transition-colors"
                        >
                            Cancel
                        </motion.button>
                        <motion.button
                            onClick={handleUpdateSettings}
                            disabled={isUpdating}
                            whileTap={{ scale: 0.95 }}
                            className="flex-1 px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all disabled:opacity-50 shadow-lg shadow-indigo-500/30"
                        >
                            {isUpdating ? "Saving..." : "Save Changes"}
                        </motion.button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Bottom Fade */}
            <div className="fixed bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[#f8fafc] to-transparent pointer-events-none z-10" />
        </div>
    );
}

export default function DeviceDetailPage() {
    return (
        <Suspense fallback={
            <div className="h-screen mesh-gradient flex items-center justify-center">
                <motion.div
                    className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600"
                    animate={{ rotate: 360, scale: [1, 1.1, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                />
            </div>
        }>
            <DeviceDetailContent />
        </Suspense>
    );
}
