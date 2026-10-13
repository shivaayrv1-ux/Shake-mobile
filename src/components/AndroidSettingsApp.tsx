import React from 'react';
import {
  ArrowLeft,
  Shield,
  Battery,
  Sliders,
  Smartphone,
  Eye,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

interface AndroidSettingsAppProps {
  onGoBack: () => void;
  isAccessibilityGranted: boolean;
  onToggleAccessibility: () => void;
  isBatteryUnrestricted: boolean;
  onToggleBattery: () => void;
}

export const AndroidSettingsApp: React.FC<AndroidSettingsAppProps> = ({
  onGoBack,
  isAccessibilityGranted,
  onToggleAccessibility,
  isBatteryUnrestricted,
  onToggleBattery
}) => {
  return (
    <div className="w-full h-full bg-[#0D111A] text-slate-100 flex flex-col font-sans select-none overflow-hidden">
      {/* Settings Top Bar */}
      <div className="bg-[#131924] px-4 py-3 border-b border-slate-800 flex items-center gap-3">
        <button
          onClick={onGoBack}
          className="p-1 rounded-full text-slate-300 hover:text-white hover:bg-slate-800 transition"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h2 className="text-sm font-bold text-white">System Settings</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-left scrollbar-thin">
        {/* Category: System Integrations */}
        <div className="space-y-2">
          <div className="text-[10px] font-bold text-sky-400 uppercase tracking-wider px-1">
            Permissions & Background Services
          </div>

          {/* Setting 1: Accessibility */}
          <div className="bg-[#151D2C] p-3.5 rounded-2xl border border-slate-800 flex items-center justify-between">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center shrink-0 mt-0.5">
                <Eye className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">Accessibility Service</h4>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Allows Shake & Volume Screen Control to lock the screen via GLOBAL_ACTION_LOCK_SCREEN.
                </p>
                <div className="flex items-center gap-1.5 mt-2">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isAccessibilityGranted ? 'bg-emerald-400' : 'bg-amber-400'
                    }`}
                  />
                  <span
                    className={`text-[10px] font-semibold ${
                      isAccessibilityGranted ? 'text-emerald-400' : 'text-amber-400'
                    }`}
                  >
                    {isAccessibilityGranted ? 'Enabled & Active' : 'Permission Required'}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={onToggleAccessibility}
              className={`text-xs px-3 py-1.5 rounded-xl font-bold transition shrink-0 ${
                isAccessibilityGranted
                  ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  : 'bg-sky-500 hover:bg-sky-400 text-white shadow-md shadow-sky-500/20'
              }`}
            >
              {isAccessibilityGranted ? 'Revoke' : 'Allow'}
            </button>
          </div>

          {/* Setting 2: Battery Unrestricted */}
          <div className="bg-[#151D2C] p-3.5 rounded-2xl border border-slate-800 flex items-center justify-between">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                <Battery className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">Battery Optimization</h4>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Exempt from Doze mode to prevent freezing the accelerometer when display powers off.
                </p>
                <div className="flex items-center gap-1.5 mt-2">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isBatteryUnrestricted ? 'bg-emerald-400' : 'bg-amber-400'
                    }`}
                  />
                  <span
                    className={`text-[10px] font-semibold ${
                      isBatteryUnrestricted ? 'text-emerald-400' : 'text-amber-400'
                    }`}
                  >
                    {isBatteryUnrestricted ? 'Unrestricted (Doze Safe)' : 'Optimized'}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={onToggleBattery}
              className={`text-xs px-3 py-1.5 rounded-xl font-bold transition shrink-0 ${
                isBatteryUnrestricted
                  ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  : 'bg-sky-500 hover:bg-sky-400 text-white shadow-md shadow-sky-500/20'
              }`}
            >
              {isBatteryUnrestricted ? 'Restore' : 'Ignore'}
            </button>
          </div>
        </div>

        {/* Device Information */}
        <div className="bg-[#151D2C] p-3 rounded-2xl border border-slate-800 space-y-1 text-xs">
          <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Device Status</div>
          <div className="flex justify-between py-1 border-b border-slate-800 text-[11px]">
            <span className="text-slate-400">Model</span>
            <span className="font-semibold text-white">Google Pixel 9 Pro</span>
          </div>
          <div className="flex justify-between py-1 border-b border-slate-800 text-[11px]">
            <span className="text-slate-400">Android Version</span>
            <span className="font-semibold text-sky-400">Android 15 (API 35)</span>
          </div>
          <div className="flex justify-between py-1 text-[11px]">
            <span className="text-slate-400">Kernel Wakeup Source</span>
            <span className="font-semibold text-emerald-400">KEY_POWER (gpio-keys)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
