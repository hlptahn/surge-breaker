import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculatePowerFactor,
  getPowerFactorMultiplier,
  calculateBrickScore,
  evaluatePaddleCatch,
  stepPassiveCooling,
  isHighHeatWarning,
  checkExtraLifeMilestone,
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

test('Extra life milestone triggers at every 10,000 points', () => {
  assert.equal(checkExtraLifeMilestone(9800, 10200), 1);
  assert.equal(checkExtraLifeMilestone(10200, 19900), 0);
  assert.equal(checkExtraLifeMilestone(9500, 20500), 2);
});

test('Circle vs AABB collision detects hits and surface normals accurately', () => {
  const brick = { x: 100, y: 100, width: 80, height: 32 };
  const bottomHit = testBallVsAABB(140, 136, 8, brick);
  assert.equal(bottomHit.hit, true);
  assert.equal(bottomHit.normalY, 1);

  const miss = testBallVsAABB(50, 50, 8, brick);
  assert.equal(miss.hit, false);
});

test('Worlds and levels generate valid destructible and boss configurations', () => {
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
  }
});
