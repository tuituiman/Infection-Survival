/**
 * minigames.js - Touch-First Micro Mini-Games for School Students
 * Designed specifically for mobile/tablet touch interaction and PC mouse clicks.
 * Engaging, fast-paced (3-5 seconds), highly rewarding with instant audio-visual feedback.
 */

class MiniGameManager {
  constructor(game) {
    this.game = game;
  }

  /**
   * 1. Mosquito Swatting Mini-Game (ตบยุงลาย 5 วินาที)
   * Tapping/clicking mosquitoes flying on screen before timer ends.
   */
  playMosquitoSwat(onSuccess) {
    const overlay = document.getElementById('modal-minigame');
    const container = document.getElementById('minigame-container');
    if (!overlay || !container) {
      if (onSuccess) onSuccess();
      return;
    }

    this.game.openModal('modal-minigame');

    const targetKills = 4;
    let kills = 0;
    let timeLeft = 6.0;
    let isGameOver = false;

    container.innerHTML = `
      <div class="minigame-card mosquito-game">
        <div class="minigame-header">
          <div class="minigame-title">🦟 ภารกิจด่วน: ตบยุงลายรอบแอ่งน้ำขัง!</div>
          <div class="minigame-stats">
            <span class="mg-stat-pill">เป้าหมาย: <strong id="mg-kills">0</strong>/${targetKills} ตัว</span>
            <span class="mg-stat-pill time" id="mg-time">⏱️ ${timeLeft.toFixed(1)}s</span>
          </div>
        </div>
        <div class="minigame-canvas-area" id="mg-mosquito-field">
          <div class="mg-hint-tap">👉 แตะที่ตัวยุงบนจอเพื่อตบ!</div>
        </div>
        <div class="minigame-footer">
          <button id="btn-mg-skip" class="btn btn-secondary btn-sm">ข้ามมินิเกม</button>
        </div>
      </div>
    `;

    overlay.classList.remove('hidden');
    const field = document.getElementById('mg-mosquito-field');
    const killsEl = document.getElementById('mg-kills');
    const timeEl = document.getElementById('mg-time');
    const btnSkip = document.getElementById('btn-mg-skip');

    // Spawn animated mosquitoes
    const mosquitoes = [];
    for (let i = 0; i < targetKills + 2; i++) {
      const moz = document.createElement('div');
      moz.className = 'mosquito-target';
      moz.innerHTML = '🦟';
      moz.style.left = `${15 + Math.random() * 70}%`;
      moz.style.top = `${20 + Math.random() * 60}%`;
      field.appendChild(moz);

      // Random drifting animation
      const vx = (Math.random() - 0.5) * 60;
      const vy = (Math.random() - 0.5) * 60;
      mosquitoes.push({ el: moz, x: parseFloat(moz.style.left), y: parseFloat(moz.style.top), vx, vy, dead: false });

      // Tap / Click handler
      const swatHandler = (e) => {
        e.stopPropagation();
        if (moz.classList.contains('dead') || isGameOver) return;
        moz.classList.add('dead');
        moz.innerHTML = '💥';
        kills++;
        killsEl.textContent = kills;
        window.soundManager?.playSplat?.();
        this.game.spawnFloatingEffect(e.clientX || field.getBoundingClientRect().left + 100, e.clientY || 200, 'แปะ! 💥');

        setTimeout(() => {
          if (moz.parentNode) moz.parentNode.removeChild(moz);
        }, 300);

        if (kills >= targetKills) {
          isGameOver = true;
          this.endMosquitoGame(true, onSuccess);
        }
      };

      moz.addEventListener('pointerdown', swatHandler);
    }

    // Skip handler
    btnSkip.addEventListener('click', () => {
      isGameOver = true;
      this.endMosquitoGame(true, onSuccess, true);
    });

    // Mosquito flying tick
    const animInterval = setInterval(() => {
      if (isGameOver) {
        clearInterval(animInterval);
        return;
      }
      mosquitoes.forEach(m => {
        if (m.dead) return;
        m.x += m.vx * 0.04;
        m.y += m.vy * 0.04;
        if (m.x < 10 || m.x > 85) m.vx *= -1;
        if (m.y < 15 || m.y > 80) m.vy *= -1;
        m.el.style.left = `${m.x}%`;
        m.el.style.top = `${m.y}%`;
      });
    }, 40);

    // Timer countdown
    const timerInterval = setInterval(() => {
      if (isGameOver) {
        clearInterval(timerInterval);
        return;
      }
      timeLeft -= 0.1;
      timeEl.textContent = `⏱️ ${Math.max(0, timeLeft).toFixed(1)}s`;
      if (timeLeft <= 0) {
        isGameOver = true;
        clearInterval(timerInterval);
        this.endMosquitoGame(kills >= targetKills, onSuccess);
      }
    }, 100);
  }

