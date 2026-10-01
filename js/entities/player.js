/**
 * player.js - Player Character Entity, Movement, Inventory & Equipment
 */

class Player {
  constructor(startX, startY) {
    this.x = startX;
    this.y = startY;
    this.radius = 16;
    this.baseSpeed = 160;
    this.speed = this.baseSpeed;
    this.facing = 'down'; // up, down, left, right
    this.isMoving = false;
    this.animTime = 0;
    this.footstepTimer = 0;

    // Equipment & Protection
    this.hasBoots = false;
    this.repellentHoursLeft = 0; // Duration remaining in game hours
    this.hasMask = false;
    this.maskHoursLeft = 0; // Duration remaining in game hours

    // Inventory: 8 slots max
    this.maxSlots = 8;
    this.inventory = [
      { itemId: 'raw_pork', count: 1 },
      { itemId: 'raw_water', count: 1 },
      { itemId: 'paracetamol', count: 2 }
    ];
    this.selectedSlotIndex = 0;
  }

  update(dt, moveVector, world, diseaseSystem) {
    // Determine movement speed based on disease conditions (Leptospirosis causes severe calf pain)
    let currentSpeed = this.baseSpeed;
    if (diseaseSystem && diseaseSystem.hasDisease('leptospirosis')) {
      currentSpeed *= 0.42; // Severe leg pain -> slow shuffle
    }

    const dx = moveVector.x * currentSpeed * dt;
    const dy = moveVector.y * currentSpeed * dt;

    this.isMoving = (Math.abs(moveVector.x) > 0.05 || Math.abs(moveVector.y) > 0.05);

    if (this.isMoving) {
      this.animTime += dt * 8;

      // Update facing
      if (Math.abs(moveVector.x) > Math.abs(moveVector.y)) {
        this.facing = moveVector.x > 0 ? 'right' : 'left';
      } else {
        this.facing = moveVector.y > 0 ? 'down' : 'up';
      }

      // Try X movement with collision check
      let newX = this.x + dx;
      if (!world.checkCollision(newX, this.y, this.radius)) {
        this.x = newX;
      }

      // Try Y movement with collision check
      let newY = this.y + dy;
      if (!world.checkCollision(this.x, newY, this.radius)) {
        this.y = newY;
      }

      // Footstep sound tick
      this.footstepTimer += dt;
      if (this.footstepTimer >= 0.32) {
        this.footstepTimer = 0;
        const inPuddle = world.isInPuddle(this.x, this.y);
        if (window.soundManager) {
          window.soundManager.playFootstep(inPuddle);
        }
      }
    } else {
      this.animTime = 0;
    }
  }

  // Add item to inventory
  addItem(itemId, count = 1) {
    const itemData = window.ITEMS_DATA[itemId];
    if (!itemData) return false;

    // Check if item already in inventory
    const existing = this.inventory.find(slot => slot.itemId === itemId);
    if (existing) {
      existing.count += count;
      return true;
    }

    // Check if free slot exists
    if (this.inventory.length < this.maxSlots) {
      this.inventory.push({ itemId, count });
      return true;
    }

    return false; // Inventory full
  }

  // Remove item count
  removeItem(itemId, count = 1) {
    const idx = this.inventory.findIndex(slot => slot.itemId === itemId);
    if (idx === -1) return false;

    this.inventory[idx].count -= count;
    if (this.inventory[idx].count <= 0) {
      this.inventory.splice(idx, 1);
    }
    return true;
  }

  hasItem(itemId, count = 1) {
    const slot = this.inventory.find(s => s.itemId === itemId);
    return slot && slot.count >= count;
  }

