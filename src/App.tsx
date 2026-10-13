import React, { useState, useEffect, useRef } from 'react';
import {
  Smartphone,
  Volume2,
  Zap,
  ShieldCheck,
  AlertTriangle,
  Terminal,
  Code2,
  Download,
  Power,
  RotateCcw,
  CheckCircle2,
  BookOpen,
  Copy,
  Check,
  Sliders,
  BatteryCharging,
  Cpu,
  Layers,
  Sparkles,
  Globe,
  Bell,
  Home,
  Square,
  ChevronLeft,
  X,
  Wifi,
  Bluetooth,
  Moon,
  ExternalLink
} from 'lucide-react';
import JSZip from 'jszip';
import { ANDROID_PROJECT_FILES, AndroidProjectFile } from './androidProjectFiles.ts';
import { ChromeBrowser } from './components/ChromeBrowser.tsx';
import { AndroidHomeScreen } from './components/AndroidHomeScreen.tsx';
import { AndroidSettingsApp } from './components/AndroidSettingsApp.tsx';

interface LogEntry {
  id: string;
  timestamp: string;
  tag: string;
  level: 'D' | 'I' | 'W' | 'E';
  message: string;
}

export default function App() {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<'device' | 'code' | 'architecture'>('device');

  // Android Settings & Toggle States (Mirrors native PreferencesManager & Switches)
  const [isShakeEnabled, setIsShakeEnabled] = useState<boolean>(true);
  const [isVolumeUpEnabled, setIsVolumeUpEnabled] = useState<boolean>(true);
  const [shakeThreshold, setShakeThreshold] = useState<number>(13.5);
  const [cooldownRemaining, setCooldownRemaining] = useState<number>(0);

  // System & Permission States
  const [isAccessibilityGranted, setIsAccessibilityGranted] = useState<boolean>(true);
  const [isBatteryUnrestricted, setIsBatteryUnrestricted] = useState<boolean>(true);

  // Phone Simulation State
  const [isScreenInteractive, setIsScreenInteractive] = useState<boolean>(true);
  const [isShakingAnim, setIsShakingAnim] = useState<boolean>(false);
  const [hapticPulse, setHapticPulse] = useState<boolean>(false);
  const [volumeLevel, setVolumeLevel] = useState<number>(65);
  const [showVolumeSlider, setShowVolumeSlider] = useState<boolean>(false);
  const [currentMobileApp, setCurrentMobileApp] = useState<'screencontrol' | 'chrome' | 'home' | 'settings' | 'recents'>('screencontrol');
  const [isNotificationShadeOpen, setIsNotificationShadeOpen] = useState<boolean>(false);

  // Code Explorer State
  const [selectedFile, setSelectedFile] = useState<AndroidProjectFile>(ANDROID_PROJECT_FILES[0]);
  const [hasCopiedCode, setHasCopiedCode] = useState<boolean>(false);
  const [isExportingZip, setIsExportingZip] = useState<boolean>(false);

  // Live Android Logcat Stream
  const [logFilter, setLogFilter] = useState<string>('ALL');
  const [logs, setLogs] = useState<LogEntry[]>([
    {
      id: '1',
      timestamp: '12:00:01.102',
      tag: 'ScreenCtrlService',
      level: 'I',
      message: 'ScreenControlForegroundService started in foreground with specialUse type.'
    },
    {
      id: '2',
      timestamp: '12:00:01.124',
      tag: 'ShakeDetector',
      level: 'D',
      message: 'Accelerometer listener registered. Threshold: 13.5 m/s², Cooldown: 2000 ms.'
    },
    {
      id: '3',
      timestamp: '12:00:01.156',
      tag: 'ScreenAccessService',
      level: 'I',
      message: 'ScreenAccessibilityService connected with FLAG_REQUEST_FILTER_KEY_EVENTS.'
    }
  ]);

  const logContainerRef = useRef<HTMLDivElement>(null);
  const cooldownTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Add Logcat helper
  const addLog = (tag: string, level: 'D' | 'I' | 'W' | 'E', message: string) => {
    const now = new Date();
    const timeStr = `${now.toTimeString().split(' ')[0]}.${String(now.getMilliseconds()).padStart(3, '0')}`;
    setLogs((prev) => [
      ...prev.slice(-99),
      {
        id: Math.random().toString(36).substring(2, 9),
        timestamp: timeStr,
        tag,
        level,
        message
      }
    ]);
  };

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  // Handle shake trigger with physics calculation & cooldown
  const triggerShake = (netMagnitude: number = 16.8) => {
    if (cooldownRemaining > 0) {
      addLog('ShakeDetector', 'D', `Shake ignored: Cooldown active (${(cooldownRemaining / 1000).toFixed(1)}s remaining).`);
      return;
    }

    setIsShakingAnim(true);
    setHapticPulse(true);
    setTimeout(() => setIsShakingAnim(false), 550);
    setTimeout(() => setHapticPulse(false), 200);

    addLog('ShakeDetector', 'D', `Accelerometer vector spike: net_acc = ${netMagnitude.toFixed(2)} m/s² (threshold: ${shakeThreshold} m/s²). Direction shifts = 2.`);

    if (!isShakeEnabled) {
      addLog('ScreenCtrlService', 'I', 'Shake recognized, but "Enable Shake to Wake" is toggled OFF. Action skipped.');
      return;
    }

    // Start 2000ms cooldown
    setCooldownRemaining(2000);
    const startTime = Date.now();
    if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current);

    cooldownTimerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const left = Math.max(0, 2000 - elapsed);
      setCooldownRemaining(left);
      if (left <= 0 && cooldownTimerRef.current) {
        clearInterval(cooldownTimerRef.current);
        cooldownTimerRef.current = null;
      }
    }, 100);

    // Screen ON/OFF Toggle
    if (isScreenInteractive) {
      // Screen is ON -> Lock / Turn OFF
      addLog('ScreenCtrlService', 'I', 'Valid shake confirmed! Screen is ON -> Invoking PowerUtils.turnScreenOff()');
      if (isAccessibilityGranted) {
        addLog('ScreenAccessService', 'I', 'performGlobalAction(GLOBAL_ACTION_LOCK_SCREEN) executed. Biometrics retained.');
        setIsScreenInteractive(false);
      } else {
        addLog('PowerUtils', 'W', 'Accessibility permission missing! Cannot invoke GLOBAL_ACTION_LOCK_SCREEN.');
      }
    } else {
      // Screen is OFF -> Wake / Turn ON
      addLog('ScreenCtrlService', 'I', 'Valid shake confirmed! Screen is OFF -> Invoking PowerUtils.turnScreenOn()');
      addLog('PowerUtils', 'I', 'PowerManager.newWakeLock(SCREEN_BRIGHT_WAKE_LOCK | ACQUIRE_CAUSES_WAKEUP). Screen awakened.');
      setIsScreenInteractive(true);
    }
  };

  // Handle Volume UP Hardware Button Press
  const pressVolumeUp = () => {
    addLog('LinuxKernel', 'D', 'Hardware Key Event: KEYCODE_VOLUME_UP (ScanCode 115, Action DOWN)');

    if (!isScreenInteractive) {
      // Screen is currently OFF
      if (!isVolumeUpEnabled) {
        addLog('ScreenAccessService', 'I', 'Volume UP pressed while screen off, but "Enable Volume UP to Wake" is DISABLED.');
        return;
      }

      if (!isAccessibilityGranted) {
        addLog('ScreenAccessService', 'W', 'Accessibility Service is not enabled. Key event was not intercepted.');
        return;
      }

      addLog('ScreenAccessService', 'I', 'onKeyEvent intercepted KEYCODE_VOLUME_UP during standby display state.');
      addLog('PowerUtils', 'I', 'WakeLock acquired via Volume UP trigger! Display illuminated.');
      setHapticPulse(true);
      setTimeout(() => setHapticPulse(false), 200);
      setIsScreenInteractive(true);
    } else {
      // Screen is ON -> standard volume step
      setVolumeLevel((prev) => Math.min(100, prev + 10));
      setShowVolumeSlider(true);
      setTimeout(() => setShowVolumeSlider(false), 2500);
      addLog('ScreenAccessService', 'D', 'Screen is interactive; KEYCODE_VOLUME_UP passed to system AudioManager (vol: ' + Math.min(100, volumeLevel + 10) + '%).');
    }
  };

  const pressVolumeDown = () => {
    if (isScreenInteractive) {
      setVolumeLevel((prev) => Math.max(0, prev - 10));
      setShowVolumeSlider(true);
      setTimeout(() => setShowVolumeSlider(false), 2500);
    }
    addLog('LinuxKernel', 'D', 'Hardware Key Event: KEYCODE_VOLUME_DOWN');
  };

  const pressPowerButton = () => {
    setHapticPulse(true);
    setTimeout(() => setHapticPulse(false), 150);
    setIsScreenInteractive((prev) => !prev);
    addLog('PowerManager', 'I', `Physical Power Key toggled. Screen interactive: ${!isScreenInteractive}`);
  };

  // Copy code helper
  const copyCode = () => {
    navigator.clipboard.writeText(selectedFile.content);
    setHasCopiedCode(true);
    setTimeout(() => setHasCopiedCode(false), 2000);
  };

  // Export full Android project as ZIP
  const exportProjectZip = async () => {
    try {
      setIsExportingZip(true);
      const zip = new JSZip();

      // Root files
      zip.file(
        'settings.gradle.kts',
        'rootProject.name = "ShakeVolumeScreenControl"\ninclude(":app")\n'
      );
      zip.file(
        'build.gradle.kts',
        'plugins {\n    alias(libs.plugins.android.application) apply false\n    alias(libs.plugins.kotlin.android) apply false\n}\n'
      );
      zip.file(
        'gradle.properties',
        'org.gradle.jvmargs=-Xmx2048m -Dfile.encoding=UTF-8\nandroid.useAndroidX=true\nandroid.nonTransitiveRClass=true\n'
      );
      zip.file(
        'gradle/libs.versions.toml',
        `[versions]
agp = "8.7.3"
kotlin = "2.0.21"
coreKtx = "1.15.0"
appcompat = "1.7.0"
material = "1.12.0"
constraintlayout = "2.2.0"
lifecycleRuntimeKtx = "2.8.7"

[libraries]
androidx-core-ktx = { group = "androidx.core", name = "core-ktx", version.ref = "coreKtx" }
androidx-appcompat = { group = "androidx.appcompat", name = "appcompat", version.ref = "appcompat" }
material = { group = "com.google.android.material", name = "material", version.ref = "material" }
androidx-constraintlayout = { group = "androidx.constraintlayout", name = "constraintlayout", version.ref = "constraintlayout" }

[plugins]
android-application = { id = "com.android.application", version.ref = "agp" }
kotlin-android = { id = "org.jetbrains.kotlin.android", version.ref = "kotlin" }`
      );

      zip.file(
        'gradle/wrapper/gradle-wrapper.properties',
        'distributionBase=GRADLE_USER_HOME\ndistributionPath=wrapper/dists\ndistributionUrl=https\\://services.gradle.org/distributions/gradle-8.10.2-bin.zip\nnetworkTimeout=10000\nvalidateDistributionUrl=true\nzipStoreBase=GRADLE_USER_HOME\nzipStorePath=wrapper/dists\n'
      );
      zip.file(
        'gradlew',
        '#!/bin/sh\n# Gradle start up script\nexec java -jar gradle/wrapper/gradle-wrapper.jar "$@"\n'
      );
      zip.file(
        'gradlew.bat',
        '@rem Gradle startup script for Windows\njava -jar gradle\\wrapper\\gradle-wrapper.jar %*\n'
      );

      // Add each configured project file
      ANDROID_PROJECT_FILES.forEach((file) => {
        zip.file(file.path, file.content);
      });

      // Generate blob
      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'ShakeVolumeScreenControl-AndroidProject.zip';
      link.click();
      URL.revokeObjectURL(url);
      addLog('ProjectExport', 'I', 'Android project ZIP archive generated and downloaded successfully.');
    } catch (e: any) {
      addLog('ProjectExport', 'E', `Failed to generate ZIP: ${e.message}`);
    } finally {
      setIsExportingZip(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070A11] text-slate-100 flex flex-col font-sans selection:bg-sky-500 selection:text-white">
      {/* Top Application Header */}
      <header className="border-b border-slate-800 bg-[#0B101D]/90 backdrop-blur sticky top-0 z-50 px-4 lg:px-8 py-3.5">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400 shadow-sm shadow-sky-500/20">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-base lg:text-lg text-white tracking-tight">
                  Shake & Volume Screen Control
                </h1>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/40">
                  Android Native • Kotlin
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Accelerometer wake engine & physical key screen management architecture
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-1.5 bg-slate-900/80 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveTab('device')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'device'
                  ? 'bg-sky-500 text-white shadow-md shadow-sky-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              Interactive Device & Testing
            </button>
            <button
              onClick={() => setActiveTab('code')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'code'
                  ? 'bg-sky-500 text-white shadow-md shadow-sky-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Code2 className="w-3.5 h-3.5" />
              Source Code & Export (.ZIP)
            </button>
            <button
              onClick={() => setActiveTab('architecture')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'architecture'
                  ? 'bg-sky-500 text-white shadow-md shadow-sky-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              OS Restrictions Analysis
            </button>
          </div>

          {/* Download ZIP button in header */}
          <button
            onClick={exportProjectZip}
            disabled={isExportingZip}
            className="hidden md:flex items-center gap-2 px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 active:scale-95 text-sky-400 border border-sky-500/30 rounded-lg text-xs font-semibold transition shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            {isExportingZip ? 'Building ZIP...' : 'Export Project ZIP'}
          </button>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 lg:p-8">
        {activeTab === 'device' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Column: Interactive Native Android Device Frame */}
            <div className="lg:col-span-5 flex flex-col items-center">
              <div className="w-full flex items-center justify-between mb-3 px-2">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5 text-sky-400" />
                  Target Device Simulator (Pixel 9 Pro / API 35)
                </span>
                <span className="text-[11px] text-slate-500">
                  Screen: {isScreenInteractive ? 'ON (Interactive)' : 'OFF (Standby Lock)'}
                </span>
              </div>

              {/* Emulator Quick App Switcher Bar */}
              <div className="w-full flex items-center justify-between gap-1 mb-3 bg-slate-900/90 p-1 rounded-xl border border-slate-800">
                <button
                  onClick={() => {
                    setIsNotificationShadeOpen(false);
                    setCurrentMobileApp('screencontrol');
                  }}
                  className={`flex-1 flex items-center justify-center gap-1 py-1 rounded-lg text-[10px] font-medium transition ${
                    currentMobileApp === 'screencontrol' && !isNotificationShadeOpen
                      ? 'bg-sky-500 text-white font-bold shadow-md shadow-sky-500/30'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <Zap className="w-3 h-3" />
                  Shake App
                </button>

                <button
                  onClick={() => {
                    setIsNotificationShadeOpen(false);
                    setCurrentMobileApp('chrome');
                  }}
                  className={`flex-1 flex items-center justify-center gap-1 py-1 rounded-lg text-[10px] font-medium transition ${
                    currentMobileApp === 'chrome' && !isNotificationShadeOpen
                      ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-600/30'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <Globe className="w-3 h-3 text-blue-400" />
                  Chrome Browser
                </button>

                <button
                  onClick={() => {
                    setIsNotificationShadeOpen(false);
                    setCurrentMobileApp('home');
                  }}
                  className={`flex-1 flex items-center justify-center gap-1 py-1 rounded-lg text-[10px] font-medium transition ${
                    currentMobileApp === 'home' && !isNotificationShadeOpen
                      ? 'bg-slate-700 text-white font-bold shadow'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <Home className="w-3 h-3" />
                  Home
                </button>

                <button
                  onClick={() => setIsNotificationShadeOpen(!isNotificationShadeOpen)}
                  className={`flex items-center justify-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium transition ${
                    isNotificationShadeOpen
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`}
                  title="Toggle Notification Shade"
                >
                  <Bell className="w-3 h-3" />
                  Shade
                </button>
              </div>

              {/* Physical Phone Frame Wrapper */}
              <div className="relative group">
                {/* Physical Hardware Buttons on Phone Frame Exterior */}
                {/* Volume Up */}
                <button
                  onClick={pressVolumeUp}
                  title="Physical Volume UP Button"
                  className="absolute -left-3.5 top-28 w-2.5 h-12 bg-slate-700 hover:bg-sky-500 active:bg-sky-400 rounded-l-md transition cursor-pointer z-20 border-l border-y border-slate-600 shadow-md"
                />
                {/* Volume Down */}
                <button
                  onClick={pressVolumeDown}
                  title="Physical Volume DOWN Button"
                  className="absolute -left-3.5 top-44 w-2.5 h-12 bg-slate-700 hover:bg-slate-600 active:bg-slate-500 rounded-l-md transition cursor-pointer z-20 border-l border-y border-slate-600 shadow-md"
                />
                {/* Power Key */}
                <button
                  onClick={pressPowerButton}
                  title="Physical Power Button (Lock/Wake)"
                  className="absolute -right-3.5 top-32 w-2.5 h-14 bg-slate-700 hover:bg-red-500 active:bg-red-400 rounded-r-md transition cursor-pointer z-20 border-r border-y border-slate-600 shadow-md"
                />

                {/* Outer Bezel */}
                <div
                  className={`w-[340px] sm:w-[380px] h-[720px] rounded-[44px] bg-[#121620] p-3 shadow-2xl border-4 transition-all duration-300 relative ${
                    hapticPulse
                      ? 'border-sky-400 shadow-sky-500/40 ring-4 ring-sky-500/20'
                      : 'border-slate-800 shadow-black/80'
                  } ${isShakingAnim ? 'animate-bounce' : ''}`}
                >
                  {/* Inner Screen Bezel */}
                  <div className="w-full h-full rounded-[34px] overflow-hidden bg-[#0B0F17] relative flex flex-col border border-slate-800/80">
                    {/* Native Screen Status Bar with pull-down notification trigger */}
                    <div
                      onClick={() => setIsNotificationShadeOpen(!isNotificationShadeOpen)}
                      className="h-7 bg-transparent px-5 flex items-center justify-between text-[11px] font-semibold text-slate-400 z-30 select-none cursor-pointer hover:bg-slate-800/40 transition"
                      title="Tap to toggle Notification Shade"
                    >
                      <div className="flex items-center gap-1.5">
                        <span>12:00</span>
                        {isShakeEnabled && (
                          <span title="Screen Control Service Active">
                            <Zap className="w-3 h-3 text-sky-400" />
                          </span>
                        )}
                      </div>
                      {/* Dynamic Camera Punch Hole */}
                      <div className="w-4 h-4 rounded-full bg-black border border-slate-800 flex items-center justify-center">
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-900" />
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-300">
                        <span className="text-[10px] font-mono">5G</span>
                        <BatteryCharging className="w-3.5 h-3.5 text-emerald-400" />
                      </div>
                    </div>

                    {/* Interactive Volume HUD Overlay */}
                    {showVolumeSlider && isScreenInteractive && (
                      <div className="absolute top-10 right-4 z-40 bg-slate-900/95 border border-sky-500/30 rounded-2xl p-2.5 shadow-2xl flex flex-col items-center gap-2 animate-in fade-in duration-150">
                        <Volume2 className="w-4 h-4 text-sky-400" />
                        <div className="w-1.5 h-20 bg-slate-800 rounded-full overflow-hidden relative">
                          <div
                            className="absolute bottom-0 w-full bg-sky-400 transition-all duration-100 rounded-full"
                            style={{ height: `${volumeLevel}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-mono text-sky-300 font-bold">{volumeLevel}%</span>
                      </div>
                    )}

                    {/* NOTIFICATION SHADE OVERLAY */}
                    {isNotificationShadeOpen && isScreenInteractive && (
                      <div className="absolute inset-x-0 top-7 bottom-0 bg-[#0B0F17]/98 backdrop-blur-md z-40 p-4 flex flex-col justify-between animate-in slide-in-from-top-4 duration-200">
                        <div className="space-y-4">
                          {/* Quick Settings Tiles */}
                          <div className="grid grid-cols-4 gap-2 pt-1">
                            <div className="bg-sky-500/20 border border-sky-500/40 p-2.5 rounded-2xl flex flex-col items-center gap-1 text-sky-300">
                              <Wifi className="w-4 h-4 text-sky-400" />
                              <span className="text-[9px] font-bold">Wi-Fi</span>
                            </div>
                            <div className="bg-slate-800 border border-slate-700 p-2.5 rounded-2xl flex flex-col items-center gap-1 text-slate-400">
                              <Bluetooth className="w-4 h-4" />
                              <span className="text-[9px] font-bold">Bluetooth</span>
                            </div>
                            <div className="bg-slate-800 border border-slate-700 p-2.5 rounded-2xl flex flex-col items-center gap-1 text-slate-400">
                              <Moon className="w-4 h-4" />
                              <span className="text-[9px] font-bold">DND</span>
                            </div>
                            <div className="bg-sky-500/20 border border-sky-500/40 p-2.5 rounded-2xl flex flex-col items-center gap-1 text-sky-300">
                              <Zap className="w-4 h-4 text-sky-400" />
                              <span className="text-[9px] font-bold">Screen Lock</span>
                            </div>
                          </div>

                          {/* Persistent Foreground Service Notification */}
                          <div className="bg-[#131B2A] border border-sky-500/30 rounded-2xl p-3 shadow-lg">
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center">
                                  <Zap className="w-3.5 h-3.5" />
                                </div>
                                <div>
                                  <div className="text-[11px] font-bold text-white flex items-center gap-1.5">
                                    <span>Shake &amp; Volume Screen Control</span>
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                  </div>
                                  <div className="text-[9px] text-slate-400">
                                    Foreground Service • SENSOR_DELAY_UI
                                  </div>
                                </div>
                              </div>
                              <span className="text-[9px] text-slate-500">ongoing</span>
                            </div>

                            <p className="text-[10px] text-slate-300 mt-2">
                              Monitoring accelerometer motion in background. Cooldown:{' '}
                              {cooldownRemaining > 0 ? `${(cooldownRemaining / 1000).toFixed(1)}s` : 'Ready'}.
                            </p>

                            <div className="flex items-center gap-2 mt-3 pt-2 border-t border-slate-800">
                              <button
                                onClick={() => {
                                  setCurrentMobileApp('screencontrol');
                                  setIsNotificationShadeOpen(false);
                                }}
                                className="text-[10px] bg-sky-500 hover:bg-sky-400 text-white font-bold px-3 py-1 rounded-lg transition"
                              >
                                Open App Settings
                              </button>
                              <button
                                onClick={() => {
                                  setIsShakeEnabled(!isShakeEnabled);
                                  addLog(
                                    'ScreenCtrlService',
                                    'I',
                                    `Service toggled from notification: ${!isShakeEnabled ? 'ENABLED' : 'DISABLED'}`
                                  );
                                }}
                                className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold px-3 py-1 rounded-lg border border-slate-700 transition"
                              >
                                {isShakeEnabled ? 'Pause Service' : 'Resume Service'}
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Close Shade Handle */}
                        <div
                          onClick={() => setIsNotificationShadeOpen(false)}
                          className="pt-2 flex flex-col items-center cursor-pointer text-slate-500 hover:text-white"
                        >
                          <div className="w-10 h-1 bg-slate-600 rounded-full mb-1" />
                          <span className="text-[9px]">Tap to close drawer</span>
                        </div>
                      </div>
                    )}

                    {/* SCREEN CONTENT LAYER */}
                    {!isScreenInteractive ? (
                      /* SCREEN OFF (STANDBY / LOCKED STATE) */
                      <div className="flex-1 bg-black flex flex-col items-center justify-center px-6 text-center select-none relative animate-in fade-in duration-300">
                        <div className="w-14 h-14 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 mb-4">
                          <Power className="w-6 h-6 text-slate-600" />
                        </div>
                        <h3 className="text-sm font-bold text-slate-400">Screen Standby (Screen OFF)</h3>
                        <p className="text-xs text-slate-600 mt-1 max-w-[220px]">
                          Device is locked. Shake the phone or press Volume UP (standby) to test screen wake lock.
                        </p>
                        <div className="mt-6 flex flex-col gap-2 w-full max-w-[200px]">
                          <button
                            onClick={() => triggerShake(17.2)}
                            className="w-full py-2 bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-sky-500/20 transition flex items-center justify-center gap-2"
                          >
                            <Zap className="w-3.5 h-3.5" />
                            Simulate Shake to Wake
                          </button>
                          <button
                            onClick={pressVolumeUp}
                            className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-sky-400 font-semibold text-xs rounded-xl border border-slate-700 transition flex items-center justify-center gap-2"
                          >
                            <Volume2 className="w-3.5 h-3.5" />
                            Press Volume UP
                          </button>
                        </div>
                      </div>
                    ) : currentMobileApp === 'chrome' ? (
                      /* CHROME BROWSER APP */
                      <ChromeBrowser
                        onGoHome={() => setCurrentMobileApp('home')}
                        onOpenScreenControl={() => setCurrentMobileApp('screencontrol')}
                      />
                    ) : currentMobileApp === 'home' ? (
                      /* ANDROID HOME SCREEN */
                      <AndroidHomeScreen
                        onOpenApp={(app) => setCurrentMobileApp(app)}
                        isShakeServiceRunning={isShakeEnabled}
                      />
                    ) : currentMobileApp === 'settings' ? (
                      /* ANDROID SETTINGS APP */
                      <AndroidSettingsApp
                        onGoBack={() => setCurrentMobileApp('home')}
                        isAccessibilityGranted={isAccessibilityGranted}
                        onToggleAccessibility={() => setIsAccessibilityGranted(!isAccessibilityGranted)}
                        isBatteryUnrestricted={isBatteryUnrestricted}
                        onToggleBattery={() => setIsBatteryUnrestricted(!isBatteryUnrestricted)}
                      />
                    ) : currentMobileApp === 'recents' ? (
                      /* ANDROID RECENTS APP SWITCHER */
                      <div className="flex-1 bg-[#090D15] p-4 flex flex-col justify-between select-none">
                        <div className="text-center pt-2">
                          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                            Recent Applications
                          </span>
                        </div>

                        <div className="flex items-center justify-center gap-3 my-auto overflow-x-auto py-2">
                          {/* Card 1: Shake & Volume Screen Control */}
                          <div
                            onClick={() => setCurrentMobileApp('screencontrol')}
                            className="w-36 h-56 bg-[#131B2A] border-2 border-sky-500/50 rounded-2xl p-2.5 flex flex-col justify-between cursor-pointer hover:scale-105 transition shadow-xl"
                          >
                            <div className="flex items-center gap-1.5">
                              <Zap className="w-3.5 h-3.5 text-sky-400" />
                              <span className="text-[10px] font-bold text-white truncate">Screen Control</span>
                            </div>
                            <div className="flex-1 my-2 bg-slate-900 rounded-lg p-2 text-[9px] text-slate-400 flex flex-col justify-center items-center text-center">
                              <span className="text-emerald-400 font-bold mb-1">● Service Active</span>
                              <span>Shake to Wake &amp; Lock</span>
                            </div>
                            <button className="w-full py-1 bg-sky-500 text-white rounded-lg text-[9px] font-bold">
                              Switch
                            </button>
                          </div>

                          {/* Card 2: Google Chrome */}
                          <div
                            onClick={() => setCurrentMobileApp('chrome')}
                            className="w-36 h-56 bg-[#1F2228] border-2 border-slate-700 rounded-2xl p-2.5 flex flex-col justify-between cursor-pointer hover:scale-105 transition shadow-xl"
                          >
                            <div className="flex items-center gap-1.5">
                              <Globe className="w-3.5 h-3.5 text-blue-400" />
                              <span className="text-[10px] font-bold text-white truncate">Chrome</span>
                            </div>
                            <div className="flex-1 my-2 bg-slate-900 rounded-lg p-2 text-[9px] text-slate-400 flex flex-col justify-center items-center text-center">
                              <span className="text-blue-400 font-bold mb-1">Google Search</span>
                              <span>Mobile Web Browser</span>
                            </div>
                            <button className="w-full py-1 bg-blue-600 text-white rounded-lg text-[9px] font-bold">
                              Switch
                            </button>
                          </div>
                        </div>

                        <div className="flex justify-center pb-2">
                          <button
                            onClick={() => setCurrentMobileApp('home')}
                            className="text-[10px] text-slate-400 hover:text-white px-3 py-1 rounded-full bg-slate-800/60"
                          >
                            Clear All Recents
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* SHAKE & VOLUME SCREEN CONTROL NATIVE APP */
                      <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-4 text-left select-none scrollbar-none">
                        {/* Native App Header Bar */}
                        <div className="flex items-center gap-3 pb-1 border-b border-slate-800/60">
                          <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
                            <Zap className="w-5 h-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h2 className="text-sm font-bold text-white tracking-tight leading-tight truncate">
                              Shake &amp; Volume Screen Control
                            </h2>
                            <p className="text-[10px] text-sky-400 font-medium">
                              Native Screen Power &amp; Wake Engine
                            </p>
                          </div>
                          <span
                            className={`text-[9px] font-bold px-2 py-0.5 rounded-md border tracking-wider ${
                              isShakeEnabled || (isVolumeUpEnabled && isAccessibilityGranted)
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                : 'bg-slate-800 text-slate-400 border-slate-700'
                            }`}
                          >
                            {isShakeEnabled || (isVolumeUpEnabled && isAccessibilityGranted) ? 'ONLINE' : 'STANDBY'}
                          </span>
                        </div>

                        {/* FEATURE 1 CARD: Shake to Turn Screen ON/OFF */}
                        <div className="rounded-2xl bg-[#131B2A] border border-slate-800 p-4 transition-all">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-lg bg-sky-500/10 flex items-center justify-center text-sky-400">
                                <Zap className="w-4 h-4" />
                              </div>
                              <div>
                                <h3 className="text-xs font-bold text-white">Enable Shake to Wake</h3>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <span
                                    className={`w-2 h-2 rounded-full ${
                                      isShakeEnabled ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'
                                    }`}
                                  />
                                  <span
                                    className={`text-[11px] font-semibold ${
                                      isShakeEnabled ? 'text-emerald-400' : 'text-slate-500'
                                    }`}
                                  >
                                    {isShakeEnabled ? 'Active & Monitoring' : 'Disabled'}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Switch 1: Shake to Wake */}
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={isShakeEnabled}
                                onChange={(e) => {
                                  setIsShakeEnabled(e.target.checked);
                                  addLog(
                                    'MainActivity',
                                    'I',
                                    `Toggle: Shake to Wake is now ${e.target.checked ? 'ENABLED' : 'DISABLED'}`
                                  );
                                }}
                                className="sr-only peer"
                              />
                              <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-500 border border-slate-700" />
                            </label>
                          </div>

                          <p className="text-[11px] text-slate-400 mt-2.5 leading-relaxed">
                            Detects shaking motion to turn the screen ON or OFF using low-power accelerometer sampling.
                          </p>

                          {/* Technical status strip */}
                          <div className="mt-3 bg-[#0B132B] rounded-lg px-2.5 py-1.5 flex items-center justify-between text-[10px] text-slate-400 border border-sky-950">
                            <span>Threshold: {shakeThreshold} m/s²</span>
                            <span className="text-sky-400 font-mono">
                              Cooldown: {cooldownRemaining > 0 ? `${(cooldownRemaining / 1000).toFixed(1)}s` : '2000 ms'}
                            </span>
                          </div>
                        </div>

                        {/* FEATURE 2 CARD: Volume UP Button to Turn Screen ON */}
                        <div className="rounded-2xl bg-[#131B2A] border border-slate-800 p-4 transition-all">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-lg bg-sky-500/10 flex items-center justify-center text-sky-400">
                                <Volume2 className="w-4 h-4" />
                              </div>
                              <div>
                                <h3 className="text-xs font-bold text-white">Enable Volume UP to Wake</h3>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <span
                                    className={`w-2 h-2 rounded-full ${
                                      !isVolumeUpEnabled
                                        ? 'bg-slate-600'
                                        : !isAccessibilityGranted
                                        ? 'bg-amber-400'
                                        : 'bg-emerald-400 animate-pulse'
                                    }`}
                                  />
                                  <span
                                    className={`text-[11px] font-semibold ${
                                      !isVolumeUpEnabled
                                        ? 'text-slate-500'
                                        : !isAccessibilityGranted
                                        ? 'text-amber-400'
                                        : 'text-emerald-400'
                                    }`}
                                  >
                                    {!isVolumeUpEnabled
                                      ? 'Disabled'
                                      : !isAccessibilityGranted
                                      ? 'Setup Required'
                                      : 'Active (Screen Standby)'}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Switch 2: Volume UP to Wake */}
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={isVolumeUpEnabled}
                                onChange={(e) => {
                                  setIsVolumeUpEnabled(e.target.checked);
                                  addLog(
                                    'MainActivity',
                                    'I',
                                    `Toggle: Volume UP to Wake is now ${e.target.checked ? 'ENABLED' : 'DISABLED'}`
                                  );
                                }}
                                className="sr-only peer"
                              />
                              <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-500 border border-slate-700" />
                            </label>
                          </div>

                          <p className="text-[11px] text-slate-400 mt-2.5 leading-relaxed">
                            Wakes display using physical Volume UP key via Accessibility KeyEvents while screen is dimmed or standby.
                          </p>

                          {/* Warning callout for Android OS restriction */}
                          <div className="mt-3 bg-amber-950/40 border border-amber-600/30 rounded-xl p-2.5 text-left">
                            <div className="flex items-center gap-1.5 text-amber-400 font-bold text-[11px]">
                              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                              <span>Android OS Hardware Limitation</span>
                            </div>
                            <p className="text-[10px] text-amber-200/80 mt-1 leading-normal">
                              Android cuts power to key scanning during deep sleep. Normal user apps cannot wake an unrooted phone from deep sleep via physical volume buttons without active media playback.
                            </p>
                          </div>
                        </div>

                        {/* SYSTEM SETUP & PERMISSIONS CARD */}
                        <div className="rounded-2xl bg-[#131B2A] border border-slate-800 p-4">
                          <h3 className="text-xs font-bold text-white">System Setup &amp; Permissions</h3>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            Required for reliable background execution:
                          </p>

                          <div className="mt-3 space-y-2.5">
                            {/* Step 1: Accessibility */}
                            <div className="flex items-center justify-between bg-slate-900/60 p-2 rounded-xl border border-slate-800/80">
                              <div className="flex items-center gap-2">
                                <span className="w-5 h-5 rounded-md bg-sky-500/20 text-sky-300 text-[10px] font-bold flex items-center justify-center">
                                  1
                                </span>
                                <div>
                                  <div className="text-[11px] font-bold text-slate-200">Accessibility Service</div>
                                  <div className="text-[9px] text-slate-400">
                                    {isAccessibilityGranted ? 'Granted & Connected' : 'Screen lock & key observation'}
                                  </div>
                                </div>
                              </div>
                              <button
                                onClick={() => {
                                  setIsAccessibilityGranted((prev) => !prev);
                                  addLog(
                                    'Settings',
                                    'I',
                                    `Accessibility Service toggled to ${!isAccessibilityGranted ? 'ENABLED' : 'DISABLED'}`
                                  );
                                }}
                                className={`text-[10px] font-semibold px-2.5 py-1 rounded-md transition ${
                                  isAccessibilityGranted
                                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                    : 'bg-sky-500 hover:bg-sky-400 text-white'
                                }`}
                              >
                                {isAccessibilityGranted ? 'Granted' : 'Configure'}
                              </button>
                            </div>

                            {/* Step 2: Battery Whitelist */}
                            <div className="flex items-center justify-between bg-slate-900/60 p-2 rounded-xl border border-slate-800/80">
                              <div className="flex items-center gap-2">
                                <span className="w-5 h-5 rounded-md bg-sky-500/20 text-sky-300 text-[10px] font-bold flex items-center justify-center">
                                  2
                                </span>
                                <div>
                                  <div className="text-[11px] font-bold text-slate-200">Battery Unrestricted</div>
                                  <div className="text-[9px] text-slate-400">
                                    {isBatteryUnrestricted ? 'Unrestricted (Doze Safe)' : 'Prevents Doze sensor freeze'}
                                  </div>
                                </div>
                              </div>
                              <button
                                onClick={() => {
                                  setIsBatteryUnrestricted((prev) => !prev);
                                  addLog(
                                    'PowerManager',
                                    'I',
                                    `Battery optimization whitelist set to ${!isBatteryUnrestricted ? 'IGNORED' : 'OPTIMIZED'}`
                                  );
                                }}
                                className={`text-[10px] font-semibold px-2.5 py-1 rounded-md transition ${
                                  isBatteryUnrestricted
                                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                    : 'bg-sky-500 hover:bg-sky-400 text-white'
                                }`}
                              >
                                {isBatteryUnrestricted ? 'Granted' : 'Configure'}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* NATIVE ANDROID 3-BUTTON NAVIGATION BAR */}
                    <div className="h-9 bg-[#090D15] border-t border-slate-800/80 px-6 flex items-center justify-between text-slate-400">
                      {/* Back button */}
                      <button
                        onClick={() => {
                          if (isNotificationShadeOpen) setIsNotificationShadeOpen(false);
                          else if (currentMobileApp !== 'home') setCurrentMobileApp('home');
                        }}
                        className="p-1 hover:text-white transition active:scale-90"
                        title="Back Button"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>

                      {/* Home button */}
                      <button
                        onClick={() => {
                          setIsNotificationShadeOpen(false);
                          setCurrentMobileApp('home');
                        }}
                        className="p-1 hover:text-white transition active:scale-90"
                        title="Home Button"
                      >
                        <div className="w-3.5 h-3.5 rounded-full border-2 border-current" />
                      </button>

                      {/* Recents button */}
                      <button
                        onClick={() => {
                          setIsNotificationShadeOpen(false);
                          setCurrentMobileApp(currentMobileApp === 'recents' ? 'screencontrol' : 'recents');
                        }}
                        className="p-1 hover:text-white transition active:scale-90"
                        title="Recents / App Switcher"
                      >
                        <Square className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Native Android Gesture Bar */}
                    <div className="h-4 bg-transparent flex items-center justify-center">
                      <div className="w-28 h-1 bg-slate-600 rounded-full" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Hardware Simulation Controls & Live Logcat */}
            <div className="lg:col-span-7 flex flex-col gap-6">
              {/* Simulation Testing Control Panel */}
              <div className="rounded-2xl bg-[#0F1422] border border-slate-800 p-5 shadow-xl">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-sky-400" />
                    <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                      Hardware Sensor & Trigger Console
                    </h2>
                  </div>
                  <span className="text-xs font-mono text-slate-400">
                    Status: <span className="text-emerald-400 font-bold">READY</span>
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Action 1: Shake Simulation Button */}
                  <div className="bg-[#141B2D] p-4 rounded-xl border border-slate-800/80 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-200">Trigger Shake Motion</span>
                        {cooldownRemaining > 0 && (
                          <span className="text-[10px] font-mono font-bold text-amber-400 px-1.5 py-0.5 rounded bg-amber-950/60 border border-amber-800">
                            Cooldown: {(cooldownRemaining / 1000).toFixed(1)}s
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Generates a simulated 3-axis accelerometer spike exceeding the threshold.
                      </p>
                    </div>

                    <div className="mt-4 flex gap-2">
                      <button
                        onClick={() => triggerShake(17.5)}
                        disabled={cooldownRemaining > 0}
                        className={`flex-1 py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition ${
                          cooldownRemaining > 0
                            ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                            : 'bg-sky-500 hover:bg-sky-400 text-white shadow-lg shadow-sky-500/25 active:scale-95'
                        }`}
                      >
                        <Zap className="w-4 h-4" />
                        Shake Phone ({isScreenInteractive ? 'Locks Screen' : 'Wakes Screen'})
                      </button>
                    </div>
                  </div>

                  {/* Action 2: Volume UP Key Trigger */}
                  <div className="bg-[#141B2D] p-4 rounded-xl border border-slate-800/80 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-200">Hardware Volume UP Key</span>
                        <span className="text-[10px] font-mono text-sky-400">KEYCODE_VOLUME_UP</span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Fires key event to test AccessibilityService interception in standby vs deep sleep.
                      </p>
                    </div>

                    <div className="mt-4 flex gap-2">
                      <button
                        onClick={pressVolumeUp}
                        className="flex-1 py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-sky-400 border border-sky-500/30 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition active:scale-95"
                      >
                        <Volume2 className="w-4 h-4" />
                        Press Volume UP
                      </button>
                      <button
                        onClick={pressPowerButton}
                        className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-xl font-bold text-xs flex items-center justify-center transition active:scale-95"
                        title="Toggle Screen Power"
                      >
                        <Power className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Sensor Threshold Slider */}
                <div className="mt-4 pt-4 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">Accelerometer Shake Sensitivity:</span>
                    <span className="font-mono text-sky-400 font-bold">{shakeThreshold.toFixed(1)} m/s²</span>
                    <span className="text-[10px] text-slate-500">
                      (Default: 13.5 m/s² prevents pocket false-triggers)
                    </span>
                  </div>
                  <input
                    type="range"
                    min="9.0"
                    max="25.0"
                    step="0.5"
                    value={shakeThreshold}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setShakeThreshold(val);
                      addLog('ShakeDetector', 'D', `Internal shake threshold updated to ${val.toFixed(1)} m/s²`);
                    }}
                    className="w-full sm:w-48 accent-sky-500 cursor-pointer"
                  />
                </div>
              </div>

              {/* Live Android Logcat Console */}
              <div className="rounded-2xl bg-[#0B0F17] border border-slate-800 shadow-xl overflow-hidden flex flex-col h-[340px]">
                {/* Console Header */}
                <div className="bg-[#121722] px-4 py-2.5 border-b border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-bold font-mono text-slate-200">
                      Android Logcat Stream (adb logcat -s ShakeDetector:D ScreenCtrlService:I ScreenAccessService:I)
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Log Filter Pills */}
                    <div className="flex bg-slate-900 rounded-lg p-0.5 border border-slate-800 text-[10px] font-mono">
                      {['ALL', 'ShakeDetector', 'ScreenAccessService', 'PowerUtils'].map((tag) => (
                        <button
                          key={tag}
                          onClick={() => setLogFilter(tag)}
                          className={`px-2 py-0.5 rounded transition ${
                            logFilter === tag ? 'bg-sky-500 text-white font-bold' : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          {tag}
                        </button>
                      ))}
                    </div>

                    <button
                      onClick={() => setLogs([])}
                      className="text-slate-400 hover:text-slate-200 p-1 hover:bg-slate-800 rounded transition"
                      title="Clear logs"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Log stream content */}
                <div
                  ref={logContainerRef}
                  className="flex-1 p-3 font-mono text-[11px] overflow-y-auto space-y-1.5 scrollbar-thin select-text"
                >
                  {logs
                    .filter((log) => logFilter === 'ALL' || log.tag === logFilter)
                    .map((log) => {
                      const levelColor =
                        log.level === 'E'
                          ? 'text-red-400'
                          : log.level === 'W'
                          ? 'text-amber-400'
                          : log.level === 'I'
                          ? 'text-sky-400'
                          : 'text-emerald-400';

                      return (
                        <div key={log.id} className="flex items-start gap-2 leading-relaxed hover:bg-slate-900/40 p-0.5 rounded">
                          <span className="text-slate-500 shrink-0">{log.timestamp}</span>
                          <span className={`font-bold shrink-0 ${levelColor}`}>
                            {log.level}/{log.tag}:
                          </span>
                          <span className="text-slate-300 break-all">{log.message}</span>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Source Code Explorer & Downloader */}
        {activeTab === 'code' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* File List Navigation */}
            <div className="lg:col-span-4 bg-[#0F1422] border border-slate-800 rounded-2xl p-4 shadow-xl">
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-sky-400" />
                  Android Project Source
                </span>
                <span className="text-[11px] text-slate-400">{ANDROID_PROJECT_FILES.length} files</span>
              </div>

              <div className="space-y-1 max-h-[560px] overflow-y-auto pr-1">
                {ANDROID_PROJECT_FILES.map((file) => {
                  const isSelected = selectedFile.path === file.path;
                  return (
                    <button
                      key={file.path}
                      onClick={() => setSelectedFile(file)}
                      className={`w-full text-left p-2.5 rounded-xl text-xs transition flex flex-col gap-1 ${
                        isSelected
                          ? 'bg-sky-500/15 border border-sky-500/40 text-white'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="font-bold font-mono text-slate-200 truncate">{file.name}</span>
                        <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-slate-800 text-sky-400 font-mono">
                          {file.type}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-500 truncate">{file.path}</span>
                    </button>
                  );
                })}
              </div>

              {/* Download ZIP button */}
              <div className="mt-4 pt-3 border-t border-slate-800">
                <button
                  onClick={exportProjectZip}
                  disabled={isExportingZip}
                  className="w-full py-2.5 bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs rounded-xl shadow-lg shadow-sky-500/25 flex items-center justify-center gap-2 transition"
                >
                  <Download className="w-4 h-4" />
                  {isExportingZip ? 'Packaging ZIP...' : 'Download Full Android Project (.ZIP)'}
                </button>
                <p className="text-[10px] text-slate-500 text-center mt-2">
                  Unzip and open directly in Android Studio Ladybug/Koala.
                </p>
              </div>
            </div>

            {/* Code Viewer Panel */}
            <div className="lg:col-span-8 bg-[#0B0F17] border border-slate-800 rounded-2xl shadow-xl overflow-hidden flex flex-col">
              <div className="bg-[#121722] px-4 py-3 border-b border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold font-mono text-white flex items-center gap-2">
                    <Code2 className="w-4 h-4 text-sky-400" />
                    {selectedFile.path}
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">{selectedFile.description}</p>
                </div>

                <button
                  onClick={copyCode}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition"
                >
                  {hasCopiedCode ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Code</span>
                    </>
                  )}
                </button>
              </div>

              {/* Syntax / Code content */}
              <pre className="p-4 font-mono text-xs text-slate-200 overflow-x-auto max-h-[580px] overflow-y-auto leading-relaxed select-text scrollbar-thin">
                <code>{selectedFile.content}</code>
              </pre>
            </div>
          </div>
        )}

        {/* TAB 3: Android Platform Restrictions & Architecture Deep-Dive */}
        {activeTab === 'architecture' && (
          <div className="space-y-6 max-w-4xl mx-auto">
            <div className="rounded-2xl bg-[#0F1422] border border-slate-800 p-6 shadow-xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">
                    Android Platform Restrictions & Technical Feasibility
                  </h2>
                  <p className="text-xs text-slate-400">
                    Detailed architectural investigation of Screen Locking, WakeLocks, and Hardware Key HAL
                  </p>
                </div>
              </div>

              <div className="space-y-6 text-xs text-slate-300 leading-relaxed">
                {/* Feature 1 Deep Dive */}
                <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
                  <h3 className="text-sm font-bold text-sky-400 flex items-center gap-2">
                    <Zap className="w-4 h-4" />
                    Feature 1: Shake to Turn Screen ON & OFF
                  </h3>
                  <div className="mt-3 space-y-2.5">
                    <div>
                      <strong className="text-white">Turning Screen OFF (Software Lock):</strong>
                      <p className="text-slate-400 mt-0.5">
                        Starting in Android 9.0 (API 28), Google provided{' '}
                        <code className="text-sky-300 bg-slate-800 px-1 py-0.5 rounded">
                          AccessibilityService.performGlobalAction(GLOBAL_ACTION_LOCK_SCREEN)
                        </code>
                        . This is the legitimate, official method. Unlike legacy{' '}
                        <code className="text-amber-300 bg-slate-800 px-1 py-0.5 rounded">
                          DevicePolicyManager.lockNow()
                        </code>
                        , it locks the screen <em>without</em> breaking biometric authentication (fingerprint/face
                        unlock continue to work immediately).
                      </p>
                    </div>

                    <div>
                      <strong className="text-white">Turning Screen ON (WakeLock):</strong>
                      <p className="text-slate-400 mt-0.5">
                        Waking the screen uses{' '}
                        <code className="text-sky-300 bg-slate-800 px-1 py-0.5 rounded">
                          PowerManager.newWakeLock(SCREEN_BRIGHT_WAKE_LOCK | ACQUIRE_CAUSES_WAKEUP)
                        </code>
                        . Our implementation guarantees safety by releasing the lock within 3000ms, preventing battery
                        leaks.
                      </p>
                    </div>

                    <div>
                      <strong className="text-white">Keeping Accelerometer Alive in Deep Sleep:</strong>
                      <p className="text-slate-400 mt-0.5">
                        When the display turns off, standard background apps have their sensor listeners frozen by
                        Doze mode. To guarantee reliable shake detection without root, the app runs a Foreground
                        Service with a low-power <code className="text-sky-300 bg-slate-800 px-1 py-0.5 rounded">PARTIAL_WAKE_LOCK</code> and queries hardware wake-up sensors (
                        <code className="text-sky-300 bg-slate-800 px-1 py-0.5 rounded">sensor.isWakeUpSensor</code>).
                      </p>
                    </div>
                  </div>
                </div>

                {/* Feature 2 Deep Dive */}
                <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-500/30">
                  <h3 className="text-sm font-bold text-amber-400 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    Feature 2: Volume UP Button to Wake Screen (OS Limitation Analysis)
                  </h3>
                  <div className="mt-3 space-y-2.5">
                    <div>
                      <strong className="text-white">Why Android Blocks Screen-Off Volume Button Wake:</strong>
                      <p className="text-slate-400 mt-0.5">
                        In the Linux kernel layer powering Android devices, physical buttons are controlled via{' '}
                        <code className="text-amber-300 bg-slate-800 px-1 py-0.5 rounded">gpio-keys</code> drivers.
                        When the screen powers off and the CPU enters deep sleep, power to physical key matrices is
                        halted. Only the physical Power button (and in some phones, the fingerprint sensor) is wired as
                        a hardware wakeup interrupt source (<code className="text-amber-300 bg-slate-800 px-1 py-0.5 rounded">wakeup-source</code>).
                      </p>
                    </div>

                    <div>
                      <strong className="text-white">What is Legitimate on Stock Android:</strong>
                      <p className="text-slate-400 mt-0.5">
                        An Accessibility Service can intercept{' '}
                        <code className="text-sky-300 bg-slate-800 px-1 py-0.5 rounded">KeyEvent.KEYCODE_VOLUME_UP</code>{' '}
                        whenever key events are delivered: during interactive use, ambient display standby, or when
                        an active media session keeps the audio HAL awake.
                      </p>
                    </div>

                    <div>
                      <strong className="text-white">Honest Engineering Verdict:</strong>
                      <p className="text-slate-400 mt-0.5">
                        No non-rooted Android app on Google Play can wake an arbitrary device from deep sleep using
                        volume keys alone without custom OEM ROM features (like Samsung/LineageOS custom settings) or
                        kernel-level key remapping. We implement the maximum legitimate API interception and clearly
                        warn the user in the UI.
                      </p>
                    </div>
                  </div>
                </div>

                {/* How to Build & Install Guide */}
                <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-sky-400" />
                    Building & Running the Native APK
                  </h3>
                  <div className="mt-3 space-y-2 font-mono text-[11px] bg-black/60 p-3 rounded-lg border border-slate-800">
                    <p className="text-slate-400"># 1. Clone or extract the project</p>
                    <p className="text-sky-300">cd android</p>
                    <p className="text-slate-400 mt-1"># 2. Build the Debug APK using Gradle</p>
                    <p className="text-sky-300">./gradlew assembleDebug</p>
                    <p className="text-slate-400 mt-1"># 3. Install to connected device via ADB</p>
                    <p className="text-sky-300">adb install -r app/build/outputs/apk/debug/app-debug.apk</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-[#070A11] py-4 px-6 text-center text-xs text-slate-500">
        <span>Shake &amp; Volume Screen Control • Production-Grade Native Android (Kotlin + XML) Engine</span>
      </footer>
    </div>
  );
}
