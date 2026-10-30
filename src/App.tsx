/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  ARENA_WIDTH,
  ARENA_HEIGHT,
  PADDLE_Y,
  PADDLE_BASE_WIDTH,
  PADDLE_HEIGHT,
  BALL_RADIUS,
  MAX_BALL_SPEED,
  AMP_WIDTH_MULTIPLIERS,
  AMP_LEVEL_LABELS,
  EQUIPMENT_CATALOG,
  POWERUP_CATALOG,
  FLAVOUR_MESSAGES,
  WORLDS,
  BrickEntity,
  BossEntity,
  BossZap,
  PowerUpType,
  getStartingBallSpeed,
  calculatePowerFactor,
  calculateBrickScore,
  evaluatePaddleCatch,
  getCentreCatchMessage,
  stepPassiveCooling,
  isHighHeatWarning,
  checkExtraLifeMilestone,
  getExtraLifeMilestoneMessage,
  applyExtraLifeReward,
  selectPowerUpFromRoll,
  testBallVsAABB,
  buildLevelBricks,
  isRegularLevelCleared,
  createBossForWorld,
} from './game/rules';
import {
  PooledParticle,
  FloatingText,
  FallingPowerUp,
  TrailPoint,
  drawCircuitBackground,
  drawEquipmentBrick,
  drawFusePaddle,
  drawSurgeBall,
  drawCircuitBreakerShield,
  drawPowerUpCapsule,
  drawBossAndZaps,
} from './game/renderer';
import { soundEngine } from './game/audio';
import { TitleScreen } from './components/TitleScreen';
import { HudOverlay, HudSnapshot } from './components/HudOverlay';
import { StatusModal, EndOfRunStats } from './components/StatusModal';

type GameState = 'title' | 'playing' | 'paused' | 'gameover';

const HIGH_SCORE_STORAGE_KEY = 'surge_breaker_fuseco_highscore_v1';
const REDUCE_FLASH_STORAGE_KEY = 'surge_breaker_fuseco_reduce_flash_v1';
const PARTICLE_POOL_SIZE = 180;
const FLOATING_TEXT_POOL_SIZE = 32;

