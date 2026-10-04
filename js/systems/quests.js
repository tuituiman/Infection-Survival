/**
 * quests.js - Daily Village Public Health Quests & 7-Day Outbreak Curriculum
 */

const CURRICULUM_DATA = {
  1: {
    day: 1,
    theme: '🦟 ไข้เลือดออก (Dengue Fever)',
    subtitle: 'ตัดวงจรยุงลาย & กฎเหล็กห้ามกินแอสไพริน',
    weather: 'clear',
    icon: '🦟',
    featuredDisease: 'dengue',
    briefing: 'ยินดีต้อนรับสู่ชุมชน! ในช่วงนี้เริ่มพบการเพาะพันธุ์ของยุงลายตามบ้านเรือน ยุงลายจะออกหากินชุกชุมช่วงเช้าและพลบค่ำ และชอบวางไข่ในน้ำนิ่งใส ให้คุณรีบตัดวงจรลูกน้ำรอบบ้านก่อนที่จะมีชาวบ้านถูกกัดจนล้มป่วย!',
    keyAdvice: [
      '🧹 คว่ำกะลามะพร้าวและทำลายขยะน้ำขังรอบบ้านทันที',
      '🧪 เบิกทรายอะเบทจาก รพ.สต. มาใส่ในโอ่งน้ำข้างบ้าน',
      '⚠️ **คำเตือนทางการแพทย์:** หากสงสัยว่าเป็นไข้เลือดออก ห้ามกินยาแอสไพริน (Aspirin) เด็ดขาด เพราะจะทำให้เลือดออกในทางเดินอาหารจนช็อก ให้ใช้พาราเซตามอลเท่านั้น!'
    ],
    quests: [
      {
        id: 'flip_shells_d1',
        type: 'flip_shells',
        title: 'ตัดวงจรลูกน้ำยุงลาย',
        description: 'คว่ำกะลามะพร้าวและทำลายแหล่งน้ำขังรอบบ้าน',
        icon: '🧹',
        target: 1,
        progress: 0,
        rewardTokens: 1,
        completed: false
      },
      {
        id: 'apply_abate_d1',
        type: 'apply_abate',
        title: 'ใส่ทรายอะเบทในโอ่งน้ำ',
        description: 'เบิกทรายอะเบทจาก รพ.สต. แล้วนำมาใส่โอ่งน้ำข้างบ้าน',
        icon: '🧪',
        target: 1,
        progress: 0,
        rewardTokens: 1,
        completed: false
      }
    ]
  },
  2: {
    day: 2,
    theme: '🍲 อุจจาระร่วงเฉียบพลัน (Acute Diarrhea)',
    subtitle: 'กินร้อน ช้อนกลาง ล้างมือ & การดื่มน้ำต้มสุก',
    weather: 'hot',
    icon: '🍲',
    featuredDisease: 'diarrhea',
    briefing: 'วันนี้แดดแรงและอากาศร้อนระอุ! อุณหภูมิที่สูงทำให้อาหารปรุงสุกบูดเสียง่ายกว่าปกติ และเชื้อแบคทีเรียเจริญเติบโตได้ดีในน้ำดิบและอาหารที่ไม่ถูกสุขอนามัย ให้เน้นความสะอาด ต้มน้ำดื่มให้เดือดสนิท และล้างมือทุกครั้งก่อนหยิบจับอาหาร!',
    keyAdvice: [
      '🍵 ตักน้ำดิบจากบ่อน้ำแล้วนำไปต้มที่เตาไฟในบ้านให้เดือดพล่าน 100%',
      '🧼 ล้างมือด้วยสบู่ที่อ่างล้างมืออย่างน้อย 20 วินาที เพื่อฟื้นฟูสุขอนามัย',
      '🧂 หากมีอาการท้องร่วง หลอดน้ำในร่างกายจะลดเร็วขึ้น 4 เท่า ให้รีบดื่มผงเกลือแร่ ORS ทดแทนน้ำทันที!'
    ],
    quests: [
      {
        id: 'boil_water_d2',
        type: 'boil_water',
        title: 'ดื่มน้ำต้มสุก 100%',
        description: 'ตักน้ำดิบจากบ่อน้ำแล้วนำมาต้มให้เดือดสนิทที่เตาไฟ',
        icon: '🍵',
        target: 1,
        progress: 0,
        rewardTokens: 1,
        completed: false
      },
      {
        id: 'wash_hands_d2',
        type: 'wash_hands',
        title: 'ฟอกสบู่ล้างมือสะอาด',
        description: 'ล้างมือที่อ่างล้างมือหน้าบ้านด้วยสบู่ 2 ครั้ง',
        icon: '🧼',
        target: 2,
        progress: 0,
        rewardTokens: 1,
        completed: false
      }
    ]
  },
  3: {
    day: 3,
    theme: '👢 โรคฉี่หนู (Leptospirosis)',
    subtitle: 'พายุฝนกระหน่ำ & ภัยร้ายจากน้ำท่วมขัง',
    weather: 'rain',
    icon: '👢',
    featuredDisease: 'leptospirosis',
    briefing: 'พายุฝนกระหน่ำตลอดทั้งคืน ทำให้เกิดแอ่งน้ำท่วมขังและโคลนตมตามถนนในหมู่บ้าน! เชื้อเลปโตสไปราที่ปนเปื้อนจากปัสสาวะหนูสามารถไชผ่านผิวหนังและบาดแผล ห้ามเดินลุยน้ำด้วยเท้าเปล่าเด็ดขาด!',
    keyAdvice: [
      '👢 รีบไปเบิกรองเท้าบูทยางที่ รพ.สต. เพื่อสวมใส่ป้องกันเชื้อฉี่หนู 100%',
      '⚠️ หากเดินลุยน้ำเท้าเปล่า จะติดเชื้อโรคฉี่หนู ทำให้มีอาการปวดกล้ามเนื้อน่องรุนแรงจนเดินช้าลง 60%',
      '🩺 เข้าไปพูดคุยสอบสวนอาการชาวบ้านที่เดินตากฝนในชุมชน'
    ],
    quests: [
      {
        id: 'get_boots_d3',
        type: 'get_boots',
        title: 'เบิกและสวมรองเท้าบูทยาง',
        description: 'ไปที่ รพ.สต. เบิกรองเท้าบูทยางมาสวมใส่เพื่อความปลอดภัย',
        icon: '👢',
        target: 1,
        progress: 0,
        rewardTokens: 1,
        completed: false
      },
      {
        id: 'investigate_d3',
        type: 'investigate_illness',
        title: 'สอบสวนโรคชาวบ้านที่ลุยน้ำ',
        description: 'เข้าไปพูดคุยซักประวัติอาการชาวบ้านที่เดินตากฝน 1 คน',
        icon: '🔍',
        target: 1,
        progress: 0,
        rewardTokens: 2,
        completed: false
      }
    ]
  },
  4: {
    day: 4,
    theme: '🥩 โรคไข้หูดับ (Streptococcus suis)',
    subtitle: 'กินสุก แยกตะเกียบ & อันตรายจากหมูดิบ',
    weather: 'overcast',
    icon: '🥩',
    featuredDisease: 'strep_suis',
    briefing: 'เขียงหมูลุงสมชายมีเนื้อหมูสดใหม่มาลง ลุงสมชายกำลังชวนชาวบ้านกินลาบหมูดิบแกล้มสุรา! เนื้อหมูและเลือดดิบอาจมีเชื้อแบคทีเรียสเตรปโตคอกคัส ซูอิส ทำให้เยื่อหุ้มสมองอักเสบและสูญเสียการได้ยินจนหูหนวกถาวร!',
    keyAdvice: [
      '🍖 ซื้อเนื้อหมูสดมาแล้ว ต้องนำมาย่างที่เตาไฟให้สุก 100% ก่อนรับประทาน',
      '🥢 แยกอุปกรณ์ คีบดิบและคีบสุกออกจากกัน อย่าใช้ตะเกียบคู่เดียวในหมูกระทะ',
      '👂 หากติดเชื้อจะมีเสียงวิ้งในหู (Tinnitus) และหูดับ ต้องรีบไปฉีดยาปฏิชีวนะที่ รพ.สต. ทันที!'
    ],
    quests: [
      {
        id: 'cook_pork_d4',
        type: 'cook_pork',
        title: 'ย่างหมูสุก 100% ปลอดภัย',
        description: 'ซื้อเนื้อหมูสดแล้วนำมาย่างให้สุกสนิทที่เตาไฟในบ้าน',
        icon: '🍖',
        target: 1,
        progress: 0,
        rewardTokens: 1,
        completed: false
      },
      {
        id: 'investigate_d4',
        type: 'investigate_illness',
        title: 'ซักประวัติชาวบ้านเรื่องหมูดิบ',
        description: 'พูดคุยสอบสวนอาการชาวบ้านที่แวะไปเขียงหมู 1 คน',
        icon: '🔍',
        target: 1,
        progress: 0,
        rewardTokens: 2,
        completed: false
      }
    ]
  },
  5: {
    day: 5,
    theme: '😷 โรคไข้หวัดใหญ่ (Influenza)',
    subtitle: 'ตลาดนัดแออัด & การป้องกันละอองฝอย',
    weather: 'clear',
    icon: '😷',
    featuredDisease: 'influenza',
    briefing: 'วันนี้มีงานตลาดนัดใหญ่ในชุมชน ผู้คนมารวมตัวกันอย่างหนาแน่น ละอองฝอยจากการไอ จาม และพูดคุยในที่แออัดเป็นพาหะแพร่เชื้อไวรัสไข้หวัดใหญ่ได้ง่ายที่สุด!',
    keyAdvice: [
      '😷 เบิกหรือซื้อหน้ากากอนามัยมาสวมใส่ทุกครั้งก่อนเดินเข้าไปในตลาดนัด',
      '🧼 หมั่นล้างมือด้วยสบู่หลังจากหยิบจับสิ่งของสาธารณะในตลาด',
      '🏃 เว้นระยะห่างจากผู้ที่มีอาการไอหรือจามอย่างน้อย 1-2 เมตร'
    ],
    quests: [
      {
        id: 'get_mask_d5',
        type: 'get_mask',
        title: 'สวมหน้ากากอนามัยป้องกัน',
        description: 'รับหน้ากากอนามัยจาก รพ.สต. หรือร้านของชำมาสวมใส่',
        icon: '😷',
        target: 1,
        progress: 0,
        rewardTokens: 1,
        completed: false
      },
      {
        id: 'wash_hands_d5',
        type: 'wash_hands',
        title: 'ล้างมือตัดวงจรเชื้อโรค',
        description: 'ล้างมือด้วยสบู่ที่อ่างล้างมือหน้าบ้าน 2 ครั้ง',
        icon: '🧼',
        target: 2,
        progress: 0,
        rewardTokens: 1,
        completed: false
      }
    ]
  },
  6: {
    day: 6,
    theme: '⚠️ วิกฤตโรคระบาดผสม (Multiple Outbreak)',
    subtitle: 'ตรวจวินิจฉัย & บริหารเวชภัณฑ์ฉุกเฉิน',
    weather: 'rain',
    icon: '⚠️',
    featuredDisease: 'multiple',
    briefing: 'สภาพอากาศแปรปรวนทำให้พบผู้ป่วยหลายโรคพร้อมกันในชุมชน! โควตาเวชภัณฑ์ที่ รพ.สต. มีจำกัด คุณต้องใช้ความรู้ทั้งหมดที่เรียนรู้มา ซักประวัติอาการชาวบ้าน วินิจฉัยให้แม่นยำ และเลือกยารักษาให้ตรงโรค!',
    keyAdvice: [
      '📋 ตรวจอาการให้รอบคอบ: ใครท้องร่วงให้ ORS, ใครเป็นไข้เลือดออกให้พาราเซตามอล (ห้ามแอสไพริน!)',
      '💉 ใครมีอาการไข้หูดับหรือโรคฉี่หนู ต้องรีบส่งตัวไปรับยาปฏิชีวนะที่ รพ.สต.',
      '📦 เตรียมน้ำต้มสุกและอาหารสะอาดสำรองไว้ในตู้กับข้าว'
    ],
    quests: [
      {
        id: 'investigate_d6',
        type: 'investigate_illness',
        title: 'สอบสวนโรคชาวบ้านที่ป่วย',
        description: 'ตรวจซักประวัติและวินิจฉัยอาการชาวบ้านในชุมชน 2 คน',
        icon: '🔍',
        target: 2,
        progress: 0,
        rewardTokens: 3,
        completed: false
      },
      {
        id: 'boil_water_d6',
        type: 'boil_water',
        title: 'ต้มน้ำสะอาดสำรองชุมชน',
        description: 'ตักน้ำและต้มน้ำเดือด 1 ครั้งเพื่อสำรองน้ำสะอาด',
        icon: '🍵',
        target: 1,
        progress: 0,
        rewardTokens: 1,
        completed: false
      }
    ]
  },
  7: {
    day: 7,
    theme: '🏆 ชุมชนสุขภาพดี ชัยชนะเหนือโรคระบาด',
    subtitle: 'วันประเมินผลสุขาภิบาล & เกียรติยศ อสม. ดีเด่น',
    weather: 'clear',
    icon: '🏆',
    featuredDisease: 'none',
    briefing: 'ยินดีด้วย! คุณพาชุมชนก้าวข้ามผ่านสัปดาห์แห่งความเสี่ยงมาถึงวันสุดท้าย วันนี้เป็นวันประเมินผลสุขาภิบาลชุมชน รักษาค่าพลังชีวิตให้สมบูรณ์ ตรวจเช็กความสะอาดรอบบ้าน และส่งรายงานสรุปผลงานที่ รพ.สต. เพื่อรับตราเกียรติยศ!',
    keyAdvice: [
      '✨ รักษาค่า HP, ความหิว, และน้ำในร่างกายให้อยู่ในระดับปลอดภัย',
      '🧹 ตรวจตราให้แน่ใจว่าไม่มีแหล่งน้ำขังหรือกะลามะพร้าวหลงเหลือรอบบ้าน',
      '🏅 ไปที่โต๊ะพยาบาล รพ.สต. เพื่อสรุปผลการปฏิบัติงานตลอด 7 วัน'
    ],
    quests: [
      {
        id: 'flip_shells_d7',
        type: 'flip_shells',
        title: 'กำจัดน้ำขังจุดสุดท้าย',
        description: 'ตรวจตราและทำลายแหล่งน้ำขังรอบบ้านให้สะอาดหมดจด',
        icon: '🧹',
        target: 1,
        progress: 0,
        rewardTokens: 2,
        completed: false
      },
      {
        id: 'wash_hands_d7',
        type: 'wash_hands',
        title: 'รักษาสุขอนามัยเต็ม 100%',
        description: 'ล้างมือด้วยสบู่ให้สะอาดบริสุทธิ์เพื่อสุขอนามัยที่ดีเยี่ยม',
        icon: '🧼',
        target: 1,
        progress: 0,
        rewardTokens: 2,
        completed: false
      }
    ]
  }
};

