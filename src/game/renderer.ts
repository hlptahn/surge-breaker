import {
  ARENA_WIDTH,
  ARENA_HEIGHT,
  PADDLE_Y,
  PADDLE_HEIGHT,
  BALL_RADIUS,
  BrickEntity,
  BossEntity,
  BossZap,
  EQUIPMENT_CATALOG,
  POWERUP_CATALOG,
  PowerUpType,
  AMP_LEVEL_LABELS,
  getFilamentVisuals,
} from './rules';

export interface PooledParticle {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
  isGlassShard: boolean;
  rotation: number;
  vRot: number;
}

export interface FloatingText {
  active: boolean;
  x: number;
  y: number;
  vy: number;
  text: string;
  color: string;
  life: number;
  maxLife: number;
  scale: number;
}

export interface FallingPowerUp {
  id: number;
  type: PowerUpType;
  x: number;
  y: number;
  vy: number;
  width: number;
  height: number;
  pulse: number;
}

export interface TrailPoint {
  x: number;
  y: number;
}

/**
 * Draws the dark charcoal/navy background with a faint circuit-board trace pattern.
 */
export function drawCircuitBackground(
  ctx: CanvasRenderingContext2D,
  timeSec: number,
  world: 1 | 2 | 3,
  highHeatWarning: boolean
): void {
  ctx.fillStyle = '#090d16';
  ctx.fillRect(0, 0, ARENA_WIDTH, ARENA_HEIGHT);

  // Subtle world-tinted ambient radial glow
  const grad = ctx.createRadialGradient(
    ARENA_WIDTH * 0.5,
    ARENA_HEIGHT * 0.42,
    40,
    ARENA_WIDTH * 0.5,
    ARENA_HEIGHT * 0.5,
    ARENA_WIDTH * 0.65
  );
  if (highHeatWarning) {
    const pulse = 0.06 + Math.sin(timeSec * 12) * 0.03;
    grad.addColorStop(0, `rgba(239, 68, 68, ${pulse})`);
  } else if (world === 1) {
    grad.addColorStop(0, 'rgba(255, 107, 0, 0.045)');
  } else if (world === 2) {
    grad.addColorStop(0, 'rgba(245, 158, 11, 0.05)');
  } else {
    grad.addColorStop(0, 'rgba(0, 229, 255, 0.05)');
  }
  grad.addColorStop(1, 'rgba(9, 13, 22, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, ARENA_WIDTH, ARENA_HEIGHT);

  // Faint orthogonal grid & diagonal circuit traces
  ctx.strokeStyle = 'rgba(30, 41, 59, 0.42)';
  ctx.lineWidth = 1;
  const gridStep = 48;
  ctx.beginPath();
  for (let x = gridStep; x < ARENA_WIDTH; x += gridStep) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, ARENA_HEIGHT);
  }
  for (let y = gridStep; y < ARENA_HEIGHT; y += gridStep) {
    ctx.moveTo(0, y);
    ctx.lineTo(ARENA_WIDTH, y);
  }
  ctx.stroke();

  // Circuit board copper/cyan traces & solder pads
  ctx.strokeStyle = 'rgba(255, 107, 0, 0.08)';
  ctx.lineWidth = 2;
  const traces = [
    [48, 96, 192, 96, 240, 144, 240, 288],
    [912, 144, 768, 144, 720, 192, 720, 384],
    [96, 576, 240, 576, 288, 528, 432, 528],
    [864, 576, 720, 576, 672, 528, 528, 528],
    [480, 48, 480, 144, 528, 192, 624, 192],
  ];

  for (let i = 0; i < traces.length; i++) {
    const t = traces[i];
    ctx.beginPath();
    ctx.moveTo(t[0], t[1]);
    for (let j = 2; j < t.length; j += 2) {
      ctx.lineTo(t[j], t[j + 1]);
    }
    ctx.stroke();

    // Terminal via pads at ends
    ctx.fillStyle = 'rgba(255, 107, 0, 0.14)';
    ctx.beginPath();
    ctx.arc(t[0], t[1], 4, 0, Math.PI * 2);
    ctx.arc(t[t.length - 2], t[t.length - 1], 4, 0, Math.PI * 2);
    ctx.fill();
  }
}

/**
 * Draws a chunky pixel-art electrical equipment brick in Fuseco's bold orange outline style.
 */
