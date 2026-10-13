import React, { useState } from 'react';
import {
  Globe,
  Search,
  ArrowLeft,
  ArrowRight,
  RotateCw,
  Home,
  Plus,
  Lock,
  ExternalLink,
  BookOpen,
  Code,
  Sparkles,
  Share2,
  Bookmark
} from 'lucide-react';

interface ChromeBrowserProps {
  onGoHome: () => void;
  onOpenScreenControl: () => void;
}

export const ChromeBrowser: React.FC<ChromeBrowserProps> = ({ onGoHome, onOpenScreenControl }) => {
  const [urlInput, setUrlInput] = useState<string>('https://google.com');
  const [currentUrl, setCurrentUrl] = useState<string>('https://google.com');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeSite, setActiveSite] = useState<'home' | 'search' | 'wikipedia' | 'android' | 'github'>('home');
  const [tabCount, setTabCount] = useState<number>(3);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const quickLinks = [
    {
      name: 'Google',
      icon: 'G',
      color: 'bg-red-500',
      action: () => {
        setActiveSite('home');
        setCurrentUrl('https://google.com');
        setUrlInput('https://google.com');
      }
    },
    {
      name: 'Android Dev',
      icon: '🤖',
      color: 'bg-emerald-600',
      action: () => {
        setActiveSite('android');
        setCurrentUrl('https://developer.android.com');
        setUrlInput('https://developer.android.com/reference/android/hardware/SensorManager');
      }
    },
    {
      name: 'Wikipedia',
      icon: 'W',
      color: 'bg-slate-700',
      action: () => {
        setActiveSite('wikipedia');
        setCurrentUrl('https://en.wikipedia.org/wiki/Accelerometer');
        setUrlInput('https://en.wikipedia.org/wiki/Accelerometer');
      }
    },
    {
      name: 'GitHub',
      icon: '🐙',
      color: 'bg-slate-900',
      action: () => {
        setActiveSite('github');
        setCurrentUrl('https://github.com');
        setUrlInput('https://github.com/screencontrol/shake-volume-wake');
      }
    }
  ];

  const handleNavigate = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    let target = urlInput.trim();
    if (!target.startsWith('http://') && !target.startsWith('https://')) {
      if (target.includes('.') && !target.includes(' ')) {
        target = `https://${target}`;
      } else {
        // Search query
        setSearchQuery(target);
        setActiveSite('search');
        setCurrentUrl(`https://google.com/search?q=${encodeURIComponent(target)}`);
        setIsLoading(false);
        return;
      }
    }

    setCurrentUrl(target);
    if (target.includes('wikipedia')) setActiveSite('wikipedia');
    else if (target.includes('android')) setActiveSite('android');
    else if (target.includes('github')) setActiveSite('github');
    else setActiveSite('home');

    setTimeout(() => setIsLoading(false), 300);
  };

  const handleSearchSubmit = (query: string) => {
    setSearchQuery(query);
    setActiveSite('search');
    setCurrentUrl(`https://google.com/search?q=${encodeURIComponent(query)}`);
    setUrlInput(`https://google.com/search?q=${encodeURIComponent(query)}`);
  };

  return (
    <div className="w-full h-full bg-[#1F2228] text-slate-100 flex flex-col font-sans select-none overflow-hidden">
      {/* Top Chrome Address & Navigation Bar */}
      <div className="bg-[#2B2D30] border-b border-slate-700 px-3 pt-2 pb-2.5 flex flex-col gap-2">
        {/* Top actions & Omnibox */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setActiveSite('home');
              setCurrentUrl('https://google.com');
              setUrlInput('https://google.com');
            }}
            className="p-1 text-slate-400 hover:text-white rounded-full hover:bg-slate-700/60"
            title="Chrome Home"
          >
            <Home className="w-4 h-4" />
          </button>

          {/* Omnibox Address Field */}
          <form onSubmit={handleNavigate} className="flex-1 min-w-0">
            <div className="bg-[#1E1F22] rounded-full px-3 py-1.5 flex items-center gap-2 border border-slate-700/80 focus-within:border-sky-500 focus-within:ring-1 focus-within:ring-sky-500">
              <Lock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <input
                type="text"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="Search or type URL"
                className="bg-transparent border-none outline-none text-xs text-slate-200 w-full placeholder-slate-500 font-mono"
              />
              {isLoading && (
                <RotateCw className="w-3 h-3 text-sky-400 animate-spin shrink-0" />
              )}
            </div>
          </form>

          {/* Tab Counter Badge */}
          <div className="w-5 h-5 rounded border border-slate-400 text-[10px] font-bold text-slate-300 flex items-center justify-center font-mono">
            {tabCount}
          </div>

          {/* 3 Dots Menu */}
          <div className="flex flex-col gap-0.5 px-1 py-1 cursor-pointer text-slate-400 hover:text-white">
            <span className="w-1 h-1 bg-current rounded-full" />
            <span className="w-1 h-1 bg-current rounded-full" />
            <span className="w-1 h-1 bg-current rounded-full" />
          </div>
        </div>

        {/* Browser Quick Tabs / Navigation Bar */}
        <div className="flex items-center justify-between text-xs px-1 text-slate-400">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setActiveSite('home');
                setUrlInput('https://google.com');
              }}
              className={`pb-0.5 border-b-2 text-[11px] font-medium transition ${
                activeSite === 'home'
                  ? 'border-sky-400 text-sky-400 font-bold'
                  : 'border-transparent hover:text-slate-200'
              }`}
            >
              Google
            </button>
            <button
              onClick={() => {
                setActiveSite('android');
                setUrlInput('https://developer.android.com');
              }}
              className={`pb-0.5 border-b-2 text-[11px] font-medium transition ${
                activeSite === 'android'
                  ? 'border-sky-400 text-sky-400 font-bold'
                  : 'border-transparent hover:text-slate-200'
              }`}
            >
              Android Docs
            </button>
            <button
              onClick={() => {
                setActiveSite('wikipedia');
                setUrlInput('https://en.wikipedia.org');
              }}
              className={`pb-0.5 border-b-2 text-[11px] font-medium transition ${
                activeSite === 'wikipedia'
                  ? 'border-sky-400 text-sky-400 font-bold'
                  : 'border-transparent hover:text-slate-200'
              }`}
            >
              Wiki
            </button>
          </div>

          {/* Banner link back to Shake app */}
          <button
            onClick={onOpenScreenControl}
            className="text-[10px] px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30 font-semibold hover:bg-sky-500/30 transition flex items-center gap-1"
          >
            <span>Shake App</span>
            <ExternalLink className="w-2.5 h-2.5" />
          </button>
        </div>
      </div>

      {/* Main Browser Viewport */}
      <div className="flex-1 overflow-y-auto bg-[#181A1F] p-4 text-left scrollbar-thin">
        {/* SITE 1: GOOGLE HOME */}
        {activeSite === 'home' && (
          <div className="flex flex-col items-center justify-center min-h-[440px] text-center px-2">
            {/* Google Logo */}
            <div className="text-3xl font-bold tracking-tight mb-6">
              <span className="text-blue-500">G</span>
              <span className="text-red-500">o</span>
              <span className="text-amber-500">o</span>
              <span className="text-blue-500">g</span>
              <span className="text-emerald-500">l</span>
              <span className="text-red-500">e</span>
            </div>

            {/* Google Mobile Search Bar */}
            <div className="w-full max-w-xs bg-[#24272E] border border-slate-700 rounded-full px-4 py-2.5 flex items-center gap-2.5 shadow-lg mb-6">
              <Search className="w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search Google or type a URL..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSearchSubmit(searchQuery);
                }}
                className="bg-transparent border-none outline-none text-xs text-white placeholder-slate-400 w-full"
              />
              <button
                onClick={() => handleSearchSubmit(searchQuery || 'Android Accelerometer Sensor')}
                className="text-[10px] bg-blue-600 hover:bg-blue-500 px-2.5 py-1 rounded-full font-bold text-white transition"
              >
                Go
              </button>
            </div>

            {/* Quick Links Grid */}
            <div className="grid grid-cols-4 gap-4 w-full max-w-xs mb-8">
              {quickLinks.map((item) => (
                <button
                  key={item.name}
                  onClick={item.action}
                  className="flex flex-col items-center gap-1.5 p-2 rounded-xl hover:bg-slate-800/60 transition group cursor-pointer"
                >
                  <div
                    className={`w-11 h-11 rounded-full ${item.color} flex items-center justify-center text-white text-base font-bold shadow-md group-hover:scale-105 transition`}
                  >
                    {item.icon}
                  </div>
                  <span className="text-[10px] text-slate-300 font-medium truncate w-full">
                    {item.name}
                  </span>
                </button>
              ))}
            </div>

            {/* Google Discover / Tech Feed Card */}
            <div className="w-full max-w-xs bg-[#20232B] border border-slate-800 rounded-2xl p-3.5 text-left shadow-md">
              <div className="flex items-center justify-between text-[10px] text-slate-400 mb-2">
                <span className="font-semibold text-sky-400">DISCOVER FOR YOU</span>
                <span>12m ago</span>
              </div>
              <h4 className="text-xs font-bold text-white leading-snug">
                Testing Screen Wake & Hardware Keys on Android 15
              </h4>
              <p className="text-[10px] text-slate-400 mt-1 line-clamp-2">
                How background foreground services manage hardware sensors and key events without draining device battery.
              </p>
              <div className="mt-3 pt-2 border-t border-slate-800 flex items-center justify-between text-[9px] text-slate-500">
                <span>Android Developers Blog</span>
                <span className="text-sky-400 font-semibold cursor-pointer" onClick={() => setActiveSite('android')}>
                  Read Article →
                </span>
              </div>
            </div>
          </div>
        )}

        {/* SITE 2: SEARCH RESULTS */}
        {activeSite === 'search' && (
          <div className="space-y-4">
            <div className="bg-[#24272E] p-2.5 rounded-xl border border-slate-700 flex items-center gap-2">
              <Search className="w-3.5 h-3.5 text-sky-400" />
              <span className="text-xs font-medium text-white truncate">{searchQuery}</span>
            </div>

            <div className="space-y-3">
              {/* Result 1 */}
              <div
                onClick={() => {
                  setActiveSite('android');
                  setUrlInput('https://developer.android.com/reference/android/hardware/Sensor');
                }}
                className="bg-[#20232B] p-3 rounded-xl border border-slate-800 hover:border-sky-500/40 cursor-pointer transition"
              >
                <div className="text-[10px] text-emerald-400 font-mono">developer.android.com &gt; sensor</div>
                <h3 className="text-xs font-bold text-sky-300 hover:underline mt-0.5">
                  SensorManager & Accelerometer (Android Developers)
                </h3>
                <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                  Learn how to register low-power sensor listeners with SENSOR_DELAY_UI and handle wake-up sensors during screen off states.
                </p>
              </div>

              {/* Result 2 */}
              <div
                onClick={() => {
                  setActiveSite('wikipedia');
                  setUrlInput('https://en.wikipedia.org/wiki/Accelerometer');
                }}
                className="bg-[#20232B] p-3 rounded-xl border border-slate-800 hover:border-sky-500/40 cursor-pointer transition"
              >
                <div className="text-[10px] text-slate-400 font-mono">en.wikipedia.org &gt; wiki</div>
                <h3 className="text-xs font-bold text-sky-300 hover:underline mt-0.5">
                  Accelerometer - Motion & Vector Physics
                </h3>
                <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                  An accelerometer measures proper acceleration. In smartphones, 3-axis MEMS sensors track instantaneous G-force for shake detection.
                </p>
              </div>

              {/* Result 3 */}
              <div
                onClick={onOpenScreenControl}
                className="bg-sky-950/40 p-3 rounded-xl border border-sky-500/40 hover:border-sky-400 cursor-pointer transition"
              >
                <div className="text-[10px] text-sky-400 font-mono">Installed App &gt; Shake & Volume Screen Control</div>
                <h3 className="text-xs font-bold text-white hover:underline mt-0.5">
                  Shake & Volume Screen Control Settings
                </h3>
                <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                  Open installed app to configure shake thresholds, cooldown timing, and volume wake toggles.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* SITE 3: ANDROID DEVELOPERS DOCS */}
        {activeSite === 'android' && (
          <div className="space-y-4">
            <div className="border-b border-slate-700 pb-3">
              <span className="text-[10px] font-bold tracking-widest text-emerald-400 uppercase">
                Android Platform Guide
              </span>
              <h2 className="text-sm font-bold text-white mt-1">
                Hardware Sensors & Input Handling
              </h2>
              <p className="text-[11px] text-slate-400 mt-0.5">
                API Level 35 • Core Architecture
              </p>
            </div>

            <div className="bg-[#20232B] p-3.5 rounded-xl border border-slate-800 space-y-2.5">
              <h4 className="text-xs font-bold text-sky-400">Low-Power Shake Detection</h4>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Using <code className="text-sky-300 bg-slate-900 px-1 py-0.5 rounded text-[10px]">Sensor.TYPE_ACCELEROMETER</code> with <code className="text-sky-300 bg-slate-900 px-1 py-0.5 rounded text-[10px]">SENSOR_DELAY_UI</code> (~60,000µs) strikes an optimal balance between energy conservation and immediate response when the user shakes the device.
              </p>
            </div>

            <div className="bg-[#20232B] p-3.5 rounded-xl border border-slate-800 space-y-2.5">
              <h4 className="text-xs font-bold text-amber-400">Physical Key Events in Standby</h4>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                When the display powers off, Linux kernel power management halts scan matrices for non-power keys. The <code className="text-amber-300 bg-slate-900 px-1 py-0.5 rounded text-[10px]">AccessibilityService</code> intercepts Volume keys during active or dimmed states.
              </p>
            </div>

            <button
              onClick={onOpenScreenControl}
              className="w-full py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Switch back to Shake Screen Control
            </button>
          </div>
        )}

        {/* SITE 4: WIKIPEDIA */}
        {activeSite === 'wikipedia' && (
          <div className="space-y-4">
            <div className="border-b border-slate-700 pb-2">
              <h2 className="text-base font-bold text-white">Accelerometer</h2>
              <p className="text-[11px] text-slate-400">From Wikipedia, the free encyclopedia</p>
            </div>

            <div className="text-[11px] text-slate-300 space-y-2 leading-relaxed">
              <p>
                An <strong>accelerometer</strong> is a tool that measures proper acceleration. In modern smartphones, microelectromechanical systems (MEMS) accelerometers consist of a cantilever beam with a proof mass.
              </p>
              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 font-mono text-[10px] text-sky-300">
                Vector Magnitude Formula:<br />
                A_net = √(Ax² + Ay² + Az²) - 9.80665 m/s²
              </div>
              <p>
                When a smartphone is shaken, rapid changes in vector direction allow filtering algorithms to distinguish human shakes from vehicular road noise or walking in a pocket.
              </p>
            </div>
          </div>
        )}

        {/* SITE 5: GITHUB */}
        {activeSite === 'github' && (
          <div className="space-y-3">
            <div className="bg-[#20232B] p-3.5 rounded-xl border border-slate-800">
              <div className="flex items-center gap-2 text-xs font-bold text-white">
                <span>screencontrol / shake-volume-wake</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Native Android Kotlin application for accelerometer shake-to-wake and volume screen control.
              </p>
              <div className="flex items-center gap-3 mt-3 text-[10px] text-slate-300">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-violet-400" /> Kotlin 100%
                </span>
                <span>⭐ 142 stars</span>
                <span>Apache 2.0</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
