"use client";

import { motion } from "framer-motion";
import { Thermometer, Droplets, Wifi, WifiOff, ChevronRight, Activity, Flame, Wind, Lightbulb } from "lucide-react";
import Link from "next/link";
import clsx from "clsx";

interface Device {
    id: string;
    device_id: string;
    model: string;
    status: string;
    last_seen: string;
    latest_telemetry?: {
        temp_c: number;
        hum_pct: number;
        primary_heater?: boolean;
        secondary_heater?: boolean;
        exhaust_fan?: boolean;
        sv_valve?: boolean;
        fan?: boolean;
        turning_motor?: boolean;
        limit_switch?: boolean;
        door_light?: boolean;
        motor_state?: string;
        uptime_s?: number;
        ip?: string;
        ts: string;
    };
}

export function MobileDeviceCard({ device, index }: { device: Device; index: number }) {
    const isOnline = new Date().getTime() - new Date(device.last_seen || 0).getTime() < 120000;
    const t = device.latest_telemetry;

    return (
        <Link href={`/devices/${device.id}`}>
            <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: index * 0.08, type: "spring", stiffness: 100 }}
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                className="glass-card p-5 rounded-2xl card-hover relative overflow-hidden"
            >
                {/* Gradient Overlay */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-indigo-500/5 to-transparent rounded-full blur-2xl pointer-events-none" />

                {/* Header */}
                <div className="flex justify-between items-start mb-4 relative z-10">
                    <div>
                        <h3 className="font-bold text-lg text-slate-900 mb-0.5">{device.model}</h3>
                        <p className="text-xs text-slate-400 font-mono tracking-wide">{device.device_id}</p>
                    </div>
                    <motion.div
                        className={clsx(
                            "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold",
                            isOnline
                                ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                                : "bg-red-50 text-red-600 border border-red-200"
                        )}
                        animate={isOnline ? { scale: [1, 1.05, 1] } : {}}
                        transition={{ duration: 2, repeat: Infinity }}
                    >
                        {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                        {isOnline ? "Online" : "Offline"}
                    </motion.div>
                </div>

                {/* Main Stats */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                    <motion.div
                        className="bg-gradient-to-br from-orange-50 to-red-50 border border-orange-100 p-4 rounded-xl flex flex-col items-center justify-center relative overflow-hidden group"
                        whileHover={{ scale: 1.02 }}
                    >
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center mb-2 shadow-md shadow-orange-500/20">
                            <Thermometer className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-3xl font-bold text-slate-900">{t?.temp_c?.toFixed(1) ?? "--"}</span>
                        <span className="text-[10px] text-slate-500 uppercase tracking-widest">°F</span>
                    </motion.div>

                    <motion.div
                        className="bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-100 p-4 rounded-xl flex flex-col items-center justify-center relative overflow-hidden group"
                        whileHover={{ scale: 1.02 }}
                    >
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center mb-2 shadow-md shadow-blue-500/20">
                            <Droplets className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-3xl font-bold text-slate-900">{t?.hum_pct?.toFixed(0) ?? "--"}</span>
                        <span className="text-[10px] text-slate-500 uppercase tracking-widest">%</span>
                    </motion.div>
                </div>

                {/* Actuator Status Grid */}
                <div className="grid grid-cols-4 gap-2 mb-4">
                    <div className={clsx(
                        "flex flex-col items-center p-2 rounded-xl text-[9px] transition-all border",
                        t?.primary_heater
                            ? "bg-orange-50 border-orange-200 text-orange-600"
                            : "bg-slate-50 border-slate-100 text-slate-400"
                    )}>
                        <Flame className={clsx("w-4 h-4 mb-1", t?.primary_heater && "text-orange-500")} />
                        <span className="font-bold">{t?.primary_heater ? "ON" : "OFF"}</span>
                        <span className="text-[8px] opacity-70">Pri Heat</span>
                    </div>
                    <div className={clsx(
                        "flex flex-col items-center p-2 rounded-xl text-[9px] transition-all border",
                        t?.secondary_heater
                            ? "bg-orange-50 border-orange-200 text-orange-600"
                            : "bg-slate-50 border-slate-100 text-slate-400"
                    )}>
                        <Flame className={clsx("w-4 h-4 mb-1", t?.secondary_heater && "text-orange-500")} />
                        <span className="font-bold">{t?.secondary_heater ? "ON" : "OFF"}</span>
                        <span className="text-[8px] opacity-70">Sec Heat</span>
                    </div>
                    <div className={clsx(
                        "flex flex-col items-center p-2 rounded-xl text-[9px] transition-all border",
                        t?.exhaust_fan
                            ? "bg-cyan-50 border-cyan-200 text-cyan-600"
                            : "bg-slate-50 border-slate-100 text-slate-400"
                    )}>
                        <Wind className={clsx("w-4 h-4 mb-1", t?.exhaust_fan && "text-cyan-500")} />
                        <span className="font-bold">{t?.exhaust_fan ? "ON" : "OFF"}</span>
                        <span className="text-[8px] opacity-70">Exhaust</span>
                    </div>
                    <div className={clsx(
                        "flex flex-col items-center p-2 rounded-xl text-[9px] transition-all border",
                        t?.fan
                            ? "bg-blue-50 border-blue-200 text-blue-600"
                            : "bg-slate-50 border-slate-100 text-slate-400"
                    )}>
                        <Wind className={clsx("w-4 h-4 mb-1", t?.fan && "text-blue-500")} />
                        <span className="font-bold">{t?.fan ? "ON" : "OFF"}</span>
                        <span className="text-[8px] opacity-70">Fan</span>
                    </div>
                </div>

                {/* Footer */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-3 text-xs text-slate-500">
                        <div className="flex items-center gap-1.5">
                            <Activity className={clsx("w-3 h-3", t?.turning_motor ? "text-purple-500" : "text-slate-400")} />
                            <span className={t?.turning_motor ? "text-purple-600" : ""}>Motor</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <Lightbulb className={clsx("w-3 h-3", t?.door_light ? "text-yellow-500" : "text-slate-400")} />
                            <span className={t?.door_light ? "text-yellow-600" : ""}>Light</span>
                        </div>
                    </div>
                    <motion.div
                        className="flex items-center text-indigo-600 font-semibold text-xs"
                        whileHover={{ x: 3 }}
                    >
                        View <ChevronRight className="w-4 h-4" />
                    </motion.div>
                </div>
            </motion.div>
        </Link>
    );
}