export function drawEquipmentBrick(ctx: CanvasRenderingContext2D, brick: BrickEntity): void {
  if (brick.hp <= 0) return;

  const { x, y, width, height, equipment, hp, maxHp, indestructible, hitFlash } = brick;
  const meta = EQUIPMENT_CATALOG[equipment];

  ctx.save();

  if (indestructible) {
    // Heavy riveted armoured busbar
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(x, y, width, height);
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 1, y + 1, width - 2, height - 2);

    // Copper busbar core strip
    ctx.fillStyle = '#b45309';
    ctx.fillRect(x + 6, y + 11, width - 12, 10);
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(x + 8, y + 14, width - 16, 4);

    // Corner rivets
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(x + 4, y + 4, 3, 3);
    ctx.fillRect(x + width - 7, y + 4, 3, 3);
    ctx.fillRect(x + 4, y + height - 7, 3, 3);
    ctx.fillRect(x + width - 7, y + height - 7, 3, 3);

    ctx.restore();
    return;
  }

  // Dark industrial housing fill
  ctx.fillStyle = '#111927';
  ctx.fillRect(x, y, width, height);

  // Chunky pixel-art double outline in Fuseco Orange + equipment accent
  ctx.strokeStyle = hitFlash > 0 ? '#ffffff' : '#ff6b00';
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 1, y + 1, width - 2, height - 2);

  // Inner top highlight bar
  ctx.fillStyle = meta.accentColor;
  ctx.fillRect(x + 3, y + 3, width - 6, 3);

  // Left pixel-art equipment icon (24x20 box at x+6, y+8)
  const ix = x + 6;
  const iy = y + 8;
  ctx.strokeStyle = meta.accentColor;
  ctx.fillStyle = meta.secondaryColor;
  ctx.lineWidth = 2;

  switch (equipment) {
    case 'SURGE_PROTECTOR': {
      // Lightning arrestor zig-zag
      ctx.beginPath();
      ctx.moveTo(ix + 12, iy + 1);
      ctx.lineTo(ix + 5, iy + 10);
      ctx.lineTo(ix + 12, iy + 10);
      ctx.lineTo(ix + 7, iy + 19);
      ctx.stroke();
      break;
    }
    case 'PROTECTION_RELAY': {
      // Relay window + trip indicator dots
      ctx.strokeRect(ix + 2, iy + 3, 18, 13);
      ctx.fillRect(ix + 5, iy + 7, 4, 4);
      ctx.fillRect(ix + 12, iy + 7, 4, 4);
      break;
    }
    case 'UPS_UNIT': {
      // Battery terminals + charge bars
      ctx.strokeRect(ix + 2, iy + 4, 18, 12);
      ctx.fillRect(ix + 5, iy + 2, 4, 2);
      ctx.fillRect(ix + 13, iy + 2, 4, 2);
      ctx.fillRect(ix + 6, iy + 7, 10, 6);
      break;
    }
    case 'HARMONIC_FILTER': {
      // Sine wave choke
      ctx.beginPath();
      ctx.moveTo(ix + 2, iy + 10);
      ctx.quadraticCurveTo(ix + 7, iy + 1, ix + 11, iy + 10);
      ctx.quadraticCurveTo(ix + 15, iy + 19, ix + 20, iy + 10);
      ctx.stroke();
      break;
    }
    case 'PFC_CAPACITOR': {
      // Parallel capacitor plates ||
      ctx.beginPath();
      ctx.moveTo(ix + 2, iy + 10);
      ctx.lineTo(ix + 8, iy + 10);
      ctx.moveTo(ix + 8, iy + 3);
      ctx.lineTo(ix + 8, iy + 17);
      ctx.moveTo(ix + 14, iy + 3);
      ctx.lineTo(ix + 14, iy + 17);
      ctx.moveTo(ix + 14, iy + 10);
      ctx.lineTo(ix + 20, iy + 10);
      ctx.stroke();
      break;
    }
    case 'EV_CHARGER': {
      // EV cabinet + plug cord
      ctx.strokeRect(ix + 4, iy + 2, 12, 16);
      ctx.fillRect(ix + 7, iy + 5, 6, 5);
      ctx.beginPath();
      ctx.moveTo(ix + 16, iy + 8);
      ctx.lineTo(ix + 20, iy + 12);
      ctx.lineTo(ix + 18, iy + 17);
      ctx.stroke();
      break;
    }
    case 'SOLAR_INVERTER': {
      // Solar panel grid + sun ray
      ctx.strokeRect(ix + 2, iy + 4, 18, 12);
      ctx.beginPath();
      ctx.moveTo(ix + 11, iy + 4);
      ctx.lineTo(ix + 11, iy + 16);
      ctx.moveTo(ix + 2, iy + 10);
      ctx.lineTo(ix + 20, iy + 10);
      ctx.stroke();
      break;
    }
    case 'OSCILLOSCOPE': {
      // CRT scope screen + square wave
      ctx.strokeRect(ix + 2, iy + 3, 18, 14);
      ctx.beginPath();
      ctx.moveTo(ix + 4, iy + 12);
      ctx.lineTo(ix + 8, iy + 12);
      ctx.lineTo(ix + 8, iy + 7);
      ctx.lineTo(ix + 14, iy + 7);
      ctx.lineTo(ix + 14, iy + 12);
      ctx.lineTo(ix + 18, iy + 12);
      ctx.stroke();
      break;
    }
    case 'RFI_FILTER': {
      // Dual inductor coils
      ctx.beginPath();
      ctx.arc(ix + 7, iy + 10, 4, 0, Math.PI * 2);
      ctx.arc(ix + 15, iy + 10, 4, 0, Math.PI * 2);
      ctx.stroke();
      break;
    }
    case 'INSTRUMENT_TX': {
      // Toroidal current transformer ring
      ctx.beginPath();
      ctx.arc(ix + 11, iy + 10, 6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillRect(ix + 10, iy + 2, 2, 16);
      break;
    }
    default:
      break;
  }

  // Equipment short code label on the right half
  ctx.fillStyle = '#f8fafc';
  ctx.font = '700 10px "JetBrains Mono", monospace';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  ctx.fillText(meta.shortCode, x + width - 6, y + height / 2 + 1);

  // Multi-hit armor pips (top right)
  if (maxHp > 1) {
    for (let p = 0; p < maxHp; p++) {
      ctx.fillStyle = p < hp ? '#00e5ff' : '#334155';
      ctx.fillRect(x + width - 8 - p * 6, y + 6, 4, 3);
    }
  }

  // Damage cracks if hp < maxHp
  if (hp < maxHp) {
    ctx.strokeStyle = '#ff6b00';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x + width * 0.45, y + 2);
    ctx.lineTo(x + width * 0.52, y + height * 0.55);
    ctx.lineTo(x + width * 0.38, y + height - 2);
    ctx.stroke();
  }

  // Hit flash overlay
  if (hitFlash > 0) {
    ctx.fillStyle = `rgba(255, 255, 255, ${Math.min(0.85, hitFlash * 12)})`;
    ctx.fillRect(x, y, width, height);
  }

  ctx.restore();
}

