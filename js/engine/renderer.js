/**
 * renderer.js - 2D Canvas Engine: Camera, World Tiles, Animated Sprites, Lighting & FX
 */

class GameRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.camera = { x: 0, y: 0 };
    this.smokeParticles = [];
    this.waterRippleTime = 0;
    this.mosquitoParticles = [];

    this.initMosquitoParticles();
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = this.width;
    this.canvas.height = this.height;
  }

  initMosquitoParticles() {
    for (let i = 0; i < 40; i++) {
      this.mosquitoParticles.push({
        x: 0,
        y: 0,
        vx: (Math.random() - 0.5) * 60,
        vy: (Math.random() - 0.5) * 60,
        angle: Math.random() * Math.PI * 2
      });
    }
  }

  updateCamera(targetX, targetY, worldWidth, worldHeight) {
    // Smooth camera centered on target
    const targetCamX = targetX - this.width / 2;
    const targetCamY = targetY - this.height / 2;

    this.camera.x += (targetCamX - this.camera.x) * 0.12;
    this.camera.y += (targetCamY - this.camera.y) * 0.12;

    // Clamp camera within map if map is larger than screen
    if (worldWidth > this.width) {
      this.camera.x = Math.max(0, Math.min(this.camera.x, worldWidth - this.width));
    }
    if (worldHeight > this.height) {
      this.camera.y = Math.max(0, Math.min(this.camera.y, worldHeight - this.height));
    }
  }

  render(world, player, weatherSystem, diseaseSystem, nearbyEntity, dt) {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    this.waterRippleTime += dt * 2.5;

    ctx.save();
    // Apply camera offset
    ctx.translate(-Math.floor(this.camera.x), -Math.floor(this.camera.y));

    // 1. Draw World Tiles
    this.drawWorldTiles(ctx, world);

    // 2. Draw Puddles (Leptospirosis water hazards)
    this.drawPuddles(ctx, world);

    // 3. Draw Interactive Entities & Structures
    this.drawEntities(ctx, world, dt);

    // 4. Draw Player Character
    this.drawPlayer(ctx, player);

    // 5. Draw Mosquito Swarms
    this.drawMosquitoes(ctx, world, player, dt);

    // 6. Draw Entity Focus Indicator
    if (nearbyEntity) {
      this.drawInteractionHighlight(ctx, nearbyEntity);
    }

    // 7. Day/Night & Weather Ambient Overlay
    this.drawLightingAndWeather(ctx, weatherSystem, world);

    ctx.restore();

    // 8. Screen-space Rain
    if (weatherSystem.weatherType === 'rain') {
      this.drawRainScreen(ctx, weatherSystem);
    }
  }

  drawWorldTiles(ctx, world) {
    const startCol = Math.max(0, Math.floor(this.camera.x / world.tileSize));
    const endCol = Math.min(world.cols - 1, Math.ceil((this.camera.x + this.width) / world.tileSize));
    const startRow = Math.max(0, Math.floor(this.camera.y / world.tileSize));
    const endRow = Math.min(world.rows - 1, Math.ceil((this.camera.y + this.height) / world.tileSize));

    for (let y = startRow; y <= endRow; y++) {
      for (let x = startCol; x <= endCol; x++) {
        const tileType = world.tiles[y][x];
        const px = x * world.tileSize;
        const py = y * world.tileSize;
        const ts = world.tileSize;

        switch (tileType) {
          case 0: // Grass
            ctx.fillStyle = '#2d5a27';
            ctx.fillRect(px, py, ts, ts);
            // Grass details
            if ((x + y) % 5 === 0) {
              ctx.fillStyle = '#386f31';
              ctx.fillRect(px + 10, py + 12, 3, 8);
              ctx.fillRect(px + 13, py + 15, 3, 5);
            }
            if ((x * 3 + y * 7) % 19 === 0) {
              ctx.fillStyle = '#fef08a'; // Tiny flower
              ctx.beginPath();
              ctx.arc(px + 24, py + 24, 2.5, 0, Math.PI * 2);
              ctx.fill();
            }
            break;

          case 1: // Dirt path
            ctx.fillStyle = '#926c48';
            ctx.fillRect(px, py, ts, ts);
            ctx.fillStyle = '#785536';
            if ((x + y) % 3 === 0) {
              ctx.fillRect(px + 8, py + 18, 5, 3);
            }
            break;

          case 2: // Road
            ctx.fillStyle = '#52525b';
            ctx.fillRect(px, py, ts, ts);
            ctx.fillStyle = '#71717a';
            ctx.fillRect(px, py + ts - 2, ts, 2);
            break;

          case 3: // Wood Floor
            ctx.fillStyle = '#a16207';
            ctx.fillRect(px, py, ts, ts);
            ctx.strokeStyle = '#78350f';
            ctx.lineWidth = 1;
            ctx.strokeRect(px, py, ts, ts);
            break;

          case 4: // Wall (Solid)
            ctx.fillStyle = '#3f3f46';
            ctx.fillRect(px, py, ts, ts);
            ctx.fillStyle = '#27272a';
            ctx.fillRect(px, py + ts - 8, ts, 8);
            ctx.fillStyle = '#52525b';
            ctx.fillRect(px + 2, py + 2, ts - 4, 10);
            break;

          case 5: // Deep Pond
            ctx.fillStyle = '#1e3a8a';
            ctx.fillRect(px, py, ts, ts);
            // Animated wave
            ctx.fillStyle = 'rgba(56, 189, 248, 0.25)';
            const waveOff = Math.sin(this.waterRippleTime + x * 0.8 + y * 0.5) * 4;
            ctx.fillRect(px + 4, py + 16 + waveOff, ts - 8, 4);
            break;

          case 6: // Tall Grass (Mosquito risk)
            ctx.fillStyle = '#224a1e';
            ctx.fillRect(px, py, ts, ts);
            ctx.fillStyle = '#4ade80';
            // Dense grass tufts
            ctx.fillRect(px + 6, py + 8, 4, 16);
            ctx.fillRect(px + 18, py + 4, 4, 22);
            ctx.fillRect(px + 32, py + 10, 4, 18);
            break;
        }
      }
    }
  }

  drawPuddles(ctx, world) {
    for (const p of world.puddles) {
      if (!p.active) continue;
      ctx.save();
      ctx.fillStyle = 'rgba(74, 144, 226, 0.45)';
      ctx.strokeStyle = 'rgba(147, 197, 253, 0.6)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, p.radius, p.radius * 0.55, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Hazard badge indicator
      ctx.fillStyle = '#ef4444';
      ctx.font = '10px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('⚠️ น้ำขัง', p.x, p.y + 4);

      ctx.restore();
    }
  }

  drawEntities(ctx, world, dt) {
    for (const ent of world.interactiveEntities) {
      ctx.save();
      const cx = ent.x + ent.w / 2;
      const cy = ent.y + ent.h / 2;

      // Drop shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
      ctx.beginPath();
      ctx.ellipse(cx, ent.y + ent.h, ent.w * 0.45, 8, 0, 0, Math.PI * 2);
      ctx.fill();

      // Draw custom visual based on entity id
      switch (ent.id) {
        case 'home_bed':
          ctx.fillStyle = '#b45309'; // Bed frame
          ctx.fillRect(ent.x, ent.y, ent.w, ent.h);
          ctx.fillStyle = '#f8fafc'; // Pillow
          ctx.fillRect(ent.x + 8, ent.y + 6, ent.w - 16, 14);
          ctx.fillStyle = '#3b82f6'; // Blanket
          ctx.fillRect(ent.x + 4, ent.y + 24, ent.w - 8, ent.h - 28);
          break;

        case 'home_stove':
          ctx.fillStyle = '#1e293b'; // Stove body
          ctx.fillRect(ent.x, ent.y, ent.w, ent.h);
          ctx.fillStyle = '#ef4444'; // Fire glow
          ctx.beginPath();
          ctx.arc(cx, cy, 10 + Math.sin(this.waterRippleTime * 4) * 2, 0, Math.PI * 2);
          ctx.fill();
          break;

        case 'wash_basin':
          ctx.fillStyle = '#64748b';
          ctx.fillRect(ent.x, ent.y, ent.w, ent.h);
          ctx.fillStyle = '#38bdf8'; // Water basin
          ctx.beginPath();
          ctx.arc(cx, cy, 12, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#f472b6'; // Soap
          ctx.fillRect(ent.x + 4, ent.y + 4, 10, 6);
          break;

        case 'water_jar':
          ctx.fillStyle = '#78350f'; // Clay jar
          ctx.beginPath();
          ctx.arc(cx, cy, 22, 0, Math.PI * 2);
          ctx.fill();
          if (ent.hasCover) {
            ctx.fillStyle = '#475569'; // Lid
            ctx.beginPath();
            ctx.arc(cx, cy, 18, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#10b981';
            ctx.font = '9px Prompt';
            ctx.fillText('ปิดฝาแล้ว', cx - 18, cy + 30);
          } else {
            ctx.fillStyle = ent.hasAbate ? '#059669' : '#0284c7'; // Water with abate or raw
            ctx.beginPath();
            ctx.arc(cx, cy, 14, 0, Math.PI * 2);
            ctx.fill();
            if (ent.hasAbate) {
              ctx.fillStyle = '#34d399';
              ctx.font = '9px Prompt';
              ctx.fillText('ใส่ทรายแล้ว', cx - 22, cy + 30);
            }
          }
          break;

        case 'coconut_shells':
          if (!ent.cleared) {
            ctx.fillStyle = '#451a03';
            ctx.beginPath();
            ctx.arc(ent.x + 12, ent.y + 16, 12, 0, Math.PI);
            ctx.arc(ent.x + 32, ent.y + 22, 10, 0, Math.PI);
            ctx.fill();
            ctx.fillStyle = '#38bdf8'; // Standing water
            ctx.fillRect(ent.x + 4, ent.y + 15, 16, 3);
          } else {
            ctx.fillStyle = '#64748b';
            ctx.font = '9px Prompt';
            ctx.fillText('คว่ำสะอาดแล้ว', ent.x - 4, ent.y + 24);
          }
          break;

        case 'meat_stall':
        case 'street_food':
          // Market stall with awning
          ctx.fillStyle = '#78350f'; // Counter
          ctx.fillRect(ent.x, ent.y + 16, ent.w, ent.h - 16);
          // Striped canopy
          const isMeat = ent.id === 'meat_stall';
          for (let i = 0; i < 4; i++) {
            ctx.fillStyle = (i % 2 === 0) ? (isMeat ? '#dc2626' : '#16a34a') : '#ffffff';
            ctx.fillRect(ent.x + i * (ent.w / 4), ent.y, ent.w / 4, 18);
          }
          break;

        case 'clinic_counter':
          ctx.fillStyle = '#e2e8f0'; // Clean clinic desk
          ctx.fillRect(ent.x, ent.y, ent.w, ent.h);
          ctx.fillStyle = '#ef4444'; // Red cross
          ctx.fillRect(cx - 3, cy - 10, 6, 20);
          ctx.fillRect(cx - 10, cy - 3, 20, 6);
          break;

        default:
          ctx.fillStyle = '#94a3b8';
          ctx.fillRect(ent.x, ent.y, ent.w, ent.h);
      }

      // Render entity emoji & label
      ctx.font = '18px serif';
      ctx.textAlign = 'center';
      ctx.fillText(ent.icon, cx, ent.y - 6);

      ctx.fillStyle = '#f8fafc';
      ctx.font = '600 11px Prompt, sans-serif';
      ctx.fillText(ent.name, cx, ent.y + ent.h + 14);

      ctx.restore();
    }
  }

  drawPlayer(ctx, player) {
    ctx.save();
    const px = player.x;
    const py = player.y;

    // Drop Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.beginPath();
    ctx.ellipse(px, py + 14, 14, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Mosquito repellent shield aura (if active)
    if (player.repellentHoursLeft > 0) {
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(px, py, 26 + Math.sin(this.waterRippleTime * 2) * 2, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Legs animation
    const legOffset = player.isMoving ? Math.sin(player.animTime) * 6 : 0;
    const bootColor = player.hasBoots ? '#f59e0b' : '#334155'; // Yellow boots or dark shoes

    // Left Leg
    ctx.fillStyle = bootColor;
    ctx.fillRect(px - 8, py + 8 + legOffset, 6, player.hasBoots ? 10 : 8);
    // Right Leg
    ctx.fillStyle = bootColor;
    ctx.fillRect(px + 2, py + 8 - legOffset, 6, player.hasBoots ? 10 : 8);

    // Torso / Shirt
    ctx.fillStyle = '#0284c7'; // Blue shirt
    ctx.beginPath();
    ctx.roundRect(px - 10, py - 6, 20, 16, 4);
    ctx.fill();

    // Head
    ctx.fillStyle = '#fcd34d'; // Skin
    ctx.beginPath();
    ctx.arc(px, py - 14, 10, 0, Math.PI * 2);
    ctx.fill();

    // Hair / Cap
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.arc(px, py - 16, 10, Math.PI, 0);
    ctx.fill();

    // Face eyes based on direction
    ctx.fillStyle = '#0f172a';
    if (player.facing === 'down') {
      ctx.fillRect(px - 4, py - 14, 2, 3);
      ctx.fillRect(px + 2, py - 14, 2, 3);
    } else if (player.facing === 'left') {
      ctx.fillRect(px - 7, py - 14, 2, 3);
    } else if (player.facing === 'right') {
      ctx.fillRect(px + 5, py - 14, 2, 3);
    }

    // Surgical Face Mask (if equipped and facing front/sides)
    if (player.hasMask && player.facing !== 'up') {
      ctx.fillStyle = '#f8fafc';
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 1;
      if (player.facing === 'down') {
        ctx.fillRect(px - 5, py - 11, 10, 6);
        ctx.strokeRect(px - 5, py - 11, 10, 6);
      } else if (player.facing === 'left') {
        ctx.fillRect(px - 8, py - 11, 8, 6);
        ctx.strokeRect(px - 8, py - 11, 8, 6);
      } else if (player.facing === 'right') {
        ctx.fillRect(px, py - 11, 8, 6);
        ctx.strokeRect(px, py - 11, 8, 6);
      }
    }

    ctx.restore();
  }

  drawMosquitoes(ctx, world, player, dt) {
    // Only render mosquitoes when player is in mosquito zone or untreated jar
    const inMosquitoArea = world.isMosquitoZone(player.x, player.y);
    if (!inMosquitoArea) return;

    ctx.save();
    ctx.fillStyle = '#000000';
    for (const p of this.mosquitoParticles) {
      p.angle += (Math.random() - 0.5) * 1.5;
      p.x = player.x + Math.cos(p.angle) * (20 + Math.random() * 45);
      p.y = player.y + Math.sin(p.angle) * (15 + Math.random() * 35);

      ctx.fillRect(p.x, p.y, 2, 2);
    }
    ctx.restore();
  }

  drawInteractionHighlight(ctx, ent) {
    ctx.save();
    const cx = ent.x + ent.w / 2;
    const cy = ent.y + ent.h / 2;

    // Pulsing highlight ring around interactable object
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2.5;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.arc(cx, cy, Math.max(ent.w, ent.h) * 0.75 + Math.sin(this.waterRippleTime * 4) * 3, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
  }

  drawLightingAndWeather(ctx, weatherSystem, world) {
    const ambientColor = weatherSystem.getAmbientColor();
    ctx.fillStyle = ambientColor;
    ctx.fillRect(this.camera.x, this.camera.y, this.width, this.height);
  }

  drawRainScreen(ctx, weatherSystem) {
    ctx.save();
    ctx.strokeStyle = 'rgba(186, 230, 253, 0.55)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (const p of weatherSystem.rainParticles) {
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x + 4, p.y + p.len);
    }
    ctx.stroke();
    ctx.restore();
  }
}

window.GameRenderer = GameRenderer;
