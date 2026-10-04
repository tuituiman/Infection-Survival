/**
 * world.js - Village Map Layout, Tiles & Interactive Entities
 */

class GameWorld {
  constructor() {
    this.tileSize = 48;
    this.cols = 36;
    this.rows = 26;
    this.width = this.cols * this.tileSize;
    this.height = this.rows * this.tileSize;

    // Tile layers
    // 0: Grass, 1: Dirt Path, 2: Road, 3: Wood Floor, 4: Wall (solid), 5: Water Pond (solid), 6: Tall Grass (mosquito risk)
    this.tiles = [];
    this.colliders = [];
    this.interactiveEntities = [];
    this.puddles = []; // Rain puddles (Leptospirosis risk)
    this.mosquitoSwarms = []; // Swarms buzzing around

    // Clinic daily quotas to prevent hoarding & encourage disease prevention
    this.clinicQuota = {
      clinic_heal: { max: 1, usedToday: 0, label: 'ตรวจรักษาโรค' },
      get_ors: { max: 2, usedToday: 0, label: 'เกลือแร่ ORS' },
      get_para: { max: 3, usedToday: 0, label: 'พาราเซตามอล' },
      get_boots: { max: 1, usedToday: 0, isOneTime: true, label: 'รองเท้าบูทยาง' },
      get_protection_kit: { max: 1, usedToday: 0, label: 'ชุดกันยุง+ทรายอะเบท' },
      get_mask: { max: 2, usedToday: 0, label: 'หน้ากากอนามัย' }
    };

    // Cupboard storage (safe from spoilage)
    this.cupboardInventory = [
      { itemId: 'cooked_pork', count: 1 }
    ];

    // Village NPCs
    this.npcs = (typeof window.createVillageNPCs === 'function') ? window.createVillageNPCs(this.tileSize) : [];

    this.initMap();
    this.initEntities();
  }

  initMap() {
    // Generate base terrain
    for (let y = 0; y < this.rows; y++) {
      this.tiles[y] = [];
      for (let x = 0; x < this.cols; x++) {
        // Default grass
        this.tiles[y][x] = 0;

        // Village Roads (crossroad)
        if (y >= 12 && y <= 14) this.tiles[y][x] = 2; // East-West Main Road
        if (x >= 17 && x <= 19) this.tiles[y][x] = 2; // North-South Village Path

        // Dirt path leading to player home (top-left)
        if (x >= 4 && x <= 7 && y >= 7 && y <= 12) this.tiles[y][x] = 1;

        // Dirt path leading to clinic (top-right)
        if (x >= 24 && x <= 27 && y >= 6 && y <= 12) this.tiles[y][x] = 1;

        // Natural Pond in bottom-right (Water tile)
        const pondDist = Math.hypot(x - 30, y - 20);
        if (pondDist < 3.8) {
          this.tiles[y][x] = 5; // Deep pond (solid)
        }

        // Tall Grass patches (mosquito territory)
        if ((x >= 28 && x <= 34 && y >= 15 && y <= 18) || (x >= 1 && x <= 5 && y >= 17 && y <= 22)) {
          if (this.tiles[y][x] === 0) this.tiles[y][x] = 6;
        }

        // Player House (top-left: x=2..9, y=2..7)
        if (x >= 2 && x <= 9 && y >= 2 && y <= 7) {
          if (x === 2 || x === 9 || y === 2 || (y === 7 && x !== 6)) {
            this.tiles[y][x] = 4; // Wall (solid), door at x=6, y=7
          } else {
            this.tiles[y][x] = 3; // Wood floor
          }
        }

        // Health Clinic / รพ.สต. (top-right: x=24..33, y=2..7)
        if (x >= 24 && x <= 33 && y >= 2 && y <= 7) {
          if (x === 24 || x === 33 || y === 2 || (y === 7 && x !== 28)) {
            this.tiles[y][x] = 4; // Wall (solid), door at x=28, y=7
          } else {
            this.tiles[y][x] = 3; // Clean clinic floor
          }
        }

        // Village Market Zone (bottom-left: x=3..15, y=16..22)
        if (x >= 4 && x <= 14 && y >= 16 && y <= 21) {
          this.tiles[y][x] = 1; // Market dirt ground
        }
      }
    }

    // Register solid wall colliders
    this.rebuildColliders();

    // Default puddles (initially few, more spawn in rain)
    this.puddles = [
      { x: 13 * this.tileSize, y: 13 * this.tileSize, radius: 36, active: true },
      { x: 21 * this.tileSize, y: 10 * this.tileSize, radius: 40, active: true },
      { x: 8 * this.tileSize, y: 18 * this.tileSize, radius: 44, active: true }
    ];
  }