interface InternalSimState {
  mode: GameState;
  score: number;
  highScore: number;
  lives: number;
  world: 1 | 2 | 3;
  level: 1 | 2 | 3 | 4;
  heat: number;
  combo: number;
  powerFactor: number;
  peakPowerFactor: number;
  paddleX: number;
  paddleWidth: number;
  ampLevel: number;
  ampTimer: number;
  shieldHits: number;
  ballX: number;
  ballY: number;
  ballVx: number;
  ballVy: number;
  ballSpeed: number;
  ballLaunched: boolean;
  ballTrail: TrailPoint[];
  bricks: BrickEntity[];
  boss: BossEntity | null;
  bossZaps: BossZap[];
  powerUps: FallingPowerUp[];
  nextPowerUpId: number;
  nextZapId: number;
  hitstopTimer: number;
  screenShakeTrauma: number;
  screenFlashAlpha: number;
  screenFlashColor: string;
  fuseBlowRespawnTimer: number;
  levelClearTimer: number;
  levelClearBanner: string | null;
  flavourText: string | null;
  flavourTimer: number;
  flavourCooldown: number;
  perfectPfFlashTimer: number;
  elapsedTime: number;
}

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // URL shortcuts (autostart, world, level) are ONLY active when ?debug=1 is present
  const searchParams =
    typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const isDebugMode = searchParams?.get('debug') === '1';
  const initialAutostart = isDebugMode && searchParams?.get('autostart') === '1';
  const paramWorld = isDebugMode ? Number(searchParams?.get('world') || 1) : 1;
  const initialWorld: 1 | 2 | 3 =
    paramWorld === 2 ? 2 : paramWorld === 3 ? 3 : 1;
  const paramLevel = isDebugMode ? Number(searchParams?.get('level') || 1) : 1;
  const initialLevel: 1 | 2 | 3 | 4 =
    paramLevel === 2 ? 2 : paramLevel === 3 ? 3 : paramLevel === 4 ? 4 : 1;

  const loadSavedHighScore = (): number => {
    try {
      const raw = window.localStorage.getItem(HIGH_SCORE_STORAGE_KEY);
      const parsed = raw ? parseInt(raw, 10) : 0;
      return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
    } catch {
      return 0;
    }
  };

  const loadInitialReduceFlash = (): boolean => {
    if (typeof window === 'undefined') return false;
    try {
      const raw = window.localStorage.getItem(REDUCE_FLASH_STORAGE_KEY);
      if (raw === '1' || raw === 'true') return true;
      if (raw === '0' || raw === 'false') return false;
    } catch {
      // ignore blocked storage
    }
    try {
      return window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;
    } catch {
      return false;
    }
  };

  const [gameState, setGameState] = useState<GameState>(initialAutostart ? 'playing' : 'title');
  const [muted, setMuted] = useState<boolean>(false);
  const [crtEnabled, setCrtEnabled] = useState<boolean>(true);
  const [reduceFlash, setReduceFlash] = useState<boolean>(() => loadInitialReduceFlash());
  const reduceFlashRef = useRef<boolean>(reduceFlash);
  const [endStats, setEndStats] = useState<EndOfRunStats | null>(null);

  const [hud, setHud] = useState<HudSnapshot>(() => ({
    score: 0,
    highScore: typeof window !== 'undefined' ? loadSavedHighScore() : 0,
    lives: 3,
    world: initialWorld,
    level: initialLevel,
    heat: 0,
    powerFactor: 0.7,
    combo: 0,
    ampLevel: 0,
    ampTimer: 0,
    shieldHits: 0,
    ballLaunched: false,
    perfectPfFlash: false,
    flavourText: null,
    levelClearBanner: null,
  }));

  // Pre-allocated Zero-GC pools
  const particlePoolRef = useRef<PooledParticle[]>(
    Array.from({ length: PARTICLE_POOL_SIZE }, () => ({
      active: false,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      size: 3,
      color: '#ff6b00',
      alpha: 1,
      life: 0,
      maxLife: 0.5,
      isGlassShard: false,
      rotation: 0,
      vRot: 0,
    }))
  );

  const floatingTextPoolRef = useRef<FloatingText[]>(
    Array.from({ length: FLOATING_TEXT_POOL_SIZE }, () => ({
      active: false,
      x: 0,
      y: 0,
      vy: -40,
      text: '',
      color: '#ffffff',
      life: 0,
      maxLife: 0.8,
      scale: 1,
    }))
  );

  // Unified input state ref
  const keysHeldRef = useRef<Set<string>>(new Set());
  const pointerTargetXRef = useRef<number | null>(null);

  // Main mutable simulation state
  const simRef = useRef<InternalSimState>({
    mode: initialAutostart ? 'playing' : 'title',
    score: 0,
    highScore: typeof window !== 'undefined' ? loadSavedHighScore() : 0,
    lives: 3,
    world: initialWorld,
    level: initialLevel,
    heat: 0,
    combo: 0,
    powerFactor: 0.7,
    peakPowerFactor: 0.7,
    paddleX: ARENA_WIDTH / 2,
    paddleWidth: PADDLE_BASE_WIDTH,
    ampLevel: 0,
    ampTimer: 0,
    shieldHits: 0,
    ballX: ARENA_WIDTH / 2,
    ballY: PADDLE_Y - BALL_RADIUS - 2,
    ballVx: 0,
    ballVy: 0,
    ballSpeed: getStartingBallSpeed(initialWorld, initialLevel),
    ballLaunched: false,
    ballTrail: [],
    bricks: buildLevelBricks(initialWorld, initialLevel),
    boss: initialLevel === 4 ? createBossForWorld(initialWorld) : null,
    bossZaps: [],
    powerUps: [],
    nextPowerUpId: 1,
    nextZapId: 1,
    hitstopTimer: 0,
    screenShakeTrauma: 0,
    screenFlashAlpha: 0,
    screenFlashColor: '#ffffff',
    fuseBlowRespawnTimer: 0,
    levelClearTimer: 0,
    levelClearBanner: null,
    flavourText: '24/7 EMERGENCY FUSE SERVICE — ALWAYS ON CALL',
    flavourTimer: 4.5,
    flavourCooldown: 14,
    perfectPfFlashTimer: 0,
    elapsedTime: 0,
  });

  // Sync document.body.dataset.state whenever gameState or reduceFlash changes
  useEffect(() => {
    document.body.dataset.state = gameState;
  }, [gameState]);

  useEffect(() => {
    reduceFlashRef.current = reduceFlash;
    document.body.dataset.reduceFlash = reduceFlash ? 'true' : 'false';
  }, [reduceFlash]);

  const spawnParticleBurst = useCallback(
    (
      x: number,
      y: number,
      count: number,
      colors: string[],
      speedMin: number = 60,
      speedMax: number = 260,
      isGlass: boolean = false
    ) => {
      const pool = particlePoolRef.current;
      let spawned = 0;
      for (let i = 0; i < pool.length && spawned < count; i++) {
        if (!pool[i].active) {
          const p = pool[i];
          const angle = Math.random() * Math.PI * 2;
          const speed = speedMin + Math.random() * (speedMax - speedMin);
          p.active = true;
          p.x = x;
          p.y = y;
          p.vx = Math.cos(angle) * speed;
          p.vy = Math.sin(angle) * speed - (isGlass ? 70 : 20);
          p.size = isGlass ? 5 + Math.random() * 6 : 2.5 + Math.random() * 3.5;
          p.color = colors[spawned % colors.length];
          p.alpha = 1;
          p.life = 0;
          p.maxLife = isGlass ? 0.65 + Math.random() * 0.35 : 0.28 + Math.random() * 0.32;
          p.isGlassShard = isGlass;
          p.rotation = Math.random() * Math.PI * 2;
          p.vRot = (Math.random() - 0.5) * 14;
          spawned++;
        }
      }
    },
    []
  );

  const spawnFloatingText = useCallback(
    (x: number, y: number, text: string, color: string = '#ffffff', scale: number = 1) => {
      const pool = floatingTextPoolRef.current;
      for (let i = 0; i < pool.length; i++) {
        if (!pool[i].active) {
          const ft = pool[i];
          ft.active = true;
          ft.x = Math.max(64, Math.min(ARENA_WIDTH - 64, x));
          ft.y = y;
          ft.vy = -52;
          ft.text = text;
          ft.color = color;
          ft.life = 0;
          ft.maxLife = 0.85;
          ft.scale = scale;
          break;
        }
      }
    },
    []
  );

  const syncHudFromSim = useCallback(() => {
    const s = simRef.current;
    const nextScore = Math.round(s.score);
    const nextHighScore = Math.round(s.highScore);
    const nextHeat = Math.round(s.heat);
    const nextAmpTimer = Math.ceil(s.ampTimer);
    const nextPerfectPf = s.perfectPfFlashTimer > 0;
    const nextFlavour = s.flavourTimer > 0 ? s.flavourText : null;

    setHud((prev) => {
      if (
        prev.score === nextScore &&
        prev.highScore === nextHighScore &&
        prev.lives === s.lives &&
        prev.world === s.world &&
        prev.level === s.level &&
        prev.heat === nextHeat &&
        prev.powerFactor === s.powerFactor &&
        prev.combo === s.combo &&
        prev.ampLevel === s.ampLevel &&
        prev.ampTimer === nextAmpTimer &&
        prev.shieldHits === s.shieldHits &&
        prev.ballLaunched === s.ballLaunched &&
        prev.perfectPfFlash === nextPerfectPf &&
        prev.flavourText === nextFlavour &&
        prev.levelClearBanner === s.levelClearBanner
      ) {
        return prev;
      }
      return {
        score: nextScore,
        highScore: nextHighScore,
        lives: s.lives,
        world: s.world,
        level: s.level,
        heat: nextHeat,
        powerFactor: s.powerFactor,
        combo: s.combo,
        ampLevel: s.ampLevel,
        ampTimer: nextAmpTimer,
        shieldHits: s.shieldHits,
        ballLaunched: s.ballLaunched,
        perfectPfFlash: nextPerfectPf,
        flavourText: nextFlavour,
        levelClearBanner: s.levelClearBanner,
      };
    });
  }, []);

  const setupStage = useCallback(
    (world: 1 | 2 | 3, level: 1 | 2 | 3 | 4, resetRunStats: boolean) => {
      const s = simRef.current;
      if (resetRunStats) {
        s.score = 0;
        s.lives = 3;
        s.heat = 0;
        s.combo = 0;
        s.powerFactor = 0.7;
        s.peakPowerFactor = 0.7;
        s.ampLevel = 0;
        s.ampTimer = 0;
        s.shieldHits = 0;
      }

      s.world = world;
      s.level = level;
      s.paddleX = ARENA_WIDTH / 2;
      s.paddleWidth = PADDLE_BASE_WIDTH * AMP_WIDTH_MULTIPLIERS[Math.min(3, s.ampLevel)];
      s.ballLaunched = false;
      s.ballSpeed = getStartingBallSpeed(world, level);
      s.ballX = s.paddleX;
      s.ballY = PADDLE_Y - BALL_RADIUS - 2;
      s.ballVx = 0;
      s.ballVy = 0;
      s.ballTrail = [];
      s.bricks = buildLevelBricks(world, level);
      s.boss = level === 4 ? createBossForWorld(world) : null;
      s.bossZaps = [];
      s.powerUps = [];
      s.fuseBlowRespawnTimer = 0;
      s.levelClearTimer = 0;
      s.levelClearBanner = null;
      s.hitstopTimer = 0;
      s.screenShakeTrauma = 0;

      soundEngine.setBossMusicMode(level === 4);
      syncHudFromSim();
    },
    [syncHudFromSim]
  );

  const launchBall = useCallback(() => {
    const s = simRef.current;
    if (s.mode !== 'playing' || s.ballLaunched || s.levelClearTimer > 0 || s.fuseBlowRespawnTimer > 0) {
      return;
    }
    s.ballLaunched = true;
    const initialAngle = (Math.random() - 0.5) * 0.36; // slight upward angle
    s.ballVx = Math.sin(initialAngle) * s.ballSpeed;
    s.ballVy = -Math.cos(initialAngle) * s.ballSpeed;
    soundEngine.playPaddleHit('centre');
    syncHudFromSim();
  }, [syncHudFromSim]);

  const startNewGame = useCallback(() => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    keysHeldRef.current.clear();
    setEndStats(null);
    simRef.current.mode = 'playing';
    document.body.dataset.state = 'playing';
    setGameState('playing');
    setupStage(1, 1, true);
    soundEngine.startMusic(false);
  }, [setupStage]);

  const handleSelectStage = useCallback(
    (world: 1 | 2 | 3, level: 1 | 2 | 3 | 4) => {
      if (!isDebugMode) return;
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      keysHeldRef.current.clear();
      setEndStats(null);
      simRef.current.mode = 'playing';
      document.body.dataset.state = 'playing';
      setGameState('playing');
      setupStage(world, level, false);
      soundEngine.startMusic(level === 4);
    },
    [isDebugMode, setupStage]
  );

  const handleTogglePause = useCallback(() => {
    const s = simRef.current;
    if (s.mode === 'playing') {
      s.mode = 'paused';
      document.body.dataset.state = 'paused';
      setGameState('paused');
      soundEngine.stopMusic();
    } else if (s.mode === 'paused') {
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      keysHeldRef.current.clear();
      s.mode = 'playing';
      document.body.dataset.state = 'playing';
      setGameState('playing');
      soundEngine.startMusic(s.level === 4);
    }
  }, []);

  const handleReturnTitle = useCallback(() => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    keysHeldRef.current.clear();
    const s = simRef.current;
    s.mode = 'title';
    document.body.dataset.state = 'title';
    setGameState('title');
    soundEngine.stopMusic();
    setupStage(1, 1, true);
  }, [setupStage]);

  const handleToggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      soundEngine.setMuted(next);
      if (!next && simRef.current.mode === 'playing') {
        soundEngine.startMusic(simRef.current.level === 4);
      }
      return next;
    });
  }, []);

  const handleToggleCrt = useCallback(() => {
    setCrtEnabled((prev) => !prev);
  }, []);

  const handleToggleReduceFlash = useCallback(() => {
    setReduceFlash((prev) => {
      const next = !prev;
      reduceFlashRef.current = next;
      try {
        window.localStorage.setItem(REDUCE_FLASH_STORAGE_KEY, next ? '1' : '0');
      } catch {
        // ignore storage errors
      }
      return next;
    });
  }, []);

  // Keyboard & Blur Listeners
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const code = e.code;
      const keyLower = e.key.toLowerCase();

      if (keyLower === 'm') {
        e.preventDefault();
        handleToggleMute();
        return;
      }
      if (keyLower === 'c') {
        e.preventDefault();
        handleToggleCrt();
        return;
      }
      if (keyLower === 'f') {
        e.preventDefault();
        handleToggleReduceFlash();
        return;
      }
      if (keyLower === 'p' || code === 'Escape') {
        if (simRef.current.mode === 'playing' || simRef.current.mode === 'paused') {
          e.preventDefault();
          handleTogglePause();
        }
        return;
      }

      if (code === 'Space' || code === 'Enter') {
        if (simRef.current.mode === 'title' || simRef.current.mode === 'gameover') {
          e.preventDefault();
          startNewGame();
          return;
        }
        if (simRef.current.mode === 'playing' && code === 'Space') {
          e.preventDefault();
          launchBall();
          return;
        }
      }

      keysHeldRef.current.add(code);
    };

    const onKeyUp = (e: KeyboardEvent) => {
      keysHeldRef.current.delete(e.code);
    };

    const onBlurOrVisibility = () => {
      keysHeldRef.current.clear();
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlurOrVisibility);
    document.addEventListener('visibilitychange', onBlurOrVisibility);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlurOrVisibility);
      document.removeEventListener('visibilitychange', onBlurOrVisibility);
    };
  }, [
    handleToggleMute,
    handleToggleCrt,
    handleToggleReduceFlash,
    handleTogglePause,
    startNewGame,
    launchBall,
  ]);

  // Main 60fps Canvas Simulation & Render Loop
  useEffect(() => {
    let animationFrameId: number;
    let lastTimestamp = performance.now();
    let lastHudSyncTimestamp = 0;

    const triggerFuseBlow = (s: InternalSimState, isHeatBlow: boolean) => {
      s.lives = Math.max(0, s.lives - 1);
      s.combo = 0;
      s.powerFactor = 0.7;
      s.ballLaunched = false;
      // Reset ball speed to this level's starting speed when a life is lost
      s.ballSpeed = getStartingBallSpeed(s.world, s.level);
      s.ballTrail = [];
      s.bossZaps = [];

      if (isHeatBlow) {
        // Satisfying glass-shatter animation: glass shards, sparks, flash (max ~60% when off, 15% when reduceFlash on), screen shake
        soundEngine.playFuseBlowGlassShatter();
        s.screenFlashAlpha = reduceFlashRef.current ? 0.15 : 0.6;
        s.screenFlashColor = '#ffffff';
        s.screenShakeTrauma = 1.0;
        s.hitstopTimer = 0.07;
        spawnParticleBurst(
          s.paddleX,
          PADDLE_Y + PADDLE_HEIGHT / 2,
          36,
          ['#e0f2fe', '#38bdf8', '#ffffff', '#ff6b00', '#fde047'],
          90,
          380,
          true
        );
        spawnFloatingText(s.paddleX, PADDLE_Y - 28, 'FUSE BLOWN! (100% HEAT)', '#ef4444', 1.25);
      } else {
        // Ball dropped below bottom
        soundEngine.playZapHitPlayer();
        s.screenShakeTrauma = 0.65;
        s.screenFlashAlpha = reduceFlashRef.current ? 0.15 : 0.45;
        s.screenFlashColor = '#ef4444';
        spawnParticleBurst(s.ballX, ARENA_HEIGHT - 12, 20, ['#ff6b00', '#ef4444', '#fde047']);
        spawnFloatingText(s.paddleX, PADDLE_Y - 24, 'SURGE LOST!', '#f97316', 1.15);
      }

      // Reset heat to 0 on respawn
      s.heat = 0;
      s.fuseBlowRespawnTimer = 0.65;
      syncHudFromSim();
    };

    const addScore = (s: InternalSimState, points: number) => {
      if (points <= 0) return;
      let pendingPoints = points;

      while (pendingPoints > 0) {
        const prevScore = s.score;
        s.score += pendingPoints;
        pendingPoints = 0;

        // Check 25,000-point extra life milestone (with 6-life cap)
        const milestoneCount = checkExtraLifeMilestone(prevScore, s.score);
        if (milestoneCount > 0) {
          const reward = applyExtraLifeReward(s.lives, milestoneCount);
          s.lives = reward.newLives;
          soundEngine.playPowerUp('AFTER_HOURS');
          if (reward.livesAdded > 0) {
            spawnFloatingText(
              s.paddleX,
              PADDLE_Y - 42,
              getExtraLifeMilestoneMessage(s.score),
              '#facc15',
              1.25
            );
          }
          if (reward.cappedCount > 0) {
            pendingPoints += reward.bonusPoints;
            spawnFloatingText(
              s.paddleX,
              PADDLE_Y - 58,
              'MAX FUSES · +2,500',
              '#facc15',
              1.2
            );
          }
        }
      }

      if (s.score > s.highScore) {
        if (!isDebugMode) {
          s.highScore = s.score;
          try {
            window.localStorage.setItem(HIGH_SCORE_STORAGE_KEY, String(Math.round(s.highScore)));
          } catch {
            // ignore storage quota errors
          }
        }
      }
    };

    const collectPowerUpCapsule = (
      s: InternalSimState,
      pu: FallingPowerUp,
      isClearSweep: boolean = false,
      playSound: boolean = true
    ) => {
      if (playSound) {
        soundEngine.playPowerUp(pu.type);
      }
      const meta = POWERUP_CATALOG[pu.type];
      addScore(s, 250);

      const textX = pu.x;
      const textY = isClearSweep
        ? Math.max(96, Math.min(PADDLE_Y - 24, pu.y))
        : PADDLE_Y - 22;

      if (pu.type === 'CIRCUIT_BREAKER') {
        s.shieldHits = 2;
        spawnFloatingText(textX, textY, 'CIRCUIT BREAKER SHIELD ONLINE!', '#00e5ff', 1.15);
      } else if (pu.type === 'HIGHER_AMP') {
        s.ampLevel = Math.min(3, s.ampLevel + 1);
        s.ampTimer = 15;
        s.paddleWidth = PADDLE_BASE_WIDTH * AMP_WIDTH_MULTIPLIERS[Math.min(3, s.ampLevel)];
        const ampLabel = AMP_LEVEL_LABELS[s.ampLevel];
        spawnFloatingText(textX, textY, `UPGRADED TO ${ampLabel} FUSE!`, '#ff6b00', 1.15);
      } else if (pu.type === 'COOLING') {
        s.heat = 0;
        s.screenFlashAlpha = reduceFlashRef.current ? 0.15 : 0.5;
        s.screenFlashColor = '#38bdf8';
        spawnParticleBurst(s.paddleX, PADDLE_Y, 24, ['#38bdf8', '#e0f2fe', '#00e5ff']);
        spawnFloatingText(textX, textY, 'THERMAL RESET · 0% HEAT!', '#38bdf8', 1.2);
      } else if (pu.type === 'AFTER_HOURS') {
        const reward = applyExtraLifeReward(s.lives, 1);
        s.lives = reward.newLives;
        spawnParticleBurst(s.paddleX, PADDLE_Y, 24, ['#facc15', '#ff6b00', '#ffffff']);
        if (reward.livesAdded > 0) {
          spawnFloatingText(textX, textY - 4, 'AFTER-HOURS CALL-OUT · +1 LIFE!', '#facc15', 1.25);
        } else {
          addScore(s, reward.bonusPoints);
          spawnFloatingText(textX, textY - 4, 'MAX FUSES · +2,500', '#facc15', 1.25);
        }
      }

      spawnParticleBurst(pu.x, pu.y, 10, [meta.color, '#ffffff']);
    };

    const collectAllFallingPowerUpsOnClear = (s: InternalSimState) => {
      if (s.powerUps.length === 0) return;
      // Play a single pick-up sound for the whole sweep so it doesn't clash with the level-clear jingle
      soundEngine.playPowerUp(s.powerUps[0].type);
      for (let i = 0; i < s.powerUps.length; i++) {
        collectPowerUpCapsule(s, s.powerUps[i], true, false);
      }
      s.powerUps = [];
    };

    const advanceToNextStage = (s: InternalSimState) => {
      if (s.level < 4) {
        const nextLevel = (s.level + 1) as 1 | 2 | 3 | 4;
        setupStage(s.world, nextLevel, false);
      } else if (s.world < 3) {
        const nextWorld = (s.world + 1) as 1 | 2 | 3;
        setupStage(nextWorld, 1, false);
      } else {
        // Victory! Beat World 3 Boss
        soundEngine.stopMusic();
        soundEngine.playVictoryJingle();
        const stats: EndOfRunStats = {
          outcome: 'victory',
          score: s.score,
          highScore: s.highScore,
          worldReached: 3,
          levelReached: 4,
          peakPowerFactor: s.peakPowerFactor,
          livesRemaining: s.lives,
        };
        setEndStats(stats);
        s.mode = 'gameover';
        document.body.dataset.state = 'gameover';
        setGameState('gameover');
      }
    };

    const stepSimulation = (rawDt: number, nowMs: number) => {
      const dt = Math.min(rawDt, 0.05);
      const s = simRef.current;
      s.elapsedTime += dt;

      // Decay screen flash & camera trauma in real dt
      if (s.screenFlashAlpha > 0) {
        s.screenFlashAlpha = Math.max(0, s.screenFlashAlpha - dt * 2.8);
      }
      if (s.screenShakeTrauma > 0) {
        s.screenShakeTrauma = Math.max(0, s.screenShakeTrauma - dt * 2.4);
      }
      if (s.perfectPfFlashTimer > 0) {
        s.perfectPfFlashTimer = Math.max(0, s.perfectPfFlashTimer - dt);
      }

      // Update pooled particles & floating texts
      const pPool = particlePoolRef.current;
      for (let i = 0; i < pPool.length; i++) {
        const p = pPool[i];
        if (!p.active) continue;
        p.life += dt;
        if (p.life >= p.maxLife) {
          p.active = false;
          continue;
        }
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += (p.isGlassShard ? 420 : 180) * dt;
        p.rotation += p.vRot * dt;
        p.alpha = 1 - p.life / p.maxLife;
      }

      const ftPool = floatingTextPoolRef.current;
      for (let i = 0; i < ftPool.length; i++) {
        const ft = ftPool[i];
        if (!ft.active) continue;
        ft.life += dt;
        if (ft.life >= ft.maxLife) {
          ft.active = false;
          continue;
        }
        ft.y += ft.vy * dt;
      }

      // Title screen interactive centerpiece demo loop
      if (s.mode === 'title') {
        const targetX =
          pointerTargetXRef.current !== null
            ? pointerTargetXRef.current
            : ARENA_WIDTH / 2 + Math.sin(s.elapsedTime * 1.6) * 210;
        const halfW = s.paddleWidth / 2;
        s.paddleX = Math.max(halfW + 16, Math.min(ARENA_WIDTH - halfW - 16, targetX));
        s.ballX = s.paddleX + Math.sin(s.elapsedTime * 5) * 18;
        s.ballY = PADDLE_Y - BALL_RADIUS - 10 - Math.abs(Math.cos(s.elapsedTime * 4)) * 22;
        return;
      }

      if (s.mode !== 'playing') {
        return;
      }

      // Flavour message rotation
      if (s.flavourTimer > 0) {
        s.flavourTimer = Math.max(0, s.flavourTimer - dt);
      } else {
        s.flavourCooldown -= dt;
        if (s.flavourCooldown <= 0) {
          const nextMsg =
            FLAVOUR_MESSAGES[Math.floor(Math.random() * FLAVOUR_MESSAGES.length)];
          s.flavourText = nextMsg;
          s.flavourTimer = 4.5;
          s.flavourCooldown = 14 + Math.random() * 6;
        }
      }

      // Level Clear Banner transition countdown
      if (s.levelClearTimer > 0) {
        s.levelClearTimer -= dt;
        if (s.levelClearTimer <= 0) {
          s.levelClearBanner = null;
          advanceToNextStage(s);
        }
        return;
      }

      // Fuse Blow / Life Lost Respawn timer
      if (s.fuseBlowRespawnTimer > 0) {
        s.fuseBlowRespawnTimer -= dt;
        if (s.fuseBlowRespawnTimer <= 0) {
          if (s.lives <= 0) {
            soundEngine.stopMusic();
            soundEngine.playGameOverJingle();
            const stats: EndOfRunStats = {
              outcome: 'defeat',
              score: s.score,
              highScore: s.highScore,
              worldReached: s.world,
              levelReached: s.level,
              peakPowerFactor: s.peakPowerFactor,
              livesRemaining: 0,
            };
            setEndStats(stats);
            s.mode = 'gameover';
            document.body.dataset.state = 'gameover';
            setGameState('gameover');
            return;
          }
          s.ballX = s.paddleX;
          s.ballY = PADDLE_Y - BALL_RADIUS - 2;
        }
        return;
      }

      // Hitstop freeze timer (pauses physics on heavy impacts while keeping shake/particles live)
      if (s.hitstopTimer > 0) {
        s.hitstopTimer = Math.max(0, s.hitstopTimer - dt);
        return;
      }

      // 1. Paddle Movement (Keyboard A/D/Arrows + Mouse/Touch pointer)
      const keys = keysHeldRef.current;
      const moveLeft = keys.has('ArrowLeft') || keys.has('KeyA');
      const moveRight = keys.has('ArrowRight') || keys.has('KeyD');
      const keyboardSpeed = 640;

      if (moveLeft || moveRight) {
        pointerTargetXRef.current = null; // Keyboard overrides pointer target
        const dir = (moveRight ? 1 : 0) - (moveLeft ? 1 : 0);
        s.paddleX += dir * keyboardSpeed * dt;
      } else if (pointerTargetXRef.current !== null) {
        const diff = pointerTargetXRef.current - s.paddleX;
        s.paddleX += diff * Math.min(1, dt * 28);
      }

      // Update Amp Rating timer & paddle width
      if (s.ampLevel > 0) {
        s.ampTimer -= dt;
        if (s.ampTimer <= 0) {
          s.ampLevel = 0;
          s.ampTimer = 0;
        }
      }
      s.paddleWidth = PADDLE_BASE_WIDTH * AMP_WIDTH_MULTIPLIERS[Math.min(3, s.ampLevel)];
      const halfPaddle = s.paddleWidth / 2;
      s.paddleX = Math.max(halfPaddle + 14, Math.min(ARENA_WIDTH - halfPaddle - 14, s.paddleX));

      // 2. Passive Heat Cooling (-1% per second when below 80%) & High Heat Warning Buzzer
      s.heat = stepPassiveCooling(s.heat, dt);
      if (isHighHeatWarning(s.heat)) {
        soundEngine.playHeatWarningBuzzer(nowMs);
      }

      // Decay brick hit flashes
      for (let i = 0; i < s.bricks.length; i++) {
        if (s.bricks[i].hitFlash > 0) {
          s.bricks[i].hitFlash = Math.max(0, s.bricks[i].hitFlash - dt);
        }
      }

      // 3. Update Falling Power-Up Capsules
      for (let i = s.powerUps.length - 1; i >= 0; i--) {
        const pu = s.powerUps[i];
        pu.y += pu.vy * dt;
        pu.pulse += dt * 6;

        // Check paddle catch
        const caughtX =
          pu.x + pu.width / 2 >= s.paddleX - halfPaddle &&
          pu.x - pu.width / 2 <= s.paddleX + halfPaddle;
        const caughtY =
          pu.y + pu.height / 2 >= PADDLE_Y &&
          pu.y - pu.height / 2 <= PADDLE_Y + PADDLE_HEIGHT;

        if (caughtX && caughtY) {
          collectPowerUpCapsule(s, pu, false);
          s.powerUps.splice(i, 1);
          continue;
        }

        if (pu.y - pu.height / 2 > ARENA_HEIGHT) {
          s.powerUps.splice(i, 1);
        }
      }

      // 4. Update Boss AI, Telegraphs & Downward Zaps
      if (s.boss && s.boss.hp > 0) {
        const boss = s.boss;
        if (boss.hitFlash > 0) {
          boss.hitFlash = Math.max(0, boss.hitFlash - dt);
        }

        const hpRatio = boss.hp / boss.maxHp;
        boss.angerPhase = hpRatio <= 0.33 ? 3 : hpRatio <= 0.66 ? 2 : 1;
        const speedMult = boss.angerPhase === 3 ? 1.55 : boss.angerPhase === 2 ? 1.25 : 1.0;

        boss.x += boss.vx * speedMult * dt;
        if (boss.x <= 36) {
          boss.x = 36;
          boss.vx = Math.abs(boss.vx);
        } else if (boss.x + boss.width >= ARENA_WIDTH - 36) {
          boss.x = ARENA_WIDTH - 36 - boss.width;
          boss.vx = -Math.abs(boss.vx);
        }

        // Boss attack cooldown -> spawn visible windup telegraphs
        boss.attackCooldown -= dt * speedMult;
        if (boss.attackCooldown <= 0) {
          boss.attackCooldown = boss.world === 1 ? 2.5 : boss.world === 2 ? 2.0 : 1.65;
          const volleyCount = boss.world === 1 ? 1 : boss.world === 2 ? 2 : 3;
          soundEngine.playBossTelegraph();

          for (let v = 0; v < volleyCount; v++) {
            const emitterX =
              boss.x + ((v + 1) * boss.width) / (volleyCount + 1);
            const emitterY = boss.y + boss.height;
            // Aim loosely toward player paddle with spread
            const aimSpread = (v - (volleyCount - 1) / 2) * 55;
            const dx = s.paddleX + aimSpread - emitterX;
            const dy = PADDLE_Y - emitterY;
            const dist = Math.max(1, Math.hypot(dx, dy));
            const zapSpeed = 270 + boss.world * 40 + (boss.angerPhase - 1) * 35;

            boss.telegraphs.push({
              x: emitterX,
              y: emitterY,
              vx: (dx / dist) * zapSpeed,
              vy: (dy / dist) * zapSpeed,
              timer: 0.55,
              maxTimer: 0.55,
            });
          }
        }

        // Tick windup telegraphs -> fire active BossZaps
        for (let t = boss.telegraphs.length - 1; t >= 0; t--) {
          const tel = boss.telegraphs[t];
          tel.timer -= dt;
          if (tel.timer <= 0) {
            soundEngine.playBossZap();
            s.bossZaps.push({
              id: s.nextZapId++,
              x: tel.x,
              y: tel.y,
              vx: tel.vx,
              vy: tel.vy,
              width: 12,
              height: 26,
              phase: 0,
            });
            boss.telegraphs.splice(t, 1);
          }
        }
      }

      // Tick active BossZaps and check collision with player fuse paddle
      for (let z = s.bossZaps.length - 1; z >= 0; z--) {
        const zap = s.bossZaps[z];
        zap.x += zap.vx * dt;
        zap.y += zap.vy * dt;
        zap.phase += dt * 20;

        const hitPaddleX =
          zap.x + zap.width / 2 >= s.paddleX - halfPaddle &&
          zap.x - zap.width / 2 <= s.paddleX + halfPaddle;
        const hitPaddleY =
          zap.y + zap.height / 2 >= PADDLE_Y &&
          zap.y - zap.height / 2 <= PADDLE_Y + PADDLE_HEIGHT;

        if (hitPaddleX && hitPaddleY) {
          s.bossZaps.splice(z, 1);
          s.heat = Math.min(100, s.heat + 20);
          soundEngine.playZapHitPlayer();
          s.screenShakeTrauma = 0.55;
          s.screenFlashAlpha = reduceFlashRef.current ? 0.15 : 0.35;
          s.screenFlashColor = '#ef4444';
          spawnParticleBurst(zap.x, PADDLE_Y, 16, ['#fde047', '#ef4444', '#ff6b00']);
          spawnFloatingText(s.paddleX, PADDLE_Y - 24, 'ZAP HIT! +20% HEAT', '#ef4444', 1.15);

          if (s.heat >= 100) {
            triggerFuseBlow(s, true);
            return;
          }
          continue;
        }

        if (zap.y > ARENA_HEIGHT + 30 || zap.x < -30 || zap.x > ARENA_WIDTH + 30) {
          s.bossZaps.splice(z, 1);
        }
      }

      // 5. Ball Movement & Substepped Swept Collision Physics
      if (!s.ballLaunched) {
        s.ballX = s.paddleX;
        s.ballY = PADDLE_Y - BALL_RADIUS - 2;
        return;
      }

      // Gradually ramp ball speed within each level
      s.ballSpeed = Math.min(MAX_BALL_SPEED, s.ballSpeed + 3.2 * dt);
      const currentSpeed = Math.max(1, Math.hypot(s.ballVx, s.ballVy));
      s.ballVx = (s.ballVx / currentSpeed) * s.ballSpeed;
      s.ballVy = (s.ballVy / currentSpeed) * s.ballSpeed;

      // Record trail point
      s.ballTrail.push({ x: s.ballX, y: s.ballY });
      if (s.ballTrail.length > 9) {
        s.ballTrail.shift();
      }

      const substeps = Math.max(3, Math.ceil((s.ballSpeed * dt) / (BALL_RADIUS * 0.65)));
      const subDt = dt / substeps;

      for (let step = 0; step < substeps; step++) {
        s.ballX += s.ballVx * subDt;
        s.ballY += s.ballVy * subDt;

        // Arena left/right walls
        if (s.ballX - BALL_RADIUS <= 12) {
          s.ballX = 12 + BALL_RADIUS;
          s.ballVx = Math.abs(s.ballVx);
          soundEngine.playBrickHit(0, false, true);
        } else if (s.ballX + BALL_RADIUS >= ARENA_WIDTH - 12) {
          s.ballX = ARENA_WIDTH - 12 - BALL_RADIUS;
          s.ballVx = -Math.abs(s.ballVx);
          soundEngine.playBrickHit(0, false, true);
        }

        // Arena top ceiling
        if (s.ballY - BALL_RADIUS <= 64) {
          s.ballY = 64 + BALL_RADIUS;
          s.ballVy = Math.abs(s.ballVy);
          soundEngine.playBrickHit(0, false, true);
        }

        // Paddle collision (only when ball is moving downward)
        if (
          s.ballVy > 0 &&
          s.ballY + BALL_RADIUS >= PADDLE_Y &&
          s.ballY - BALL_RADIUS <= PADDLE_Y + PADDLE_HEIGHT &&
          s.ballX + BALL_RADIUS >= s.paddleX - halfPaddle &&
          s.ballX - BALL_RADIUS <= s.paddleX + halfPaddle
        ) {
          const catchRes = evaluatePaddleCatch(
            s.heat,
            s.ballX,
            s.paddleX,
            s.paddleWidth,
            s.combo
          );

          s.heat = catchRes.newHeat;
          s.combo = 0;
          s.powerFactor = 0.7;

          // Visual + audio feedback on catch
          soundEngine.playPaddleHit(catchRes.zone);
          if (catchRes.zone === 'centre') {
            spawnParticleBurst(s.ballX, PADDLE_Y, 8, ['#00e5ff', '#e0f2fe']);
            const msg = getCentreCatchMessage(catchRes.heatDelta);
            spawnFloatingText(s.ballX, PADDLE_Y - 18, msg.text, msg.color, 0.95);
          } else {
            spawnParticleBurst(s.ballX, PADDLE_Y, 12, ['#ff6b00', '#fde047']);
            spawnFloatingText(
              s.ballX,
              PADDLE_Y - 18,
              `EDGE DEFLECT +${catchRes.heatDelta}% HEAT!`,
              '#ff6b00',
              1.0
            );
          }

          // Check if fuse blew from hitting 100% heat!
          if (catchRes.fuseBlown) {
            triggerFuseBlow(s, true);
            return;
          }

          s.ballY = PADDLE_Y - BALL_RADIUS - 1;
          s.ballVx = Math.sin(catchRes.bounceAngleRad) * s.ballSpeed;
          s.ballVy = -Math.cos(catchRes.bounceAngleRad) * s.ballSpeed;
          break;
        }

        // Circuit Breaker bottom shield bounce
        const shieldY = PADDLE_Y + PADDLE_HEIGHT + 16;
        if (
          s.shieldHits > 0 &&
          s.ballVy > 0 &&
          s.ballY + BALL_RADIUS >= shieldY - 4 &&
          s.ballY - BALL_RADIUS <= shieldY + 8
        ) {
          s.shieldHits -= 1;
          s.ballY = shieldY - BALL_RADIUS - 5;
          s.ballVy = -Math.abs(s.ballVy);
          soundEngine.playPowerUp('CIRCUIT_BREAKER');
          spawnParticleBurst(s.ballX, shieldY, 16, ['#00e5ff', '#ffffff']);
          spawnFloatingText(s.ballX, shieldY - 20, 'BREAKER TRIPPED · SAVED!', '#00e5ff', 1.1);
          break;
        }

        // Ball fell off the bottom of the screen
        if (s.ballY - BALL_RADIUS > ARENA_HEIGHT) {
          triggerFuseBlow(s, false);
          return;
        }

        // Boss collision (on Boss levels)
        if (s.boss && s.boss.hp > 0) {
          const bossCol = testBallVsAABB(s.ballX, s.ballY, BALL_RADIUS, s.boss);
          if (bossCol.hit) {
            s.ballX += bossCol.normalX * (bossCol.penetration + 1.5);
            s.ballY += bossCol.normalY * (bossCol.penetration + 1.5);
            if (Math.abs(bossCol.normalX) > Math.abs(bossCol.normalY)) {
              s.ballVx = bossCol.normalX > 0 ? Math.abs(s.ballVx) : -Math.abs(s.ballVx);
            } else {
              s.ballVy = bossCol.normalY > 0 ? Math.abs(s.ballVy) : -Math.abs(s.ballVy);
            }

            if (s.boss.hitFlash <= 0) {
              s.boss.hp -= 1;
              s.boss.hitFlash = 0.16;
              s.combo += 1;
              s.powerFactor = calculatePowerFactor(s.combo);
              if (s.powerFactor > s.peakPowerFactor) {
                s.peakPowerFactor = s.powerFactor;
              }
              if (s.powerFactor >= 0.99 && s.perfectPfFlashTimer <= 0) {
                s.perfectPfFlashTimer = 2.0;
                spawnFloatingText(s.ballX, s.ballY - 24, 'PERFECT 0.99 PF!', '#00e5ff', 1.25);
              }

              const pts = calculateBrickScore(250, s.combo);
              addScore(s, pts);
              soundEngine.playBrickHit(s.combo, s.boss.hp <= 0, false);
              spawnParticleBurst(
                bossCol.contactX,
                bossCol.contactY,
                16,
                ['#ff6b00', '#00e5ff', '#fde047']
              );
              spawnFloatingText(bossCol.contactX, bossCol.contactY, `+${pts}`, '#ffb703', 1.1);

              // Occasional power-up drop from Boss hits
              if (s.boss.hp > 0 && s.boss.hp % 5 === 0) {
                const pType = selectPowerUpFromRoll(Math.random(), s.heat, s.lives);
                s.powerUps.push({
                  id: s.nextPowerUpId++,
                  type: pType,
                  x: bossCol.contactX,
                  y: bossCol.contactY + 12,
                  vy: 135,
                  width: 84,
                  height: 22,
                  pulse: 0,
                });
              }

              if (s.boss.hp <= 0) {
                // Boss defeated! Treat any falling power-up capsules as caught
                collectAllFallingPowerUpsOnClear(s);
                s.hitstopTimer = 0.08;
                s.screenShakeTrauma = 1.0;
                s.screenFlashAlpha = reduceFlashRef.current ? 0.15 : 0.55;
                s.screenFlashColor = '#00e5ff';
                addScore(s, 2500 * s.world);
                spawnParticleBurst(
                  s.boss.x + s.boss.width / 2,
                  s.boss.y + s.boss.height / 2,
                  45,
                  ['#ff6b00', '#00e5ff', '#ffffff', '#facc15'],
                  80,
                  380
                );
                soundEngine.playLevelClearJingle();
                s.levelClearBanner = WORLDS[s.world].clearMessage;
                s.levelClearTimer = 2.6;
                return;
              }
            }
            break;
          }
        }

        // Brick collisions
        for (let i = 0; i < s.bricks.length; i++) {
          const brick = s.bricks[i];
          if (brick.hp <= 0) continue;

          const col = testBallVsAABB(s.ballX, s.ballY, BALL_RADIUS, brick);
          if (!col.hit) continue;

          // Push ball out of brick and reflect velocity along outward normal
          s.ballX += col.normalX * (col.penetration + 0.5);
          s.ballY += col.normalY * (col.penetration + 0.5);
          if (Math.abs(col.normalX) > Math.abs(col.normalY)) {
            s.ballVx = col.normalX > 0 ? Math.abs(s.ballVx) : -Math.abs(s.ballVx);
          } else {
            s.ballVy = col.normalY > 0 ? Math.abs(s.ballVy) : -Math.abs(s.ballVy);
          }

          // Prevent near-horizontal infinite loops
          if (Math.abs(s.ballVy) < 95) {
            s.ballVy = (s.ballVy >= 0 ? 1 : -1) * 110;
          }

          if (brick.indestructible) {
            brick.hitFlash = 0.08;
            soundEngine.playBrickHit(s.combo, false, true);
            spawnParticleBurst(col.contactX, col.contactY, 6, ['#94a3b8', '#f59e0b']);
            break;
          }

          brick.hp -= 1;
          brick.hitFlash = 0.12;
          s.combo += 1;
          const prevPf = s.powerFactor;
          s.powerFactor = calculatePowerFactor(s.combo);
          if (s.powerFactor > s.peakPowerFactor) {
            s.peakPowerFactor = s.powerFactor;
          }
          if (s.powerFactor >= 0.99 && prevPf < 0.99) {
            s.perfectPfFlashTimer = 2.2;
            spawnFloatingText(brick.x + brick.width / 2, brick.y, 'PERFECT PF 0.99!', '#00e5ff', 1.25);
          }

          const eqMeta = EQUIPMENT_CATALOG[brick.equipment];
          const destroyed = brick.hp <= 0;
          const basePts = destroyed ? eqMeta.basePoints : Math.round(eqMeta.basePoints * 0.35);
          const pts = calculateBrickScore(basePts, s.combo);
          addScore(s, pts);

          soundEngine.playBrickHit(s.combo, destroyed, false);

          if (destroyed) {
            s.hitstopTimer = 0.025;
            s.screenShakeTrauma = Math.min(0.45, s.screenShakeTrauma + 0.14);
            spawnParticleBurst(
              brick.x + brick.width / 2,
              brick.y + brick.height / 2,
              16,
              [eqMeta.accentColor, eqMeta.secondaryColor, '#ffffff']
            );
            spawnFloatingText(
              brick.x + brick.width / 2,
              brick.y + brick.height / 2,
              `+${pts}`,
              eqMeta.accentColor,
              1.05
            );

            // 22% chance to drop a Power-Up capsule
            if (Math.random() < 0.22) {
              const pType: PowerUpType = selectPowerUpFromRoll(
                Math.random(),
                s.heat,
                s.lives
              );
              s.powerUps.push({
                id: s.nextPowerUpId++,
                type: pType,
                x: brick.x + brick.width / 2,
                y: brick.y + brick.height / 2,
                vy: 130,
                width: 84,
                height: 22,
                pulse: 0,
              });
            }

            // Check if regular level is cleared
            if (s.level < 4 && isRegularLevelCleared(s.bricks)) {
              // Treat any falling power-up capsules as caught before clearing
              collectAllFallingPowerUpsOnClear(s);
              soundEngine.playLevelClearJingle();
              s.levelClearBanner = WORLDS[s.world].clearMessage;
              s.levelClearTimer = 2.3;
              return;
            }
          } else {
            spawnParticleBurst(col.contactX, col.contactY, 7, [eqMeta.accentColor, '#ffffff']);
          }

          break;
        }
      }
    };

    const renderFrame = (ctx: CanvasRenderingContext2D) => {
      const s = simRef.current;
      ctx.save();

      // Decaying trauma^2 camera shake (cut to 25% when Reduce Flash is ON)
      if (s.screenShakeTrauma > 0) {
        const shakeScale = reduceFlashRef.current ? 0.25 : 1.0;
        const shake = s.screenShakeTrauma * s.screenShakeTrauma * 11 * shakeScale;
        const dx = (Math.random() - 0.5) * 2 * shake;
        const dy = (Math.random() - 0.5) * 2 * shake;
        ctx.translate(dx, dy);
      }

      // 1. Background circuit board
      drawCircuitBackground(ctx, s.elapsedTime, s.world, isHighHeatWarning(s.heat));

      // Playfield subtle border frame
      ctx.strokeStyle = 'rgba(255, 107, 0, 0.28)';
      ctx.lineWidth = 2;
      ctx.strokeRect(12, 64, ARENA_WIDTH - 24, ARENA_HEIGHT - 70);

      // 2. Equipment Bricks
      for (let i = 0; i < s.bricks.length; i++) {
        drawEquipmentBrick(ctx, s.bricks[i]);
      }

      // 3. Boss & Downward Zaps
      if (s.boss && s.boss.hp > 0) {
        drawBossAndZaps(ctx, s.boss, s.bossZaps, s.elapsedTime);
      }

      // 4. Circuit Breaker Shield Line
      drawCircuitBreakerShield(ctx, s.shieldHits, s.elapsedTime);

      // 5. Falling Power-Up Capsules
      for (let i = 0; i < s.powerUps.length; i++) {
        drawPowerUpCapsule(ctx, s.powerUps[i]);
      }

      // 6. Glass Cartridge Fuse Paddle (hidden briefly while shattered)
      if (s.fuseBlowRespawnTimer <= 0) {
        drawFusePaddle(
          ctx,
          s.paddleX,
          s.paddleWidth,
          s.heat,
          s.ampLevel,
          s.elapsedTime
        );
      }

      // 7. Crackling Surge Ball
      if (s.fuseBlowRespawnTimer <= 0) {
        drawSurgeBall(ctx, s.ballX, s.ballY, s.ballTrail, s.elapsedTime);
      }

      // 8. Pooled Sparks & Glass Shards
      const pPool = particlePoolRef.current;
      for (let i = 0; i < pPool.length; i++) {
        const p = pPool[i];
        if (!p.active) continue;
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.fillStyle = p.color;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        if (p.isGlassShard) {
          ctx.beginPath();
          ctx.moveTo(-p.size, -p.size * 0.5);
          ctx.lineTo(p.size, 0);
          ctx.lineTo(-p.size * 0.3, p.size * 0.8);
          ctx.closePath();
          ctx.fill();
        } else {
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        }
        ctx.restore();
      }

      // 9. Pooled Score & Status Pop-ups
      const ftPool = floatingTextPoolRef.current;
      for (let i = 0; i < ftPool.length; i++) {
        const ft = ftPool[i];
        if (!ft.active) continue;
        const alpha = Math.max(0, 1 - ft.life / ft.maxLife);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.font = `700 ${Math.round(12 * ft.scale)}px "Press Start 2P", monospace`;
        ctx.textAlign = 'center';
        ctx.strokeStyle = '#090d16';
        ctx.lineWidth = 4;
        ctx.strokeText(ft.text, ft.x, ft.y);
        ctx.fillStyle = ft.color;
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.restore();
      }

      // 10. Full-arena flash on Fuse Blow or Frosty Cooling pickup
      // Capped to <= 15% opacity when Reduce Flash is ON, and <= 60% when OFF
      if (s.screenFlashAlpha > 0) {
        ctx.fillStyle = s.screenFlashColor;
        const maxAlpha = reduceFlashRef.current ? 0.15 : 0.6;
        ctx.globalAlpha = Math.min(maxAlpha, s.screenFlashAlpha);
        ctx.fillRect(0, 0, ARENA_WIDTH, ARENA_HEIGHT);
        ctx.globalAlpha = 1;
      }

      ctx.restore();
    };

    const loop = (nowMs: number) => {
      const rawDt = (nowMs - lastTimestamp) / 1000;
      lastTimestamp = nowMs;

      stepSimulation(rawDt, nowMs);

      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          renderFrame(ctx);
        }
      }

      // Throttle React HUD state synchronization to ~15Hz while playing
      if (simRef.current.mode === 'playing' && nowMs - lastHudSyncTimestamp > 65) {
        lastHudSyncTimestamp = nowMs;
        syncHudFromSim();
      }

      animationFrameId = window.requestAnimationFrame(loop);
    };

    animationFrameId = window.requestAnimationFrame(loop);
    return () => {
      window.cancelAnimationFrame(animationFrameId);
    };
  }, [setupStage, spawnFloatingText, spawnParticleBurst, syncHudFromSim, isDebugMode]);

  // Convert client pointer X to arena X coordinate via live getBoundingClientRect()
  const updatePointerX = useCallback((clientX: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0) return;
    const scaleX = ARENA_WIDTH / rect.width;
    pointerTargetXRef.current = (clientX - rect.left) * scaleX;
  }, []);

  // Attach non-passive touch listeners on the game canvas so dragging/tapping on phones/tablets
  // never scrolls the page, pull-to-refreshes, pinch-zooms, or double-tap zooms
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleTouchStart = (e: TouchEvent) => {
      if (e.cancelable) {
        e.preventDefault();
      }
      if (e.touches.length > 0) {
        updatePointerX(e.touches[0].clientX);
      }
      if (simRef.current.mode === 'playing') {
        launchBall();
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.cancelable) {
        e.preventDefault();
      }
      if (e.touches.length > 0) {
        updatePointerX(e.touches[0].clientX);
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (e.cancelable) {
        e.preventDefault();
      }
    };

    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd, { passive: false });

    return () => {
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchmove', handleTouchMove);
      canvas.removeEventListener('touchend', handleTouchEnd);
    };
  }, [launchBall, updatePointerX]);

  return (
    <main
      className={`relative w-screen h-screen overflow-hidden bg-[#090d16] flex items-center justify-center select-none ${
        reduceFlash ? 'reduce-flash' : ''
      }`}
    >
      {/* Isolated Full-Viewport Responsive Game Canvas Container */}
      <div className="relative w-full h-full flex items-center justify-center pt-2 pb-4 [@media(max-height:480px)]:pt-6 [@media(max-height:480px)]:pb-3.5">
        <canvas
          ref={canvasRef}
          width={ARENA_WIDTH}
          height={ARENA_HEIGHT}
          data-testid="game-canvas"
          onMouseMove={(e) => updatePointerX(e.clientX)}
          onClick={() => {
            if (simRef.current.mode === 'playing') {
              launchBall();
            }
          }}
          className="max-w-full max-h-full aspect-[4/3] w-auto h-auto object-contain shadow-[0_0_60px_rgba(0,0,0,0.95)] cursor-crosshair touch-none"
        />
      </div>

      {/* Optional CRT Scanlines & Vignette Overlay (Toggleable with [C]) */}
      {crtEnabled && (
        <div
          className="fixed inset-0 z-40 pointer-events-none crt-scanlines"
          data-testid="crt-overlay"
          aria-hidden="true"
        />
      )}

      {/* Title Screen Overlay */}
      {gameState === 'title' && (
        <TitleScreen
          highScore={hud.highScore}
          muted={muted}
          crtEnabled={crtEnabled}
          reduceFlash={reduceFlash}
          onStartGame={startNewGame}
          onToggleMute={handleToggleMute}
          onToggleCrt={handleToggleCrt}
          onToggleReduceFlash={handleToggleReduceFlash}
        />
      )}

      {/* Active Gameplay Perimeter HUD */}
      {gameState === 'playing' && (
        <HudOverlay
          hud={hud}
          muted={muted}
          crtEnabled={crtEnabled}
          reduceFlash={reduceFlash}
          onToggleMute={handleToggleMute}
          onToggleCrt={handleToggleCrt}
          onToggleReduceFlash={handleToggleReduceFlash}
          onPause={handleTogglePause}
        />
      )}

      {/* Pause / Victory / Game Over Modal */}
      {(gameState === 'paused' || gameState === 'gameover') && (
        <StatusModal
          mode={gameState}
          endStats={endStats}
          currentWorld={hud.world}
          currentLevel={hud.level}
          muted={muted}
          crtEnabled={crtEnabled}
          reduceFlash={reduceFlash}
          debugMode={isDebugMode}
          onResume={handleTogglePause}
          onRestartRun={startNewGame}
          onSelectStage={handleSelectStage}
          onReturnTitle={handleReturnTitle}
          onToggleMute={handleToggleMute}
          onToggleCrt={handleToggleCrt}
          onToggleReduceFlash={handleToggleReduceFlash}
        />
      )}
    </main>
  );
}

