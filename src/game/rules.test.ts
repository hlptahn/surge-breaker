import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculatePowerFactor,
  getPowerFactorMultiplier,
  calculateBrickScore,
  evaluatePaddleCatch,
  getCentreCatchMessage,
  stepPassiveCooling,
  isHighHeatWarning,
  checkExtraLifeMilestone,
  getExtraLifeMilestoneMessage,
  applyExtraLifeReward,
  selectPowerUpFromRoll,
  splitBallsForParallel,
  shouldResetComboOnPaddleCatch,
  evaluateBallLost,
  getFusecoExpertContactUrl,
  FUSECO_EXPERT_CONTACT_BASE_URL,
  FUSECO_EXPERT_SHORT_URL,
  getStartingBallSpeed,
  MAX_LIVES,
  MAX_LIVES_BONUS_POINTS,
  MAX_BALLS,
  PARALLEL_SPLIT_ANGLE_DEG,
  SurgeBallState,
  testBallVsAABB,
  buildLevelBricks,
  isRegularLevelCleared,
  createBossForWorld,
} from './rules';
import { generateQrMatrix } from './qrcode';

test('Power Factor starts at 0.70 and climbs to 0.99 with combo', () => {
  assert.equal(calculatePowerFactor(0), 0.70);
  assert.equal(calculatePowerFactor(4), 0.80);
  assert.equal(calculatePowerFactor(12), 0.99);
  assert.equal(calculatePowerFactor(25), 0.99);

  assert.equal(getPowerFactorMultiplier(0.70), 1.0);
  assert.equal(getPowerFactorMultiplier(0.99), 2.5);
  assert.ok(calculateBrickScore(100, 12) > calculateBrickScore(100, 0));
});

test('Heat Meter decreases on centre third paddle catch and increases on left/right thirds', () => {
  // Centre hit (ballX == paddleX) with 0 combo
  const centreCatch = evaluatePaddleCatch(40, 480, 480, 120, 0);
  assert.equal(centreCatch.zone, 'centre');
  assert.equal(centreCatch.heatDelta, -3);
  assert.equal(centreCatch.newHeat, 37);
  assert.equal(centreCatch.fuseBlown, false);

  // Left third hit (ballX = paddleX - 50 on width 120 => relativeHit = -50/60 = -0.833)
  const leftCatch = evaluatePaddleCatch(40, 430, 480, 120, 0);
  assert.equal(leftCatch.zone, 'left');
  assert.equal(leftCatch.heatDelta, 8);
  assert.equal(leftCatch.newHeat, 48);
  assert.ok(leftCatch.bounceAngleRad < -0.5);

  // Right third hit with combo > 5 adds extra heat
  const rightComboCatch = evaluatePaddleCatch(40, 530, 480, 120, 8);
  assert.equal(rightComboCatch.zone, 'right');
  assert.equal(rightComboCatch.comboHeatAdded, 6); // (8 - 5) * 2 = 6
  assert.equal(rightComboCatch.heatDelta, 14); // 8 + 6
  assert.equal(rightComboCatch.newHeat, 54);
});

test('Centre catch message always matches whether heat went down or went up/flat from combo', () => {
  const cool3 = getCentreCatchMessage(-3);
  assert.equal(cool3.text, 'CENTRE COOL -3% HEAT');
  assert.equal(cool3.color, '#00e5ff');

  const cool1 = getCentreCatchMessage(-1);
  assert.equal(cool1.text, 'CENTRE COOL -1% HEAT');
  assert.equal(cool1.color, '#00e5ff');

  const flat0 = getCentreCatchMessage(0);
  assert.equal(flat0.text, 'COMBO HEAT +0%');
  assert.equal(flat0.color, '#ffb703');

  const up6 = getCentreCatchMessage(6);
  assert.equal(up6.text, 'COMBO HEAT +6%');
  assert.equal(up6.color, '#ffb703');
});

test('Fuse blows when heat reaches 100% and high heat warning activates above 80%', () => {
  assert.equal(isHighHeatWarning(80), false);
  assert.equal(isHighHeatWarning(80.5), true);

  const blowResult = evaluatePaddleCatch(94, 535, 480, 120, 0);
  assert.equal(blowResult.newHeat, 100);
  assert.equal(blowResult.fuseBlown, true);
});

