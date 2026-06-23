import { clamp } from './utils.js';

export function createParticleEffects({ actors, world, ctx }) {
  let dustParticles = [];
  let deathParticles = [];
  let hitSparks = [];
  let screenShake = { time: 0, duration: 0, magnitude: 0 };

  function reset() {
    dustParticles = [];
    deathParticles = [];
    hitSparks = [];
    screenShake = { time: 0, duration: 0, magnitude: 0 };
  }

  function emitDust(dt) {
    actors.forEach((actor) => {
      const player = actor.player;
      if (actor.previousOnGround && !player.onGround && player.vy < 0) {
        emitJumpDust(player);
      }

      if (!actor.previousOnGround && player.onGround) {
        emitLandingDust(player, actor.previousVy);
      }

      if (!player.onGround || Math.abs(player.vx) < 45 || player.state !== 'run') return;
      if (Math.random() > dt * 16) return;

      const direction = player.vx > 0 ? -1 : 1;
      dustParticles.push({
        x: player.x + direction * (22 + Math.random() * 12),
        y: world.floorY - 7 + Math.random() * 6,
        vx: direction * (28 + Math.random() * 38),
        vy: -8 - Math.random() * 18,
        life: 0.42,
        maxLife: 0.42,
        size: 2.5 + Math.random() * 3.5,
        stretchX: 1,
      });
    });
  }

  function emitJumpDust(player) {
    const count = 5;
    for (let index = 0; index < count; index += 1) {
      const side = index % 2 === 0 ? -1 : 1;
      dustParticles.push({
        x: player.x + side * (7 + Math.random() * 12),
        y: world.floorY - 5 + Math.random() * 5,
        vx: side * (42 + Math.random() * 48) + player.vx * 0.06,
        vy: -14 - Math.random() * 18,
        life: 0.2 + Math.random() * 0.06,
        maxLife: 0.26,
        size: 3 + Math.random() * 4.5,
        stretchX: 1.2 + Math.random() * 0.38,
      });
    }
  }

  function emitLandingDust(player, previousVy = 0) {
    const impact = clamp(Math.abs(previousVy) / 760, 0.55, 1.35);
    const count = Math.round(8 + impact * 8);
    for (let index = 0; index < count; index += 1) {
      const side = index % 2 === 0 ? -1 : 1;
      dustParticles.push({
        x: player.x + side * (8 + Math.random() * 18),
        y: world.floorY - 4 + Math.random() * 6,
        vx: side * (64 + Math.random() * 130) * impact + player.vx * 0.06,
        vy: -16 - Math.random() * 34 * impact,
        life: 0.34 + Math.random() * 0.12,
        maxLife: 0.46,
        size: (6 + Math.random() * 10) * impact,
        stretchX: 1.8 + Math.random() * 0.9,
      });
    }
  }

  function updateDust(dt) {
    dustParticles = dustParticles.filter((particle) => {
      particle.life -= dt;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vy += 44 * dt;
      particle.size += 10 * dt;
      return particle.life > 0;
    });
  }

  function drawDust() {
    dustParticles.forEach((particle) => {
      const alpha = Math.max(0, particle.life / particle.maxLife) * 0.42;
      const stretchX = particle.stretchX || 1;
      ctx.fillStyle = `rgba(245, 248, 255, ${alpha})`;
      ctx.save();
      ctx.translate(particle.x, particle.y);
      ctx.scale(stretchX, 1);
      ctx.beginPath();
      ctx.arc(0, 0, particle.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }

  function triggerHitImpact(attacker, target, comboStep, defeated = false) {
    const box = attacker.player.attackBox;
    const hitX = box ? box.x + box.w * (attacker.player.facing === 1 ? 0.68 : 0.32) : target.player.x;
    const hitY = box ? box.y + box.h * 0.5 : target.player.y - 70;
    const effects = attacker.tuning.effects || {};
    const shake = Number(effects.hitShake ?? 1.6);
    const spark = Number(effects.hitSpark ?? 1);
    const power = defeated ? 1.45 : comboStep === 3 ? 1.25 : 1;
    spawnHitSparks(hitX, hitY, attacker.player.facing, power * spark);
    shakeScreen((defeated ? 8 : comboStep === 3 ? 6 : 4) * shake, defeated ? 0.18 : 0.12);
  }

  function triggerGuardImpact(attacker, target, broken = false) {
    const box = attacker.player.attackBox;
    const hitX = box ? box.x + box.w * 0.5 : target.player.x;
    const hitY = box ? box.y + box.h * 0.5 : target.player.y - 72;
    const effects = target.tuning.effects || {};
    const shake = Number(effects.hitShake ?? 1.6);
    spawnHitSparks(hitX, hitY, -attacker.player.facing, broken ? 1.45 : 1.05);
    shakeScreen((broken ? 7.5 : 4.5) * shake, broken ? 0.18 : 0.11);
    attacker.player.vx = -attacker.player.facing * (broken ? 105 : 68);
  }

  function spawnHitSparks(x, y, direction, power = 1) {
    const count = Math.round(7 + power * 5);
    for (let index = 0; index < count; index += 1) {
      const angle = (Math.random() - 0.5) * Math.PI * 0.9 + (direction === 1 ? 0 : Math.PI);
      const speed = (145 + Math.random() * 185) * power;
      hitSparks.push({
        x,
        y: y + (Math.random() - 0.5) * 24,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 45 * power,
        life: 0.16 + Math.random() * 0.08,
        maxLife: 0.24,
        length: 12 + Math.random() * 16 * power,
        width: 2 + Math.random() * 2.5,
      });
    }
  }

  function updateHitSparks(dt) {
    hitSparks = hitSparks.filter((spark) => {
      spark.life -= dt;
      spark.x += spark.vx * dt;
      spark.y += spark.vy * dt;
      spark.vx *= 0.9;
      spark.vy += 360 * dt;
      return spark.life > 0;
    });
  }

  function drawHitSparks() {
    hitSparks.forEach((spark) => {
      const alpha = clamp(spark.life / spark.maxLife, 0, 1);
      const angle = Math.atan2(spark.vy, spark.vx);
      ctx.save();
      ctx.translate(spark.x, spark.y);
      ctx.rotate(angle);
      ctx.globalAlpha = alpha;
      ctx.lineCap = 'round';
      ctx.strokeStyle = 'rgba(255, 58, 58, 0.95)';
      ctx.lineWidth = spark.width;
      ctx.beginPath();
      ctx.moveTo(-spark.length * 0.35, 0);
      ctx.lineTo(spark.length * 0.65, 0);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255, 196, 196, 0.88)';
      ctx.lineWidth = Math.max(1, spark.width * 0.45);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(spark.length * 0.42, 0);
      ctx.stroke();
      ctx.restore();
    });
  }

  function shakeScreen(magnitude, duration) {
    screenShake = {
      time: Math.max(screenShake.time, duration),
      duration: Math.max(screenShake.duration, duration),
      magnitude: Math.max(screenShake.magnitude, magnitude),
    };
  }

  function updateScreenShake(dt) {
    screenShake.time = Math.max(0, screenShake.time - dt);
    if (screenShake.time <= 0) {
      screenShake.duration = 0;
      screenShake.magnitude = 0;
    }
  }

  function getScreenShakeOffset() {
    if (screenShake.time <= 0 || screenShake.duration <= 0) return { x: 0, y: 0 };

    const progress = screenShake.time / screenShake.duration;
    const amount = screenShake.magnitude * progress * progress;
    return {
      x: (Math.random() - 0.5) * amount,
      y: (Math.random() - 0.5) * amount * 0.7,
    };
  }

  function spawnEnemyDeathBurst(actor, burst = actor.player.facing) {
    const player = actor.player;
    const scale = player.transform?.scale || 1;
    const vector = typeof burst === 'number' ? { x: burst, y: -0.35, power: 1 } : burst;
    const direction = Math.sign(vector?.x) || Math.sign(player.facing) || 1;
    const vectorX = Number(vector?.x || direction);
    const vectorY = Number(vector?.y ?? -0.35);
    const vectorLength = Math.hypot(vectorX, vectorY) || 1;
    const burstAxis = { x: vectorX / vectorLength, y: vectorY / vectorLength };
    const burstSide = { x: -burstAxis.y, y: burstAxis.x };
    const burstPower = clamp(Number(vector?.power ?? 1), 0, 4);
    const knockbackScale = clamp(vectorLength / 520, 0.7, 1.85);
    const pieces = [
      { image: player.assets.head, part: player.rig.head, x: 0, y: -102, weight: 1.15 },
      { image: player.assets.body, part: player.rig.body, x: 0, y: -54, weight: 1.25 },
      { image: player.assets.cape, part: player.rig.cape, x: -4, y: -48, weight: 0.95 },
      { image: player.assets.shield, part: player.rig.shield, x: 30, y: -58, weight: 0.8 },
      { image: player.assets.upperArmL, part: player.rig.upperArmL, x: -33, y: -64, weight: 0.72 },
      { image: player.assets.lowerArmL, part: player.rig.lowerArmL, x: -48, y: -34, weight: 0.62 },
      { image: player.assets.upperArmR, part: player.rig.upperArmR, x: 33, y: -64, weight: 0.72 },
      { image: player.assets.lowerArmR, part: player.rig.lowerArmR, x: 48, y: -34, weight: 0.62 },
      { image: player.assets.upperLegL, part: player.rig.upperLegL, x: -18, y: -18, weight: 0.72 },
      { image: player.assets.lowerLegL, part: player.rig.lowerLegL, x: -24, y: 10, weight: 0.62 },
      { image: player.assets.upperLegR, part: player.rig.upperLegR, x: 18, y: -18, weight: 0.72 },
      { image: player.assets.lowerLegR, part: player.rig.lowerLegR, x: 24, y: 10, weight: 0.62 },
      { image: player.assets.weapon, part: player.rig.weapon, x: 56, y: -42, weight: 0.58 },
    ];

    pieces.forEach((piece, index) => {
      const spread = (index / Math.max(1, pieces.length - 1) - 0.5) * 0.62 + (Math.random() - 0.5) * 0.2;
      const speed = ((210 + Math.random() * 230) * burstPower * knockbackScale) / piece.weight;
      const sideSpeed = speed * spread;
      deathParticles.push({
        image: piece.image,
        x: player.x + piece.x * player.facing * scale,
        y: player.y + piece.y * scale,
        vx: burstAxis.x * speed + burstSide.x * sideSpeed + Math.max(0, player.vx * direction) * direction * 0.16,
        vy: burstAxis.y * speed + burstSide.y * sideSpeed - (40 + Math.random() * 65) * burstPower,
        rotation: (Math.random() - 0.5) * 1.4,
        rotationSpeed: (Math.random() - 0.5) * 10,
        width: Math.max(8, (piece.part.w || piece.image.width || 28) * scale * 0.72),
        height: Math.max(8, (piece.part.h || piece.image.height || 28) * scale * 0.72),
        life: 0.82 + Math.random() * 0.22,
        maxLife: 1.04,
      });
    });

    emitLandingDust(player, 820);
  }

  function updateDeathParticles(dt) {
    deathParticles = deathParticles.filter((particle) => {
      particle.life -= dt;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vy += world.gravity * 0.72 * dt;
      particle.vx *= 0.988;
      particle.rotation += particle.rotationSpeed * dt;

      if (particle.y > world.floorY - particle.height * 0.22 && particle.vy > 0) {
        particle.y = world.floorY - particle.height * 0.22;
        particle.vy *= -0.28;
        particle.vx *= 0.72;
        particle.rotationSpeed *= 0.72;
      }

      return particle.life > 0;
    });
  }

  function drawDeathParticles() {
    deathParticles.forEach((particle) => {
      const alpha = clamp(particle.life / particle.maxLife, 0, 1);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(particle.x, particle.y);
      ctx.rotate(particle.rotation);
      ctx.drawImage(particle.image, -particle.width / 2, -particle.height / 2, particle.width, particle.height);
      ctx.restore();
    });
  }

  function update(dt) {
    updateDust(dt);
    updateDeathParticles(dt);
    updateHitSparks(dt);
    updateScreenShake(dt);
  }

  return {
    drawDeathParticles,
    drawDust,
    drawHitSparks,
    emitDust,
    getScreenShakeOffset,
    reset,
    spawnEnemyDeathBurst,
    triggerGuardImpact,
    triggerHitImpact,
    update,
  };
}