  endMosquitoGame(success, onSuccess, skipped = false) {
    const overlay = document.getElementById('modal-minigame');
    const container = document.getElementById('minigame-container');
    if (success) {
      window.soundManager?.playStarChime?.();
      this.game.addStars(skipped ? 10 : 30);
      container.innerHTML = `
        <div class="minigame-card result success">
          <div class="result-icon">🎉</div>
          <h3>${skipped ? 'ข้ามมินิเกมแล้ว' : 'สำเร็จ! ยุงลายราบคาบ!'}</h3>
          <p>ทำลายแหล่งเพาะพันธุ์ยุงลาย ลดความเสี่ยงไข้เลือดออกสำเร็จ</p>
          <div class="star-reward-pill">+${skipped ? '10' : '30'} ⭐ ดาวอนามัย</div>
          <button id="btn-mg-finish" class="btn btn-primary-action" style="margin-top: 14px;">ลุยต่อเลย!</button>
        </div>
      `;
    } else {
      container.innerHTML = `
        <div class="minigame-card result warning">
          <div class="result-icon">⚠️</div>
          <h3>ยุงบินหนีไปได้บางส่วน!</h3>
          <p>แต่คุณยังคงคว่ำกะลาน้ำขังสำเร็จ รอบหน้าต้องระวังตบให้ทันนะ</p>
          <div class="star-reward-pill">+10 ⭐ ดาวอนามัย</div>
          <button id="btn-mg-finish" class="btn btn-primary-action" style="margin-top: 14px;">ตกลง</button>
        </div>
      `;
      this.game.addStars(10);
    }

    const btnFinish = document.getElementById('btn-mg-finish');
    if (btnFinish) {
      btnFinish.addEventListener('click', () => {
        this.game.closeModal('modal-minigame');
        if (onSuccess) onSuccess();
      });
    }
  }