  // Use item at slot index
  useItem(slotIndex, survivalSystem, diseaseSystem, onNotify) {
    if (slotIndex < 0 || slotIndex >= this.inventory.length) return;
    const slot = this.inventory[slotIndex];
    const item = window.ITEMS_DATA[slot.itemId];
    if (!item) return;

    if (window.soundManager) {
      window.soundManager.ensureContext();
    }

    // Food
    if (item.type === 'food') {
      if (window.soundManager) window.soundManager.playConsume(false);
      survivalSystem.hunger = Math.min(100, survivalSystem.hunger + item.hungerRestore);
      if (item.hpRestore) survivalSystem.hp = Math.min(100, survivalSystem.hp + item.hpRestore);

      // Check disease risk (e.g. raw pork -> Streptococcus suis)
      if (item.risk && diseaseSystem) {
        diseaseSystem.evaluateRisk(item.risk);
      }

      onNotify(`รับประทาน ${item.name} (${item.hungerRestore > 0 ? '+' + item.hungerRestore + ' หิว' : ''})`, item.risk ? 'warning' : 'success');
      this.removeItem(item.id, 1);
      return;
    }

    // Drink
    if (item.type === 'drink') {
      if (window.soundManager) window.soundManager.playConsume(true);
      survivalSystem.thirst = Math.min(100, survivalSystem.thirst + item.thirstRestore);
      if (item.hpRestore) survivalSystem.hp = Math.min(100, survivalSystem.hp + item.hpRestore);

      // Check disease risk (e.g. unboiled water -> Diarrhea)
      if (item.risk && diseaseSystem) {
        diseaseSystem.evaluateRisk(item.risk);
      }

      onNotify(`ดื่ม ${item.name} (+${item.thirstRestore} น้ำในร่างกาย)`, item.risk ? 'warning' : 'success');
      this.removeItem(item.id, 1);
      return;
    }

    // Equipment (Boots & Face Mask)
    if (item.type === 'equipment') {
      if (item.slot === 'feet') {
        this.hasBoots = true;
        if (window.soundManager) window.soundManager.playChime(440);
        onNotify(`สวมใส่ ${item.name} สำเร็จ! เท้าของคุณได้รับการป้องกันจากโรคฉี่หนู 100%`, 'success');
        this.removeItem(item.id, 1);
        return;
      }
      if (item.slot === 'face') {
        this.hasMask = true;
        this.maskHoursLeft = (this.maskHoursLeft || 0) + (item.buffDurationHours || 8);
        if (window.soundManager) window.soundManager.playChime(520);
        onNotify(`สวมใส่ ${item.name} สำเร็จ! ป้องกันละอองฝอยไข้หวัดใหญ่ได้นาน ${this.maskHoursLeft.toFixed(0)} ชั่วโมงในเกม`, 'success');
        this.removeItem(item.id, 1);
        return;
      }
    }

    // Consumable Buff (Mosquito Repellent)
    if (item.type === 'consumable_buff') {
      this.repellentHoursLeft = (this.repellentHoursLeft || 0) + item.buffDurationHours;
      if (window.soundManager) window.soundManager.playChime(600);
      onNotify(`ทา ${item.name} ทั่วผิวกาย ป้องกันยุงลายได้ ${this.repellentHoursLeft.toFixed(0)} ชั่วโมงในเกม!`, 'success');
      this.removeItem(item.id, 1);
      return;
    }

    // Medicine
    if (item.type === 'medicine') {
      if (window.soundManager) window.soundManager.playConsume(true);

      // Check contraindication (Aspirin + Dengue = Lethal internal bleeding!)
      if (item.dangerIfDisease && diseaseSystem && diseaseSystem.hasDisease(item.dangerIfDisease.disease)) {
        survivalSystem.hp -= item.dangerIfDisease.damage;
        onNotify(item.dangerIfDisease.message, 'danger');
        this.removeItem(item.id, 1);
        return;
      }

      // Cure specific diseases
      if (item.curesDisease && diseaseSystem) {
        const cured = diseaseSystem.cureDisease(item.curesDisease);
        if (cured) {
          onNotify(`ใช้ยา ${item.name} รักษาโรค ${cured.name} ได้สำเร็จ!`, 'success');
        } else {
          onNotify(`ใช้ยา ${item.name} (คุณไม่ได้เป็นโรคนั้น แต่ช่วยบรรเทาอาการได้)`, 'warning');
        }
      }

      if (item.curesDiseases && diseaseSystem) {
        let curedCount = 0;
        for (const dId of item.curesDiseases) {
          const cured = diseaseSystem.cureDisease(dId);
          if (cured) {
            onNotify(`รับยาปฏิชีวนะรักษาโรค ${cured.name} สำเร็จ!`, 'success');
            curedCount++;
          }
        }
        if (curedCount === 0) {
          onNotify(`กินยาปฏิชีวนะ (ไม่มีการติดเชื้อแบคทีเรีย)`, 'warning');
        }
      }

      if (item.hpRestore) survivalSystem.hp = Math.min(100, survivalSystem.hp + item.hpRestore);
      if (item.thirstRestore) survivalSystem.thirst = Math.min(100, survivalSystem.thirst + item.thirstRestore);

      this.removeItem(item.id, 1);
      return;
    }
  }
}

window.Player = Player;
