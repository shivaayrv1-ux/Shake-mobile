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
  BookOpen,
  Copy,
  Check,
  Sliders,
  BatteryCharging,
  Cpu,
  Layers,
  HelpCircle,
  ExternalLink,
  Info
} from 'lucide-react';
import JSZip from 'jszip';
import { ANDROID_PROJECT_FILES, AndroidProjectFile } from './androidProjectFiles.ts';

interface LogEntry {
  id: string;
  timestamp: string;
  tag: string;
  level: 'D' | 'I' | 'W' | 'E';
  message: string;
}

export default function App() {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<'app' | 'code' | 'architecture'>('app');

  // Android Settings & Toggle States (Mirrors native PreferencesManager & Switches)
  const [isShakeEnabled, setIsShakeEnabled] = useState<boolean>(true);
  const [isVolumeUpEnabled, setIsVolumeUpEnabled] = useState<boolean>(true);
  const [shakeThreshold, setShakeThreshold] = useState<number>(13.5);
  const [cooldownRemaining, setCooldownRemaining] = useState<number>(0);

  // System & Permission States
  const [isAccessibilityGranted, setIsAccessibilityGranted] = useState<boolean>(true);
  const [isBatteryUnrestricted, setIsBatteryUnrestricted] = useState<boolean>(true);

  // Screen interactive state for simulation
  const [isScreenInteractive, setIsScreenInteractive] = useState<boolean>(true);
  const [volumeLevel, setVolumeLevel] = useState<number>(65);
  const [showVolumeSlider, setShowVolumeSlider] = useState<boolean>(false);
  const [showPreviewGuide, setShowPreviewGuide] = useState<boolean>(false);

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
      addLog('ScreenCtrlService', 'I', 'Valid shake confirmed! Screen is ON -> Invoking PowerUtils.turnScreenOff()');
      if (isAccessibilityGranted) {
        addLog('ScreenAccessService', 'I', 'performGlobalAction(GLOBAL_ACTION_LOCK_SCREEN) executed. Biometrics retained.');
        setIsScreenInteractive(false);
      } else {
        addLog('PowerUtils', 'W', 'Accessibility permission missing! Cannot invoke GLOBAL_ACTION_LOCK_SCREEN.');
      }
    } else {
      addLog('ScreenCtrlService', 'I', 'Valid shake confirmed! Screen is OFF -> Invoking PowerUtils.turnScreenOn()');
      addLog('PowerUtils', 'I', 'PowerManager.newWakeLock(SCREEN_BRIGHT_WAKE_LOCK | ACQUIRE_CAUSES_WAKEUP). Screen awakened.');
      setIsScreenInteractive(true);
    }
  };

  // Handle Volume UP Hardware Button Press
  const pressVolumeUp = () => {
    addLog('LinuxKernel', 'D', 'Hardware Key Event: KEYCODE_VOLUME_UP (ScanCode 115, Action DOWN)');

    if (!isScreenInteractive) {
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
      setIsScreenInteractive(true);
    } else {
      setVolumeLevel((prev) => Math.min(100, prev + 10));
      setShowVolumeSlider(true);
      setTimeout(() => setShowVolumeSlider(false), 2500);
      addLog('ScreenAccessService', 'D', 'Screen is interactive; KEYCODE_VOLUME_UP passed to system AudioManager (vol: ' + Math.min(100, volumeLevel + 10) + '%).');
    }
  };

  const pressPowerButton = () => {
    setIsScreenInteractive((prev) => !prev);
    addLog('PowerManager', 'I', `Physical Power Key toggled. Screen interactive: ${!isScreenInteractive}`);
  };

  const copyCode = () => {
    navigator.clipboard.writeText(selectedFile.content);
    setHasCopiedCode(true);
    setTimeout(() => setHasCopiedCode(false), 2000);
  };

  const exportProjectZip = async () => {
    try {
      setIsExportingZip(true);
      const zip = new JSZip();

      zip.file(
        'settings.gradle.kts',
        `pluginManagement {
    repositories {
        google {
            content {
                includeGroupByRegex("com\\\\.android.*")
                includeGroupByRegex("com\\\\.google.*")
                includeGroupByRegex("androidx.*")
            }
        }
        mavenCentral()
        gradlePluginPortal()
    }
}
dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
    }
}

rootProject.name = "ShakeVolumeScreenControl"
include(":app")
`
      );
      zip.file('build.gradle.kts', 'plugins {\n    alias(libs.plugins.android.application) apply false\n    alias(libs.plugins.kotlin.android) apply false\n}\n');
      zip.file('gradle.properties', 'org.gradle.jvmargs=-Xmx2048m -Dfile.encoding=UTF-8\nandroid.useAndroidX=true\nandroid.nonTransitiveRClass=true\n');
      zip.file('gradle/wrapper/gradle-wrapper.properties', 'distributionBase=GRADLE_USER_HOME\ndistributionPath=wrapper/dists\ndistributionUrl=https\\://services.gradle.org/distributions/gradle-8.10.2-bin.zip\nnetworkTimeout=10000\nvalidateDistributionUrl=true\nzipStoreBase=GRADLE_USER_HOME\nzipStorePath=wrapper/dists\n');
      zip.file('gradlew', '#!/bin/sh\nexec java -jar gradle/wrapper/gradle-wrapper.jar "$@"\n');
      zip.file('gradlew.bat', '@rem Gradle startup script for Windows\njava -jar gradle\\wrapper\\gradle-wrapper.jar %*\n');

      ANDROID_PROJECT_FILES.forEach((file) => {
        zip.file(file.path, file.content);
      });

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
              onClick={() => setActiveTab('app')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'app'
                  ? 'bg-sky-500 text-white shadow-md shadow-sky-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              Application & Sensor Engine
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

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowPreviewGuide(!showPreviewGuide)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 rounded-lg text-xs font-medium transition"
              title="How to enable Google AI Studio's built-in Mobile Device frame"
            >
              <HelpCircle className="w-3.5 h-3.5 text-sky-400" />
              <span className="hidden sm:inline">AI Studio Device View</span>
            </button>

            <button
              onClick={exportProjectZip}
              disabled={isExportingZip}
              className="flex items-center gap-2 px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 active:scale-95 text-sky-400 border border-sky-500/30 rounded-lg text-xs font-semibold transition shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              {isExportingZip ? 'Building ZIP...' : 'Export Project ZIP'}
            </button>
          </div>
        </div>
      </header>

      {/* AI Studio Interface Guide Banner */}
      {showPreviewGuide && (
        <div className="bg-sky-950/70 border-b border-sky-500/30 px-4 py-3 text-xs text-sky-200">
          <div className="max-w-7xl mx-auto flex items-start justify-between gap-4">
            <div className="flex items-start gap-2.5">
              <Info className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-white">
                  Restoring Google AI Studio&apos;s Full-Device Mobile Preview
                </p>
                <p className="mt-1 text-slate-300 leading-relaxed">
                  In Google AI Studio, the preview toolbar at the top of the right preview panel has a{' '}
                  <strong className="text-white">Mobile Device Toggle</strong> (phone icon next to Desktop). Clicking it places the application inside AI Studio&apos;s native responsive phone viewport.
                  For native Android cloud emulators (with real system Chrome and Home screen), Google AI Studio runs an Android Virtual Device session when starting from an Android workspace template.
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowPreviewGuide(false)}
              className="text-slate-400 hover:text-white px-2 py-1 text-xs"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Main Body */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 lg:p-8">
        {activeTab === 'app' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Column: The Native Application UI */}
            <div className="lg:col-span-6 flex flex-col gap-4">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5 text-sky-400" />
                  Shake & Volume Screen Control App
                </span>
                <span className="text-xs font-mono">
                  Display State:{' '}
                  <span className={isScreenInteractive ? 'text-emerald-400 font-bold' : 'text-slate-500 font-bold'}>
                    {isScreenInteractive ? 'SCREEN ON (Interactive)' : 'SCREEN OFF (Standby Lock)'}
                  </span>
                </span>
              </div>

              {/* Volume HUD Indicator */}
              {showVolumeSlider && isScreenInteractive && (
                <div className="bg-slate-900 border border-sky-500/40 rounded-xl p-3 flex items-center gap-3 animate-in fade-in duration-150">
                  <Volume2 className="w-4 h-4 text-sky-400" />
                  <div className="flex-1 bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-sky-400 h-full transition-all duration-100 rounded-full"
                      style={{ width: `${volumeLevel}%` }}
                    />
                  </div>
                  <span className="text-xs font-mono font-bold text-sky-300">{volumeLevel}%</span>
                </div>
              )}

              {/* Native App Main Card */}
              <div className="bg-[#0D121F] border border-slate-800 rounded-2xl p-5 shadow-2xl relative overflow-hidden">
                {/* Screen Off Overlay */}
                {!isScreenInteractive && (
                  <div className="absolute inset-0 bg-black/95 z-30 flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-200">
                    <div className="w-14 h-14 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 mb-3">
                      <Power className="w-6 h-6 text-slate-600" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-300">Display Standby (Screen OFF)</h3>
                    <p className="text-xs text-slate-500 mt-1 max-w-xs">
                      The phone screen is locked. Test waking it via shake gesture or Volume UP button.
                    </p>
                    <div className="mt-5 flex gap-2">
                      <button
                        onClick={() => triggerShake(17.2)}
                        className="py-2 px-4 bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-sky-500/20 transition flex items-center gap-2"
                      >
                        <Zap className="w-3.5 h-3.5" />
                        Simulate Shake to Wake
                      </button>
                      <button
                        onClick={pressVolumeUp}
                        className="py-2 px-4 bg-slate-800 hover:bg-slate-700 text-sky-400 font-semibold text-xs rounded-xl border border-slate-700 transition flex items-center gap-2"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                        Press Volume UP
                      </button>
                    </div>
                  </div>
                )}

                {/* Native App Header Bar */}
                <div className="flex items-center gap-3 pb-3 border-b border-slate-800/80 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
                    <Zap className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-base font-bold text-white tracking-tight leading-tight">
                      Shake & Volume Screen Control
                    </h2>
                    <p className="text-xs text-sky-400 font-medium">
                      Native Screen Power & Wake Engine
                    </p>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2.5 py-1 rounded-md border tracking-wider ${
                      isShakeEnabled || (isVolumeUpEnabled && isAccessibilityGranted)
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}
                  >
                    {isShakeEnabled || (isVolumeUpEnabled && isAccessibilityGranted) ? 'ONLINE' : 'STANDBY'}
                  </span>
                </div>

                {/* FEATURE 1: Shake to Turn Screen ON/OFF Card */}
                <div className="rounded-2xl bg-[#131B2A] border border-slate-800 p-4 mb-4 transition-all">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-sky-500/10 flex items-center justify-center text-sky-400">
                        <Zap className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white">Enable Shake to Wake</h3>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              isShakeEnabled ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'
                            }`}
                          />
                          <span
                            className={`text-xs font-semibold ${
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

                  <p className="text-xs text-slate-400 mt-2.5 leading-relaxed">
                    Detects shaking motion to turn the screen ON or OFF using low-power accelerometer sampling.
                  </p>

                  <div className="mt-3 bg-[#0B132B] rounded-xl px-3 py-2 flex items-center justify-between text-xs text-slate-400 border border-sky-950">
                    <span>Threshold: {shakeThreshold} m/s² (Filtered)</span>
                    <span className="text-sky-400 font-mono font-semibold">
                      Cooldown: {cooldownRemaining > 0 ? `${(cooldownRemaining / 1000).toFixed(1)}s` : '2000 ms'}
                    </span>
                  </div>
                </div>

                {/* FEATURE 2: Volume UP Button to Turn Screen ON Card */}
                <div className="rounded-2xl bg-[#131B2A] border border-slate-800 p-4 mb-4 transition-all">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-sky-500/10 flex items-center justify-center text-sky-400">
                        <Volume2 className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white">Enable Volume UP to Wake</h3>
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
                            className={`text-xs font-semibold ${
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

                  <p className="text-xs text-slate-400 mt-2.5 leading-relaxed">
                    Wakes display using physical Volume UP key via Accessibility KeyEvents while screen is dimmed or standby.
                  </p>

                  {/* Warning callout for Android OS restriction */}
                  <div className="mt-3 bg-amber-950/40 border border-amber-600/30 rounded-xl p-3 text-left">
                    <div className="flex items-center gap-1.5 text-amber-400 font-bold text-xs">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>Android OS Hardware Limitation</span>
                    </div>
                    <p className="text-[11px] text-amber-200/80 mt-1.5 leading-relaxed">
                      Android halts physical key scan matrices during deep sleep CPU suspension. Ordinary non-root user apps cannot intercept physical volume keys in deep sleep without active media playback.
                    </p>
                  </div>
                </div>

                {/* System Setup & Permissions */}
                <div className="rounded-2xl bg-[#131B2A] border border-slate-800 p-4">
                  <h3 className="text-sm font-bold text-white">System Setup &amp; Permissions</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Required for reliable background execution on stock Android:
                  </p>

                  <div className="mt-3 space-y-2.5">
                    {/* Step 1: Accessibility */}
                    <div className="flex items-center justify-between bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/80">
                      <div className="flex items-center gap-2.5">
                        <span className="w-6 h-6 rounded-md bg-sky-500/20 text-sky-300 text-xs font-bold flex items-center justify-center">
                          1
                        </span>
                        <div>
                          <div className="text-xs font-bold text-slate-200">Accessibility Service</div>
                          <div className="text-[10px] text-slate-400">
                            {isAccessibilityGranted ? 'Granted & Connected' : 'Native screen lock & key events'}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setIsAccessibilityGranted((prev) => !prev);
                          addLog(
                            'Settings',
                            'I',
                            `Accessibility Service set to ${!isAccessibilityGranted ? 'ENABLED' : 'DISABLED'}`
                          );
                        }}
                        className={`text-xs font-semibold px-3 py-1 rounded-md transition ${
                          isAccessibilityGranted
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-sky-500 hover:bg-sky-400 text-white'
                        }`}
                      >
                        {isAccessibilityGranted ? 'Granted' : 'Configure'}
                      </button>
                    </div>

                    {/* Step 2: Battery Whitelist */}
                    <div className="flex items-center justify-between bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/80">
                      <div className="flex items-center gap-2.5">
                        <span className="w-6 h-6 rounded-md bg-sky-500/20 text-sky-300 text-xs font-bold flex items-center justify-center">
                          2
                        </span>
                        <div>
                          <div className="text-xs font-bold text-slate-200">Battery Unrestricted</div>
                          <div className="text-[10px] text-slate-400">
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
                        className={`text-xs font-semibold px-3 py-1 rounded-md transition ${
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
            </div>

            {/* Right Column: Hardware Sensor & Trigger Console + Logcat */}
            <div className="lg:col-span-6 flex flex-col gap-6">
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
                      <p className="text-xs text-slate-400 mt-1">
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
                      <p className="text-xs text-slate-400 mt-1">
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
                        title="Toggle Screen Power (Lock/Wake)"
                      >
                        <Power className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Sensor Threshold Slider */}
                <div className="mt-4 pt-4 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">Shake Sensitivity:</span>
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
              <div className="rounded-2xl bg-[#0B0F17] border border-slate-800 shadow-xl overflow-hidden flex flex-col h-[320px]">
                <div className="bg-[#121722] px-4 py-2.5 border-b border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-bold font-mono text-slate-200">
                      Android Logcat Stream
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
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
                  Unzip and open directly in Android Studio.
                </p>
              </div>
            </div>

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