class QuestSystem {
  constructor() {
    this.activeQuests = [];
    this.completedQuestsCount = 0;
    this.healthTokens = 0;
    this.generateDailyQuests(1);
  }

  // Get daily curriculum data
  getBriefingForDay(day) {
    const d = Math.max(1, Math.min(7, day || 1));
    return CURRICULUM_DATA[d] || CURRICULUM_DATA[1];
  }

  // Generate public health missions based on 7-day curriculum
  generateDailyQuests(day) {
    const cur = this.getBriefingForDay(day);
    if (cur && cur.quests) {
      // Clone quests so each day has fresh progress
      this.activeQuests = cur.quests.map(q => ({ ...q, progress: 0, completed: false }));
    } else {
      this.activeQuests = [];
    }
  }

  // Progress quest
  progress(questType, amount = 1, player = null, onNotify = null) {
    let anyCompleted = false;

    for (const q of this.activeQuests) {
      if (!q.completed && q.type === questType) {
        q.progress = Math.min(q.target, q.progress + amount);
        if (q.progress >= q.target) {
          q.completed = true;
          this.completedQuestsCount++;
          this.healthTokens += q.rewardTokens;
          anyCompleted = true;

          if (player) {
            player.addItem('health_token', q.rewardTokens);
          }

          if (onNotify) {
            onNotify(`🎉 สำเร็จภารกิจ อสม.: "${q.title}"! ได้รับ ${q.rewardTokens} เหรียญจิตอาสา 🏅`, 'success');
          }
        }
      }
    }

    return anyCompleted;
  }
}

window.CURRICULUM_DATA = CURRICULUM_DATA;
window.QuestSystem = QuestSystem;