/**
 * Draws the Glass Cartridge Fuse paddle with metal end caps, glowing internal filament,
 * centre cooling zone ticks, and stamped Amp rating.
 */
export function drawFusePaddle(
  ctx: CanvasRenderingContext2D,
  paddleX: number,
  paddleWidth: number,
  heat: number,
  ampLevel: number,
  timeSec: number
): void {
  const left = paddleX - paddleWidth / 2;
  const top = PADDLE_Y;
  const capWidth = Math.max(20, Math.round(paddleWidth * 0.17));
  const glassLeft = left + capWidth;
  const glassWidth = paddleWidth - capWidth * 2;

  ctx.save();

  // 1. Translucent glass tube body
  ctx.fillStyle = 'rgba(15, 23, 42, 0.82)';
  ctx.fillRect(glassLeft, top + 2, glassWidth, PADDLE_HEIGHT - 4);

  // Subtle centre-third cooling zone guide lines on the glass cylinder
  const centreZoneWidth = paddleWidth / 3;
  const czLeft = paddleX - centreZoneWidth / 2;
  ctx.fillStyle = 'rgba(0, 229, 255, 0.12)';
  ctx.fillRect(czLeft, top + 3, centreZoneWidth, PADDLE_HEIGHT - 6);
  ctx.strokeStyle = 'rgba(0, 229, 255, 0.55)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(czLeft, top + 2);
  ctx.lineTo(czLeft, top + PADDLE_HEIGHT - 2);
  ctx.moveTo(czLeft + centreZoneWidth, top + 2);
  ctx.lineTo(czLeft + centreZoneWidth, top + PADDLE_HEIGHT - 2);
  ctx.stroke();

  // 2. Glowing filament inside the glass cartridge
  const fil = getFilamentVisuals(heat);
  ctx.save();
  ctx.shadowColor = fil.glowColor;
  ctx.shadowBlur = fil.glowRadius;
  ctx.strokeStyle = fil.coreColor;
  ctx.lineWidth = fil.thickness;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const midY = top + PADDLE_HEIGHT / 2;
  const jitterAmp = heat > 65 ? ((heat - 65) / 35) * 3.8 : 0.6;
  const segments = 8;
  ctx.beginPath();
  ctx.moveTo(glassLeft, midY);
  for (let i = 1; i < segments; i++) {
    const px = glassLeft + (glassWidth * i) / segments;
    const wave = Math.sin(timeSec * 28 + i * 1.9) * jitterAmp;
    ctx.lineTo(px, midY + wave);
  }
  ctx.lineTo(glassLeft + glassWidth, midY);
  ctx.stroke();
  ctx.restore();

  // 3. Glass cylinder border and top specular shine
  ctx.strokeStyle = heat > 80 ? '#f87171' : '#38bdf8';
  ctx.lineWidth = 2;
  ctx.strokeRect(glassLeft, top + 2, glassWidth, PADDLE_HEIGHT - 4);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.28)';
  ctx.fillRect(glassLeft + 4, top + 4, glassWidth - 8, 2);

  // 4. Left & Right metallic end caps
  const drawEndCap = (capX: number, isLeft: boolean) => {
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(capX, top, capWidth, PADDLE_HEIGHT);
    // Metallic highlight & shadow bands
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(capX + 2, top + 2, capWidth - 4, 4);
    ctx.fillStyle = '#64748b';
    ctx.fillRect(capX + 2, top + PADDLE_HEIGHT - 5, capWidth - 4, 3);
    // Bold Fuseco orange rim outline
    ctx.strokeStyle = '#ff6b00';
    ctx.lineWidth = 2;
    ctx.strokeRect(capX, top, capWidth, PADDLE_HEIGHT);

    // Stamped Amp rating on left cap, "HRC" on right cap
    ctx.fillStyle = '#0f172a';
    ctx.font = '800 9px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const label = isLeft ? AMP_LEVEL_LABELS[Math.min(3, ampLevel)] : 'HRC';
    ctx.fillText(label, capX + capWidth / 2, top + PADDLE_HEIGHT / 2 + 0.5);
  };

  drawEndCap(left, true);
  drawEndCap(left + paddleWidth - capWidth, false);

  ctx.restore();
}

