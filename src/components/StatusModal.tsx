import React, { useMemo } from 'react';
import {
  WORLDS,
  FUSECO_EXPERT_SHORT_URL,
  getFusecoExpertContactUrl,
} from '../game/rules';
import { generateQrMatrix } from '../game/qrcode';

export interface EndOfRunStats {
  outcome: 'victory' | 'defeat';
  score: number;
  highScore: number;
  worldReached: 1 | 2 | 3;
  levelReached: 1 | 2 | 3 | 4;
  peakPowerFactor: number;
  livesRemaining: number;
}

interface StatusModalProps {
  mode: 'paused' | 'gameover';
  endStats: EndOfRunStats | null;
  currentWorld: 1 | 2 | 3;
  currentLevel: 1 | 2 | 3 | 4;
  muted: boolean;
  crtEnabled: boolean;
  reduceFlash: boolean;
  debugMode: boolean;
  onResume: () => void;
  onRestartRun: () => void;
  onSelectStage: (world: 1 | 2 | 3, level: 1 | 2 | 3 | 4) => void;
  onReturnTitle: () => void;
  onToggleMute: () => void;
  onToggleCrt: () => void;
  onToggleReduceFlash: () => void;
}

export const StatusModal: React.FC<StatusModalProps> = ({
  mode,
  endStats,
  currentWorld,
  currentLevel,
  muted,
  crtEnabled,
  reduceFlash,
  debugMode,
  onResume,
  onRestartRun,
  onSelectStage,
  onReturnTitle,
  onToggleMute,
  onToggleCrt,
  onToggleReduceFlash,
}) => {
  const isVictory = endStats?.outcome === 'victory';
  const qrTargetUrl = getFusecoExpertContactUrl(isVictory ? 'victory' : 'defeat');

  const qrSvgData = useMemo(() => {
    const matrix = generateQrMatrix(qrTargetUrl);
    const size = matrix.length;
    const quietZone = 4;
    const totalModules = size + quietZone * 2;
    const pathParts: string[] = [];
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (matrix[r][c]) {
          pathParts.push(`M${c + quietZone},${r + quietZone}h1v1h-1z`);
        }
      }
    }
    return {
      totalModules,
      pathD: pathParts.join(''),
    };
  }, [qrTargetUrl]);

  if (mode === 'paused') {
    const worldMeta = WORLDS[currentWorld];
    return (
      <div
        className="fixed inset-0 z-30 overflow-y-auto flex p-2 sm:p-4 bg-[#050810]/85"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pause-modal-title"
      >
        <div className="m-auto w-full max-w-lg bg-[#0b111e] border-2 border-[#ff6b00] p-5 md:p-8 [@media(max-height:480px)]:p-3.5 shadow-[0_0_45px_rgba(255,107,0,0.3)] text-center">
          <div className="font-mono-tabular text-xs [@media(max-height:480px)]:text-[10px] font-bold uppercase tracking-widest text-[#00e5ff] mb-1 [@media(max-height:480px)]:mb-0.5">
            WORLD {currentWorld}-{currentLevel === 4 ? 'BOSS' : currentLevel} &middot; {worldMeta.name}
          </div>
          <h2
            id="pause-modal-title"
            className="font-pixel text-xl md:text-2xl [@media(max-height:480px)]:text-base text-white mb-5 [@media(max-height:480px)]:mb-2.5"
          >
            SYSTEM PAUSED
          </h2>

          <div className="flex flex-col gap-2.5 [@media(max-height:480px)]:gap-1.5 mb-5 [@media(max-height:480px)]:mb-2.5">
            <button
              type="button"
              onClick={onResume}
              className="w-full py-3 [@media(max-height:480px)]:py-2 bg-[#ff6b00] hover:bg-[#ff8524] text-[#090d16] font-pixel text-sm [@media(max-height:480px)]:text-xs tracking-wider border-2 border-white cursor-pointer"
            >
              RESUME GAME [P]
            </button>

            <button
              type="button"
              onClick={onRestartRun}
              className="w-full py-2.5 [@media(max-height:480px)]:py-1.5 bg-[#111927] hover:border-[#ff6b00] text-white font-mono-tabular text-sm [@media(max-height:480px)]:text-xs font-bold border-2 border-slate-700 cursor-pointer"
            >
              RESTART NEW RUN
            </button>

            <div className="grid grid-cols-3 gap-2 [@media(max-height:480px)]:gap-1.5">
              <button
                type="button"
                onClick={onToggleMute}
                className="py-2 px-2 [@media(max-height:480px)]:py-1.5 bg-[#111927] hover:border-[#00e5ff] text-slate-200 font-mono-tabular text-xs [@media(max-height:480px)]:text-[10px] font-bold border-2 border-slate-700 cursor-pointer whitespace-nowrap"
              >
                {muted ? 'SOUND: OFF [M]' : 'SOUND: ON [M]'}
              </button>
              <button
                type="button"
                onClick={onToggleCrt}
                className="py-2 px-2 [@media(max-height:480px)]:py-1.5 bg-[#111927] hover:border-[#00e5ff] text-slate-200 font-mono-tabular text-xs [@media(max-height:480px)]:text-[10px] font-bold border-2 border-slate-700 cursor-pointer whitespace-nowrap"
              >
                {crtEnabled ? 'CRT: ON [C]' : 'CRT: OFF [C]'}
              </button>
              <button
                type="button"
                data-testid="modal-toggle-reduce-flash"
                onClick={onToggleReduceFlash}
                className="py-2 px-2 [@media(max-height:480px)]:py-1.5 bg-[#111927] hover:border-[#ffb703] text-slate-200 font-mono-tabular text-xs [@media(max-height:480px)]:text-[10px] font-bold border-2 border-slate-700 cursor-pointer whitespace-nowrap"
              >
                {reduceFlash ? 'REDUCE FLASH: ON [F]' : 'REDUCE FLASH: OFF [F]'}
              </button>
            </div>
          </div>

          {/* Stage Jump Grid — ONLY rendered when ?debug=1 is present */}
          {debugMode && (
            <div
              className="border-t border-slate-800 pt-3 mb-4 [@media(max-height:480px)]:pt-2 [@media(max-height:480px)]:mb-2 text-left"
              data-testid="debug-stage-jump"
            >
              <div className="text-[11px] [@media(max-height:480px)]:text-[10px] font-mono-tabular uppercase tracking-wider text-slate-400 mb-2 [@media(max-height:480px)]:mb-1 text-center">
                JUMP TO SUBSTATION STAGE / BOSS
              </div>
              <div className="grid grid-cols-4 gap-1.5 [@media(max-height:480px)]:gap-1">
                {([1, 2, 3] as const).map((w) =>
                  ([1, 2, 3, 4] as const).map((lvl) => {
                    const active = w === currentWorld && lvl === currentLevel;
                    return (
                      <button
                        key={`${w}-${lvl}`}
                        type="button"
                        onClick={() => onSelectStage(w, lvl)}
                        className={`py-1.5 px-2 [@media(max-height:480px)]:py-1 text-[11px] [@media(max-height:480px)]:text-[10px] font-mono-tabular font-bold border cursor-pointer transition-colors ${
                          active
                            ? 'bg-[#ff6b00] text-[#090d16] border-white'
                            : 'bg-[#090d16] text-slate-300 border-slate-800 hover:border-[#00e5ff]'
                        }`}
                      >
                        W{w}-{lvl === 4 ? 'BOSS' : lvl}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={onReturnTitle}
            className="w-full py-2 [@media(max-height:480px)]:py-1 text-xs [@media(max-height:480px)]:text-[11px] font-mono-tabular font-bold text-slate-400 hover:text-white cursor-pointer"
          >
            RETURN TO TITLE SCREEN
          </button>
        </div>
      </div>
    );
  }

  // Game Over or Victory Modal
  const score = Math.round(endStats?.score ?? 0);
  const highScore = Math.round(endStats?.highScore ?? 0);
  const peakPf = (endStats?.peakPowerFactor ?? 0.7).toFixed(2);
  const worldReached = endStats?.worldReached ?? 1;
  const levelReached = endStats?.levelReached ?? 1;

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto flex p-2 sm:p-4 bg-[#050810]/88"
      role="dialog"
      aria-modal="true"
      aria-labelledby="outcome-modal-title"
    >
      <div
        className={`m-auto w-full max-w-xl bg-[#0b111e] border-2 p-5 md:p-6 [@media(max-height:480px)]:p-3.5 text-center ${
          isVictory
            ? 'border-[#00e5ff] shadow-[0_0_50px_rgba(0,229,255,0.35)]'
            : 'border-[#ff6b00] shadow-[0_0_50px_rgba(255,107,0,0.35)]'
        }`}
      >
        <div className="font-mono-tabular text-xs [@media(max-height:480px)]:text-[10px] font-bold uppercase tracking-widest text-[#ffb703] mb-1 [@media(max-height:480px)]:mb-0.5">
          {isVictory ? 'AUSTRALIAN GRID RESTORED · 30 YEARS OF FUSECO' : 'OVERCURRENT PROTECTION TRIPPED'}
        </div>

        <h2
          id="outcome-modal-title"
          className={`font-pixel text-xl md:text-3xl [@media(max-height:480px)]:text-lg mb-2 [@media(max-height:480px)]:mb-1 ${
            isVictory ? 'text-[#00e5ff]' : 'text-[#ff6b00]'
          }`}
        >
          {isVictory ? 'VICTORY!' : 'GAME OVER'}
        </h2>

        <p className="font-display text-base md:text-lg [@media(max-height:480px)]:text-sm font-bold text-white mb-4 [@media(max-height:480px)]:mb-2">
          {isVictory
            ? 'The lights are on. Thanks for keeping Australia powered!'
            : 'Fuse blown! Need a fuse urgently?'}
        </p>

        {/* 3 Tabular Stat Tiles */}
        <div className="grid grid-cols-3 gap-3 [@media(max-height:480px)]:gap-2 mb-4 [@media(max-height:480px)]:mb-2.5">
          <div className="bg-[#090d16] border border-slate-800 p-2.5 [@media(max-height:480px)]:p-2">
            <div className="text-[10px] [@media(max-height:480px)]:text-[9px] font-mono-tabular uppercase text-slate-400 mb-1 [@media(max-height:480px)]:mb-0.5">
              FINAL SCORE
            </div>
            <div className="font-pixel text-sm md:text-base [@media(max-height:480px)]:text-xs text-white font-mono-tabular" data-testid="final-score">
              {score.toString().padStart(6, '0')}
            </div>
          </div>

          <div className="bg-[#090d16] border border-slate-800 p-2.5 [@media(max-height:480px)]:p-2">
            <div className="text-[10px] [@media(max-height:480px)]:text-[9px] font-mono-tabular uppercase text-slate-400 mb-1 [@media(max-height:480px)]:mb-0.5">
              HIGH SCORE
            </div>
            <div className="font-pixel text-sm md:text-base [@media(max-height:480px)]:text-xs text-[#ffb703] font-mono-tabular" data-testid="final-highscore">
              {highScore.toString().padStart(6, '0')}
            </div>
          </div>

          <div className="bg-[#090d16] border border-slate-800 p-2.5 [@media(max-height:480px)]:p-2">
            <div className="text-[10px] [@media(max-height:480px)]:text-[9px] font-mono-tabular uppercase text-slate-400 mb-1 [@media(max-height:480px)]:mb-0.5">
              {isVictory ? 'PEAK PF' : 'STAGE REACHED'}
            </div>
            <div className="font-pixel text-xs md:text-sm [@media(max-height:480px)]:text-xs text-[#00e5ff] font-mono-tabular">
              {isVictory
                ? `${peakPf} PF`
                : `W${worldReached}-${levelReached === 4 ? 'BOSS' : levelReached}`}
            </div>
          </div>
        </div>

        {/* Primary Play Again / Try Again Button */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 [@media(max-height:480px)]:gap-2 mb-4 [@media(max-height:480px)]:mb-2.5">
          <button
            type="button"
            data-start="true"
            onClick={onRestartRun}
            className="w-full sm:w-auto px-8 py-3 [@media(max-height:480px)]:px-5 [@media(max-height:480px)]:py-2 bg-[#ff6b00] hover:bg-[#ff8524] text-[#090d16] font-pixel text-sm [@media(max-height:480px)]:text-xs tracking-wider border-2 border-white cursor-pointer"
          >
            {isVictory ? 'PLAY AGAIN' : 'TRY AGAIN'}
          </button>

          <button
            type="button"
            onClick={onReturnTitle}
            className="w-full sm:w-auto px-6 py-3 [@media(max-height:480px)]:px-4 [@media(max-height:480px)]:py-2 bg-[#111927] hover:border-[#00e5ff] text-slate-200 font-mono-tabular text-xs font-bold border-2 border-slate-700 cursor-pointer"
          >
            TITLE SCREEN
          </button>
        </div>

        {/* Offline QR Code Panel — Shown on desktop/kiosk screens; hidden on phones, short screens, and touch-only devices */}
        <div
          className="hidden [@media(min-width:768px)_and_(min-height:560px)_and_(hover:hover)_and_(pointer:fine)]:flex flex-col items-center justify-center bg-[#090d16] border border-slate-800 p-3 mb-3.5"
          data-testid="fuseco-qr-section"
          data-qr-url={qrTargetUrl}
        >
          <div className="text-xs font-mono-tabular font-bold text-white mb-2">
            Scan to talk to a Fuseco expert
          </div>
          <svg
            width="147"
            height="147"
            viewBox={`0 0 ${qrSvgData.totalModules} ${qrSvgData.totalModules}`}
            shapeRendering="crispEdges"
            className="w-[147px] h-[147px] bg-white shrink-0"
            role="img"
            aria-label={`QR code linking to ${FUSECO_EXPERT_SHORT_URL}`}
            data-testid="fuseco-qr-svg"
          >
            <rect
              width={qrSvgData.totalModules}
              height={qrSvgData.totalModules}
              fill="#ffffff"
            />
            <path d={qrSvgData.pathD} fill="#000000" />
          </svg>
          <div
            className="text-xs font-mono-tabular text-[#00e5ff] mt-1.5"
            data-testid="fuseco-qr-short-url"
          >
            {FUSECO_EXPERT_SHORT_URL}
          </div>
        </div>

        {/* Fuseco Call To Action (Preserved) */}
        <div className="border-t border-slate-800 pt-3 [@media(max-height:480px)]:pt-2 text-xs md:text-sm [@media(max-height:480px)]:text-[11px] font-mono-tabular text-amber-300 font-bold">
          Talk to a Fuseco expert: 1300 387 326 |{' '}
          <a
            href={qrTargetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-white"
            data-testid="fuseco-expert-link"
          >
            www.fuseco.com.au
          </a>
        </div>
      </div>
    </div>
  );
};

