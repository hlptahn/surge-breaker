export type EquipmentType =
  | 'SURGE_PROTECTOR'
  | 'PROTECTION_RELAY'
  | 'UPS_UNIT'
  | 'HARMONIC_FILTER'
  | 'PFC_CAPACITOR'
  | 'EV_CHARGER'
  | 'SOLAR_INVERTER'
  | 'OSCILLOSCOPE'
  | 'RFI_FILTER'
  | 'INSTRUMENT_TX'
  | 'BUSBAR_METAL';

export type PowerUpType =
  | 'CIRCUIT_BREAKER'
  | 'HIGHER_AMP'
  | 'COOLING'
  | 'AFTER_HOURS';

export interface EquipmentMeta {
  type: EquipmentType;
  label: string;
  shortCode: string;
  basePoints: number;
  accentColor: string;
  secondaryColor: string;
}

export const EQUIPMENT_CATALOG: Record<EquipmentType, EquipmentMeta> = {
  SURGE_PROTECTOR: {
    type: 'SURGE_PROTECTOR',
    label: 'Surge Protector',
    shortCode: 'SPD',
    basePoints: 100,
    accentColor: '#ff6b00',
    secondaryColor: '#ffb703',
  },
  PROTECTION_RELAY: {
    type: 'PROTECTION_RELAY',
    label: 'Protection Relay',
    shortCode: 'RLY',
    basePoints: 120,
    accentColor: '#00e5ff',
    secondaryColor: '#ff6b00',
  },
  UPS_UNIT: {
    type: 'UPS_UNIT',
    label: 'UPS System',
    shortCode: 'UPS',
    basePoints: 150,
    accentColor: '#f59e0b',
    secondaryColor: '#10b981',
  },
  HARMONIC_FILTER: {
    type: 'HARMONIC_FILTER',
    label: 'Harmonic Filter',
    shortCode: 'HFL',
    basePoints: 140,
    accentColor: '#38bdf8',
    secondaryColor: '#ff6b00',
  },
  PFC_CAPACITOR: {
    type: 'PFC_CAPACITOR',
    label: 'PFC Capacitor Bank',
    shortCode: 'PFC',
    basePoints: 160,
    accentColor: '#fbbf24',
    secondaryColor: '#00e5ff',
  },
  EV_CHARGER: {
    type: 'EV_CHARGER',
    label: 'EV Fast Charger',
    shortCode: 'EVC',
    basePoints: 180,
    accentColor: '#22d3ee',
    secondaryColor: '#a3e635',
  },
  SOLAR_INVERTER: {
    type: 'SOLAR_INVERTER',
    label: 'Solar Hybrid Inverter',
    shortCode: 'INV',
    basePoints: 170,
    accentColor: '#ff8800',
    secondaryColor: '#fde047',
  },
  OSCILLOSCOPE: {
    type: 'OSCILLOSCOPE',
    label: 'Test Oscilloscope',
    shortCode: 'OSC',
    basePoints: 200,
    accentColor: '#00f5d4',
    secondaryColor: '#ff6b00',
  },
  RFI_FILTER: {
    type: 'RFI_FILTER',
    label: 'RFI EMC Filter',
    shortCode: 'RFI',
    basePoints: 130,
    accentColor: '#fb923c',
    secondaryColor: '#cbd5e1',
  },
  INSTRUMENT_TX: {
    type: 'INSTRUMENT_TX',
    label: 'Instrument Transformer',
    shortCode: 'CT/VT',
    basePoints: 190,
    accentColor: '#f97316',
    secondaryColor: '#38bdf8',
  },
  BUSBAR_METAL: {
    type: 'BUSBAR_METAL',
    label: 'Armoured Busbar',
    shortCode: 'BUS',
    basePoints: 0,
    accentColor: '#64748b',
    secondaryColor: '#94a3b8',
  },
};

export interface PowerUpMeta {
  type: PowerUpType;
  name: string;
  capsuleText: string;
  shortTag: string;
  color: string;
  borderColor: string;
}