test('Passive cooling reduces heat by 1% per second only when below 80%', () => {
  assert.equal(stepPassiveCooling(50, 2.0), 48);
  assert.equal(stepPassiveCooling(85, 2.0), 85);
  assert.equal(stepPassiveCooling(0.5, 2.0), 0);
});

test('Extra life milestone triggers at every 25,000 points and formats the reached milestone', () => {
  // Does not trigger at 10,000
  assert.equal(checkExtraLifeMilestone(9800, 10200), 0);
  // Triggers at 25,000
  assert.equal(checkExtraLifeMilestone(24800, 25200), 1);
  assert.equal(checkExtraLifeMilestone(25200, 49900), 0);
  assert.equal(checkExtraLifeMilestone(24500, 50500), 2);

  assert.equal(getExtraLifeMilestoneMessage(25200), '25,000 PTS · +1 FUSE LIFE!');
  assert.equal(getExtraLifeMilestoneMessage(50500), '50,000 PTS · +1 FUSE LIFE!');
  assert.equal(getExtraLifeMilestoneMessage(75100), '75,000 PTS · +1 FUSE LIFE!');
});

test('Lives are capped at 6 and extra life rewards at cap grant +2,500 bonus points', () => {
  assert.equal(MAX_LIVES, 6);
  assert.equal(MAX_LIVES_BONUS_POINTS, 2500);

  // Below cap: increments lives with 0 bonus points
  const belowCap = applyExtraLifeReward(4, 1);
  assert.equal(belowCap.newLives, 5);
  assert.equal(belowCap.livesAdded, 1);
  assert.equal(belowCap.cappedCount, 0);
  assert.equal(belowCap.bonusPoints, 0);

  // At cap (6): stays at 6 lives and awards +2,500 bonus points
  const atCap = applyExtraLifeReward(6, 1);
  assert.equal(atCap.newLives, 6);
  assert.equal(atCap.livesAdded, 0);
  assert.equal(atCap.cappedCount, 1);
  assert.equal(atCap.bonusPoints, 2500);

  // Crossing into cap with multiple rewards (5 lives + 2 rewards -> 6 lives + 2,500 bonus)
  const mixed = applyExtraLifeReward(5, 2);
  assert.equal(mixed.newLives, 6);
  assert.equal(mixed.livesAdded, 1);
  assert.equal(mixed.cappedCount, 1);
  assert.equal(mixed.bonusPoints, 2500);
});

test('Power-up drop mix keeps After-Hours at 3%/5%, gives Parallel Circuit 15%, and weights Cooling higher above 55% heat', () => {
  // Normal lives (3), low heat (20):
  // [0, 0.03) -> AFTER_HOURS (3%)
  // [0.03, 0.18) -> PARALLEL_CIRCUIT (15%)
  // [0.18, 0.48) -> COOLING (30%, down 5% from 35%)
  // [0.48, 0.75) -> HIGHER_AMP (27%, down 5% from 32%)
  // [0.75, 1.0] -> CIRCUIT_BREAKER (25%, down 5% from 30%)
  assert.equal(selectPowerUpFromRoll(0.0, 20, 3), 'AFTER_HOURS');
  assert.equal(selectPowerUpFromRoll(0.029, 20, 3), 'AFTER_HOURS');
  assert.equal(selectPowerUpFromRoll(0.031, 20, 3), 'PARALLEL_CIRCUIT');
  assert.equal(selectPowerUpFromRoll(0.179, 20, 3), 'PARALLEL_CIRCUIT');
  assert.equal(selectPowerUpFromRoll(0.181, 20, 3), 'COOLING');
  assert.equal(selectPowerUpFromRoll(0.479, 20, 3), 'COOLING');
  assert.equal(selectPowerUpFromRoll(0.481, 20, 3), 'HIGHER_AMP');
  assert.equal(selectPowerUpFromRoll(0.749, 20, 3), 'HIGHER_AMP');
  assert.equal(selectPowerUpFromRoll(0.751, 20, 3), 'CIRCUIT_BREAKER');
  assert.equal(selectPowerUpFromRoll(0.999, 20, 3), 'CIRCUIT_BREAKER');

  // Last life (1), low heat (20):
  // [0, 0.05) -> AFTER_HOURS (5%)
  // [0.05, 0.20) -> PARALLEL_CIRCUIT (15%)
  // [0.20, 0.46) -> COOLING (26%, down 5% from 31%)
  // [0.46, 0.74) -> HIGHER_AMP (28%, down 5% from 33%)
  // [0.74, 1.0] -> CIRCUIT_BREAKER (26%, down 5% from 31%)
  assert.equal(selectPowerUpFromRoll(0.049, 20, 1), 'AFTER_HOURS');
  assert.equal(selectPowerUpFromRoll(0.051, 20, 1), 'PARALLEL_CIRCUIT');
  assert.equal(selectPowerUpFromRoll(0.199, 20, 1), 'PARALLEL_CIRCUIT');
  assert.equal(selectPowerUpFromRoll(0.201, 20, 1), 'COOLING');
  assert.equal(selectPowerUpFromRoll(0.459, 20, 1), 'COOLING');
  assert.equal(selectPowerUpFromRoll(0.461, 20, 1), 'HIGHER_AMP');
  assert.equal(selectPowerUpFromRoll(0.739, 20, 1), 'HIGHER_AMP');
  assert.equal(selectPowerUpFromRoll(0.741, 20, 1), 'CIRCUIT_BREAKER');

  // High heat (> 55) boosts COOLING share above normal 0.48 threshold (up to 0.51):
  assert.equal(selectPowerUpFromRoll(0.495, 20, 3), 'HIGHER_AMP');
  assert.equal(selectPowerUpFromRoll(0.495, 75, 3), 'COOLING');
});