  /**
   * 2. Hand Washing Bubble Pop Mini-Game (ถูฟองสบู่ล้างมือ 7 ขั้นตอน)
   * Tapping and scrubbing away germs and soap bubbles.
   */
  playHandWash(onSuccess) {
    const overlay = document.getElementById('modal-minigame');
    const container = document.getElementById('minigame-container');
    if (!overlay || !container) {
      if (onSuccess) onSuccess();
      return;
    }

    this.game.openModal('modal-minigame');

    const totalBubbles = 7;
    let popped = 0;

    container.innerHTML = `
      <div class="minigame-card soap-game">
        <div class="minigame-header">
          <div class="minigame-title">🧼 ล้างมือ 7 ขั้นตอน: ฟอกสบู่ให้ฟองแตก!</div>
          <div class="minigame-stats">
            <span class="mg-stat-pill">ความสะอาด: <strong id="mg-popped">0</strong>/${totalBubbles} จุด</span>
          </div>
        </div>
        <div class="minigame-canvas-area soap-field" id="mg-soap-field">
          <div class="hands-bg">🤲</div>
          <div class="mg-hint-tap">👉 แตะหรือลากผ่านฟองสบู่ให้แตกครบ 7 จุด!</div>
        </div>
        <div class="minigame-footer">
          <button id="btn-mg-skip" class="btn btn-secondary btn-sm">ข้ามมินิเกม</button>
        </div>
      </div>
    `;

    overlay.classList.remove('hidden');
    const field = document.getElementById('mg-soap-field');
    const poppedEl = document.getElementById('mg-popped');
    const btnSkip = document.getElementById('btn-mg-skip');

    const bubblePositions = [
      { x: 30, y: 35 }, { x: 70, y: 35 },
      { x: 50, y: 45 }, { x: 35, y: 60 },
      { x: 65, y: 60 }, { x: 25, y: 75 },
      { x: 75, y: 75 }
    ];

    bubblePositions.forEach((pos, idx) => {
      const bubble = document.createElement('div');
      bubble.className = 'soap-bubble-target';
      bubble.innerHTML = '🫧';
      bubble.style.left = `${pos.x}%`;
      bubble.style.top = `${pos.y}%`;
      field.appendChild(bubble);

      const popAction = (e) => {
        if (bubble.classList.contains('popped')) return;
        bubble.classList.add('popped');
        bubble.innerHTML = '✨';
        popped++;
        poppedEl.textContent = popped;
        window.soundManager?.playPop?.();
        this.game.spawnFloatingEffect(e.clientX || 200, e.clientY || 200, 'ป๊อป! 🫧');

        setTimeout(() => {
          if (bubble.parentNode) bubble.parentNode.removeChild(bubble);
        }, 250);

        if (popped >= totalBubbles) {
          setTimeout(() => {
            this.endHandWashGame(onSuccess);
          }, 350);
        }
      };

      bubble.addEventListener('pointerdown', popAction);
      bubble.addEventListener('pointerenter', popAction);
    });

    btnSkip.addEventListener('click', () => {
      this.endHandWashGame(onSuccess, true);
    });
  }

  endHandWashGame(onSuccess, skipped = false) {
    const overlay = document.getElementById('modal-minigame');
    const container = document.getElementById('minigame-container');
    window.soundManager?.playStarChime?.();
    this.game.addStars(skipped ? 10 : 25);

    container.innerHTML = `
      <div class="minigame-card result success">
        <div class="result-icon">✨</div>
        <h3>${skipped ? 'ล้างมือเรียบร้อย' : 'มือสะอาดหมดจด 100%!'}</h3>
        <p>เชื้อแบคทีเรียและไวรัสหลุดลอก ป้องกันโรคอุจจาระร่วงและไข้หวัดใหญ่</p>
        <div class="star-reward-pill">+${skipped ? '10' : '25'} ⭐ ดาวอนามัย</div>
        <button id="btn-mg-finish" class="btn btn-primary-action" style="margin-top: 14px;">ยอดเยี่ยม!</button>
      </div>
    `;

    const btnFinish = document.getElementById('btn-mg-finish');
    if (btnFinish) {
      btnFinish.addEventListener('click', () => {
        this.game.closeModal('modal-minigame');
        if (onSuccess) onSuccess();
      });
    }
  }