export const POWERUP_CATALOG: Record<PowerUpType, PowerUpMeta> = {
  CIRCUIT_BREAKER: {
    type: 'CIRCUIT_BREAKER',
    name: 'CIRCUIT BREAKER',
    capsuleText: 'BREAKER',
    shortTag: 'CB',
    color: '#00e5ff',
    borderColor: '#a5f3fc',
  },
  HIGHER_AMP: {
    type: 'HIGHER_AMP',
    name: 'HIGHER AMP RATING',
    capsuleText: 'AMP UP',
    shortTag: 'AMP',
    color: '#ff6b00',
    borderColor: '#fdba74',
  },
  COOLING: {
    type: 'COOLING',
    name: 'COOLING BLAST',
    capsuleText: 'COOLING',
    shortTag: 'COOL',
    color: '#38bdf8',
    borderColor: '#e0f2fe',
  },
  AFTER_HOURS: {
    type: 'AFTER_HOURS',
    name: 'AFTER-HOURS CALL-OUT',
    capsuleText: '24/7 CALL',
    shortTag: '1UP',
    color: '#facc15',
    borderColor: '#fef08a',
  },
};

export const AMP_LEVEL_LABELS = ['5A', '10A', '20A', '32A'] as const;
export const AMP_WIDTH_MULTIPLIERS = [1.0, 1.28, 1.56, 1.85] as const;

export const FLAVOUR_MESSAGES: string[] = [
  '24/7 EMERGENCY FUSE SERVICE — ALWAYS ON CALL',
  'FUSES FOR EVERY INDUSTRY SINCE 1996',
  'CELEBRATING 30 YEARS OF FUSECO: 1996–2026',
  'HIGH RUPTURING CAPACITY PROTECTION ONLINE',
  'POWER FACTOR OPTIMISATION IN PROGRESS',
  'FAST NATIONWIDE DISPATCH — BACK ONLINE FAST',
  'EXPERTISE YOU NEED. SERVICE YOU DESERVE.',
];

export interface WorldConfig {
  worldNumber: 1 | 2 | 3;
  name: string;
  subtitle: string;
  storyBrief: string;
  clearMessage: string;
  bossName: string;
  bossSubtitle: string;
  themeAccent: string;
}

export const WORLDS: Record<1 | 2 | 3, WorldConfig> = {
  1: {
    worldNumber: 1,
    name: 'HOSPITAL WING',
    subtitle: 'CRITICAL CARE SUBSTATION',
    storyBrief: 'A major fault has knocked out the power overnight.',
    clearMessage: 'Power restored. Surgeries can go ahead!',
    bossName: 'OVERLOAD TRANSFORMER',
    bossSubtitle: 'CLASS-I DISTRIBUTION FAULT',
    themeAccent: '#ff6b00',
  },
  2: {
    worldNumber: 2,
    name: 'OUTBACK MINE',
    subtitle: '1,800 KM REMOTE FEEDER',
    storyBrief: 'A remote site 1,800 km from the nearest city, where a 22kV feed has failed.',
    clearMessage: 'Emergency fuses delivered. Site back up and running!',
    bossName: 'HIGH VOLTAGE TRANSFORMER',
    bossSubtitle: '22kV SUB-TRANSMISSION ARC',
    themeAccent: '#f59e0b',
  },
  3: {
    worldNumber: 3,
    name: 'THE GRID',
    subtitle: 'NATIONAL INTERCONNECTOR',
    storyBrief: 'A heatwave is pushing the network to its limit.',
    clearMessage: 'Heatwave survived. Grid stable!',
    bossName: 'MEGA TRANSFORMER',
    bossSubtitle: '500kV CASCADE MELTDOWN',
    themeAccent: '#00e5ff',
  },
};

export interface BrickEntity {
  id: number;
  col: number;
  row: number;
  x: number;
  y: number;
  width: number;
  height: number;
  hp: number;
  maxHp: number;
  indestructible: boolean;
  equipment: EquipmentType;
  hitFlash: number;
}

export interface BossZap {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  phase: number;
}

export interface BossTelegraph {
  x: number;
  y: number;
  vx: number;
  vy: number;
  timer: number;
  maxTimer: number;
}

export interface BossEntity {
  world: 1 | 2 | 3;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  hp: number;
  maxHp: number;
  vx: number;
  hitFlash: number;
  attackCooldown: number;
  coilPulse: number;
  telegraphs: BossTelegraph[];
  angerPhase: 1 | 2 | 3;
}