/**
 * Draws the crackling electrical surge ball and its spark trail.
 */
export function drawSurgeBall(
  ctx: CanvasRenderingContext2D,
  ballX: number,
  ballY: number,
  trail: TrailPoint[],
  timeSec: number
): void {
  ctx.save();

  // 1. Electric trail
  for (let i = 0; i < trail.length; i++) {
    const pt = trail[i];
    const ratio = (i + 1) / (trail.length + 1);
    ctx.fillStyle = i % 2 === 0 ? `rgba(0, 229, 255, ${ratio * 0.48})` : `rgba(255, 107, 0, ${ratio * 0.48})`;
    const r = BALL_RADIUS * ratio * 0.85;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // 2. Outer crackling corona
  ctx.shadowColor = '#00e5ff';
  ctx.shadowBlur = 16;
  ctx.strokeStyle = '#ff6b00';
  ctx.lineWidth = 2;
  const spikes = 6;
  ctx.beginPath();
  for (let i = 0; i < spikes; i++) {
    const angle = timeSec * 18 + (i * Math.PI * 2) / spikes;
    const len = BALL_RADIUS + 4 + Math.sin(timeSec * 40 + i * 2) * 3;
    ctx.moveTo(ballX, ballY);
    ctx.lineTo(ballX + Math.cos(angle) * len, ballY + Math.sin(angle) * len);
  }
  ctx.stroke();

  // 3. Bright surge core
  ctx.fillStyle = '#00e5ff';
  ctx.beginPath();
  ctx.arc(ballX, ballY, BALL_RADIUS, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(ballX, ballY, BALL_RADIUS * 0.55, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

/**
 * Draws the active Circuit Breaker shield line at the bottom of the playfield.
 */
export function drawCircuitBreakerShield(
  ctx: CanvasRenderingContext2D,
  shieldHits: number,
  timeSec: number
): void {
  if (shieldHits <= 0) return;
  const y = PADDLE_Y + PADDLE_HEIGHT + 16;

  ctx.save();
  ctx.shadowColor = '#00e5ff';
  ctx.shadowBlur = 12;
  ctx.strokeStyle = shieldHits >= 2 ? '#00e5ff' : '#fbbf24';
  ctx.lineWidth = shieldHits >= 2 ? 4 : 2.5;

  ctx.beginPath();
  ctx.moveTo(16, y);
  for (let x = 32; x <= ARENA_WIDTH - 16; x += 32) {
    const jitter = Math.sin(timeSec * 24 + x * 0.1) * 2;
    ctx.lineTo(x, y + jitter);
  }
  ctx.stroke();

  ctx.fillStyle = shieldHits >= 2 ? '#00e5ff' : '#fbbf24';
  ctx.font = '700 10px "JetBrains Mono", monospace';
  ctx.textAlign = 'right';
  ctx.fillText(`CIRCUIT BREAKER SHIELD [${shieldHits}x]`, ARENA_WIDTH - 22, y - 6);
  ctx.restore();
}

/**
 * Draws a falling colour-coded Power-Up capsule with icon and text label.
 */
export function drawPowerUpCapsule(ctx: CanvasRenderingContext2D, item: FallingPowerUp): void {
  const meta = POWERUP_CATALOG[item.type];
  const left = item.x - item.width / 2;
  const top = item.y - item.height / 2;

  ctx.save();
  ctx.shadowColor = meta.color;
  ctx.shadowBlur = 10;

  // Dark capsule body
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(left, top, item.width, item.height);

  // Colored left badge block
  ctx.fillStyle = meta.color;
  ctx.fillRect(left, top, 24, item.height);

  // Crisp pixel border
  ctx.strokeStyle = meta.borderColor;
  ctx.lineWidth = 2;
  ctx.strokeRect(left, top, item.width, item.height);

  // Left icon / tag
  ctx.fillStyle = '#090d16';
  ctx.font = '800 9px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (item.type === 'AFTER_HOURS') {
    // Draw tiny ringing phone handset icon
    ctx.fillRect(left + 7, top + 6, 10, 3);
    ctx.fillRect(left + 6, top + 6, 3, 10);
    ctx.fillRect(left + 15, top + 6, 3, 10);
  } else {
    ctx.fillText(meta.shortTag, left + 12, item.y + 0.5);
  }

  // Capsule name text
  ctx.fillStyle = '#f8fafc';
  ctx.font = '700 9px "JetBrains Mono", monospace';
  ctx.textAlign = 'left';
  ctx.fillText(meta.capsuleText, left + 29, item.y + 0.5);

  ctx.restore();
}

/**
 * Draws the Boss Transformer (Overload, High Voltage, or Mega Transformer),
 * its glowing coils, health bar, windup telegraphs, and active downward zaps.
 */
export function drawBossAndZaps(
  ctx: CanvasRenderingContext2D,
  boss: BossEntity,
  zaps: BossZap[],
  timeSec: number
): void {
  ctx.save();

  const { x, y, width, height, world, hp, maxHp, hitFlash, telegraphs, angerPhase } = boss;
  const primaryColor = angerPhase === 3 ? '#ef4444' : world === 1 ? '#ff6b00' : world === 2 ? '#f59e0b' : '#00e5ff';

  // 1. Draw windup telegraph sightlines BEFORE zaps fire
  for (let i = 0; i < telegraphs.length; i++) {
    const tel = telegraphs[i];
    const progress = 1 - tel.timer / tel.maxTimer;
    ctx.save();
    ctx.strokeStyle = `rgba(239, 68, 68, ${0.35 + progress * 0.6})`;
    ctx.lineWidth = 2 + progress * 2;
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.moveTo(tel.x, tel.y);
    ctx.lineTo(tel.x + tel.vx * 1.4, PADDLE_Y + 12);
    ctx.stroke();

    // Glowing charge orb at emitter nozzle
    ctx.fillStyle = progress > 0.7 ? '#ffffff' : '#ff6b00';
    ctx.beginPath();
    ctx.arc(tel.x, tel.y, 6 + progress * 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // 2. Top porcelain/copper HV bushings & coils
  const coilCount = world === 1 ? 2 : world === 2 ? 3 : 4;
  const coilSpacing = width / (coilCount + 1);
  for (let c = 1; c <= coilCount; c++) {
    const cx = x + coilSpacing * c;
    // Insulator ribs
    ctx.fillStyle = '#334155';
    ctx.fillRect(cx - 12, y - 22, 24, 22);
    ctx.strokeStyle = primaryColor;
    ctx.lineWidth = 2;
    ctx.strokeRect(cx - 12, y - 22, 24, 22);

    // Glowing arc sphere on top of bushing
    const pulse = 5 + Math.sin(timeSec * 14 + c) * 2.5;
    ctx.fillStyle = primaryColor;
    ctx.beginPath();
    ctx.arc(cx, y - 26, pulse, 0, Math.PI * 2);
    ctx.fill();
  }

  // 3. Main Transformer armoured tank body
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(x, y, width, height);

  // Cooling radiator fins along sides
  ctx.fillStyle = '#1e293b';
  for (let ry = y + 10; ry < y + height - 12; ry += 12) {
    ctx.fillRect(x - 10, ry, 10, 6);
    ctx.fillRect(x + width, ry, 10, 6);
  }

  // Bold outline
  ctx.strokeStyle = hitFlash > 0 ? '#ffffff' : primaryColor;
  ctx.lineWidth = 3;
  ctx.strokeRect(x, y, width, height);

  // Menacing angry core visor & internal coils
  const visorY = y + 22;
  ctx.fillStyle = '#090d16';
  ctx.fillRect(x + 24, visorY, width - 48, 34);
  ctx.strokeStyle = primaryColor;
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 24, visorY, width - 48, 34);

  // Glowing angry eyes / core arcs inside visor
  const eyeColor = angerPhase >= 2 ? '#ef4444' : '#ff6b00';
  ctx.fillStyle = eyeColor;
  const leftEyeX = x + width * 0.32;
  const rightEyeX = x + width * 0.68;
  ctx.beginPath();
  ctx.moveTo(leftEyeX - 18, visorY + 8);
  ctx.lineTo(leftEyeX + 14, visorY + 15);
  ctx.lineTo(leftEyeX - 14, visorY + 24);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(rightEyeX + 18, visorY + 8);
  ctx.lineTo(rightEyeX - 14, visorY + 15);
  ctx.lineTo(rightEyeX + 14, visorY + 24);
  ctx.closePath();
  ctx.fill();

  // Boss name & HP bar integrated above/on tank
  const barWidth = width - 32;
  const barX = x + 16;
  const barY = y + height - 18;
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(barX, barY, barWidth, 10);
  const hpRatio = Math.max(0, hp / maxHp);
  ctx.fillStyle = hpRatio > 0.5 ? '#ff6b00' : hpRatio > 0.25 ? '#f59e0b' : '#ef4444';
  ctx.fillRect(barX, barY, barWidth * hpRatio, 10);
  ctx.strokeStyle = '#f8fafc';
  ctx.lineWidth = 1;
  ctx.strokeRect(barX, barY, barWidth, 10);

  if (hitFlash > 0) {
    ctx.fillStyle = `rgba(255, 255, 255, ${Math.min(0.8, hitFlash * 10)})`;
    ctx.fillRect(x, y, width, height);
  }

  // 4. Active downward electrical zaps
  for (let i = 0; i < zaps.length; i++) {
    const zap = zaps[i];
    ctx.save();
    ctx.shadowColor = '#ef4444';
    ctx.shadowBlur = 12;
    ctx.strokeStyle = '#fde047';
    ctx.lineWidth = 3.5;

    ctx.beginPath();
    ctx.moveTo(zap.x, zap.y - zap.height / 2);
    ctx.lineTo(zap.x - 6, zap.y - zap.height * 0.15);
    ctx.lineTo(zap.x + 6, zap.y + zap.height * 0.15);
    ctx.lineTo(zap.x, zap.y + zap.height / 2);
    ctx.stroke();

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
  }

  ctx.restore();
}