  /**
   * 3. Cooking Safe Temp Gauge Mini-Game (ย่างสุก 100% ปลอดไข้หูดับ)
   * Tap when thermometer hits the green "Safe 100%" zone!
   */
  playCookingTiming(foodName, onSuccess) {
    const overlay = document.getElementById('modal-minigame');
    const container = document.getElementById('minigame-container');
    if (!overlay || !container) {
      if (onSuccess) onSuccess();
      return;
    }

    this.game.openModal('modal-minigame');

    container.innerHTML = `
      <div class="minigame-card cook-game">
        <div class="minigame-header">
          <div class="minigame-title">🥩 ปรุงอาหาร: ย่าง ${foodName} ให้สุก 100%!</div>
        </div>
        <div class="minigame-canvas-area cook-field">
          <div class="cook-pan">🥩🔥</div>
          <p class="mg-hint-tap" style="margin-top: 10px;">👉 แตะปุ่ม "หยุดย่าง" เมื่อแถบความร้อนถึง <strong>โซนสีเขียว (สุก 100%)</strong></p>
          
          <div class="cook-gauge-wrap">
            <div class="cook-gauge-track">
              <div class="cook-zone-raw" style="width: 50%;" title="ดิบ (เสี่ยงไข้หูดับ)">🥩 ดิบ (อันตราย)</div>
              <div class="cook-zone-cooked" style="width: 50%;" title="สุกปลอดภัย 100%">✅ สุก 100% (ปลอดภัย)</div>
              <div class="cook-needle" id="cook-needle"></div>
            </div>
          </div>
        </div>
        <div class="minigame-footer" style="display: flex; gap: 10px; justify-content: center;">
          <button id="btn-cook-stop" class="btn btn-primary-action pulse-anim" style="padding: 12px 28px; font-size: 1.1rem;">
            🔥 หยุดย่างเดี๋ยวนี้!
          </button>
          <button id="btn-mg-skip" class="btn btn-secondary btn-sm">ข้าม</button>
        </div>
      </div>
    `;

    overlay.classList.remove('hidden');
    const needle = document.getElementById('cook-needle');
    const btnStop = document.getElementById('btn-cook-stop');
    const btnSkip = document.getElementById('btn-mg-skip');

    let needlePos = 0;
    let needleDir = 1;
    let isStopped = false;

    const animInterval = setInterval(() => {
      if (isStopped) {
        clearInterval(animInterval);
        return;
      }
      needlePos += needleDir * 2.8;
      if (needlePos >= 100) {
        needlePos = 100;
        needleDir = -1;
      } else if (needlePos <= 0) {
        needlePos = 0;
        needleDir = 1;
      }
      needle.style.left = `${needlePos}%`;
    }, 25);

    const finishCooking = (pos, skipped = false) => {
      isStopped = true;
      clearInterval(animInterval);
      const isCooked = skipped || pos >= 50;

      if (isCooked) {
        window.soundManager?.playStarChime?.();
        this.game.addStars(skipped ? 10 : 30);
        container.innerHTML = `
          <div class="minigame-card result success">
            <div class="result-icon">😋</div>
            <h3>สุก 100% หอมกรุ่น ปลอดภัย!</h3>
            <p>ความร้อนฆ่าเชื้อแบคทีเรีย Streptococcus suis ตายหมดสิ้น กินได้อย่างสบายใจ</p>
            <div class="star-reward-pill">+${skipped ? '10' : '30'} ⭐ ดาวอนามัย</div>
            <button id="btn-mg-finish" class="btn btn-primary-action" style="margin-top: 14px;">อร่อยมาก!</button>
          </div>
        `;
      } else {
        window.soundManager?.playClick?.();
        this.game.addStars(5);
        container.innerHTML = `
          <div class="minigame-card result warning">
            <div class="result-icon">⚠️</div>
            <h3>หมูยังไม่สุกดี (กึ่งสุกกึ่งดิบ)!</h3>
            <p>แต่คุณตัดสินใจหยุดย่างแล้ว ต้องระวังเสี่ยงไข้หูดับนะ!</p>
            <div class="star-reward-pill">+5 ⭐ ดาวอนามัย</div>
            <button id="btn-mg-finish" class="btn btn-primary-action" style="margin-top: 14px;">เข้าใจแล้ว</button>
          </div>
        `;
      }

      const btnFinish = document.getElementById('btn-mg-finish');
      if (btnFinish) {
        btnFinish.addEventListener('click', () => {
          this.game.closeModal('modal-minigame');
          if (onSuccess) onSuccess(isCooked);
        });
      }
    };

    btnStop.addEventListener('click', () => finishCooking(needlePos));
    btnSkip.addEventListener('click', () => finishCooking(100, true));
  }
}

window.MiniGameManager = MiniGameManager;
