/**
 * weather.js - Day/Night Cycle, Weather States & Ambient Environmental Simulation
 */

class WeatherSystem {
  constructor() {
    this.day = 1;
    this.maxDays = 7;
    this.hour = 7.0; // Starts at 07:00 AM
    this.secondsPerGameHour = 22; // 1 game hour = 22 real-time seconds

    this.weatherType = 'clear'; // 'clear', 'hot', 'overcast', 'rain'
    this.weatherTimer = 0;
    this.isVictory = false;

    // Rain particles
    this.rainParticles = [];
    this.maxRainDrops = 180;
    this.initRain();
  }

  initRain() {
    for (let i = 0; i < this.maxRainDrops; i++) {
      this.rainParticles.push({
        x: Math.random() * 1920,
        y: Math.random() * 1080,
        len: 12 + Math.random() * 14,
        speed: 480 + Math.random() * 200
      });
    }
  }

  update(dt, player, world, onNotify) {
    // Advance clock
    const deltaHour = dt / this.secondsPerGameHour;
    this.hour += deltaHour;

    // Deplete player's repellent hours
    if (player && player.repellentHoursLeft > 0) {
      player.repellentHoursLeft = Math.max(0, player.repellentHoursLeft - deltaHour);
    }

    // Deplete player's mask hours
    if (player && player.maskHoursLeft > 0) {
      player.maskHoursLeft = Math.max(0, player.maskHoursLeft - deltaHour);
      if (player.maskHoursLeft <= 0) {
        player.hasMask = false;
        if (onNotify) {
          onNotify('😷 หน้ากากอนามัยหมดอายุการใช้งานแล้ว (ควรสวมใส่ชิ้นใหม่)', 'warning');
        }
      }
    }

    // New day transition
    if (this.hour >= 24) {
      this.hour -= 24;
      this.day++;

      // Reset clinic quota for the new day
      if (world && world.resetClinicDailyQuota) {
        world.resetClinicDailyQuota();
      }

      if (this.day > this.maxDays) {
        this.isVictory = true;
        return;
      }

      if (onNotify) {
        onNotify(`🌅 เริ่มต้นวันที่ ${this.day} / ${this.maxDays}! รพ.สต. รีเซ็ตโควตายาประจำวันแล้ว`, 'success');
      }
    }

    // Weather change routine
    this.weatherTimer += dt;
    if (this.weatherTimer > 65) {
      this.weatherTimer = 0;
      this.randomizeWeather(world, onNotify);
    }

    // Update rain particles if raining
    if (this.weatherType === 'rain') {
      for (const p of this.rainParticles) {
        p.y += p.speed * dt;
        p.x += p.speed * 0.25 * dt; // Wind slant
        if (p.y > 1100) {
          p.y = -20;
          p.x = Math.random() * 1920;
        }
      }
    }

    // Sync ambient sound
    if (window.soundManager) {
      window.soundManager.setRainAmbient(this.weatherType === 'rain');
    }
  }

  randomizeWeather(world, onNotify) {
    const roll = Math.random();
    let oldWeather = this.weatherType;

    if (roll < 0.45) {
      this.weatherType = 'clear';
    } else if (roll < 0.70) {
      this.weatherType = (this.hour >= 11 && this.hour <= 15) ? 'hot' : 'clear';
    } else if (roll < 0.88) {
      this.weatherType = 'overcast';
    } else {
      this.weatherType = 'rain';
    }

    if (this.weatherType !== oldWeather && onNotify) {
      if (this.weatherType === 'rain') {
        onNotify('🌧️ ฝนเริ่มตกหนัก! มีน้ำขังตามพื้นดิน ระวังเชื้อโรคฉี่หนู', 'warning');
        // Activate all puddles
        if (world) {
          world.puddles.forEach(p => p.active = true);
        }
      } else if (this.weatherType === 'hot') {
        onNotify('☀️ แดดจัดและอากาศร้อนระอุ! ร่างกายสูญเสียน้ำเร็วขึ้น', 'warning');
      } else if (this.weatherType === 'clear' && oldWeather === 'rain') {
        onNotify('🌤️ ฝนหยุดตกแล้ว แดดเริ่มส่อง', 'success');
      }
    }
  }

  // Check if it's high heat
  isHotSun() {
    return (this.weatherType === 'hot' || (this.weatherType === 'clear' && this.hour >= 11.5 && this.hour <= 14.5));
  }

  // Active feeding hours for Aedes aegypti (Dengue mosquito: Dawn 05:30-08:00 & Dusk 16:30-19:00)
  isMosquitoActiveHour() {
    return (this.hour >= 5.5 && this.hour <= 8.0) || (this.hour >= 16.5 && this.hour <= 19.5);
  }

  // Fast forward time during sleep
  fastForward(hours, world = null, player = null) {
    this.hour += hours;
    while (this.hour >= 24) {
      this.hour -= 24;
      this.day++;
      if (world && world.resetClinicDailyQuota) {
        world.resetClinicDailyQuota();
      }
    }

    if (player) {
      if (player.repellentHoursLeft > 0) {
        player.repellentHoursLeft = Math.max(0, player.repellentHoursLeft - hours);
      }
      if (player.maskHoursLeft > 0) {
        player.maskHoursLeft = Math.max(0, player.maskHoursLeft - hours);
        if (player.maskHoursLeft <= 0) {
          player.hasMask = false;
        }
      }
    }
  }

  // Get Ambient Darkness Overlay RGBA
  getAmbientColor() {
    const h = this.hour;

    // Morning sunrise (05:00 - 07:00): Warm orange fade
    if (h >= 5 && h < 7) {
      const t = (h - 5) / 2;
      return `rgba(180, 100, 40, ${0.45 * (1 - t)})`;
    }
    // Daylight (07:00 - 17:00): Clear
    if (h >= 7 && h < 17) {
      if (this.weatherType === 'rain') return 'rgba(30, 45, 60, 0.35)';
      if (this.weatherType === 'overcast') return 'rgba(40, 50, 60, 0.2)';
      return 'rgba(0, 0, 0, 0)';
    }
    // Sunset / Dusk (17:00 - 19:30): Deep purple/amber
    if (h >= 17 && h < 19.5) {
      const t = (h - 17) / 2.5;
      return `rgba(120, 40, 90, ${0.15 + 0.45 * t})`;
    }
    // Night (19:30 - 05:00): Dark blue night
    let nightAlpha = 0.68;
    if (this.weatherType === 'rain') nightAlpha = 0.78;
    return `rgba(6, 12, 28, ${nightAlpha})`;
  }

  // Formatted string: e.g. "07:30 น."
  getTimeFormatted() {
    const totalMinutes = Math.floor((this.hour % 24) * 60);
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    const hStr = h < 10 ? '0' + h : '' + h;
    const mStr = m < 10 ? '0' + m : '' + m;
    return `${hStr}:${mStr} น.`;
  }

  getWeatherFormatted() {
    switch (this.weatherType) {
      case 'clear': return '☀️ ท้องฟ้าแจ่มใส';
      case 'hot': return '🔥 แดดร้อนจัด';
      case 'overcast': return '⛅ เมฆครึ้ม';
      case 'rain': return '🌧️ ฝนตกน้ำขัง';
      default: return '☀️ อากาศปกติ';
    }
  }
}

window.WeatherSystem = WeatherSystem;
