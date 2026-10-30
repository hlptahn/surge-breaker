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
  getStartingBallSpeed,
  MAX_LIVES,
  MAX_LIVES_BONUS_POINTS,
  testBallVsAABB,
  buildLevelBricks,
  isRegularLevelCleared,
  createBossForWorld,
} from './rules';

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

test('After-Hours Call-Out drop rate is 3% normally and 5% on last life', () => {
  // Normal lives (3): < 0.03 is AFTER_HOURS, >= 0.03 is COOLING / HIGHER_AMP / CIRCUIT_BREAKER
  assert.equal(selectPowerUpFromRoll(0.029, 20, 3), 'AFTER_HOURS');
  assert.equal(selectPowerUpFromRoll(0.031, 20, 3), 'COOLING');
  assert.equal(selectPowerUpFromRoll(0.39, 20, 3), 'HIGHER_AMP');
  assert.equal(selectPowerUpFromRoll(0.71, 20, 3), 'CIRCUIT_BREAKER');

  // Last life (1): < 0.05 is AFTER_HOURS, >= 0.05 is COOLING
  assert.equal(selectPowerUpFromRoll(0.049, 20, 1), 'AFTER_HOURS');
  assert.equal(selectPowerUpFromRoll(0.051, 20, 1), 'COOLING');
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