export const ARENA_WIDTH = 960;
export const ARENA_HEIGHT = 720;
export const PADDLE_Y = 656;
export const PADDLE_BASE_WIDTH = 136;
export const PADDLE_HEIGHT = 22;
export const BALL_RADIUS = 8;
export const BASE_BALL_SPEED = 435;
export const MAX_BALL_SPEED = 740;
export const MAX_LIVES = 6;
export const EXTRA_LIFE_MILESTONE_POINTS = 25000;
export const MAX_LIVES_BONUS_POINTS = 2500;

/**
 * Returns the starting ball speed for a given world (1..3) and level (1..4).
 */
export function getStartingBallSpeed(world: 1 | 2 | 3, level: 1 | 2 | 3 | 4): number {
  return BASE_BALL_SPEED + (world - 1) * 32 + (level - 1) * 18;
}

/**
 * Calculates Power Factor reading (0.70 to 0.99) from current brick hit combo.
 */
export function calculatePowerFactor(combo: number): number {
  if (combo <= 0) return 0.7;
  // Climbs smoothly from 0.70 up to 0.99 at combo >= 12
  const pf = Math.min(0.99, 0.7 + combo * 0.025);
  return Math.round(pf * 100) / 100;
}

/**
 * Score multiplier derived from Power Factor (1.0x at 0.70 up to 2.5x at 0.99).
 */
export function getPowerFactorMultiplier(pf: number): number {
  const normalized = Math.max(0, Math.min(1, (pf - 0.7) / 0.29));
  return Math.round((1 + normalized * 1.5) * 100) / 100;
}

/**
 * Computes score gained for destroying or hitting a brick.
 */
export function calculateBrickScore(basePoints: number, combo: number): number {
  const pf = calculatePowerFactor(combo);
  const mult = getPowerFactorMultiplier(pf);
  return Math.round((basePoints * mult) / 10) * 10;
}

export interface PaddleCatchResult {
  newHeat: number;
  heatDelta: number;
  zone: 'centre' | 'left' | 'right';
  bounceAngleRad: number; // angle from vertical (0 = straight up, negative = left, positive = right)
  fuseBlown: boolean;
  comboHeatAdded: number;
}

/**
 * Evaluates catching the ball on the fuse paddle:
 * - Centre third (|relativeHit| <= 1/3): heat DECREASES (-3%) and controlled bounce angle
 * - Left or Right third (|relativeHit| > 1/3): heat INCREASES (+8%) and sharper bounce angle
 * - Combos above x5 add extra heat when the ball is finally caught.
 */
export function evaluatePaddleCatch(
  currentHeat: number,
  ballX: number,
  paddleX: number,
  paddleWidth: number,
  comboOnCatch: number
): PaddleCatchResult {
  const halfW = paddleWidth / 2;
  const clampedOffset = Math.max(-halfW, Math.min(halfW, ballX - paddleX));
  // relativeHit in [-1, 1]
  const relativeHit = clampedOffset / halfW;

  let zone: 'centre' | 'left' | 'right' = 'centre';
  let baseHeatDelta = -3;
  let bounceAngleRad = 0;

  if (Math.abs(relativeHit) <= 1 / 3) {
    zone = 'centre';
    baseHeatDelta = -3;
    // Controlled angle: max ±26 degrees (0.45 rad)
    bounceAngleRad = (relativeHit / (1 / 3)) * 0.44;
  } else {
    zone = relativeHit < 0 ? 'left' : 'right';
    baseHeatDelta = 8;
    // Sharper angle: between 32 degrees (0.56 rad) and 64 degrees (1.12 rad)
    const sign = relativeHit < 0 ? -1 : 1;
    const edgeFactor = (Math.abs(relativeHit) - 1 / 3) / (2 / 3);
    bounceAngleRad = sign * (0.56 + edgeFactor * 0.54);
  }

  // Combos above x5 add extra heat when the ball is caught (+2% per combo above 5, capped at +18%)
  const comboHeatAdded = comboOnCatch > 5 ? Math.min(18, (comboOnCatch - 5) * 2) : 0;
  const totalDelta = baseHeatDelta + comboHeatAdded;
  const newHeat = Math.max(0, Math.min(100, currentHeat + totalDelta));

  return {
    newHeat,
    heatDelta: totalDelta,
    zone,
    bounceAngleRad,
    fuseBlown: newHeat >= 100,
    comboHeatAdded,
  };
}

/**
 * Passive heat cooling over time:
 * - Cools at -1% per second when strictly below 80%
 * - Does not cool passively at or above 80% (critical thermal runaway zone!)
 */
