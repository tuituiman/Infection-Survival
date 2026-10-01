/**
 * survival.js - Player Needs & Vital Health Systems
 */

class SurvivalSystem {
  constructor() {
    this.maxHp = 100;
    this.hp = 100;
    this.hunger = 100;
    this.thirst = 100;
    this.energy = 100;
    this.hygiene = 90;

    // Depletion rates per real-time second (1 hour in-game = ~45 real-time seconds)
    this.hungerDecayPerSec = 0.25; // ~11% per in-game hour
    this.thirstDecayPerSec = 0.40; // ~18% per in-game hour
    this.energyDecayPerSec = 0.22; // ~10% per in-game hour

    this.isDead = false;
    this.deathCause = '';
  }

  update(dt, diseaseSystem, weatherSystem) {
    if (this.isDead) return;

    // Multiplier for Thirst if suffering from Diarrhea (Severe dehydration!)
    let thirstRate = this.thirstDecayPerSec;
    if (diseaseSystem && diseaseSystem.hasDisease('diarrhea')) {
      thirstRate *= 3.5; // Rapid fluid loss
    }

    // Daytime heat slightly increases thirst
    if (weatherSystem && weatherSystem.isHotSun()) {
      thirstRate *= 1.3;
    }

    // Influenza causes severe exhaustion and muscle weakness (doubles energy drain)
    let energyRate = this.energyDecayPerSec;
    if (diseaseSystem && diseaseSystem.hasDisease('influenza')) {
      energyRate *= 2.0;
    }

    // Apply decay
    this.hunger = Math.max(0, this.hunger - this.hungerDecayPerSec * dt);
    this.thirst = Math.max(0, this.thirst - thirstRate * dt);
    this.energy = Math.max(0, this.energy - energyRate * dt);

    // Starvation / Dehydration HP damage
    if (this.hunger <= 0) {
      this.hp -= 2.5 * dt;
      if (this.hp <= 0 && !this.deathCause) {
        this.deathCause = 'อดอาหารจนร่างกายขาดสารอาหารรุนแรง (Starvation)';
      }
    }

    if (this.thirst <= 0) {
      this.hp -= 4.0 * dt;
      if (this.hp <= 0 && !this.deathCause) {
        this.deathCause = 'เกิดภาวะขาดน้ำเฉียบพลันและช็อก (Severe Dehydration)';
      }
    }

    if (this.energy <= 0) {
      // Extreme exhaustion damages HP slightly
      this.hp -= 1.0 * dt;
    }

    // Passive slow regeneration if well fed and hydrated
    if (this.hunger > 70 && this.thirst > 70 && this.energy > 50 && (!diseaseSystem || diseaseSystem.activeInfections.length === 0)) {
      this.hp = Math.min(this.maxHp, this.hp + 0.8 * dt);
    }

    // Check Death
    if (this.hp <= 0) {
      this.hp = 0;
      this.isDead = true;
      if (!this.deathCause) {
        this.deathCause = 'พลังชีวิตลดลงจนหมดจากภาวะแทรกซ้อน';
      }
    }
  }

  // Restore needs during sleep (balanced for 6-7 hours of fast-forward)
  sleep(hours = 7) {
    this.energy = Math.min(100, this.energy + hours * 14); // 7h -> +98%
    this.hp = Math.min(this.maxHp, this.hp + hours * 1.5); // Minor natural recovery during rest
    this.hunger = Math.max(0, this.hunger - hours * 3.5); // 7h -> -24.5%
    this.thirst = Math.max(0, this.thirst - hours * 5.0); // 7h -> -35%
  }

  washHands() {
    this.hygiene = 100;
  }
}

window.SurvivalSystem = SurvivalSystem;
