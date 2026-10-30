import React from 'react';
import { AMP_LEVEL_LABELS, WORLDS, isHighHeatWarning } from '../game/rules';

export interface HudSnapshot {
  score: number;
  highScore: number;
  lives: number;
  world: 1 | 2 | 3;
  level: 1 | 2 | 3 | 4;
  heat: number;
  powerFactor: number;
  combo: number;
  ampLevel: number;
  ampTimer: number;
  shieldHits: number;
  ballLaunched: boolean;
  perfectPfFlash: boolean;
  flavourText: string | null;
  levelClearBanner: string | null;
}

interface HudOverlayProps {
  hud: HudSnapshot;
  muted: boolean;
  crtEnabled: boolean;
  reduceFlash: boolean;
  onToggleMute: () => void;
  onToggleCrt: () => void;
  onToggleReduceFlash: () => void;
  onPause: () => void;
}

export const HudOverlay: React.FC<HudOverlayProps> = ({
  hud,
  muted,
  crtEnabled,
  reduceFlash,
  onToggleMute,
  onToggleCrt,
  onToggleReduceFlash,
  onPause,
}) => {
  const worldMeta = WORLDS[hud.world];
  const highHeat = isHighHeatWarning(hud.heat);
  const heatInt = Math.round(hud.heat);

  return (
    <div
      className="fixed inset-0 z-10 pointer-events-none flex flex-col justify-between px-2 py-1.5 sm:px-3 sm:py-2 [@media(max-height:480px)]:px-2 [@media(max-height:480px)]:py-0.5"
      aria-label="Gameplay HUD"
    >
      {/* Top Perimeter Bar */}
      <div
        className="w-full max-w-6xl mx-auto grid grid-cols-12 gap-1.5 sm:gap-2 items-start"
        data-testid="hud-top-bar"
      >
        {/* Top-Left Cluster: Score, High Score & Up to 6 Fuse Lives */}
        <div className="col-span-4 bg-[#0b111e]/92 border-2 border-[#ff6b00]/70 px-2.5 py-1 [@media(max-height:480px)]:px-2 [@media(max-height:480px)]:py-0.5 shadow-[0_0_16px_rgba(0,0,0,0.75)]">
          <div className="flex items-baseline justify-between gap-1.5">
            <div className="flex items-baseline gap-1.5">
              <span className="text-[9px] sm:text-[10px] font-mono-tabular uppercase tracking-wider text-slate-400">
                SCORE
              </span>
              <span
                className="font-pixel text-xs sm:text-sm md:text-base [@media(max-height:480px)]:text-xs text-white font-mono-tabular leading-none"
                data-testid="hud-score"
              >
                {Math.round(hud.score).toString().padStart(6, '0')}
              </span>
            </div>
            <div className="flex items-baseline gap-1 text-right">
              <span className="text-[9px] sm:text-[10px] font-mono-tabular uppercase tracking-wider text-slate-400">
                HIGH
              </span>
              <span
                className="font-pixel text-[11px] sm:text-xs md:text-sm [@media(max-height:480px)]:text-[11px] text-[#ffb703] font-mono-tabular leading-none"
                data-testid="hud-highscore"
              >
                {Math.round(hud.highScore).toString().padStart(6, '0')}
              </span>
            </div>
          </div>

          {/* Fuse Lives Pips (fits up to 6 icons comfortably) + Amp Rating Badge */}
          <div className="flex items-center justify-between gap-1 mt-1 [@media(max-height:480px)]:mt-0.5 pt-1 [@media(max-height:480px)]:pt-0.5 border-t border-slate-800">
            <div
              className="flex items-center gap-0.5 sm:gap-1 min-w-0"
              aria-label={`Lives remaining: ${hud.lives}`}
              data-testid="hud-lives-row"
            >
              <span className="text-[9px] sm:text-[10px] font-mono-tabular font-bold text-slate-400 mr-0.5 shrink-0">
                FUSES
              </span>
              {Array.from({ length: Math.max(3, Math.min(6, hud.lives)) }).map((_, idx) => {
                const active = idx < hud.lives;
                return (
                  <svg
                    key={idx}
                    width="15"
                    height="9"
                    viewBox="0 0 22 12"
                    className={`shrink-0 ${active ? 'opacity-100' : 'opacity-25'}`}
                    data-testid="hud-fuse-icon"
                    aria-hidden="true"
                  >
                    <rect x="1" y="1" width="5" height="10" fill="#cbd5e1" stroke="#ff6b00" strokeWidth="1.5" />
                    <rect x="16" y="1" width="5" height="10" fill="#cbd5e1" stroke="#ff6b00" strokeWidth="1.5" />
                    <rect x="6" y="2" width="10" height="8" fill="#090d16" stroke="#38bdf8" strokeWidth="1.2" />
                    {active && (
                      <line x1="6" y1="6" x2="16" y2="6" stroke="#ff6b00" strokeWidth="2" />
                    )}
                  </svg>
                );
              })}
            </div>

            <div className="text-[10px] sm:text-[11px] font-mono-tabular font-bold text-[#00e5ff] shrink-0 whitespace-nowrap">
              {AMP_LEVEL_LABELS[Math.min(3, hud.ampLevel)]}
              {hud.ampLevel > 0 && hud.ampTimer > 0 ? ` (${Math.ceil(hud.ampTimer)}s)` : ''}
            </div>
          </div>
        </div>

        {/* Top-Center Cluster: Heat Meter & Power Factor Combo */}
        <div
          className={`col-span-4 bg-[#0b111e]/92 border-2 px-2.5 py-1 [@media(max-height:480px)]:px-2 [@media(max-height:480px)]:py-0.5 transition-colors ${
            highHeat
              ? 'border-red-500 animate-heat-alarm'
              : 'border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between gap-2 text-[10px] sm:text-xs font-mono-tabular">
            <span className={`font-bold truncate ${highHeat ? 'text-red-400' : 'text-slate-300'}`}>
              {highHeat ? 'OVERHEAT WARNING!' : 'FUSE HEAT METER'}
            </span>
            {/* Inline Heat Progress Bar */}
            <div className="flex-1 h-2.5 [@media(max-height:480px)]:h-2 bg-[#090d16] border border-slate-700 relative overflow-hidden min-w-[60px]">
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-red-500/80 z-10"
                style={{ left: '80%' }}
              />
              <div
                className="h-full origin-left"
                style={{
                  transform: `scaleX(${Math.max(0, Math.min(1, hud.heat / 100))})`,
                  background:
                    hud.heat > 80
                      ? 'linear-gradient(90deg, #f97316 0%, #ef4444 65%, #ffffff 100%)'
                      : hud.heat > 50
                      ? 'linear-gradient(90deg, #ea580c 0%, #f59e0b 60%, #fde047 100%)'
                      : 'linear-gradient(90deg, #0284c7 0%, #00e5ff 45%, #ff6b00 100%)',
                }}
              />
            </div>
            <span
              className={`font-pixel text-[11px] sm:text-xs font-mono-tabular leading-none shrink-0 ${
                highHeat ? 'text-red-400' : heatInt > 55 ? 'text-amber-300' : 'text-[#00e5ff]'
              }`}
              data-testid="hud-heat"
            >
              {heatInt}%
            </span>
          </div>

          {/* Power Factor Combo & World/Level Readout */}
          <div className="flex items-center justify-between gap-1 mt-1 [@media(max-height:480px)]:mt-0.5 pt-1 [@media(max-height:480px)]:pt-0.5 border-t border-slate-800 text-[10px] sm:text-xs font-mono-tabular">
            <div className="flex items-center gap-1 shrink-0">
              <span className="text-[9px] sm:text-[10px] text-slate-400 uppercase">PF:</span>
              <span
                className={`font-pixel text-[11px] sm:text-xs leading-none ${
                  hud.powerFactor >= 0.99
                    ? 'text-[#00e5ff]'
                    : hud.powerFactor >= 0.85
                    ? 'text-[#ffb703]'
                    : 'text-slate-200'
                }`}
                data-testid="hud-pf"
              >
                {hud.powerFactor.toFixed(2)} PF
              </span>
              {hud.perfectPfFlash && (
                <span className="text-[9px] font-bold text-[#00e5ff] animate-blink">
                  PERFECT!
                </span>
              )}
            </div>

            <div className="text-[10px] sm:text-[11px] font-bold text-[#ff6b00] truncate" data-testid="hud-stage">
              W{hud.world}-{hud.level === 4 ? 'BOSS' : hud.level} &middot; {worldMeta.name}
            </div>
          </div>
        </div>

        {/* Top-Right Cluster: All 4 Compact Utility Controls */}
        <div className="col-span-4 flex flex-col items-end justify-start gap-1 pointer-events-auto">
          <div className="grid grid-cols-2 lg:flex lg:flex-nowrap items-center justify-end gap-1 [@media(max-height:480px)]:gap-0.5 w-full lg:w-auto">
            <button
              type="button"
              tabIndex={-1}
              data-testid="hud-toggle-mute"
              onClick={(e) => {
                e.currentTarget.blur();
                onToggleMute();
              }}
              aria-label={muted ? 'Unmute Audio [M]' : 'Mute Audio [M]'}
              className="px-1.5 py-1 [@media(max-height:480px)]:py-0.5 [@media(max-height:480px)]:px-1 bg-[#0b111e]/92 border-2 [@media(max-height:480px)]:border border-slate-700 hover:border-[#ff6b00] text-[9px] sm:text-[10px] [@media(max-height:480px)]:text-[9px] leading-tight font-mono-tabular font-bold text-slate-200 cursor-pointer whitespace-nowrap text-center"
            >
              {muted ? 'MUTE: ON [M]' : 'SOUND [M]'}
            </button>

            <button
              type="button"
              tabIndex={-1}
              data-testid="hud-toggle-crt"
              onClick={(e) => {
                e.currentTarget.blur();
                onToggleCrt();
              }}
              aria-label={crtEnabled ? 'Disable CRT [C]' : 'Enable CRT [C]'}
              className="px-1.5 py-1 [@media(max-height:480px)]:py-0.5 [@media(max-height:480px)]:px-1 bg-[#0b111e]/92 border-2 [@media(max-height:480px)]:border border-slate-700 hover:border-[#00e5ff] text-[9px] sm:text-[10px] [@media(max-height:480px)]:text-[9px] leading-tight font-mono-tabular font-bold text-slate-200 cursor-pointer whitespace-nowrap text-center"
            >
              {crtEnabled ? 'CRT [C]' : 'NO CRT [C]'}
            </button>

            <button
              type="button"
              tabIndex={-1}
              data-testid="hud-toggle-reduce-flash"
              onClick={(e) => {
                e.currentTarget.blur();
                onToggleReduceFlash();
              }}
              aria-label={reduceFlash ? 'Disable Reduce Flash [F]' : 'Enable Reduce Flash [F]'}
              className="px-1.5 py-1 [@media(max-height:480px)]:py-0.5 [@media(max-height:480px)]:px-1 bg-[#0b111e]/92 border-2 [@media(max-height:480px)]:border border-slate-700 hover:border-[#ffb703] text-[9px] sm:text-[10px] [@media(max-height:480px)]:text-[9px] leading-tight font-mono-tabular font-bold text-slate-200 cursor-pointer whitespace-nowrap text-center"
            >
              {reduceFlash ? 'REDUCE FLASH: ON [F]' : 'REDUCE FLASH [F]'}
            </button>

            <button
              type="button"
              tabIndex={-1}
              data-testid="hud-pause-btn"
              onClick={(e) => {
                e.currentTarget.blur();
                onPause();
              }}
              aria-label="Pause Game [P]"
              className="px-1.5 py-1 [@media(max-height:480px)]:py-0.5 [@media(max-height:480px)]:px-1 bg-[#0b111e]/92 border-2 [@media(max-height:480px)]:border border-[#ff6b00] hover:bg-[#ff6b00] hover:text-[#090d16] text-[9px] sm:text-[10px] [@media(max-height:480px)]:text-[9px] leading-tight font-mono-tabular font-bold text-[#ff6b00] transition-colors cursor-pointer whitespace-nowrap text-center"
            >
              PAUSE [P]
            </button>
          </div>

          <div className="hidden lg:block text-[10px] font-mono-tabular text-slate-400 text-right truncate max-w-full">
            {hud.level === 4 ? `BOSS: ${worldMeta.bossName}` : worldMeta.storyBrief}
          </div>
        </div>
      </div>

      {/* Center Non-Blocking Level Clear Banner or Launch Prompt */}
      <div className="flex flex-col items-center justify-center my-auto">
        {hud.levelClearBanner && (
          <div
            className="px-6 py-4 md:px-8 md:py-5 [@media(max-height:480px)]:px-4 [@media(max-height:480px)]:py-2 bg-[#0b111e]/95 border-2 border-[#00e5ff] shadow-[0_0_35px_rgba(0,229,255,0.45)] text-center"
            role="status"
            aria-live="polite"
          >
            <div className="font-pixel text-xs md:text-sm [@media(max-height:480px)]:text-[10px] text-[#ff6b00] uppercase tracking-widest mb-1.5">
              STAGE CLEAR &middot; {worldMeta.name}
            </div>
            <div className="font-pixel text-sm md:text-lg [@media(max-height:480px)]:text-xs text-white leading-relaxed">
              {hud.levelClearBanner}
            </div>
          </div>
        )}

        {!hud.ballLaunched && !hud.levelClearBanner && (
          <div className="px-4 py-2 md:px-5 md:py-2.5 [@media(max-height:480px)]:px-3 [@media(max-height:480px)]:py-1 bg-[#0b111e]/90 border border-[#ff6b00]/80 text-center">
            <span className="font-pixel text-xs md:text-sm [@media(max-height:480px)]:text-[10px] text-[#ffb703] animate-blink">
              PRESS SPACE OR CLICK TO LAUNCH SURGE
            </span>
          </div>
        )}
      </div>

      {/* Bottom Subtle Flavour Message Ticker */}
      <div
        className="w-full max-w-6xl mx-auto flex items-center justify-between text-[11px] [@media(max-height:480px)]:text-[10px] leading-none font-mono-tabular text-slate-400 px-2"
        data-testid="hud-bottom-bar"
      >
        <span className="truncate">
          {hud.flavourText ? (
            <span className="text-[#ffb703] font-bold">&bull; {hud.flavourText}</span>
          ) : (
            <span>CENTRE CATCH: -3% HEAT &middot; EDGE CATCH: +8% HEAT</span>
          )}
        </span>
        <span className="hidden sm:inline text-slate-400 shrink-0 ml-2">
          FUSECO 30 YEARS (1996&ndash;2026) &middot; 1300 387 326
        </span>
      </div>
    </div>
  );
};