export function stepPassiveCooling(currentHeat: number, dtSeconds: number): number {
  if (currentHeat <= 0 || currentHeat >= 80) {
    return Math.max(0, Math.min(100, currentHeat));
  }
  return Math.max(0, currentHeat - 1.0 * dtSeconds);
}

/**
 * Returns true when heat is strictly above 80% (triggers red flash & buzzer).
 */
export function isHighHeatWarning(heat: number): boolean {
  return heat > 80;
}

/**
 * Checks if extra lives should be awarded at every 25,000-point boundary.
 */
export function checkExtraLifeMilestone(prevScore: number, newScore: number): number {
  const prevMilestone = Math.floor(prevScore / EXTRA_LIFE_MILESTONE_POINTS);
  const newMilestone = Math.floor(newScore / EXTRA_LIFE_MILESTONE_POINTS);
  return Math.max(0, newMilestone - prevMilestone);
}

export interface ExtraLifeRewardResult {
  newLives: number;
  livesAdded: number;
  cappedCount: number;
  bonusPoints: number;
}

/**
 * Applies one or more extra-life rewards with a strict cap of MAX_LIVES (6).
 * Any life reward when already at 6 lives grants +2,500 bonus points instead.
 */
export function applyExtraLifeReward(
  currentLives: number,
  rewardCount: number = 1
): ExtraLifeRewardResult {
  let lives = Math.max(0, Math.min(MAX_LIVES, currentLives));
  let livesAdded = 0;
  let cappedCount = 0;

  for (let i = 0; i < rewardCount; i++) {
    if (lives < MAX_LIVES) {
      lives += 1;
      livesAdded += 1;
    } else {
      cappedCount += 1;
    }
  }

  return {
    newLives: lives,
    livesAdded,
    cappedCount,
    bonusPoints: cappedCount * MAX_LIVES_BONUS_POINTS,
  };
}

/**
 * Returns the glowing filament color and intensity from heat (0-100%).
 * Dull orange -> bright Fuseco orange -> amber -> white-hot.
 */
export function getFilamentVisuals(heat: number): {
  coreColor: string;
  glowColor: string;
  glowRadius: number;
  thickness: number;
} {
  const clamped = Math.max(0, Math.min(100, heat));
  if (clamped < 35) {
    return {
      coreColor: '#ea580c',
      glowColor: 'rgba(234, 88, 12, 0.55)',
      glowRadius: 8,
      thickness: 3,
    };
  }
  if (clamped < 65) {
    return {
      coreColor: '#ff8800',
      glowColor: 'rgba(255, 136, 0, 0.78)',
      glowRadius: 14,
      thickness: 4,
    };
  }
  if (clamped <= 80) {
    return {
      coreColor: '#fde047',
      glowColor: 'rgba(251, 191, 36, 0.9)',
      glowRadius: 20,
      thickness: 5,
    };
  }
  return {
    coreColor: '#ffffff',
    glowColor: 'rgba(255, 255, 255, 0.98)',
    glowRadius: 28,
    thickness: 6,
  };
}

/**
 * Selects a power-up type deterministically or from a random roll [0..1).
 * "After-Hours Call-Out" is 3% base (reduced from 9%) and 5% on last life (reduced from 14%),
 * with the freed share (+6% normal / +9% last life) spread evenly (+2% / +3% each) across the other 3 power-ups.
 */
export function selectPowerUpFromRoll(roll: number, currentHeat: number, currentLives: number): PowerUpType {
  const onLastLife = currentLives <= 1;
  const afterHoursThreshold = onLastLife ? 0.05 : 0.03;
  const freedPerOther = onLastLife ? 0.03 : 0.02;

  if (roll < afterHoursThreshold) {
    return 'AFTER_HOURS';
  }

  // If heat is high (>55%), weight Cooling higher (+freedPerOther)
  if (currentHeat > 55 && roll < afterHoursThreshold + 0.36 + freedPerOther) {
    return 'COOLING';
  }

  const baseCoolingShare = (onLastLife ? 0.28 : 0.33) + freedPerOther;
  const coolingThreshold = afterHoursThreshold + baseCoolingShare;
  if (roll < coolingThreshold) {
    return 'COOLING';
  }

  const higherAmpShare = 0.30 + freedPerOther;
  if (roll < coolingThreshold + higherAmpShare) {
    return 'HIGHER_AMP';
  }

  return 'CIRCUIT_BREAKER';
}