test('Parallel Circuit splits the ball closest to the paddle by ±20 degrees and caps at 5 balls', () => {
  assert.equal(MAX_BALLS, 5);
  assert.equal(PARALLEL_SPLIT_ANGLE_DEG, 20);

  const initialBalls: SurgeBallState[] = [
    {
      id: 1,
      x: 200,
      y: 150, // far from paddle
      vx: 0,
      vy: -400,
      trail: [],
      colorVariant: 'cyan',
    },
    {
      id: 2,
      x: 480,
      y: 500, // closest to paddle (480, 668)
      vx: 0,
      vy: -400, // heading straight up (angle -90 deg)
      trail: [{ x: 480, y: 510 }],
      colorVariant: 'orange',
    },
  ];

  // Splitting from 2 balls adds 2 balls -> 4 balls total
  const res1 = splitBallsForParallel(initialBalls, 480, 668, 400, 3);
  assert.equal(res1.addedCount, 2);
  assert.equal(res1.balls.length, 4);
  assert.equal(res1.nextBallId, 5);

  const newBallA = res1.balls[2];
  const newBallB = res1.balls[3];
  // Spawned at the closest ball's position (480, 500)
  assert.equal(newBallA.x, 480);
  assert.equal(newBallA.y, 500);
  assert.equal(newBallB.x, 480);
  assert.equal(newBallB.y, 500);

  // Same speed (400) and ±20 deg around -90 deg
  const speedA = Math.hypot(newBallA.vx, newBallA.vy);
  const speedB = Math.hypot(newBallB.vx, newBallB.vy);
  assert.ok(Math.abs(speedA - 400) < 1e-6);
  assert.ok(Math.abs(speedB - 400) < 1e-6);

  const baseAngle = Math.atan2(-400, 0);
  const angleA = Math.atan2(newBallA.vy, newBallA.vx);
  const angleB = Math.atan2(newBallB.vy, newBallB.vx);
  const rad20 = (20 * Math.PI) / 180;
  assert.ok(Math.abs(angleA - (baseAngle - rad20)) < 1e-6);
  assert.ok(Math.abs(angleB - (baseAngle + rad20)) < 1e-6);

  // Splitting again from 4 balls only has room for 1 more ball (cap at 5)
  const res2 = splitBallsForParallel(res1.balls, 480, 668, 400, res1.nextBallId);
  assert.equal(res2.addedCount, 1);
  assert.equal(res2.balls.length, 5);

  // Splitting at the 5-ball cap adds 0 balls
  const res3 = splitBallsForParallel(res2.balls, 480, 668, 400, res2.nextBallId);
  assert.equal(res3.addedCount, 0);
  assert.equal(res3.balls.length, 5);
});

