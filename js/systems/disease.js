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

    let baseDamage = 1.0;
    switch (diseaseId) {
      case 'dengue': baseDamage = 1.2; break;
      case 'strep_suis': baseDamage = 1.8; break;
      case 'leptospirosis': baseDamage = 1.0; break;
      case 'diarrhea': baseDamage = 0.8; break;
      case 'influenza': baseDamage = 0.8; break;
    }

    const infection = {
      id: diseaseId,
      name: diseaseInfo.name,
      icon: diseaseInfo.icon,
      stage: 'incubating', // Starts in incubation phase
      incubationDurationSec: 32, // ~1.5 game hours
      elapsedSec: 0,
      baseDamagePerSec: baseDamage,
      damagePerSec: baseDamage * 0.2 // Minor initial discomfort
    };

    this.activeInfections.push(infection);
    this.totalInfectionsContracted++;

    if (onNotify) {
      onNotify(`⚠️ ร่างกายเริ่มรับเชื้อ "${diseaseInfo.name}" (ระยะฟักตัว: เริ่มครั่นเนื้อครั่นตัว รีบไปตรวจที่ รพ.สต.)`, 'warning');
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

    const day = weatherSystem ? weatherSystem.day : 1;

    // 1. Check Puddle (Leptospirosis / ฉี่หนู)
    if (world.isInPuddle(player.x, player.y)) {
      if (!player.hasBoots) {
        // Walking bare-footed in puddle! (Higher chance on Day 3 or Day 6)
        const baseLeptoChance = (day === 3 || day === 6) ? 0.42 : 0.28;
        this.evaluateRisk({
          disease: 'leptospirosis',
          chance: baseLeptoChance,
          message: 'คุณเหยียบย่ำน้ำขังด้วยเท้าเปล่า! เชื้อเลปโตสไปราจากฉี่หนูปนเปื้อนผ่านผิวหนัง...'
        }, onNotify);
      }
    }

    // 2. Check Mosquito Swarm Zone (Dengue / ไข้เลือดออก)
    // Mosquitoes are especially aggressive on Day 1, Day 6, or at dawn/dusk
    const isMosquitoHour = weatherSystem && weatherSystem.isMosquitoActiveHour();
    const inMosquitoZone = world.isMosquitoZone(player.x, player.y);

    if (inMosquitoZone || isMosquitoHour) {
      if (player.repellentHoursLeft > 0) {
        // Safe! Repellent shield active
      } else {
        // Mosquito danger!
        let chance = (inMosquitoZone && isMosquitoHour) ? 0.24 : 0.08;
        if (day === 1 || day === 6) chance += 0.12; // Outbreak surge
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
        // Mask provides 90%+ protection
        this.evaluateRisk({
          disease: 'influenza',
          chance: 0.015,
          message: 'แม้สวมหน้ากาก แต่ละอองฝอยหนาแน่นมาก เชื้อไข้หวัดใหญ่เล็ดลอดเข้ามา...'
        }, onNotify);
      } else {
        // Unprotected in crowded area! (Surges on Day 5 fair & Day 6 crisis)
        const fluChance = (day === 5 || day === 6) ? 0.28 : 0.15;
        this.evaluateRisk({
          disease: 'influenza',
          chance: fluChance,
          message: 'คุณอยู่ในพื้นที่ชุมชนแออัดโดยไม่สวมหน้ากาก! สูดละอองฝอยติดเชื้อไวรัสไข้หวัดใหญ่...'
        }, onNotify);
      }
    }
  }

  // Update symptom effects and damage
  update(dt, survivalSystem, onNotify) {
    for (const inf of this.activeInfections) {
      inf.elapsedSec += dt;

      // Check incubation transition to active
      if (inf.stage === 'incubating' && inf.elapsedSec >= inf.incubationDurationSec) {
        inf.stage = 'active';
        inf.damagePerSec = inf.baseDamagePerSec; // Full damage
        if (inf.id === 'strep_suis' && window.soundManager) {
          window.soundManager.setHearingLoss(true);
        }
        if (onNotify) {
          onNotify(`🚨 เชื้อ "${inf.name}" พ้นระยะฟักตัวแล้ว! เริ่มมีอาการรุนแรงเฉียบพลัน`, 'danger');
        }
      }

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