export interface AABB {
  x: number; // top-left x
  y: number; // top-left y
  width: number;
  height: number;
}

export interface CircleCollisionResult {
  hit: boolean;
  normalX: number;
  normalY: number;
  penetration: number;
  contactX: number;
  contactY: number;
}

/**
 * Precise circle-vs-AABB collision test for ball vs brick/boss.
 */
export function testBallVsAABB(
  ballX: number,
  ballY: number,
  radius: number,
  box: AABB
): CircleCollisionResult {
  const closestX = Math.max(box.x, Math.min(ballX, box.x + box.width));
  const closestY = Math.max(box.y, Math.min(ballY, box.y + box.height));
  const dx = ballX - closestX;
  const dy = ballY - closestY;
  const distSq = dx * dx + dy * dy;

  if (distSq > radius * radius) {
    return { hit: false, normalX: 0, normalY: 0, penetration: 0, contactX: closestX, contactY: closestY };
  }

  const dist = Math.sqrt(distSq);
  if (dist > 0.0001) {
    return {
      hit: true,
      normalX: dx / dist,
      normalY: dy / dist,
      penetration: radius - dist,
      contactX: closestX,
      contactY: closestY,
    };
  }

  // Ball centre is inside the box; push out along shallowest axis
  const leftPen = ballX - box.x;
  const rightPen = box.x + box.width - ballX;
  const topPen = ballY - box.y;
  const bottomPen = box.y + box.height - ballY;
  const minPen = Math.min(leftPen, rightPen, topPen, bottomPen);

  if (minPen === topPen) {
    return { hit: true, normalX: 0, normalY: -1, penetration: radius + topPen, contactX: ballX, contactY: box.y };
  }
  if (minPen === bottomPen) {
    return { hit: true, normalX: 0, normalY: 1, penetration: radius + bottomPen, contactX: ballX, contactY: box.y + box.height };
  }
  if (minPen === leftPen) {
    return { hit: true, normalX: -1, normalY: 0, penetration: radius + leftPen, contactX: box.x, contactY: ballY };
  }
  return { hit: true, normalX: 1, normalY: 0, penetration: radius + rightPen, contactX: box.x + box.width, contactY: ballY };
}

/**
 * Creates a Boss entity for the given world (used on Level 4 of each World).
 */
export function createBossForWorld(world: 1 | 2 | 3): BossEntity {
  const worldMeta = WORLDS[world];
  if (world === 1) {
    return {
      world: 1,
      name: worldMeta.bossName,
      x: ARENA_WIDTH / 2 - 120,
      y: 88,
      width: 240,
      height: 82,
      hp: 18,
      maxHp: 18,
      vx: 115,
      hitFlash: 0,
      attackCooldown: 1.6,
      coilPulse: 0,
      telegraphs: [],
      angerPhase: 1,
    };
  }
  if (world === 2) {
    return {
      world: 2,
      name: worldMeta.bossName,
      x: ARENA_WIDTH / 2 - 145,
      y: 88,
      width: 290,
      height: 90,
      hp: 26,
      maxHp: 26,
      vx: 155,
      hitFlash: 0,
      attackCooldown: 1.3,
      coilPulse: 0,
      telegraphs: [],
      angerPhase: 1,
    };
  }
  return {
    world: 3,
    name: worldMeta.bossName,
    x: ARENA_WIDTH / 2 - 170,
    y: 88,
    width: 340,
    height: 96,
    hp: 36,
    maxHp: 36,
    vx: 190,
    hitFlash: 0,
    attackCooldown: 1.1,
    coilPulse: 0,
    telegraphs: [],
    angerPhase: 1,
  };
}

const ORDERED_EQUIPMENT: EquipmentType[] = [
  'SURGE_PROTECTOR',
  'PROTECTION_RELAY',
  'UPS_UNIT',
  'HARMONIC_FILTER',
  'PFC_CAPACITOR',
  'EV_CHARGER',
  'SOLAR_INVERTER',
  'OSCILLOSCOPE',
  'RFI_FILTER',
  'INSTRUMENT_TX',
];

/**
 * Generates brick layouts for any world (1..3) and level (1..4).
 * Levels 1..3 are regular equipment grid layouts with multi-hit and indestructible metal busbars.
 * Level 4 is the Boss encounter with flanking surge-capacitor guard bricks.
 */
