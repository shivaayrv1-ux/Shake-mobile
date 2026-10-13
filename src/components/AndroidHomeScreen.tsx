import React from 'react';
import {
  Zap,
  Globe,
  Settings,
  Search,
  Camera,
  MessageSquare,
  Phone,
  Play,
  Calculator,
  Compass,
  Mic,
  Calendar,
  CloudSun
} from 'lucide-react';

interface AndroidHomeScreenProps {
  onOpenApp: (app: 'screencontrol' | 'chrome' | 'settings') => void;
  isShakeServiceRunning: boolean;
}

export const AndroidHomeScreen: React.FC<AndroidHomeScreenProps> = ({
  onOpenApp,
  isShakeServiceRunning
}) => {
  return (
    <div className="w-full h-full bg-gradient-to-b from-[#13192B] via-[#0B101D] to-[#070A12] text-slate-100 flex flex-col justify-between p-4 select-none relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-10 left-1/2 -translate-x-1/2 w-72 h-72 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top At-A-Glance Widget */}
      <div className="mt-2 space-y-1">
        <div className="flex items-center gap-2 text-slate-300 text-xs font-semibold">
          <Calendar className="w-3.5 h-3.5 text-sky-400" />
          <span>Tuesday, Oct 13</span>
        </div>
        <div className="flex items-center gap-2 text-slate-400 text-xs">
          <CloudSun className="w-3.5 h-3.5 text-amber-400" />
          <span>24°C • Mostly Sunny</span>
        </div>

        {/* Foreground Service Ongoing Notification Chip on Home Screen */}
        {isShakeServiceRunning && (
          <div
            onClick={() => onOpenApp('screencontrol')}
            className="mt-3 bg-sky-950/60 border border-sky-500/30 rounded-2xl p-2.5 flex items-center justify-between cursor-pointer hover:bg-sky-900/40 transition shadow-lg shadow-sky-950/40"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center">
                <Zap className="w-3.5 h-3.5" />
              </div>
              <div className="text-left">
                <div className="text-[11px] font-bold text-white leading-tight">
                  Shake & Volume Screen Control
                </div>
                <div className="text-[9px] text-sky-300">
                  Foreground Service Active • Low Power
                </div>
              </div>
            </div>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          </div>
        )}
      </div>

      {/* Middle: Google Search Pill */}
      <div
        onClick={() => onOpenApp('chrome')}
        className="w-full bg-[#1F2538]/90 border border-slate-700/80 rounded-full py-2.5 px-4 flex items-center justify-between shadow-xl cursor-pointer hover:border-sky-500/50 transition my-auto"
      >
        <div className="flex items-center gap-2.5 text-xs text-slate-300">
          <span className="font-bold text-sky-400 text-sm">G</span>
          <span>Search or type web address</span>
        </div>
        <div className="flex items-center gap-2 text-slate-400">
          <Mic className="w-3.5 h-3.5 hover:text-white" />
          <Camera className="w-3.5 h-3.5 hover:text-white" />
        </div>
      </div>

      {/* App Grid on Home */}
      <div className="grid grid-cols-4 gap-y-5 gap-x-3 mb-2">
        {/* APP 1: Shake & Volume Screen Control */}
        <button
          onClick={() => onOpenApp('screencontrol')}
          className="flex flex-col items-center gap-1.5 group cursor-pointer"
        >
          <div className="w-13 h-13 rounded-2xl bg-[#15233D] border border-sky-500/40 flex items-center justify-center text-sky-400 shadow-lg shadow-sky-500/20 group-hover:scale-105 group-active:scale-95 transition relative">
            <Zap className="w-6 h-6" />
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 border-2 border-[#121620] rounded-full" />
          </div>
          <span className="text-[10px] text-slate-200 font-medium text-center leading-tight">
            Screen Ctrl
          </span>
        </button>

        {/* APP 2: Google Chrome */}
        <button
          onClick={() => onOpenApp('chrome')}
          className="flex flex-col items-center gap-1.5 group cursor-pointer"
        >
          <div className="w-13 h-13 rounded-2xl bg-[#242A38] border border-slate-700 flex items-center justify-center text-white shadow-lg group-hover:scale-105 group-active:scale-95 transition relative overflow-hidden">
            {/* Chrome iconic colors */}
            <div className="w-7 h-7 rounded-full bg-blue-500 flex items-center justify-center border-2 border-white/20">
              <Globe className="w-4 h-4 text-white" />
            </div>
          </div>
          <span className="text-[10px] text-slate-200 font-medium text-center leading-tight">
            Chrome
          </span>
        </button>

        {/* APP 3: Settings */}
        <button
          onClick={() => onOpenApp('settings')}
          className="flex flex-col items-center gap-1.5 group cursor-pointer"
        >
          <div className="w-13 h-13 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 shadow-lg group-hover:scale-105 group-active:scale-95 transition">
            <Settings className="w-6 h-6" />
          </div>
          <span className="text-[10px] text-slate-200 font-medium text-center leading-tight">
            Settings
          </span>
        </button>

        {/* APP 4: Play Store */}
        <button
          onClick={() => onOpenApp('chrome')}
          className="flex flex-col items-center gap-1.5 group cursor-pointer"
        >
          <div className="w-13 h-13 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-emerald-400 shadow-lg group-hover:scale-105 group-active:scale-95 transition">
            <Play className="w-6 h-6 fill-current" />
          </div>
          <span className="text-[10px] text-slate-200 font-medium text-center leading-tight">
            Play Store
          </span>
        </button>
      </div>

      {/* Bottom Dock */}
      <div className="bg-slate-900/60 backdrop-blur-md rounded-3xl p-2.5 flex items-center justify-around border border-slate-800/80 mt-2">
        <button
          onClick={() => onOpenApp('chrome')}
          className="w-10 h-10 rounded-full bg-blue-600/30 flex items-center justify-center text-blue-400 hover:scale-105 transition"
        >
          <Phone className="w-4 h-4" />
        </button>
        <button
          onClick={() => onOpenApp('chrome')}
          className="w-10 h-10 rounded-full bg-emerald-600/30 flex items-center justify-center text-emerald-400 hover:scale-105 transition"
        >
          <MessageSquare className="w-4 h-4" />
        </button>
        {/* Chrome in Dock */}
        <button
          onClick={() => onOpenApp('chrome')}
          className="w-10 h-10 rounded-full bg-sky-500 flex items-center justify-center text-white shadow-md shadow-sky-500/30 hover:scale-105 transition"
        >
          <Globe className="w-5 h-5" />
        </button>
        <button
          onClick={() => onOpenApp('screencontrol')}
          className="w-10 h-10 rounded-full bg-sky-900/60 border border-sky-500/40 flex items-center justify-center text-sky-400 hover:scale-105 transition"
        >
          <Zap className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
