"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/axios";
import { useAuth } from "@/hooks/use-auth";
import { MobileDeviceCard } from "@/components/mobile-device-card";
import { LogOut, Search, Sparkles, Zap } from "lucide-react";
import { motion } from "framer-motion";

export default function DashboardPage() {
    const { user, logout } = useAuth();

    const { data: devices, isLoading } = useQuery({
        queryKey: ['devices'],
        queryFn: async () => {
            const res = await api.get("/devices/");
            return res.data;
        }
    });

    const onlineCount = devices?.filter((d: any) => {
        const lastSeen = new Date(d.last_seen || 0).getTime();
        return Date.now() - lastSeen < 120000;
    }).length || 0;

    return (
        <div className="min-h-screen mesh-gradient pb-24 relative overflow-hidden">
            {/* Background Glow Effects */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-indigo-400/10 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-purple-400/8 rounded-full blur-[80px] pointer-events-none" />

            {/* Header */}
            <header className="sticky top-0 z-20 glass-card mx-4 mt-4 rounded-2xl px-5 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <motion.div
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        <img src="/logo.png" alt="Logo" className="h-10 w-auto object-contain" />
                    </motion.div>
                    <div>
                        <h1 className="text-sm font-bold text-slate-900 leading-tight">My Devices</h1>
                        <p className="text-[10px] text-slate-500">Welcome, {user?.full_name?.split(" ")[0] || "User"}</p>
                    </div>
                </div>
                <motion.button
                    onClick={logout}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="p-2.5 bg-slate-100 hover:bg-red-50 rounded-xl text-slate-500 hover:text-red-500 transition-colors"
                >
                    <LogOut className="w-4 h-4" />
                </motion.button>
            </header>

            <main className="p-4 relative z-10">
                {/* Stats Cards */}
                <div className="grid grid-cols-2 gap-3 mb-6">
                    <motion.div
                        className="glass-card p-4 rounded-2xl"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                    >
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-md shadow-emerald-500/20">
                                <Zap className="w-4 h-4 text-white" />
                            </div>
                            <span className="text-xs text-slate-500">Online</span>
                        </div>
                        <p className="text-2xl font-bold text-slate-900">{onlineCount}</p>
                        <p className="text-[10px] text-emerald-600">Active Devices</p>
                    </motion.div>

                    <motion.div
                        className="glass-card p-4 rounded-2xl"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                    >
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-md shadow-indigo-500/20">
                                <Sparkles className="w-4 h-4 text-white" />
                            </div>
                            <span className="text-xs text-slate-500">Total</span>
                        </div>
                        <p className="text-2xl font-bold text-slate-900">{devices?.length || 0}</p>
                        <p className="text-[10px] text-indigo-600">Incubators</p>
                    </motion.div>
                </div>

                {/* Search */}
                <motion.div
                    className="relative mb-6"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                >
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search incubators..."
                        className="w-full bg-white border border-slate-200 rounded-xl py-3 pl-11 pr-4 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all shadow-sm"
                    />
                </motion.div>

                {/* Loading Skeleton */}
                {isLoading && (
                    <div className="flex flex-col gap-4">
                        {[1, 2, 3].map(i => (
                            <motion.div
                                key={i}
                                className="h-48 glass-card rounded-2xl shimmer"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: i * 0.1 }}
                            />
                        ))}
                    </div>
                )}

                {/* Empty State */}
                {devices && devices.length === 0 && (
                    <motion.div
                        className="text-center py-20"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                    >
                        <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center">
                            <img src="/logo.png" alt="Logo" className="w-12 h-12 object-contain opacity-50" />
                        </div>
                        <p className="text-slate-500">No devices found.</p>
                        <p className="text-xs text-slate-400 mt-1">Add your first incubator to get started</p>
                    </motion.div>
                )}

                {/* Device Cards */}
                <div className="flex flex-col gap-4">
                    {devices?.map((device: any, index: number) => (
                        <MobileDeviceCard key={device.id} device={device} index={index} />
                    ))}
                </div>
            </main>

            {/* Bottom Fade */}
            <div className="fixed bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-[#f8fafc] to-transparent pointer-events-none z-10" />
        </div>
    );
}
