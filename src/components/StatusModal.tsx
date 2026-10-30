import React from 'react';
import { WORLDS } from '../game/rules';

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
  onResume: () => void;
  onRestartRun: () => void;
  onSelectStage: (world: 1 | 2 | 3, level: 1 | 2 | 3 | 4) => void;
  onReturnTitle: () => void;
  onToggleMute: () => void;
  onToggleCrt: () => void;
}

export const StatusModal: React.FC<StatusModalProps> = ({
  mode,
  endStats,
  currentWorld,
  currentLevel,
  muted,
  crtEnabled,
  onResume,
  onRestartRun,
  onSelectStage,
  onReturnTitle,
  onToggleMute,
  onToggleCrt,
}) => {
  if (mode === 'paused') {
    const worldMeta = WORLDS[currentWorld];
    return (
      <div
        className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-[#050810]/85"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pause-modal-title"
      >
        <div className="w-full max-w-lg bg-[#0b111e] border-2 border-[#ff6b00] p-6 md:p-8 shadow-[0_0_45px_rgba(255,107,0,0.3)] text-center">
          <div className="font-mono-tabular text-xs font-bold uppercase tracking-widest text-[#00e5ff] mb-1">
            WORLD {currentWorld}-{currentLevel === 4 ? 'BOSS' : currentLevel} &middot; {worldMeta.name}
          </div>
          <h2 id="pause-modal-title" className="font-pixel text-xl md:text-2xl text-white mb-6">
            SYSTEM PAUSED
          </h2>

          <div className="flex flex-col gap-3 mb-6">
            <button
              type="button"
              onClick={onResume}
              className="w-full py-3 bg-[#ff6b00] hover:bg-[#ff8524] text-[#090d16] font-pixel text-sm tracking-wider border-2 border-white cursor-pointer"
            >
              RESUME GAME [P]
            </button>

            <button
              type="button"
              onClick={onRestartRun}
              className="w-full py-2.5 bg-[#111927] hover:border-[#ff6b00] text-white font-mono-tabular text-sm font-bold border-2 border-slate-700 cursor-pointer"
            >
              RESTART NEW RUN
            </button>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={onToggleMute}
                className="py-2 bg-[#111927] hover:border-[#00e5ff] text-slate-200 font-mono-tabular text-xs font-bold border-2 border-slate-700 cursor-pointer"
              >
                {muted ? 'SOUND: OFF [M]' : 'SOUND: ON [M]'}
              </button>
              <button
                type="button"
                onClick={onToggleCrt}
                className="py-2 bg-[#111927] hover:border-[#00e5ff] text-slate-200 font-mono-tabular text-xs font-bold border-2 border-slate-700 cursor-pointer"
              >
                {crtEnabled ? 'CRT: ON [C]' : 'CRT: OFF [C]'}
              </button>
            </div>
          </div>

          {/* Stage Jump Grid for practicing Worlds & Bosses */}
          <div className="border-t border-slate-800 pt-4 mb-5 text-left">
            <div className="text-[11px] font-mono-tabular uppercase tracking-wider text-slate-400 mb-2 text-center">
              JUMP TO SUBSTATION STAGE / BOSS
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {([1, 2, 3] as const).map((w) =>
                ([1, 2, 3, 4] as const).map((lvl) => {
                  const active = w === currentWorld && lvl === currentLevel;
                  return (
                    <button
                      key={`${w}-${lvl}`}
                      type="button"
                      onClick={() => onSelectStage(w, lvl)}
                      className={`py-1.5 px-2 text-[11px] font-mono-tabular font-bold border cursor-pointer transition-colors ${
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

          <button
            type="button"
            onClick={onReturnTitle}
            className="w-full py-2 text-xs font-mono-tabular font-bold text-slate-400 hover:text-white cursor-pointer"
          >
            RETURN TO TITLE SCREEN
          </button>
        </div>
      </div>
    );
  }

  // Game Over or Victory Modal
  const isVictory = endStats?.outcome === 'victory';
  const score = Math.round(endStats?.score ?? 0);
  const highScore = Math.round(endStats?.highScore ?? 0);
  const peakPf = (endStats?.peakPowerFactor ?? 0.7).toFixed(2);
  const worldReached = endStats?.worldReached ?? 1;
  const levelReached = endStats?.levelReached ?? 1;

  return (
    <div
      className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-[#050810]/88"
      role="dialog"
      aria-modal="true"
      aria-labelledby="outcome-modal-title"
    >
      <div
        className={`w-full max-w-xl bg-[#0b111e] border-2 p-6 md:p-8 text-center ${
          isVictory
            ? 'border-[#00e5ff] shadow-[0_0_50px_rgba(0,229,255,0.35)]'
            : 'border-[#ff6b00] shadow-[0_0_50px_rgba(255,107,0,0.35)]'
        }`}
      >
        <div className="font-mono-tabular text-xs font-bold uppercase tracking-widest text-[#ffb703] mb-2">
          {isVictory ? 'AUSTRALIAN GRID RESTORED · 30 YEARS OF FUSECO' : 'OVERCURRENT PROTECTION TRIPPED'}
        </div>

        <h2
          id="outcome-modal-title"
          className={`font-pixel text-xl md:text-3xl mb-3 ${
            isVictory ? 'text-[#00e5ff]' : 'text-[#ff6b00]'
          }`}
        >
          {isVictory ? 'VICTORY!' : 'GAME OVER'}
        </h2>

        <p className="font-display text-base md:text-lg font-bold text-white mb-6">
          {isVictory
            ? 'The lights are on. Thanks for keeping Australia powered!'
            : 'Fuse blown! Need a fuse urgently?'}
        </p>

        {/* 3 Tabular Stat Tiles */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-[#090d16] border border-slate-800 p-3">
            <div className="text-[10px] font-mono-tabular uppercase text-slate-400 mb-1">
              FINAL SCORE
            </div>
            <div className="font-pixel text-sm md:text-base text-white font-mono-tabular" data-testid="final-score">
              {score.toString().padStart(6, '0')}
            </div>
          </div>

          <div className="bg-[#090d16] border border-slate-800 p-3">
            <div className="text-[10px] font-mono-tabular uppercase text-slate-400 mb-1">
              HIGH SCORE
            </div>
            <div className="font-pixel text-sm md:text-base text-[#ffb703] font-mono-tabular" data-testid="final-highscore">
              {highScore.toString().padStart(6, '0')}
            </div>
          </div>

          <div className="bg-[#090d16] border border-slate-800 p-3">
            <div className="text-[10px] font-mono-tabular uppercase text-slate-400 mb-1">
              {isVictory ? 'PEAK PF' : 'STAGE REACHED'}
            </div>
            <div className="font-pixel text-xs md:text-sm text-[#00e5ff] font-mono-tabular">
              {isVictory
                ? `${peakPf} PF`
                : `W${worldReached}-${levelReached === 4 ? 'BOSS' : levelReached}`}
            </div>
          </div>
        </div>

        {/* Primary Play Again / Try Again Button */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-6">
          <button
            type="button"
            data-start="true"
            onClick={onRestartRun}
            className="w-full sm:w-auto px-8 py-3.5 bg-[#ff6b00] hover:bg-[#ff8524] text-[#090d16] font-pixel text-sm tracking-wider border-2 border-white cursor-pointer"
          >
            {isVictory ? 'PLAY AGAIN' : 'TRY AGAIN'}
          </button>

          <button
            type="button"
            onClick={onReturnTitle}
            className="w-full sm:w-auto px-6 py-3.5 bg-[#111927] hover:border-[#00e5ff] text-slate-200 font-mono-tabular text-xs font-bold border-2 border-slate-700 cursor-pointer"
          >
            TITLE SCREEN
          </button>
        </div>

        {/* Fuseco Call To Action */}
        <div className="border-t border-slate-800 pt-4 text-xs md:text-sm font-mono-tabular text-amber-300 font-bold">
          Talk to a Fuseco expert: 1300 387 326 |{' '}
          <a
            href="https://www.fuseco.com.au"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-white"
          >
            www.fuseco.com.au
          </a>
        </div>
      </div>
    </div>
  );
};
