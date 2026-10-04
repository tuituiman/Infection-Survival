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
    this.quests = new QuestSystem();
    this.input = window.inputController;
    this.renderer = null;
    if (window.GameRenderer3D) {
      try {
        this.renderer = new window.GameRenderer3D(this.canvas);
      } catch (err) {
        console.warn('3D renderer unavailable, falling back to 2D:', err);
      }
    }
    if (!this.renderer) this.renderer = new GameRenderer(this.canvas);
    this.input.attach(this.renderer, this.player);

    this.isPaused = false;
    this.isSleeping = false;
    this.activeModal = null;
    this.lastTime = performance.now();
    this.currentNearbyEntity = null;
    this.lastTrackedDay = this.weather.day;

    // Student Gamification: Stars & Touch Micro Mini-Games
    this.stars = parseInt(localStorage.getItem('outbreak_stars') || '50', 10);
    this.miniGames = new window.MiniGameManager(this);

    this.initUI();
    this.initCodex();
    this.updateInventoryUI();
  }

  initUI() {
    // Star & Certificate Controls
    const starEl = document.getElementById('val-stars');
    if (starEl) starEl.textContent = this.stars;

    const btnCert = document.getElementById('btn-cert');
    if (btnCert) {
      btnCert.addEventListener('click', () => {
        this.openCertificate();
      });
    }

    const btnCloseCert = document.getElementById('btn-close-cert');
    if (btnCloseCert) {
      btnCloseCert.addEventListener('click', () => {
        this.closeModal('modal-certificate');
      });
    }

    const btnCloseCert2 = document.getElementById('btn-close-cert-2');
    if (btnCloseCert2) {
      btnCloseCert2.addEventListener('click', () => {
        this.closeModal('modal-certificate');
      });
    }

    const btnPrintCert = document.getElementById('btn-print-cert');
    if (btnPrintCert) {
      btnPrintCert.addEventListener('click', () => {
        if (window.soundManager) window.soundManager.playStarChime();
        this.showToast('📸 กำลังเปิดระบบบันทึก / พิมพ์เกียรติบัตรเพื่อส่งการบ้าน...', 'success');
        setTimeout(() => {
          window.print();
        }, 300);
      });
    }

    const btnViewCertVictory = document.getElementById('btn-view-cert-victory');
    if (btnViewCertVictory) {
      btnViewCertVictory.addEventListener('click', () => {
        this.closeModal('screen-victory');
        this.openCertificate();
      });
    }

    // 1669 Ambulance Emergency Revive
    const btnAmbulanceRevive = document.getElementById('btn-ambulance-revive');
    if (btnAmbulanceRevive) {
      btnAmbulanceRevive.addEventListener('click', () => {
        this.survival.isDead = false;
        this.survival.hp = 60;
        this.survival.hunger = Math.max(50, this.survival.hunger);
        this.survival.thirst = Math.max(50, this.survival.thirst);
        this.survival.energy = Math.max(50, this.survival.energy);
        this.disease.cureAll();
        this.closeModal('screen-game-over');
        this.isPaused = false;
        if (window.soundManager && typeof window.soundManager.playAmbulance === 'function') {
          window.soundManager.playAmbulance();
        }
        this.showToast('🚑 รถพยาบาล 1669 ปฐมพยาบาลสำเร็จ! สุขภาพฟื้นฟู 60% ลุยภารกิจต่อได้!', 'success');
        this.spawnFloatingEffect(window.innerWidth / 2, window.innerHeight / 2, '🚑 1669 ช่วยชีวิต!');
      });
    }

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

    // Mini-Games Hub Controls
    const btnMinigamesHub = document.getElementById('btn-minigames-hub');
    if (btnMinigamesHub) {
      btnMinigamesHub.addEventListener('click', () => {
        this.openModal('modal-minigames-hub');
      });
    }

    const btnCloseMinigamesHub = document.getElementById('btn-close-minigames-hub');
    if (btnCloseMinigamesHub) {
      btnCloseMinigamesHub.addEventListener('click', () => {
        this.closeModal('modal-minigames-hub');
      });
    }

    // Mini-Games Hub Cards direct launch
    const hubMosquito = document.getElementById('hub-game-mosquito');
    if (hubMosquito) {
      hubMosquito.addEventListener('click', () => {
        this.closeModal('modal-minigames-hub');
        this.miniGames.playMosquitoSwat(() => {
          this.showToast('ฝึกฝนตบยุงลายสำเร็จ! (+⭐ ดาวอนามัย)', 'success');
        });
      });
    }

    const hubWash = document.getElementById('hub-game-wash');
    if (hubWash) {
      hubWash.addEventListener('click', () => {
        this.closeModal('modal-minigames-hub');
        this.miniGames.playHandWash(() => {
          this.survival.washHands();
          this.showToast('ล้างมือ 7 ขั้นตอนสะอาดหมดจด สุขอนามัยเต็ม 100%! (+⭐ ดาวอนามัย)', 'success');
        });
      });
    }

    const hubCook = document.getElementById('hub-game-cook');
    if (hubCook) {
      hubCook.addEventListener('click', () => {
        this.closeModal('modal-minigames-hub');
        this.miniGames.playCookingTiming('เนื้อหมู', (isCooked) => {
          if (isCooked) {
            this.showToast('ฝึกย่างหมูสุก 100% ปลอดภัยจากไข้หูดับ! (+⭐ ดาวอนามัย)', 'success');
          } else {
            this.showToast('หมูยังไม่สุกดี ต้องกะจังหวะให้หยุดในแถบสีเขียวนะ', 'warning');
          }
        });
      });
    }

    // Quests & Investigation & Cupboard Modal Controls
    const btnQuests = document.getElementById('btn-quests');
    if (btnQuests) {
      btnQuests.addEventListener('click', () => {
        this.openQuestsModal();
      });
    }

    const btnCloseQuests = document.getElementById('btn-close-quests');
    if (btnCloseQuests) {
      btnCloseQuests.addEventListener('click', () => {
        this.closeModal('modal-quests');
      });
    }

    const btnCloseInvestigation = document.getElementById('btn-close-investigation');
    if (btnCloseInvestigation) {
      btnCloseInvestigation.addEventListener('click', () => {
        this.closeModal('modal-investigation');
      });
    }

    const btnCloseCupboard = document.getElementById('btn-close-cupboard');
    if (btnCloseCupboard) {
      btnCloseCupboard.addEventListener('click', () => {
        this.closeModal('modal-cupboard');
      });
    }

    // Briefing Controls
    const btnBriefing = document.getElementById('btn-briefing');
    if (btnBriefing) {
      btnBriefing.addEventListener('click', () => {
        this.openDailyBriefing(this.weather.day);
      });
    }

    const hudDay = document.getElementById('hud-day');
    if (hudDay) {
      hudDay.style.cursor = 'pointer';
      hudDay.title = 'คลิกเพื่อดูสรุปภารกิจและคำเตือนสุขภาพประจำวัน';
      hudDay.addEventListener('click', () => {
        this.openDailyBriefing(this.weather.day);
      });
    }

    const btnCloseBriefing = document.getElementById('btn-close-briefing');
    if (btnCloseBriefing) {
      btnCloseBriefing.addEventListener('click', () => {
        this.closeModal('modal-briefing');
      });
    }

    // Vitals Sidebar Toggle (Desktop Collapse & Mobile Island Expand)
    const vitalsSidebar = document.getElementById('vitals-sidebar');
    const btnToggleVitals = document.getElementById('btn-toggle-vitals');
    const vitalsHeader = document.getElementById('vitals-header');

    if (btnToggleVitals && vitalsSidebar) {
      btnToggleVitals.addEventListener('click', (e) => {
        e.stopPropagation();
        const isMobile = window.innerWidth <= 768;
        if (isMobile) {
          vitalsSidebar.classList.toggle('mobile-expanded');
          const hint = vitalsSidebar.querySelector('.vitals-mobile-hint');
          if (hint) {
            hint.textContent = vitalsSidebar.classList.contains('mobile-expanded') ? 'แตะเพื่อย่อ ▴' : 'แตะเพื่อขยาย ▾';
          }
        } else {
          vitalsSidebar.classList.toggle('collapsed');
          btnToggleVitals.textContent = vitalsSidebar.classList.contains('collapsed') ? '▶' : '◀';
        }
        if (window.soundManager) window.soundManager.playClick();
      });
    }

    if (vitalsHeader && vitalsSidebar) {
      vitalsHeader.addEventListener('click', () => {
        const isMobile = window.innerWidth <= 768;
        if (isMobile) {
          vitalsSidebar.classList.toggle('mobile-expanded');
          const hint = vitalsSidebar.querySelector('.vitals-mobile-hint');
          if (hint) {
            hint.textContent = vitalsSidebar.classList.contains('mobile-expanded') ? 'แตะเพื่อย่อ ▴' : 'แตะเพื่อขยาย ▾';
          }
          if (window.soundManager) window.soundManager.playClick();
        } else if (vitalsSidebar.classList.contains('collapsed')) {
          vitalsSidebar.classList.remove('collapsed');
          if (btnToggleVitals) btnToggleVitals.textContent = '◀';
          if (window.soundManager) window.soundManager.playClick();
        }
      });
    }

    if (vitalsSidebar) {
      vitalsSidebar.addEventListener('click', (e) => {
        if (vitalsSidebar.classList.contains('collapsed')) {
          vitalsSidebar.classList.remove('collapsed');
          if (btnToggleVitals) btnToggleVitals.textContent = '◀';
          if (window.soundManager) window.soundManager.playClick();
        }
      });
    }

    // Start & Restart
    document.getElementById('btn-start-game').addEventListener('click', () => {
      window.soundManager.ensureContext();
      this.closeModal('screen-welcome');
      const isTouchDevice = window.matchMedia('(pointer: coarse)').matches || ('ontouchstart' in window);
      const hint = isTouchDevice
        ? 'เริ่มแล้ว! แตะที่ร้านค้าหรือชาวบ้านเพื่อเดินไปคุย หรือลากบนพื้นเพื่อใช้จอยสติ๊ก'
        : 'เริ่มแล้ว! คลิกที่ร้านค้า/สิ่งของเพื่อเดินไปหา หรือกดคลิกค้างเพื่อเดิน';
      this.showToast(hint, 'success');
      setTimeout(() => {
        this.openDailyBriefing(1);
      }, 350);
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

  // --- Student Gamification Methods: Stars & Certificate ---
  addStars(amount) {
    this.stars += amount;
    localStorage.setItem('outbreak_stars', this.stars);
    const starEl = document.getElementById('val-stars');
    if (starEl) starEl.textContent = this.stars;
    const hudStars = document.getElementById('hud-stars');
    if (hudStars) {
      hudStars.classList.remove('pop-anim');
      void hudStars.offsetWidth; // trigger reflow
      hudStars.classList.add('pop-anim');
    }
  }

  spawnFloatingEffect(x, y, text) {
    const container = document.getElementById('floating-fx-container');
    if (!container) return;

    const el = document.createElement('div');
    el.className = 'floating-particle';
    el.textContent = text;
    el.style.left = `${x || window.innerWidth / 2}px`;
    el.style.top = `${y || window.innerHeight / 2}px`;
    container.appendChild(el);

    setTimeout(() => {
      if (el.parentNode) el.parentNode.removeChild(el);
    }, 1200);
  }

  openCertificate() {
    const hp = Math.round(this.survival.hp);
    const days = this.weather.day;
    const infections = this.disease.totalInfectionsContracted;

    let grade = 'A';
    let title = 'อสม. น้อยดีเด่น';

    if (days >= 7 && hp >= 80 && infections === 0) {
      grade = 'S';
      title = '🏆 อสม. ฮีโร่เหรียญทองระดับประเทศ';
    } else if (days >= 5 && hp >= 60 && infections <= 1) {
      grade = 'A+';
      title = '🌟 ผู้พิทักษ์สุขภาพชุมชนดีเลิศ';
    } else if (hp >= 50) {
      grade = 'A';
      title = '🥇 มือปราบยุงลายระดับทอง';
    } else if (hp >= 30) {
      grade = 'B';
      title = '🥈 อสม. ผู้กล้าหาญระดับเงิน';
    } else {
      grade = 'C';
      title = '🥉 อสม. ฝึกหัดประจำหมู่บ้าน';
    }

    const gradeEl = document.getElementById('cert-grade-val');
    if (gradeEl) gradeEl.textContent = grade;
    const starsEl = document.getElementById('cert-stars-val');
    if (starsEl) starsEl.textContent = `⭐ ${this.stars}`;
    const daysEl = document.getElementById('cert-days-val');
    if (daysEl) daysEl.textContent = `${days} วัน`;
    const titleEl = document.getElementById('cert-title-val');
    if (titleEl) titleEl.textContent = title;

    if (window.soundManager && typeof window.soundManager.playStarChime === 'function') {
      window.soundManager.playStarChime();
    }
    this.openModal('modal-certificate');
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

  // --- Quests System UI ---
  openQuestsModal() {
    this.renderQuests();
    this.openModal('modal-quests');
  }

  renderQuests() {
    const listEl = document.getElementById('quests-list');
    const tokenEl = document.getElementById('quests-token-count');
    if (!listEl) return;

    if (tokenEl) {
      tokenEl.textContent = `🏅 เหรียญรางวัล อสม. สะสม: ${this.quests.healthTokens} เหรียญ`;
    }

    listEl.innerHTML = '';
    this.quests.activeQuests.forEach(q => {
      const card = document.createElement('div');
      card.className = `quest-card ${q.completed ? 'completed' : ''}`;
      const pct = Math.min(100, Math.round((q.progress / q.target) * 100));

      card.innerHTML = `
        <div class="quest-card-header">
          <div class="quest-title-box">
            <span class="quest-icon">${q.icon}</span>
            <div class="quest-title-text">
              <h4>${q.title}</h4>
              <p>${q.description}</p>
            </div>
          </div>
          <span class="quest-reward-badge">🏅 +${q.rewardTokens} เหรียญ</span>
        </div>
        <div class="quest-progress-bar-container">
          <div class="quest-progress-fill" style="width: ${pct}%"></div>
        </div>
        <div class="quest-card-footer">
          <span class="quest-status-text">${q.completed ? '✅ ภารกิจสำเร็จแล้ว!' : `ความคืบหน้า: ${q.progress}/${q.target}`}</span>
          ${q.completed ? '<span class="quest-done-tag">รับรางวัลแล้ว</span>' : ''}
        </div>
      `;
      listEl.appendChild(card);
    });
  }

  // --- Disease Investigation UI ---
  openInvestigation(npc) {
    if (!npc) return;
    this.currentInvestigatingNPC = npc;
    const nameEl = document.getElementById('investigation-npc-name');
    const quoteEl = document.getElementById('investigation-quote');
    const choicesEl = document.getElementById('investigation-options');

    if (nameEl) nameEl.textContent = `${npc.icon} ${npc.name} (${npc.title})`;
    if (quoteEl) quoteEl.textContent = `"${npc.symptomsQuote}"`;

    if (!choicesEl) return;
    choicesEl.innerHTML = '';

    if (npc.investigated) {
      choicesEl.innerHTML = `
        <div style="background: rgba(16, 185, 129, 0.15); border: 1px solid #10b981; border-radius: 8px; padding: 14px; margin-bottom: 12px; color: #a7f3d0;">
          <h4 style="color: #34d399; margin-bottom: 6px;">✅ คุณได้วินิจฉัยโรคให้ ${npc.name} ถูกต้องเรียบร้อยแล้ว</h4>
          <p style="margin-bottom: 8px; font-size: 0.95rem;"><strong>ผลการวินิจฉัย:</strong> ${npc.correctDiagnosis === 'strep_suis' ? 'โรคไข้หูดับ' : (npc.correctDiagnosis === 'leptospirosis' ? 'โรคฉี่หนู' : 'โรคไข้หวัดใหญ่')}</p>
          <p style="font-size: 0.85rem; color: #cbd5e1; line-height: 1.5;"><em>"${npc.adviceLesson}"</em></p>
        </div>
      `;
    } else {
      npc.diagnosisChoices.forEach(choice => {
        const btn = document.createElement('div');
        btn.className = 'diag-choice-card';
        btn.innerHTML = `
          <div style="font-weight: 600; font-size: 0.95rem;">${choice.name}</div>
          <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 4px;">แตะเพื่อระบุการวินิจฉัย</div>
        `;

        btn.addEventListener('click', () => {
          if (choice.correct) {
            npc.investigated = true;
            npc.isSick = false;
            if (window.soundManager) window.soundManager.playChime(600);
            this.showToast(`วินิจฉัยถูกต้อง! ${npc.name} ปลอดภัยและได้รับการรักษาที่ตรงจุด`, 'success');
            
            this.quests.progress('investigate_illness', 1, this.player, (msg, type) => this.showToast(msg, type));
            this.quests.healthTokens += 1;
            this.player.addItem('health_token', 1);
            this.showToast(`ได้รับเหรียญรางวัล อสม. 1 เหรียญ! 🏅`, 'success');

            this.openInvestigation(npc);
          } else {
            if (window.soundManager) window.soundManager.playBuzz();
            this.showToast(choice.feedback, 'error');
          }
        });

        choicesEl.appendChild(btn);
      });
    }

    this.openModal('modal-investigation');
  }

  // --- Daily Public Health Briefing UI (7-Day Outbreak Curriculum) ---
  openDailyBriefing(day) {
    const cur = this.quests.getBriefingForDay(day);
    if (!cur) return;

    const modalBody = document.getElementById('briefing-modal-body');
    const headerTitle = document.getElementById('briefing-header-title');
    if (!modalBody || !headerTitle) return;

    headerTitle.innerHTML = `🌅 ข่าวสารเตือนภัยสุขภาพ: วันที่ ${cur.day} / 7`;

    let adviceHtml = '';
    if (cur.keyAdvice) {
      adviceHtml = cur.keyAdvice.map(a => `<div class="briefing-advice-item">${a}</div>`).join('');
    }

    let questsHtml = '';
    if (cur.quests) {
      questsHtml = cur.quests.map(q => `
        <div class="briefing-quest-pill">
          <div class="briefing-quest-title">
            <span>${q.icon}</span>
            <span>${q.title}</span>
          </div>
          <div class="briefing-quest-reward">รางวัล: +${q.rewardTokens} 🏅</div>
        </div>
      `).join('');
    }

    modalBody.innerHTML = `
      <div class="briefing-hero">
        <div class="briefing-hero-icon">${cur.icon}</div>
        <div class="briefing-hero-title">
          <h3>${cur.theme}</h3>
          <p>${cur.subtitle}</p>
        </div>
      </div>

      <div class="briefing-desc">
        ${cur.briefing}
      </div>

      <div class="briefing-section-title">💡 คำแนะนำทางการแพทย์ & สิ่งที่ต้องระวัง:</div>
      <div class="briefing-advice-box">
        ${adviceHtml}
      </div>

      <div class="briefing-section-title">📋 ภารกิจ อสม. ประจำวันนี้:</div>
      <div class="briefing-quests-box">
        ${questsHtml}
      </div>

      <button id="btn-briefing-start" class="briefing-start-btn">
        🚀 รับทราบและเริ่มปฏิบัติงาน (วันที่ ${cur.day})
      </button>
    `;

    const btnStart = document.getElementById('btn-briefing-start');
    if (btnStart) {
      btnStart.addEventListener('click', () => {
        this.closeModal('modal-briefing');
        if (window.soundManager) window.soundManager.playChime(600);
      });
    }

    this.openModal('modal-briefing');
  }

  // --- Food Cupboard Storage UI ---
  openCupboardModal() {
    this.renderCupboardStorage();
    this.openModal('modal-cupboard');
  }

  renderCupboardStorage() {
    const cupboardList = document.getElementById('cupboard-items-list');
    const playerList = document.getElementById('player-food-list');
    if (!cupboardList || !playerList) return;

    cupboardList.innerHTML = '';
    playerList.innerHTML = '';

    // Render items in cupboard
    if (this.world.cupboardInventory.length === 0) {
      cupboardList.innerHTML = '<div style="color: var(--text-muted); font-size: 0.85rem; padding: 12px; text-align: center;">ตู้กับข้าวว่างเปล่า</div>';
    } else {
      this.world.cupboardInventory.forEach((slot, idx) => {
        const itemInfo = window.ITEMS_DATA[slot.itemId];
        if (!itemInfo) return;
        const row = document.createElement('div');
        row.className = 'cupboard-item-row';
        row.innerHTML = `
          <div class="cupboard-item-info">
            <span style="font-size: 1.3rem;">${itemInfo.icon}</span>
            <div>
              <div style="font-weight: 600; font-size: 0.9rem;">${itemInfo.name} x${slot.count}</div>
              <div style="font-size: 0.75rem; color: #10b981;">🛡️ ปลอดภัย ไม่บูดเสีย</div>
            </div>
          </div>
          <button class="btn btn-secondary btn-sm" style="padding: 4px 10px; font-size: 0.8rem;">หยิบใส่ตัว</button>
        `;
        row.querySelector('button').addEventListener('click', () => {
          if (this.player.inventory.length >= this.player.maxSlots) {
            this.showToast('กระเป๋าของคุณเต็มแล้ว!', 'error');
            return;
          }
          this.world.cupboardInventory.splice(idx, 1);
          this.player.addItem(slot.itemId, slot.count);
          this.renderCupboardStorage();
          this.updateInventoryUI();
          this.showToast(`หยิบ ${itemInfo.name} ออกจากตู้กับข้าวแล้ว`, 'normal');
        });
        cupboardList.appendChild(row);
      });
    }

    // Render food/drink items in player's inventory
    const foodSlots = [];
    this.player.inventory.forEach((slot, invIdx) => {
      const itemInfo = window.ITEMS_DATA[slot.itemId];
      if (itemInfo && (itemInfo.type === 'food' || itemInfo.type === 'water')) {
        foodSlots.push({ slot, invIdx, itemInfo });
      }
    });

    if (foodSlots.length === 0) {
      playerList.innerHTML = '<div style="color: var(--text-muted); font-size: 0.85rem; padding: 12px; text-align: center;">ไม่มีอาหารหรือเครื่องดื่มในกระเป๋า</div>';
    } else {
      foodSlots.forEach(({ slot, invIdx, itemInfo }) => {
        const row = document.createElement('div');
        row.className = 'cupboard-item-row';
        const freshLeft = slot.freshnessLeftHours !== undefined ? ` (คงเหลือ ${Math.max(0, slot.freshnessLeftHours).toFixed(1)} ชม.)` : '';
        row.innerHTML = `
          <div class="cupboard-item-info">
            <span style="font-size: 1.3rem;">${itemInfo.icon}</span>
            <div>
              <div style="font-weight: 600; font-size: 0.9rem;">${itemInfo.name} x${slot.count}</div>
              <div style="font-size: 0.75rem; color: var(--text-muted);">${itemInfo.description}${freshLeft}</div>
            </div>
          </div>
          <button class="btn btn-secondary btn-sm" style="padding: 4px 10px; font-size: 0.8rem;">เก็บเข้าตู้</button>
        `;
        row.querySelector('button').addEventListener('click', () => {
          this.player.inventory.splice(invIdx, 1);
          this.world.cupboardInventory.push({ itemId: slot.itemId, count: slot.count });
          this.renderCupboardStorage();
          this.updateInventoryUI();
          this.showToast(`เก็บ ${itemInfo.name} เข้าตู้กับข้าวเรียบร้อย`, 'success');
        });
        playerList.appendChild(row);
      });
    }
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

      // Check clinic quota if applicable
      let quotaInfo = null;
      let remainingQuota = 99;
      if (opt.quotaKey && this.world.clinicQuota && this.world.clinicQuota[opt.quotaKey]) {
        quotaInfo = this.world.clinicQuota[opt.quotaKey];
        remainingQuota = quotaInfo.max - quotaInfo.usedToday;
        if (remainingQuota <= 0) {
          canPerform = false;
          missingMsg = quotaInfo.isOneTime ? '(คุณได้รับไปแล้วตลอดเกม)' : '(โควตาวันนี้หมดแล้ว พรุ่งนี้มารับใหม่)';
        }
      }

      const quotaBadge = quotaInfo ? `
        <div class="action-quota-badge ${remainingQuota <= 0 ? 'depleted' : ''}">
          โควตา: เหลือ ${Math.max(0, remainingQuota)}/${quotaInfo.max} ${quotaInfo.isOneTime ? '(จำกัด 1 ชิ้น)' : '(วันนี้)'}
        </div>
      ` : '';

      card.innerHTML = `
        <div class="action-info">
          <span class="action-icon">${opt.icon || '👉'}</span>
          <div class="action-text">
            <h4>${opt.label}</h4>
            ${quotaBadge}
            ${missingMsg ? `<p style="color: #ef4444; margin-top: 4px;">${missingMsg}</p>` : ''}
          </div>
        </div>
        <span class="action-badge">${canPerform ? 'เลือกทำ' : (remainingQuota <= 0 ? 'โควตาหมด' : 'ไอเทมไม่พอ')}</span>
      `;

      if (canPerform) {
        card.addEventListener('click', () => {
          this.closeModal('modal-interaction');
          this.executeAction(opt, ent);
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

    // Track clinic quota usage
    if (opt.quotaKey && this.world.clinicQuota && this.world.clinicQuota[opt.quotaKey]) {
      this.world.clinicQuota[opt.quotaKey].usedToday++;
    }

    // Specific Action Handlers
    switch (opt.action) {
      case 'sleep_safe':
        this.sleepFade(7, null, true);
        break;

      case 'sleep_risky':
        this.sleepFade(7, opt.risk, false);
        break;

      case 'cook_pork':
        this.miniGames.playCookingTiming('เนื้อหมู', (isCooked) => {
          if (window.soundManager) window.soundManager.playSizzle();
          if (isCooked) {
            this.showToast('ย่างเนื้อหมูจนสุก 100% ปลอดภัยจากเชื้อไข้หูดับ!', 'success');
            this.spawnFloatingEffect(window.innerWidth / 2, window.innerHeight / 2, '🥩 สุก 100% ปลอดภัย!');
            this.quests.progress('cook_pork', 1, this.player, (msg, type) => {
              this.showToast(msg, type);
              this.addStars(50);
            });
          } else {
            this.showToast('หมูยังกึ่งสุกกึ่งดิบ! เชื้อแบคทีเรียอาจยังไม่ตาย ระวังไข้หูดับ', 'warning');
          }
        });
        break;

      case 'boil_water':
        this.miniGames.playCookingTiming('น้ำดื่ม', () => {
          if (window.soundManager) window.soundManager.playSizzle();
          this.showToast('ต้มน้ำเดือดพล่าน ฆ่าเชื้อโรคสะอาด 100%!', 'success');
          this.spawnFloatingEffect(window.innerWidth / 2, window.innerHeight / 2, '💧 น้ำต้มสุกสะอาด!');
          this.quests.progress('boil_water', 1, this.player, (msg, type) => {
            this.showToast(msg, type);
            this.addStars(50);
          });
        });
        break;

      case 'wash_hands':
        this.miniGames.playHandWash(() => {
          this.survival.washHands();
          this.showToast('ฟอกสบู่ล้างมือสะอาดแล้ว สุขอนามัยเต็ม 100%!', 'success');
          this.spawnFloatingEffect(window.innerWidth / 2, window.innerHeight / 2, '🧼 ล้างมือสะอาด!');
          this.quests.progress('wash_hands', 1, this.player, (msg, type) => {
            this.showToast(msg, type);
            this.addStars(50);
          });
        });
        break;

      case 'apply_abate':
        ent.hasAbate = true;
        this.addStars(25);
        if (window.soundManager) window.soundManager.playStarChime();
        this.showToast('ใส่ทรายอะเบทในโอ่งแล้ว ลูกน้ำยุงลายไม่สามารถเจริญเติบโตได้! (+25 ⭐)', 'success');
        this.spawnFloatingEffect(window.innerWidth / 2, window.innerHeight / 2, '+25 ⭐ ทรายอะเบท');
        this.quests.progress('apply_abate', 1, this.player, (msg, type) => {
          this.showToast(msg, type);
          this.addStars(50);
        });
        break;

      case 'cover_jar':
        ent.hasCover = true;
        this.addStars(20);
        if (window.soundManager) window.soundManager.playStarChime();
        this.showToast('ปิดฝาโอ่งน้ำสนิท ยุงลายไม่สามารถเข้าไปวางไข่ได้! (+20 ⭐)', 'success');
        this.spawnFloatingEffect(window.innerWidth / 2, window.innerHeight / 2, '+20 ⭐ ปิดฝาโอ่ง');
        break;

      case 'flip_shells':
        this.miniGames.playMosquitoSwat(() => {
          ent.cleared = true;
          this.showToast('คว่ำกะลาและทำลายแหล่งน้ำขังแล้ว ลดประชากรยุงลายในละแวกบ้าน!', 'success');
          this.spawnFloatingEffect(window.innerWidth / 2, window.innerHeight / 2, '🦟 ปราบยุงลายสำเร็จ!');
          this.quests.progress('flip_shells', 1, this.player, (msg, type) => {
            this.showToast(msg, type);
            this.addStars(50);
          });
        });
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

      case 'buy_mask':
        this.showToast('ซื้อหน้ากากอนามัยสำเร็จ! สวมใส่เพื่อป้องกันละอองฝอยในตลาด', 'success');
        this.quests.progress('get_mask', 1, this.player, (msg, type) => this.showToast(msg, type));
        break;

      case 'get_mask':
        this.showToast('รับหน้ากากอนามัยจาก รพ.สต. สำเร็จ! สวมใส่ป้องกันโรคในที่ชุมชน', 'success');
        this.quests.progress('get_mask', 1, this.player, (msg, type) => this.showToast(msg, type));
        break;

      case 'open_cupboard':
        this.openCupboardModal();
        break;

      case 'open_investigation':
        this.openInvestigation(opt.npcRef || ent);
        break;

      case 'talk_npc':
        this.showToast(ent.dialogue || 'สวัสดีจ้ะพ่อหนุ่ม/แม่หนู', 'normal');
        break;

      case 'exchange_token':
        if (this.player.hasItem('health_token')) {
          this.player.removeItem('health_token', 1);
          this.player.addItem('cooked_pork', 1);
          this.player.addItem('ors', 1);
          if (window.soundManager) window.soundManager.playChime(550);
          this.showToast('แลกเสบียง อสม. สำเร็จ! ได้รับหมูสุก 1 ชิ้น และผงเกลือแร่ ORS 1 ซอง', 'success');
        } else {
          this.showToast('คุณยังไม่มีเหรียญ อสม. พอ! ทำภารกิจช่วยชาวบ้านเพื่อรับเหรียญ', 'error');
        }
        break;
    }

    this.updateInventoryUI();
  }

  // Sleep Fade Transition
  sleepFade(hours = 7, risk = null, isSafe = true) {
    const overlay = document.getElementById('sleep-overlay');
    const textEl = document.getElementById('sleep-text');
    const subtextEl = document.getElementById('sleep-subtext');
    if (textEl) textEl.textContent = 'zzz... กำลังนอนหลับพักผ่อน';
    if (subtextEl) subtextEl.textContent = `เวลาผ่านไป ${hours} ชั่วโมง`;
    if (overlay) overlay.classList.add('active');

    this.isSleeping = true;
    setTimeout(() => {
      // Advance time & survival metrics
      this.weather.fastForward(hours, this.world, this.player);
      this.survival.sleep(hours);
      this.player.updateFoodFreshness(hours, this.weather, (msg, type) => this.showToast(msg, type));

      if (isSafe) {
        this.showToast('คุณกางมุ้งและนอนหลับอย่างปลอดภัย ฟื้นฟูพลังงานเต็มที่!', 'success');
      } else if (risk) {
        this.disease.evaluateRisk(risk, (msg, type) => this.showToast(msg, type));
      }

      setTimeout(() => {
        if (overlay) overlay.classList.remove('active');
        this.isSleeping = false;
        this.showToast(`🌅 ตื่นนอนแล้ว! ขณะนี้เวลา ${this.weather.getTimeFormatted()}`, 'normal');
        this.updateUI();
        this.updateInventoryUI();
        this.checkEndGame();
      }, 750);
    }, 700);
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
    const barHp = document.getElementById('bar-hp');
    if (barHp) {
      barHp.style.width = `${hp}%`;
      if (hp <= 30) {
        barHp.classList.add('critical');
      } else {
        barHp.classList.remove('critical');
      }
    }

    document.getElementById('val-hunger').textContent = `${hunger}%`;
    document.getElementById('bar-hunger').style.width = `${hunger}%`;

    document.getElementById('val-thirst').textContent = `${thirst}%`;
    document.getElementById('bar-thirst').style.width = `${thirst}%`;

    document.getElementById('val-energy').textContent = `${energy}%`;
    document.getElementById('bar-energy').style.width = `${energy}%`;

    // Quick Vitals Chips (Header / Mobile Island)
    const qHp = document.getElementById('quick-hp');
    if (qHp) qHp.textContent = `❤️ ${hp}`;
    const qHunger = document.getElementById('quick-hunger');
    if (qHunger) qHunger.textContent = `🍗 ${hunger}%`;
    const qThirst = document.getElementById('quick-thirst');
    if (qThirst) qThirst.textContent = `💧 ${thirst}%`;
    const qEnergy = document.getElementById('quick-energy');
    if (qEnergy) qEnergy.textContent = `⚡ ${energy}%`;

    // Dynamic Health Status Banner & Glowing Avatar Pulse Ring
    const vitalsStatus = document.getElementById('vitals-health-status');
    const vitalsStatusText = document.getElementById('vitals-status-text');
    const vitalsPulseRing = document.getElementById('vitals-pulse-ring');
    const activeInfections = this.disease.activeInfections;

    if (vitalsStatus && vitalsStatusText) {
      const activeSick = activeInfections.find(inf => inf.stage !== 'incubating');
      const activeIncubating = activeInfections.find(inf => inf.stage === 'incubating');

      if (activeSick) {
        vitalsStatus.className = 'vitals-health-status danger';
        vitalsStatusText.textContent = `⚠️ ติดเชื้อ: ${activeSick.name}`;
        if (vitalsPulseRing) vitalsPulseRing.className = 'vitals-pulse-ring danger';
      } else if (activeIncubating) {
        vitalsStatus.className = 'vitals-health-status warning';
        vitalsStatusText.textContent = `⚠️ ฟักตัว: ${activeIncubating.name}`;
        if (vitalsPulseRing) vitalsPulseRing.className = 'vitals-pulse-ring';
      } else if (hp < 30 || hunger < 20 || thirst < 20) {
        vitalsStatus.className = 'vitals-health-status danger';
        vitalsStatusText.textContent = hp < 30 ? 'ร่างกายวิกฤต!' : 'หิว/ขาดน้ำรุนแรง!';
        if (vitalsPulseRing) vitalsPulseRing.className = 'vitals-pulse-ring danger';
      } else if (hunger < 45 || thirst < 45 || energy < 30) {
        vitalsStatus.className = 'vitals-health-status warning';
        vitalsStatusText.textContent = thirst < 45 ? 'กระหายน้ำ' : 'เริ่มอ่อนล้า';
        if (vitalsPulseRing) vitalsPulseRing.className = 'vitals-pulse-ring';
      } else {
        vitalsStatus.className = 'vitals-health-status';
        vitalsStatusText.textContent = 'สุขภาพสมบูรณ์';
        if (vitalsPulseRing) vitalsPulseRing.className = 'vitals-pulse-ring';
      }
    }

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

    const badgeMask = document.getElementById('badge-mask');
    if (badgeMask) {
      if (this.player.hasMask && this.player.maskHoursLeft > 0) {
        badgeMask.className = 'equip-badge active';
        badgeMask.innerHTML = `😷 <span>สวมหน้ากาก (${this.player.maskHoursLeft.toFixed(1)}ชม.)</span>`;
      } else {
        badgeMask.className = 'equip-badge';
        badgeMask.innerHTML = '😷 <span>ไม่มีหน้ากาก</span>';
      }
    }

    // Active Diseases Badges
    const diseaseContainer = document.getElementById('active-diseases-container');
    diseaseContainer.innerHTML = '';
    this.disease.activeInfections.forEach(inf => {
      const pill = document.createElement('div');
      pill.className = 'disease-pill';
      pill.innerHTML = inf.stage === 'incubating'
        ? `<span>${inf.icon}</span> <span>ระยะฟักตัว: ${inf.name} (เริ่มมีอาการ)</span>`
        : `<span>${inf.icon}</span> <span>ติดเชื้อ: ${inf.name}</span>`;
      if (inf.stage === 'incubating') {
        pill.style.borderColor = '#f59e0b';
        pill.style.color = '#fde68a';
      }
      pill.addEventListener('click', () => {
        this.openCodex(inf.id);
      });
      diseaseContainer.appendChild(pill);
    });

    // Update quest badge counter
    const badgeQuest = document.getElementById('badge-quest-count');
    if (badgeQuest) {
      const activeUncompleted = this.quests.activeQuests.filter(q => !q.completed).length;
      badgeQuest.textContent = activeUncompleted > 0 ? activeUncompleted : '✓';
      badgeQuest.style.background = activeUncompleted > 0 ? '#3b82f6' : '#10b981';
    }

    // Screen Vignette Effects
    const vigFever = document.getElementById('vignette-fever');
    const vigDiarrhea = document.getElementById('vignette-diarrhea');
    const vigDanger = document.getElementById('vignette-danger');

    vigFever.style.opacity = (this.disease.hasDisease('dengue') || this.disease.hasDisease('influenza')) ? '0.75' : '0';
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

    if (this.weather.isVictory || this.weather.day > this.weather.maxDays) {
      this.weather.isVictory = true;
      this.isPaused = true;
      this.activeModal = 'screen-victory';
      const screen = document.getElementById('screen-victory');
      const victoryStats = document.getElementById('victory-stats');
      if (victoryStats) {
        victoryStats.innerHTML = `
          <p style="margin-bottom: 8px;">🎉 สุดยอดมาก! คุณมีวินัยในการกินสุก ดื่มน้ำต้มสุก สวมบูทป้องกัน สวมหน้ากากอนามัย และรักษาความสะอาดจนรอดชีวิตครบ ${this.weather.maxDays} วันเต็ม</p>
          <div style="font-size: 0.85rem; color: #94a3b8; background: rgba(255,255,255,0.06); padding: 8px 12px; border-radius: 8px;">
            พลังชีวิตคงเหลือ: ${Math.round(this.survival.hp)}% | สถิติติดเชื้อสะสม: ${this.disease.totalInfectionsContracted} ครั้ง
          </div>
        `;
      }
      if (screen) screen.classList.remove('hidden');
      if (window.soundManager) window.soundManager.playChime(660);
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
        if (!this.isSleeping) {
          // 1. Process Input Movement
          const moveVec = this.input.updateMovement();
          this.player.update(dt, moveVec, this.world, this.disease);

          // Update NPCs
          this.world.updateNPCs(dt);

          // Update Food Freshness
          const deltaGameHours = dt / this.weather.secondsPerGameHour;
          this.player.updateFoodFreshness(deltaGameHours, this.weather, (msg, type) => this.showToast(msg, type));

          // Check day change for daily quests & 7-day curriculum briefing
          if (this.weather.day !== this.lastTrackedDay) {
            this.lastTrackedDay = this.weather.day;
            this.quests.generateDailyQuests(this.weather.day);
            this.openDailyBriefing(this.weather.day);
            this.showToast(`📋 เริ่มต้นวันใหม่! มีภารกิจและคำเตือนวันที่ ${this.weather.day} เข้ามาแล้ว`, 'normal');
          }

          // 2. Check Interactive Entity Proximity
          this.currentNearbyEntity = this.world.getNearbyEntity(this.player.x, this.player.y);
          const promptEl = document.getElementById('interaction-prompt');
          const promptText = document.getElementById('prompt-text');

          if (this.currentNearbyEntity) {
            promptEl.classList.remove('hidden');
            const hasMiniGame = this.currentNearbyEntity.options && this.currentNearbyEntity.options.some(opt => ['flip_shells', 'wash_hands', 'cook_pork', 'boil_water'].includes(opt.action));
            if (hasMiniGame) {
              promptText.innerHTML = `กด E หรือแตะ เพื่อ [${this.currentNearbyEntity.name}] <span style="color: #fde68a; font-weight: 800; text-shadow: 0 0 8px rgba(245, 158, 11, 0.8);">🎮 มินิเกม</span>`;
            } else {
              promptText.textContent = `กด E หรือแตะ เพื่อ [${this.currentNearbyEntity.name}]`;
            }
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