export function buildLevelBricks(world: 1 | 2 | 3, level: 1 | 2 | 3 | 4): BrickEntity[] {
  const bricks: BrickEntity[] = [];
  const cols = 10;
  const brickWidth = 78;
  const brickHeight = 32;
  const gapX = 8;
  const gapY = 8;
  const totalRowWidth = cols * brickWidth + (cols - 1) * gapX;
  const startX = Math.round((ARENA_WIDTH - totalRowWidth) / 2);
  const startY = 92;

  let nextId = 1;

  // Boss level (level 4): create protective flank bunker bricks below the boss
  if (level === 4) {
    const flankY = 235;
    for (let c = 0; c < cols; c++) {
      // Leave central channels open so the player can strike the boss directly
      if (c === 4 || c === 5) continue;
      const isMetal = (c === 2 || c === 7) && world >= 2;
      const eq = isMetal
        ? 'BUSBAR_METAL'
        : ORDERED_EQUIPMENT[(c + world * 2) % ORDERED_EQUIPMENT.length];
      bricks.push({
        id: nextId++,
        col: c,
        row: 0,
        x: startX + c * (brickWidth + gapX),
        y: flankY,
        width: brickWidth,
        height: brickHeight,
        hp: isMetal ? 999 : world >= 2 ? 2 : 1,
        maxHp: isMetal ? 999 : world >= 2 ? 2 : 1,
        indestructible: isMetal,
        equipment: eq,
        hitFlash: 0,
      });
    }
    return bricks;
  }

  const rows = 4 + world + (level === 3 ? 1 : 0); // 5 to 8 rows depending on world & level

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      // Distinct architectural silhouettes per world and level
      if (world === 1 && level === 1 && (r === rows - 1) && (c === 4 || c === 5)) {
        continue; // Hospital Wing entry corridor
      }
      if (world === 1 && level === 2 && (c + r) % 7 === 0) {
        continue;
      }
      if (world === 2 && level === 1 && c === 4 && r % 2 === 1) {
        continue; // Mine shaft vertical channel
      }
      if (world === 3 && level === 2 && (c === 0 || c === 9) && r % 2 === 0) {
        continue;
      }

      // Indestructible metal busbars on strategic coordinates (always leaving open lanes)
      let isIndestructible = false;
      if (level >= 2 && r === rows - 2 && (c === 2 || c === 7)) {
        isIndestructible = true;
      } else if (world >= 2 && level === 3 && r === 2 && (c === 3 || c === 6)) {
        isIndestructible = true;
      } else if (world === 3 && level >= 2 && r === rows - 1 && (c === 1 || c === 8)) {
        isIndestructible = true;
      }

      if (isIndestructible) {
        bricks.push({
          id: nextId++,
          col: c,
          row: r,
          x: startX + c * (brickWidth + gapX),
          y: startY + r * (brickHeight + gapY),
          width: brickWidth,
          height: brickHeight,
          hp: 999,
          maxHp: 999,
          indestructible: true,
          equipment: 'BUSBAR_METAL',
          hitFlash: 0,
        });
        continue;
      }

      // Determine multi-hit toughness (1 to 3 hits)
      let hp = 1;
      if (r === 0 && (world >= 2 || level >= 2)) {
        hp = 3;
      } else if (r <= 1 && (world >= 1 && level >= 2)) {
        hp = 2;
      } else if (world === 3 && r <= 2) {
        hp = 2;
      }

      const eqIndex = (r * 3 + c + (world - 1) * 2 + (level - 1)) % ORDERED_EQUIPMENT.length;
      const equipment = ORDERED_EQUIPMENT[eqIndex];

      bricks.push({
        id: nextId++,
        col: c,
        row: r,
        x: startX + c * (brickWidth + gapX),
        y: startY + r * (brickHeight + gapY),
        width: brickWidth,
        height: brickHeight,
        hp,
        maxHp: hp,
        indestructible: false,
        equipment,
        hitFlash: 0,
      });
    }
  }

  return bricks;
}

/**
 * Checks whether all destructible bricks in a regular level have been cleared.
 */
export function isRegularLevelCleared(bricks: BrickEntity[]): boolean {
  for (let i = 0; i < bricks.length; i++) {
    if (!bricks[i].indestructible && bricks[i].hp > 0) {
      return false;
    }
  }
  return true;
}
