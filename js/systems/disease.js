/**
 * disease.js - Epidemiological Transmission, Incubation & Symptom Mechanics
 */

class DiseaseSystem {
  constructor() {
    // List of active infections: [{ id, name, severity, timer, duration }]
    this.activeInfections = [];
    this.exposureTicks = 0;
    this.totalInfectionsContracted = 0;
  }

  hasDisease(id) {
    return this.activeInfections.some(d => d.id === id);
  }

  getDisease(id) {
    return this.activeInfections.find(d => d.id === id);
  }

  // Contract a new disease
  contract(diseaseId, onNotify) {
    if (this.hasDisease(diseaseId)) return; // Already infected

    const diseaseInfo = window.DISEASES_DATA[diseaseId];
    if (!diseaseInfo) return;

    const infection = {
      id: diseaseId,
      name: diseaseInfo.name,
      icon: diseaseInfo.icon,
      severity: 1, // Scales up if untreated
      elapsedSec: 0,
      damagePerSec: 0
    };

    // Specific damage tuning per disease
    switch (diseaseId) {
      case 'dengue':
        infection.damagePerSec = 1.2; // Fever depletes HP steadily
        break;
      case 'strep_suis':
        infection.damagePerSec = 1.8; // High bacterial toxicity
        if (window.soundManager) window.soundManager.setHearingLoss(true);
        break;
      case 'leptospirosis':
        infection.damagePerSec = 1.0; // Moderate HP loss, main debuff is 60% slow walk
        break;
      case 'diarrhea':
        infection.damagePerSec = 0.6; // Primary threat is severe dehydration
        break;
      case 'influenza':
        infection.damagePerSec = 0.8; // High fever, energy drains 2x as fast
        break;
    }

    this.activeInfections.push(infection);
    this.totalInfectionsContracted++;

    if (onNotify) {
      onNotify(`⚠️ คุณติดเชื้อ "${diseaseInfo.name}"! ตรวจดูอาการและวิธีรักษาในสารานุกรม`, 'danger');
    }
  }

  // Cure an infection
  cureDisease(diseaseId) {
    const idx = this.activeInfections.findIndex(d => d.id === diseaseId);
    if (idx === -1) return null;

    const cured = this.activeInfections[idx];
    this.activeInfections.splice(idx, 1);

    // Reset special audio/visual effects if applicable
    if (diseaseId === 'strep_suis' && window.soundManager) {
      window.soundManager.setHearingLoss(false);
    }

    return cured;
  }

  cureAll() {
    this.activeInfections = [];
    if (window.soundManager) {
      window.soundManager.setHearingLoss(false);
    }
  }

  // Evaluate risk when player performs an action (e.g. eating raw pork, walking in puddle)
  evaluateRisk(riskObject, onNotify) {
    if (!riskObject) return false;
    const roll = Math.random();
    if (roll < riskObject.chance) {
      if (riskObject.message && onNotify) {
        onNotify(riskObject.message, 'warning');
      }
      this.contract(riskObject.disease, onNotify);
      return true;
    }
    return false;
  }

  // Environmental checks (called every frame / second)
  updateEnvironmentRisks(dt, player, world, weatherSystem, onNotify) {
    this.exposureTicks += dt;
    if (this.exposureTicks < 1.0) return;
    this.exposureTicks = 0;

    // 1. Check Puddle (Leptospirosis / ฉี่หนู)
    if (world.isInPuddle(player.x, player.y)) {
      if (!player.hasBoots) {
        // Walking bare-footed in puddle!
        this.evaluateRisk({
          disease: 'leptospirosis',
          chance: 0.28,
          message: 'คุณเหยียบย่ำน้ำขังด้วยเท้าเปล่า! เชื้อเลปโตสไปราจากฉี่หนูปนเปื้อนผ่านผิวหนัง...'
        }, onNotify);
      }
    }

    // 2. Check Mosquito Swarm Zone (Dengue / ไข้เลือดออก)
    // Mosquitoes are especially aggressive at dawn (05:00-08:00) and dusk (16:30-19:30)
    const isMosquitoHour = weatherSystem && weatherSystem.isMosquitoActiveHour();
    const inMosquitoZone = world.isMosquitoZone(player.x, player.y);

    if (inMosquitoZone || isMosquitoHour) {
      // If player has repellent active, repellent protects them!
      if (player.repellentHoursLeft > 0) {
        // Safe!
      } else {
        // Mosquito danger!
        const chance = (inMosquitoZone && isMosquitoHour) ? 0.22 : 0.08;
        this.evaluateRisk({
          disease: 'dengue',
          chance: chance,
          message: 'ยุงลายบินตอมและกัดคุณในที่รก! เชื้อไวรัสเดงกีเข้าสู่กระแสเลือด...'
        }, onNotify);
      }
    }

    // 3. Check Crowded Zone (Influenza / ไข้หวัดใหญ่)
    if (world.isCrowdedZone && world.isCrowdedZone(player.x, player.y)) {
      if (player.hasMask && player.maskHoursLeft > 0) {
        // Mask provides 90% protection, very low chance (1.5%)
        this.evaluateRisk({
          disease: 'influenza',
          chance: 0.015,
          message: 'แม้สวมหน้ากาก แต่ละอองฝอยหนาแน่นมาก เชื้อไข้หวัดใหญ่เล็ดลอดเข้ามา...'
        }, onNotify);
      } else {
        // Unprotected in crowded area!
        this.evaluateRisk({
          disease: 'influenza',
          chance: 0.15,
          message: 'คุณอยู่ในพื้นที่ชุมชนแออัดโดยไม่สวมหน้ากาก! สูดละอองฝอยติดเชื้อไวรัสไข้หวัดใหญ่...'
        }, onNotify);
      }
    }
  }

  // Update symptom effects and damage
  update(dt, survivalSystem) {
    for (const inf of this.activeInfections) {
      inf.elapsedSec += dt;
      if (survivalSystem && !survivalSystem.isDead) {
        survivalSystem.hp -= inf.damagePerSec * dt;

        if (survivalSystem.hp <= 0 && !survivalSystem.deathCause) {
          const diseaseInfo = window.DISEASES_DATA[inf.id];
          survivalSystem.deathCause = `เสียชีวิตจากภาวะแทรกซ้อนของ "${diseaseInfo ? diseaseInfo.name : inf.id}"`;
        }
      }
    }
  }
}

window.DiseaseSystem = DiseaseSystem;