  rebuildColliders() {
    this.colliders = [];
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        // Tile 4 is wall, Tile 5 is deep pond
        if (this.tiles[y][x] === 4 || this.tiles[y][x] === 5) {
          this.colliders.push({
            x: x * this.tileSize,
            y: y * this.tileSize,
            w: this.tileSize,
            h: this.tileSize
          });
        }
      }
    }
  }

  initEntities() {
    this.interactiveEntities = [
      // --- PLAYER HOUSE ENTITIES ---
      {
        id: 'home_bed',
        name: 'เตียงนอนในบ้าน',
        icon: '🛏️',
        x: 3.5 * this.tileSize,
        y: 3.5 * this.tileSize,
        w: 64,
        h: 64,
        category: 'rest',
        dialogue: 'เตียงนอนสำหรับพักผ่อน คุณต้องการนอนหลับหรือไม่?',
        options: [
          {
            id: 'sleep_with_net',
            label: 'กางมุ้ง แล้วนอนหลับพักผ่อน (ปลอดภัยจากยุงลาย)',
            icon: '🛡️',
            risk: null,
            action: 'sleep_safe'
          },
          {
            id: 'sleep_no_net',
            label: 'ล้มตัวลงนอนทันที ไม่กางมุ้ง (เสี่ยงถูกยุงลายกัด)',
            icon: '⚠️',
            risk: {
              disease: 'dengue',
              chance: 0.6,
              message: 'คุณนอนหลับโดยไม่กางมุ้ง! ยุงลายที่แอบอยู่ในห้องบินมากัดคุณ...'
            },
            action: 'sleep_risky'
          }
        ]
      },
      {
        id: 'home_stove',
        name: 'เตาไฟทำอาหาร',
        icon: '🍳',
        x: 7.5 * this.tileSize,
        y: 3.5 * this.tileSize,
        w: 50,
        h: 50,
        category: 'cooking',
        dialogue: 'เตาปรุงอาหารด้วยความร้อนสูง สามารถปรุงหมูสุกและต้มน้ำฆ่าเชื้อโรคได้',
        options: [
          {
            id: 'cook_pork',
            label: 'ย่างเนื้อหมูให้สุก 100% 🎮 [มินิเกม]',
            icon: '🍖',
            requiresItem: 'raw_pork',
            producesItem: 'cooked_pork',
            action: 'cook_pork'
          },
          {
            id: 'boil_water',
            label: 'ต้มน้ำดิบให้เดือดสนิท 🎮 [มินิเกม]',
            icon: '🍵',
            requiresItem: 'raw_water',
            producesItem: 'boiled_water',
            action: 'boil_water'
          }
        ]
      },
      {
        id: 'wash_basin',
        name: 'อ่างล้างมือพร้อมสบู่',
        icon: '🧼',
        x: 5.5 * this.tileSize,
        y: 6.2 * this.tileSize,
        w: 40,
        h: 40,
        category: 'hygiene',
        dialogue: 'อ่างล้างมือหน้าบ้าน การล้างมือด้วยสบู่ 20 วินาทีช่วยกำจัดเชื้อโรคได้ 99%',
        options: [
          {
            id: 'wash_hands',
            label: 'ล้างมือด้วยสบู่ 7 ขั้นตอน 🎮 [มินิเกม]',
            icon: '✨',
            action: 'wash_hands'
          }
        ]
      },
      {
        id: 'food_cupboard',
        name: 'ตู้กับข้าวในบ้าน (ป้องกันอาหารบูด)',
        icon: '🗄️',
        x: 7.5 * this.tileSize,
        y: 5.2 * this.tileSize,
        w: 48,
        h: 48,
        category: 'storage',
        dialogue: 'ตู้กับข้าวตาข่ายมิดชิด ป้องกันแมลงวันตอมและรักษาอาหารไม่ให้บูดเน่าจากความร้อน',
        options: [
          {
            id: 'open_cupboard',
            label: 'เปิดดูและจัดการอาหารในตู้กับข้าว',
            icon: '🍽️',
            action: 'open_cupboard'
          }
        ]
      },

      // --- OUTDOOR / YARD ENTITIES ---
      {
        id: 'water_jar',
        name: 'โอ่งกักเก็บน้ำฝน',
        icon: '🏺',
        x: 10.5 * this.tileSize,
        y: 8.5 * this.tileSize,
        w: 48,
        h: 48,
        category: 'prevention',
        hasAbate: false,
        hasCover: false,
        dialogue: 'โอ่งน้ำข้างบ้าน หากไม่ปิดฝาหรือใส่ทรายอะเบท จะเป็นแหล่งเพาะพันธุ์ยุงลายชั้นดี!',
        options: [
          {
            id: 'apply_abate',
            label: 'ใส่ทรายอะเบท (Abate) กำจัดลูกน้ำยุงลาย',
            icon: '🧪',
            requiresItem: 'abate_sand',
            action: 'apply_abate'
          },
          {
            id: 'cover_jar',
            label: 'ปิดฝาโอ่งน้ำให้มิดชิด',
            icon: '🪨',
            action: 'cover_jar'
          }
        ]
      },
      {
        id: 'coconut_shells',
        name: 'กองกะลามะพร้าวและขวดน้ำเก่า',
        icon: '🥥',
        x: 12.5 * this.tileSize,
        y: 6.5 * this.tileSize,
        w: 48,
        h: 48,
        category: 'prevention',
        cleared: false,
        dialogue: 'ขยะและกะลามะพร้าวที่มีน้ำขังนิ่งใส ยุงลายชอบมาวางไข่มาก!',
        options: [
          {
            id: 'flip_shells',
            label: 'คว่ำกะลาและตบยุงลาย 🎮 [มินิเกม]',
            icon: '🧹',
            action: 'flip_shells'
          }
        ]
      },
      {
        id: 'water_pump',
        name: 'บ่อน้ำบาดาลประจำหมู่บ้าน',
        icon: '🚰',
        x: 18.5 * this.tileSize,
        y: 8.5 * this.tileSize,
        w: 48,
        h: 48,
        category: 'resource',
        dialogue: 'บ่อน้ำประจำชุมชน น้ำใสแต่ยังไม่ได้ผ่านการต้มฆ่าเชื้อ',
        options: [
          {
            id: 'collect_water',
            label: 'ตักน้ำใส่ขวด (ได้รับ: น้ำดิบ)',
            icon: '🧴',
            producesItem: 'raw_water',
            action: 'collect_water'
          }
        ]
      },

      // --- VILLAGE MARKET STALLS ---
      {
        id: 'meat_stall',
        name: 'เขียงหมูสดลุงสมชาย',
        icon: '🥩',
        x: 6.5 * this.tileSize,
        y: 17.5 * this.tileSize,
        w: 64,
        h: 50,
        category: 'market',
        dialogue: 'ลุงสมชาย: "หมูสดๆ เพิ่งเชือดเช้านี้เลยพ่อหนุ่ม จะเอาไปทำลาบดิบกินแกล้ม หรือจะเอาไปย่างสุกดีล่ะ?"',
        options: [
          {
            id: 'buy_pork',
            label: 'ซื้อเนื้อหมูสด (ได้รับ: เนื้อหมูดิบ)',
            icon: '🥩',
            producesItem: 'raw_pork',
            action: 'buy_pork'
          },
          {
            id: 'ask_strep',
            label: 'คุยกับลุงสมชาย: ทำไมหมูดิบถึงอันตราย?',
            icon: '💡',
            action: 'ask_strep'
          }
        ]
      },
      {
        id: 'street_food',
        name: 'ร้านส้มตำป้าณี',
        icon: '🥗',
        x: 11.5 * this.tileSize,
        y: 17.5 * this.tileSize,
        w: 64,
        h: 50,
        category: 'market',
        dialogue: 'ป้าณี: "ส้มตำแซ่บๆ ปลาร้าดิบๆ ไหมจ๊ะ? หรือจะเอาน้ำแข็งเปล่า?"',
        options: [
          {
            id: 'eat_spicy_salad',
            label: 'กินส้มตำปลาร้าดิบและน้ำแข็งโม่ (ลดหิว แต่เสี่ยงท้องร่วง)',
            icon: '🌶️',
            risk: {
              disease: 'diarrhea',
              chance: 0.55,
              message: 'คุณกินอาหารรสจัดที่สุขอนามัยต่ำ เชื้อแบคทีเรียเข้าสู่ลำไส้...'
            },
            action: 'eat_street_food'
          }
        ]
      },
      {
        id: 'grocery_stall',
        name: 'ร้านของชำป้าบัว',
        icon: '🏪',
        x: 16.5 * this.tileSize,
        y: 17.5 * this.tileSize,
        w: 64,
        h: 50,
        category: 'market',
        dialogue: 'ป้าบัว: "ซื้ออะไรดีจ๊ะ มีหน้ากากอนามัยสำหรับใส่เดินในตลาดเพื่อป้องกันละอองฝอย และน้ำดื่มสะอาดนะ"',
        options: [
          {
            id: 'buy_mask',
            label: 'ซื้อหน้ากากอนามัย (ได้รับ: หน้ากากอนามัย)',
            icon: '😷',
            producesItem: 'face_mask',
            action: 'buy_mask'
          }
        ]
      },

      // --- CLINIC (รพ.สต.) ---
      {
        id: 'clinic_counter',
        name: 'โต๊ะพยาบาล รพ.สต. ตำบล',
        icon: '🏥',
        x: 28.5 * this.tileSize,
        y: 4.5 * this.tileSize,
        w: 70,
        h: 46,
        category: 'clinic',
        dialogue: 'เจ้าหน้าที่สาธารณสุข: "สวัสดีค่ะ มีอาการไข้ ปวดเมื่อย หรือต้องการรับเวชภัณฑ์ป้องกันโรคติดต่ออะไรไหมคะ? (เวชภัณฑ์มีโควตาจำกัดต่อวันเพื่อกระจายให้ทั่วถึง เน้นการป้องกันล่วงหน้าเป็นหลักค่ะ)"',
        options: [
          {
            id: 'checkup_heal',
            label: 'ตรวจสุขภาพ & รับการรักษาโรคทั้งหมด (ฉีดยา/ตรวจอาการ)',
            icon: '🩺',
            quotaKey: 'clinic_heal',
            action: 'clinic_heal'
          },
          {
            id: 'get_ors',
            label: 'ขอรับผงเกลือแร่ ORS (รักษาท้องร่วง)',
            icon: '🧂',
            quotaKey: 'get_ors',
            producesItem: 'ors_packet',
            action: 'get_ors'
          },
          {
            id: 'get_para',
            label: 'ขอรับยาพาราเซตามอล (ลดไข้ ปลอดภัย)',
            icon: '💊',
            quotaKey: 'get_para',
            producesItem: 'paracetamol',
            action: 'get_para'
          },
          {
            id: 'get_boots',
            label: 'ขอเบิกรองเท้าบูทยาง (ป้องกันโรคฉี่หนู 100%)',
            icon: '👢',
            quotaKey: 'get_boots',
            producesItem: 'boots',
            action: 'get_boots'
          },
          {
            id: 'get_repellent',
            label: 'ขอรับโลชั่นทากันยุงและทรายอะเบท',
            icon: '🧴',
            quotaKey: 'get_protection_kit',
            producesItems: ['mosquito_repellent', 'abate_sand'],
            action: 'get_protection_kit'
          },
          {
            id: 'get_mask',
            label: 'ขอรับหน้ากากอนามัย (ป้องกันไข้หวัดใหญ่)',
            icon: '😷',
            quotaKey: 'get_mask',
            producesItem: 'face_mask',
            action: 'get_mask'
          },
          {
            id: 'exchange_tokens',
            label: 'แลกของรางวัล อสม. (1 เหรียญจิตอาสา ➔ อาหารปลอดภัย + ORS)',
            icon: '🏅',
            requiresItem: 'health_token',
            producesItems: ['cooked_pork', 'ors_packet'],
            action: 'exchange_token'
          }
        ]
      }
    ];
  }

  // Check collision with world walls/pond
  checkCollision(x, y, radius = 16) {
    // Map boundaries
    if (x - radius < 0 || x + radius > this.width || y - radius < 0 || y - radius > this.height) {
      return true;
    }

    // Box colliders
    for (const c of this.colliders) {
      if (
        x + radius > c.x &&
        x - radius < c.x + c.w &&
        y + radius > c.y &&
        y - radius < c.y + c.h
      ) {
        return true;
      }
    }
    return false;
  }

  // Find nearest interactive entity within reach
  getNearbyEntity(playerX, playerY, maxDist = 58) {
    let nearest = null;
    let minDist = maxDist;

    for (const ent of this.interactiveEntities) {
      const cx = ent.x + (ent.w || this.tileSize) / 2;
      const cy = ent.y + (ent.h || this.tileSize) / 2;
      const dist = Math.hypot(playerX - cx, playerY - cy);

      if (dist < minDist) {
        minDist = dist;
        nearest = ent;
      }
    }

    // Also check Villager NPCs proximity
    if (this.npcs) {
      for (const npc of this.npcs) {
        const dist = Math.hypot(playerX - npc.x, playerY - npc.y);
        if (dist < minDist) {
          minDist = dist;
          const statusIcon = npc.getStatusBubble();
          nearest = {
            id: npc.id,
            name: `${npc.name} (${npc.title}) ${statusIcon ? statusIcon : ''}`,
            icon: npc.icon,
            isNpc: true,
            npcRef: npc,
            dialogue: npc.isSick
              ? `${npc.name}: "${npc.symptomsQuote}"`
              : `${npc.name}: "${npc.normalDialogue}"`,
            options: npc.isSick && !npc.investigated ? [
              {
                id: `investigate_${npc.id}`,
                label: '🔍 สอบสวนโรค & ซักประวัติอาการ (ภารกิจ อสม.)',
                icon: '📋',
                action: 'open_investigation',
                npcRef: npc
              },
              {
                id: `talk_${npc.id}`,
                label: 'คุยทักทายทั่วไป',
                icon: '💬',
                action: 'talk_npc',
                npcRef: npc
              }
            ] : [
              {
                id: `talk_${npc.id}`,
                label: 'คุยทักทายทั่วไป',
                icon: '💬',
                action: 'talk_npc',
                npcRef: npc
              }
            ]
          };
        }
      }
    }

    return nearest;
  }

  // Check if player is currently standing inside a rain puddle (Leptospirosis risk!)
  isInPuddle(playerX, playerY) {
    for (const p of this.puddles) {
      if (!p.active) continue;
      const dist = Math.hypot(playerX - p.x, playerY - p.y);
      if (dist < p.radius) {
        return true;
      }
    }
    return false;
  }

  // Check if player is in mosquito danger zone (Tall grass, untreated water jar)
  isMosquitoZone(playerX, playerY) {
    const tileX = Math.floor(playerX / this.tileSize);
    const tileY = Math.floor(playerY / this.tileSize);

    if (tileX >= 0 && tileX < this.cols && tileY >= 0 && tileY < this.rows) {
      if (this.tiles[tileY][tileX] === 6) return true; // Tall grass
    }

    // Near uncleared coconut shells
    const shells = this.interactiveEntities.find(e => e.id === 'coconut_shells');
    if (shells && !shells.cleared) {
      if (Math.hypot(playerX - shells.x, playerY - shells.y) < 100) return true;
    }

    // Near uncovered jar without abate
    const jar = this.interactiveEntities.find(e => e.id === 'water_jar');
    if (jar && !jar.hasAbate && !jar.hasCover) {
      if (Math.hypot(playerX - jar.x, playerY - jar.y) < 110) return true;
    }

    return false;
  }

  // Check if player is in crowded zone (Village market / crowded shops -> Influenza risk)
  isCrowdedZone(playerX, playerY) {
    for (const ent of this.interactiveEntities) {
      if (ent.category === 'market') {
        const cx = ent.x + (ent.w || this.tileSize) / 2;
        const cy = ent.y + (ent.h || this.tileSize) / 2;
        if (Math.hypot(playerX - cx, playerY - cy) < 140) {
          return true;
        }
      }
    }
    return false;
  }

  // Reset clinic daily quota every new day (except one-time items like boots)
  resetClinicDailyQuota() {
    for (const key in this.clinicQuota) {
      if (!this.clinicQuota[key].isOneTime) {
        this.clinicQuota[key].usedToday = 0;
      }
    }
  }

  // Update AI for all Village NPCs
  updateNPCs(dt) {
    if (this.npcs) {
      for (const npc of this.npcs) {
        npc.update(dt, this);
      }
    }
  }
}

window.GameWorld = GameWorld;
