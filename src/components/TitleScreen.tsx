import React from 'react';

interface TitleScreenProps {
  highScore: number;
  muted: boolean;
  crtEnabled: boolean;
  onStartGame: () => void;
  onToggleMute: () => void;
  onToggleCrt: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  highScore,
  muted,
  crtEnabled,
  onStartGame,
  onToggleMute,
  onToggleCrt,
}) => {
  return (
    <div
      className="fixed inset-0 z-20 flex flex-col justify-between p-6 md:p-10 pointer-events-none"
      role="region"
      aria-label="Surge Breaker Title Screen"
    >
      {/* Top Bar: Dedicated clean space in top-left corner for Fuseco logo + Top-Right Arcade Utility Controls */}
      <div className="flex items-start justify-between w-full">
        {/* Top-left dedicated Fuseco logo slot */}
        <div
          className="pointer-events-auto flex items-center gap-3 px-4 py-2.5 bg-[#0b111e]/90 border-2 border-[#ff6b00] shadow-[0_0_18px_rgba(255,107,0,0.22)]"
          data-testid="fuseco-logo-slot"
          aria-label="Fuseco Logo Slot"
        >
          <svg
            width="36"
            height="36"
            viewBox="0 0 36 36"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            {/* Chunky orange outline fuse + lightning emblem */}
            <rect x="2" y="10" width="8" height="16" fill="#cbd5e1" stroke="#ff6b00" strokeWidth="2.5" />
            <rect x="26" y="10" width="8" height="16" fill="#cbd5e1" stroke="#ff6b00" strokeWidth="2.5" />
            <rect x="10" y="12" width="16" height="12" fill="#090d16" stroke="#00e5ff" strokeWidth="2" />
            <path d="M10 18H15L17 14L19 22L21 18H26" stroke="#ff6b00" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <div className="flex flex-col">
            <span className="font-pixel text-sm md:text-base tracking-wider text-white leading-none">
              FUSECO
            </span>
            <span className="font-mono-tabular text-[11px] font-bold text-[#ff6b00] tracking-widest mt-1">
              EST. 1996 · 30 YEARS
            </span>
          </div>
        </div>

        {/* Top-right High Score & Quick Toggles */}
        <div className="pointer-events-auto flex items-center gap-3">
          <div className="hidden sm:flex flex-col items-end mr-3">
            <span className="text-[10px] font-mono-tabular uppercase tracking-widest text-slate-400">
              HIGH SCORE
            </span>
            <span className="font-pixel text-sm md:text-base text-[#ffb703] font-mono-tabular">
              {Math.round(highScore).toString().padStart(6, '0')}
            </span>
          </div>

          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.currentTarget.blur();
              onToggleMute();
            }}
            aria-label={muted ? 'Unmute Sound [M]' : 'Mute Sound [M]'}
            className="px-3 py-2 bg-[#0f172a] border-2 border-slate-700 hover:border-[#ff6b00] text-xs font-mono-tabular font-bold text-slate-200 transition-colors cursor-pointer whitespace-nowrap"
          >
            {muted ? 'SOUND: OFF [M]' : 'SOUND: ON [M]'}
          </button>

          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.currentTarget.blur();
              onToggleCrt();
            }}
            aria-label={crtEnabled ? 'Disable CRT Effect [C]' : 'Enable CRT Effect [C]'}
            className="px-3 py-2 bg-[#0f172a] border-2 border-slate-700 hover:border-[#00e5ff] text-xs font-mono-tabular font-bold text-slate-200 transition-colors cursor-pointer whitespace-nowrap"
          >
            {crtEnabled ? 'CRT: ON [C]' : 'CRT: OFF [C]'}
          </button>
        </div>
      </div>

      {/* Center Monument Lockup over calm negative space */}
      <div className="flex flex-col items-center text-center max-w-3xl mx-auto my-auto px-6 py-7 bg-[#090d16]/96 border-2 border-[#ff6b00] shadow-[0_0_60px_rgba(9,13,22,0.98)]">
        <p className="font-mono-tabular text-xs md:text-sm font-bold tracking-[0.2em] text-[#00e5ff] uppercase mb-2">
          Celebrating 30 years of Fuseco: 1996-2026
        </p>

        {/* Bespoke inline SVG flickering neon SURGE BREAKER logo */}
        <div className="w-full max-w-2xl my-2 animate-neon-flicker">
          <svg
            viewBox="0 0 760 150"
            className="w-full h-auto overflow-visible"
            role="img"
            aria-label="SURGE BREAKER"
          >
            <defs>
              <linearGradient id="surgeGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="35%" stopColor="#ffb703" />
                <stop offset="100%" stopColor="#ff6b00" />
              </linearGradient>
              <linearGradient id="breakerGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#00e5ff" />
                <stop offset="50%" stopColor="#ffffff" />
                <stop offset="100%" stopColor="#00e5ff" />
              </linearGradient>
            </defs>

            {/* Decorative High-Voltage Busbar Frame */}
            <path
              d="M25 22 H210 L230 10 L250 32 L265 22 H735"
              stroke="#ff6b00"
              strokeWidth="4"
              fill="none"
            />
            <path
              d="M25 132 H495 L515 120 L535 142 L550 132 H735"
              stroke="#00e5ff"
              strokeWidth="3"
              fill="none"
            />

            {/* Main Chunky Arcade Title */}
            <text
              x="380"
              y="76"
              textAnchor="middle"
              fill="#090d16"
              stroke="#ff6b00"
              strokeWidth="12"
              strokeLinejoin="round"
              style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '46px', fontWeight: 700 }}
            >
              SURGE
            </text>
            <text
              x="380"
              y="76"
              textAnchor="middle"
              fill="url(#surgeGrad)"
              style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '46px', fontWeight: 700 }}
            >
              SURGE
            </text>

            <text
              x="380"
              y="120"
              textAnchor="middle"
              fill="#090d16"
              stroke="#0284c7"
              strokeWidth="10"
              strokeLinejoin="round"
              style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '34px', fontWeight: 700 }}
            >
              BREAKER
            </text>
            <text
              x="380"
              y="120"
              textAnchor="middle"
              fill="url(#breakerGrad)"
              style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '34px', fontWeight: 700 }}
            >
              BREAKER
            </text>
          </svg>
        </div>

        <p className="font-display text-base md:text-lg font-semibold italic text-amber-300 tracking-wide mb-5">
          &ldquo;Expertise you need. Service you deserve.&rdquo;
        </p>

        {/* Primary Blinking PRESS START CTA */}
        <button
          type="button"
          data-start="true"
          onClick={(e) => {
            e.currentTarget.blur();
            onStartGame();
          }}
          className="pointer-events-auto group relative px-10 py-4 bg-[#ff6b00] hover:bg-[#ff8524] active:translate-y-0.5 border-2 border-white shadow-[0_0_28px_rgba(255,107,0,0.8)] transition-all cursor-pointer mb-5"
        >
          <span className="font-pixel text-base md:text-xl text-[#090d16] font-bold tracking-wider animate-blink">
            PRESS START
          </span>
        </button>

        {/* One-line how-to-play explaining the Heat Meter */}
        <p className="font-mono-tabular text-xs md:text-sm text-slate-200 max-w-2xl leading-relaxed border-t border-slate-800 pt-3">
          <span className="text-[#00e5ff] font-bold">HEAT METER:</span> Catch the surge in the{' '}
          <span className="text-[#00e5ff] font-bold">centre third</span> of your fuse to cool down (-3% heat);
          deflecting off the <span className="text-[#ff6b00] font-bold">outer edges</span> spikes heat (+8%) — at 100% the fuse blows!
        </p>
      </div>

      {/* Bottom Flat Control Hint Line */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-center w-full text-xs font-mono-tabular text-slate-300 bg-[#090d16]/80 px-4 py-2">
        <span>
          Mouse / Touch / A·D / Arrows Move &middot; Space / Click Launch &middot; P / Esc Pause &middot; M Sound &middot; C CRT
        </span>
        <span className="text-[#ff6b00] font-bold">
          24/7 EMERGENCY FUSE SUPPLY · WWW.FUSECO.COM.AU
        </span>
      </div>
    </div>
  );
};
