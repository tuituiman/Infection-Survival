/**
 * main.js - Main Game Loop, UI Manager & Interaction Handler
 */

class Game {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.world = new GameWorld();
    // Spawn player inside home near bed
    this.player = new Player(5.5 * this.world.tileSize, 5.0 * this.world.tileSize);
    this.survival = new SurvivalSystem();
    this.disease = new DiseaseSystem();
    this.weather = new WeatherSystem();
    this.input = window.inputController;
    this.renderer = new GameRenderer(this.canvas);

    this.isPaused = false;
    this.activeModal = null;
    this.lastTime = performance.now();
    this.currentNearbyEntity = null;

    this.initUI();
    this.initCodex();
    this.updateInventoryUI();
  }

  initUI() {
    // Top bar buttons
    document.getElementById('btn-sound').addEventListener('click', () => {
      const enabled = window.soundManager.toggleSound();
      document.getElementById('btn-sound').textContent = enabled ? '🔊' : '🔇';
      this.showToast(enabled ? 'เปิดเสียงแล้ว' : 'ปิดเสียงแล้ว', 'normal');
    });

    document.getElementById('btn-codex').addEventListener('click', () => {
      this.openCodex('dengue');
    });

    document.getElementById('btn-close-codex').addEventListener('click', () => {
      this.closeModal('modal-codex');
    });

    document.getElementById('btn-help').addEventListener('click', () => {
      this.openModal('modal-help');
    });

    document.getElementById('btn-close-help').addEventListener('click', () => {
      this.closeModal('modal-help');
    });

    document.getElementById('btn-close-interact').addEventListener('click', () => {
      this.closeModal('modal-interaction');
    });

    // Start & Restart
    document.getElementById('btn-start-game').addEventListener('click', () => {
      window.soundManager.ensureContext();
      this.closeModal('screen-welcome');
      this.showToast('เริ่มการเอาชีวิตรอด! กด W A S D เพื่อเดิน และกด E เพื่อสำรวจ', 'success');
    });

    document.getElementById('btn-restart-game').addEventListener('click', () => {
      window.location.reload();
    });

    document.getElementById('btn-play-again').addEventListener('click', () => {
      window.location.reload();
    });

    // Close modal on Escape
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Escape') {
        if (this.activeModal) {
          this.closeModal(this.activeModal);
        }
      }
    });
  }

  initCodex() {
    const tabsContainer = document.getElementById('codex-tabs');
    tabsContainer.innerHTML = '';

    for (const key in window.DISEASES_DATA) {
      const d = window.DISEASES_DATA[key];
      const btn = document.createElement('button');
      btn.className = 'codex-tab-btn';
      btn.id = `codex-tab-${d.id}`;
      btn.innerHTML = `<span>${d.icon}</span> <span>${d.name}</span>`;
      btn.addEventListener('click', () => {
        this.renderCodexDetail(d.id);
      });
      tabsContainer.appendChild(btn);
    }
  }

  openCodex(diseaseId = 'dengue') {
    this.openModal('modal-codex');
    this.renderCodexDetail(diseaseId);
  }

  renderCodexDetail(diseaseId) {
    const d = window.DISEASES_DATA[diseaseId];
    if (!d) return;

    // Set tab active
    document.querySelectorAll('.codex-tab-btn').forEach(b => b.classList.remove('active'));
    const currentTab = document.getElementById(`codex-tab-${d.id}`);
    if (currentTab) currentTab.classList.add('active');

    const detailContainer = document.getElementById('codex-detail');
    detailContainer.innerHTML = `
      <div class="codex-disease-header">
        <div class="codex-disease-title">
          <span>${d.icon}</span> ${d.name} (${d.nameEn})
        </div>
        <div class="codex-pathogen">เชื้อก่อโรค: ${d.pathogen}</div>
      </div>

      <div class="codex-section">
        <h4>🦟 พาหะและการติดต่อ</h4>
        <p>${d.vector}</p>
      </div>

      <div class="codex-section">
        <h4>⚠️ พฤติกรรมเสี่ยง</h4>
        <ul>
          ${d.riskActions.map(r => `<li>${r}</li>`).join('')}
        </ul>
      </div>

      <div class="codex-section">
        <h4>🛡️ การป้องกันที่ถูกต้อง</h4>
        <ul>
          ${d.prevention.map(p => `<li>${p}</li>`).join('')}
        </ul>
      </div>

      <div class="codex-section">
        <h4>🩺 อาการและผลกระทบ</h4>
        <ul>
          ${d.symptoms.map(s => `<li>${s}</li>`).join('')}
        </ul>
      </div>

      ${d.contraindications ? `
        <div class="codex-alert-box">
          <strong>⚠️ ข้อควรระวังสูงสุด:</strong> ${d.contraindications}
        </div>
      ` : ''}

      <div class="codex-section">
        <h4>💡 สรุปความรู้ (Takeaway)</h4>
        <p><em>"${d.educationalLesson}"</em></p>
      </div>
    `;
  }

  openModal(modalId) {
    this.activeModal = modalId;
    this.isPaused = true;
    const el = document.getElementById(modalId);
    if (el) el.classList.remove('hidden');
    if (window.soundManager) window.soundManager.playChime(320);
  }

  closeModal(modalId) {
    const el = document.getElementById(modalId);
    if (el) el.classList.add('hidden');
    this.activeModal = null;
    this.isPaused = false;
  }

  showToast(message, type = 'normal') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 400);
    }, 3800);
  }

  // --- Interaction Modal Handler ---
  handleEntityInteraction(ent) {
    const modalBody = document.getElementById('modal-interact-body');
    const modalTitle = document.getElementById('modal-interact-title');

    modalTitle.innerHTML = `${ent.icon} ${ent.name}`;
    modalBody.innerHTML = `
      <p style="color: var(--text-muted); font-size: 0.9rem; line-height: 1.5; margin-bottom: 8px;">
        ${ent.dialogue}
      </p>
      <div class="action-grid" id="action-options-list"></div>
    `;

    const optionsList = document.getElementById('action-options-list');

    ent.options.forEach(opt => {
      const card = document.createElement('div');
      card.className = 'action-card';

      // Check item requirements
      let canPerform = true;
      let missingMsg = '';

      if (opt.requiresItem && !this.player.hasItem(opt.requiresItem)) {
        canPerform = false;
        const reqItem = window.ITEMS_DATA[opt.requiresItem];
        missingMsg = `(ขาด: ${reqItem ? reqItem.name : opt.requiresItem})`;
      }

      card.innerHTML = `
        <div class="action-info">
          <span class="action-icon">${opt.icon || '👉'}</span>
          <div class="action-text">
            <h4>${opt.label}</h4>
            ${missingMsg ? `<p style="color: #ef4444;">${missingMsg}</p>` : ''}
          </div>
        </div>
        <span class="action-badge">${canPerform ? 'เลือกทำ' : 'ไอเทมไม่พอ'}</span>
      `;

      if (canPerform) {
        card.addEventListener('click', () => {
          this.executeAction(opt, ent);
          this.closeModal('modal-interaction');
        });
      } else {
        card.style.opacity = '0.5';
        card.style.cursor = 'not-allowed';
      }

      optionsList.appendChild(card);
    });

    this.openModal('modal-interaction');
  }

  // Execute specific option
  executeAction(opt, ent) {
    if (window.soundManager) window.soundManager.playChime(500);

    // Consume required item
    if (opt.requiresItem) {
      this.player.removeItem(opt.requiresItem, 1);
    }

    // Produce items
    if (opt.producesItem) {
      this.player.addItem(opt.producesItem, 1);
      const it = window.ITEMS_DATA[opt.producesItem];
      this.showToast(`ได้รับ: ${it ? it.name : opt.producesItem}`, 'success');
    }

    if (opt.producesItems) {
      opt.producesItems.forEach(itemId => {
        this.player.addItem(itemId, 1);
        const it = window.ITEMS_DATA[itemId];
        this.showToast(`ได้รับ: ${it ? it.name : itemId}`, 'success');
      });
    }

    // Specific Action Handlers
    switch (opt.action) {
      case 'sleep_safe':
        this.weather.fastForward(7); // Sleep 7 hours
        this.survival.sleep(7);
        this.showToast('คุณกางมุ้งและนอนหลับอย่างปลอดภัย ฟื้นฟูพลังงานเต็มที่!', 'success');
        break;

      case 'sleep_risky':
        this.weather.fastForward(7);
        this.survival.sleep(7);
        if (opt.risk) {
          this.disease.evaluateRisk(opt.risk, (msg, type) => this.showToast(msg, type));
        }
        break;

      case 'cook_pork':
        if (window.soundManager) window.soundManager.playSizzle();
        this.showToast('ย่างเนื้อหมูจนสุก 100% ปลอดภัยจากเชื้อไข้หูดับ!', 'success');
        break;

      case 'boil_water':
        if (window.soundManager) window.soundManager.playSizzle();
        this.showToast('ต้มน้ำเดือดพล่าน ฆ่าเชื้อโรคสะอาด 100%!', 'success');
        break;

      case 'wash_hands':
        this.survival.washHands();
        if (window.soundManager) window.soundManager.playConsume(true);
        this.showToast('ฟอกสบู่ล้างมือสะอาดแล้ว สุขอนามัยเต็ม 100%!', 'success');
        break;

      case 'apply_abate':
        ent.hasAbate = true;
        this.showToast('ใส่ทรายอะเบทในโอ่งแล้ว ลูกน้ำยุงลายไม่สามารถเจริญเติบโตได้!', 'success');
        break;

      case 'cover_jar':
        ent.hasCover = true;
        this.showToast('ปิดฝาโอ่งน้ำสนิท ยุงลายไม่สามารถเข้าไปวางไข่ได้!', 'success');
        break;

      case 'flip_shells':
        ent.cleared = true;
        this.showToast('คว่ำกะลาและทำลายแหล่งน้ำขังแล้ว ลดประชากรยุงลายในละแวกบ้าน!', 'success');
        break;

      case 'clinic_heal':
        this.survival.hp = 100;
        this.disease.cureAll();
        this.showToast('พยาบาลฉีดยาปฏิชีวนะและรักษาอาการทั้งหมดจนหายเป็นปกติ!', 'success');
        break;

      case 'eat_street_food':
        this.survival.hunger = Math.min(100, this.survival.hunger + 40);
        if (opt.risk) {
          this.disease.evaluateRisk(opt.risk, (msg, type) => this.showToast(msg, type));
        }
        break;

      case 'ask_strep':
        this.openCodex('strep_suis');
        break;
    }

    this.updateInventoryUI();
  }

  // --- UI Updates ---
  updateUI() {
    // Time & Weather
    document.getElementById('hud-day').textContent = `วันที่ ${this.weather.day} / ${this.weather.maxDays}`;
    document.getElementById('hud-time').textContent = this.weather.getTimeFormatted();
    document.getElementById('hud-weather').textContent = this.weather.getWeatherFormatted();

    // Survival Bars
    const hp = Math.max(0, Math.round(this.survival.hp));
    const hunger = Math.max(0, Math.round(this.survival.hunger));
    const thirst = Math.max(0, Math.round(this.survival.thirst));
    const energy = Math.max(0, Math.round(this.survival.energy));

    document.getElementById('val-hp').textContent = `${hp}/100`;
    document.getElementById('bar-hp').style.width = `${hp}%`;

    document.getElementById('val-hunger').textContent = `${hunger}%`;
    document.getElementById('bar-hunger').style.width = `${hunger}%`;

    document.getElementById('val-thirst').textContent = `${thirst}%`;
    document.getElementById('bar-thirst').style.width = `${thirst}%`;

    document.getElementById('val-energy').textContent = `${energy}%`;
    document.getElementById('bar-energy').style.width = `${energy}%`;

    // Equipment Badges
    const badgeBoots = document.getElementById('badge-boots');
    if (this.player.hasBoots) {
      badgeBoots.className = 'equip-badge active';
      badgeBoots.innerHTML = '👢 <span>สวมบูทยางแล้ว</span>';
    } else {
      badgeBoots.className = 'equip-badge';
      badgeBoots.innerHTML = '👢 <span>ไม่มีบูท (เสี่ยงฉี่หนู)</span>';
    }

    const badgeRepellent = document.getElementById('badge-repellent');
    if (this.player.repellentHoursLeft > 0) {
      badgeRepellent.className = 'equip-badge active';
      badgeRepellent.innerHTML = `🧴 <span>กันยุง (${this.player.repellentHoursLeft.toFixed(1)}ชม.)</span>`;
    } else {
      badgeRepellent.className = 'equip-badge';
      badgeRepellent.innerHTML = '🧴 <span>ไม่มียากันยุง</span>';
    }

    // Active Diseases Badges
    const diseaseContainer = document.getElementById('active-diseases-container');
    diseaseContainer.innerHTML = '';
    this.disease.activeInfections.forEach(inf => {
      const pill = document.createElement('div');
      pill.className = 'disease-pill';
      pill.innerHTML = `<span>${inf.icon}</span> <span>ติดเชื้อ: ${inf.name}</span>`;
      pill.addEventListener('click', () => {
        this.openCodex(inf.id);
      });
      diseaseContainer.appendChild(pill);
    });

    // Screen Vignette Effects
    const vigFever = document.getElementById('vignette-fever');
    const vigDiarrhea = document.getElementById('vignette-diarrhea');
    const vigDanger = document.getElementById('vignette-danger');

    vigFever.style.opacity = this.disease.hasDisease('dengue') ? '0.75' : '0';
    vigDiarrhea.style.opacity = this.disease.hasDisease('diarrhea') ? '0.65' : '0';
    vigDanger.style.opacity = (this.survival.hp < 25) ? '0.85' : '0';

    // Heartbeat audio if low HP
    if (this.survival.hp < 30 && window.soundManager) {
      if (Math.random() < 0.05) {
        window.soundManager.playHeartbeat();
      }
    }
  }

  updateInventoryUI() {
    const countEl = document.getElementById('inventory-count');
    const gridEl = document.getElementById('hotbar-slots');

    countEl.textContent = `${this.player.inventory.length}/${this.player.maxSlots}`;
    gridEl.innerHTML = '';

    for (let i = 0; i < this.player.maxSlots; i++) {
      const slotData = this.player.inventory[i];
      const slotEl = document.createElement('div');
      slotEl.className = 'slot';

      const keyLabel = document.createElement('span');
      keyLabel.className = 'slot-key';
      keyLabel.textContent = `${i + 1}`;
      slotEl.appendChild(keyLabel);

      if (slotData) {
        const itemInfo = window.ITEMS_DATA[slotData.itemId];
        if (itemInfo) {
          slotEl.title = `${itemInfo.name}: ${itemInfo.description}`;

          const iconSpan = document.createElement('span');
          iconSpan.className = 'slot-icon';
          iconSpan.textContent = itemInfo.icon;
          slotEl.appendChild(iconSpan);

          if (slotData.count > 1) {
            const countSpan = document.createElement('span');
            countSpan.className = 'slot-count';
            countSpan.textContent = slotData.count;
            slotEl.appendChild(countSpan);
          }

          slotEl.addEventListener('click', () => {
            this.player.useItem(i, this.survival, this.disease, (msg, type) => {
              this.showToast(msg, type);
            });
            this.updateInventoryUI();
          });
        }
      }

      gridEl.appendChild(slotEl);
    }
  }

  // --- End Game Checks ---
  checkEndGame() {
    if (this.survival.isDead) {
      this.isPaused = true;
      const screen = document.getElementById('screen-game-over');
      document.getElementById('game-over-cause').textContent = `สาเหตุ: ${this.survival.deathCause}`;

      // Educational takeaway box
      const lessonBox = document.getElementById('game-over-lesson');
      lessonBox.innerHTML = `
        <h4 style="margin-bottom: 6px; color: #ef4444;">📚 บทเรียนสาธารณสุขเพื่อเอาชีวิตรอด:</h4>
        <p>1. <strong>ไข้เลือดออก:</strong> ต้องนอนกางมุ้ง ทายากันยุง และหากเป็นไข้เลือดออก <em>ห้ามกินยาแอสไพรินเด็ดขาด</em> เพราะเสี่ยงเลือดออกในกระเพาะอาหาร</p>
        <p>2. <strong>ไข้หูดับ:</strong> ต้องปรุงเนื้อหมูให้สุก 100% อย่ากินดิบ และแยกตะเกียบดิบ-สุก</p>
        <p>3. <strong>โรคฉี่หนู:</strong> สวมรองเท้าบูททุกครั้งเมื่อต้องเดินลุยน้ำขัง และล้างเท้าฟอกสบู่ทันที</p>
        <p>4. <strong>ท้องร่วง:</strong> ต้องต้มน้ำให้เดือดก่อนดื่ม และชงผงเกลือแร่ ORS เพื่อป้องกันภาวะช็อกจากการขาดน้ำ</p>
      `;

      document.getElementById('game-over-stats').textContent = `คุณรอดชีวิตได้: วันที่ ${this.weather.day} (เวลา ${this.weather.getTimeFormatted()})`;
      screen.classList.remove('hidden');
      return true;
    }

    if (this.weather.isVictory) {
      this.isPaused = true;
      const screen = document.getElementById('screen-victory');
      document.getElementById('victory-stats').textContent = `สุดยอดมาก! คุณมีวินัยในการกินสุก ดื่มน้ำต้มสุก สวมบูทป้องกัน และรักษาความสะอาดจนรอดชีวิตครบ 7 วันเต็ม`;
      screen.classList.remove('hidden');
      return true;
    }

    return false;
  }

  // --- Main Game Loop ---
  start() {
    const loop = (currentTime) => {
      const dt = Math.min(0.1, (currentTime - this.lastTime) / 1000);
      this.lastTime = currentTime;

      if (!this.isPaused) {
        // 1. Process Input Movement
        const moveVec = this.input.updateMovement();
        this.player.update(dt, moveVec, this.world, this.disease);

        // 2. Check Interactive Entity Proximity
        this.currentNearbyEntity = this.world.getNearbyEntity(this.player.x, this.player.y);
        const promptEl = document.getElementById('interaction-prompt');
        const promptText = document.getElementById('prompt-text');

        if (this.currentNearbyEntity) {
          promptEl.classList.remove('hidden');
          promptText.textContent = `กด E หรือแตะ เพื่อ [${this.currentNearbyEntity.name}]`;
        } else {
          promptEl.classList.add('hidden');
        }

        // 3. Handle Interaction Input Trigger
        if (this.input.consumeInteract() && this.currentNearbyEntity) {
          this.handleEntityInteraction(this.currentNearbyEntity);
        }

        // 4. Hotbar Slot Keyboard Shortcuts (1-8)
        const hotbarTrigger = this.input.consumeHotbarTrigger();
        if (hotbarTrigger !== null) {
          this.player.useItem(hotbarTrigger, this.survival, this.disease, (msg, type) => {
            this.showToast(msg, type);
          });
          this.updateInventoryUI();
        }

        // 5. Update Systems
        this.weather.update(dt, this.player, this.world, (msg, type) => this.showToast(msg, type));
        this.survival.update(dt, this.disease, this.weather);
        this.disease.update(dt, this.survival);
        this.disease.updateEnvironmentRisks(dt, this.player, this.world, this.weather, (msg, type) => this.showToast(msg, type));

        // 6. Audio mosquito proximity check
        if (window.soundManager) {
          const inMosquito = this.world.isMosquitoZone(this.player.x, this.player.y);
          window.soundManager.setMosquitoBuzz(inMosquito ? 1.0 : 0);
        }

        // 7. Check Game Over / Victory
        this.checkEndGame();

        // 8. Update UI Bars & Indicators
        this.updateUI();
      }

      // Camera & Render
      this.renderer.updateCamera(this.player.x, this.player.y, this.world.width, this.world.height);
      this.renderer.render(this.world, this.player, this.weather, this.disease, this.currentNearbyEntity, dt);

      requestAnimationFrame(loop);
    };

    requestAnimationFrame(loop);
  }
}

// Boot application
window.addEventListener('DOMContentLoaded', () => {
  window.game = new Game();
  window.game.start();
});