test('A life is lost only when the last ball is lost, and shared combo resets properly', () => {
  // Paddle catch combo reset rule: resets ONLY when 1 ball is in play
  assert.equal(shouldResetComboOnPaddleCatch(3), false);
  assert.equal(shouldResetComboOnPaddleCatch(2), false);
  assert.equal(shouldResetComboOnPaddleCatch(1), true);

  // Ball lost while 2 other balls remain in play: no life lost, combo resets
  const stillInPlay = evaluateBallLost(2, 3);
  assert.equal(stillInPlay.lifeLost, false);
  assert.equal(stillInPlay.newLives, 3);
  assert.equal(stillInPlay.resetCombo, true);

  // Ball lost while 1 other ball remains in play: no life lost, combo resets
  const oneLeft = evaluateBallLost(1, 3);
  assert.equal(oneLeft.lifeLost, false);
  assert.equal(oneLeft.newLives, 3);
  assert.equal(oneLeft.resetCombo, true);

  // Last ball lost (0 remaining): life is lost!
  const lastLost = evaluateBallLost(0, 3);
  assert.equal(lastLost.lifeLost, true);
  assert.equal(lastLost.newLives, 2);
  assert.equal(lastLost.resetCombo, true);
});

test('QR code contact URLs and offline QR matrix match Victory and Game Over outcomes', () => {
  assert.equal(FUSECO_EXPERT_CONTACT_BASE_URL, 'https://www.fuseco.com.au/contact-us');
  assert.equal(FUSECO_EXPERT_SHORT_URL, 'fuseco.com.au/contact-us');

  const victoryUrl = getFusecoExpertContactUrl('victory');
  const gameOverUrl = getFusecoExpertContactUrl('defeat');

  assert.equal(
    victoryUrl,
    'https://www.fuseco.com.au/contact-us?utm_source=surge-breaker&utm_medium=arcade-game&utm_campaign=30-years&utm_content=victory'
  );
  assert.equal(
    gameOverUrl,
    'https://www.fuseco.com.au/contact-us?utm_source=surge-breaker&utm_medium=arcade-game&utm_campaign=30-years&utm_content=gameover'
  );

  // Offline QR matrix generates a valid square matrix with intact 7x7 finder patterns
  for (const url of [victoryUrl, gameOverUrl]) {
    const matrix = generateQrMatrix(url);
    assert.ok(matrix.length >= 21);
    assert.equal(matrix.length, matrix[0].length);
    // Top-left finder outer corner & center (3,3) must be dark (true)
    assert.equal(matrix[0][0], true);
    assert.equal(matrix[3][3], true);
    // Top-left finder inner ring (1,1) must be light (false)
    assert.equal(matrix[1][1], false);
  }
});

test('Starting ball speed scales cleanly by world and level', () => {
  const w1l1 = getStartingBallSpeed(1, 1);
  const w1l2 = getStartingBallSpeed(1, 2);
  const w2l1 = getStartingBallSpeed(2, 1);
  assert.ok(w1l2 > w1l1);
  assert.ok(w2l1 > w1l1);
});

test('Circle vs AABB collision detects hits and surface normals accurately', () => {
  const brick = { x: 100, y: 100, width: 80, height: 32 };
  const bottomHit = testBallVsAABB(140, 136, 8, brick);
  assert.equal(bottomHit.hit, true);
  assert.equal(bottomHit.normalY, 1);

  const miss = testBallVsAABB(50, 50, 8, brick);
  assert.equal(miss.hit, false);
});

test('Worlds and levels generate valid destructible and boss configurations within arena bounds', () => {
  for (const world of [1, 2, 3] as const) {
    for (const level of [1, 2, 3] as const) {
      const bricks = buildLevelBricks(world, level);
      assert.ok(bricks.length > 20);
      assert.equal(isRegularLevelCleared(bricks), false);
      // Mark all destructible bricks as 0 hp
      for (const b of bricks) {
        if (!b.indestructible) b.hp = 0;
      }
      assert.equal(isRegularLevelCleared(bricks), true);
    }
    const boss = createBossForWorld(world);
    assert.ok(boss.maxHp >= 18);
    // Boss top arc spheres extend 26.5px above boss.y; verify they remain inside top arena border (y >= 64)
    assert.ok(boss.y - 26.5 >= 64);
  }
});

