/**
 * items.js - Master Item Definitions
 */

const ITEMS_DATA = {
  raw_pork: {
    id: 'raw_pork',
    name: 'เนื้อหมูดิบ',
    icon: '🥩',
    type: 'food',
    description: 'เนื้อหมูสด ยังไม่ได้ปรุงสุก (เสี่ยงไข้หูดับสูงมากหากกินสด!)',
    hungerRestore: 35,
    risk: {
      disease: 'strep_suis',
      chance: 0.85,
      message: 'คุณกินเนื้อหมูดิบเข้าไป! เชื้อแบคทีเรียสเตรปโตคอกคัสเข้าสู่ร่างกาย...'
    },
    cookableTo: 'cooked_pork'
  },

  cooked_pork: {
    id: 'cooked_pork',
    name: 'หมูย่างสุก 100%',
    icon: '🍖',
    type: 'food',
    description: 'เนื้อหมูย่างจนสุกทั่วถึงด้วยความร้อนสูง ปลอดภัยและอร่อย (เก็บนอกตู้กับข้าวได้ 5 ชม.)',
    hungerRestore: 55,
    hpRestore: 10,
    freshnessMaxHours: 5,
    risk: null
  },

  raw_water: {
    id: 'raw_water',
    name: 'น้ำดิบ (ยังไม่ต้ม)',
    icon: '🚰',
    type: 'drink',
    description: 'น้ำตักจากก๊อกหรือบ่อน้ำ มีโอกาสปนเปื้อนเชื้อแบคทีเรีย',
    thirstRestore: 35,
    risk: {
      disease: 'diarrhea',
      chance: 0.75,
      message: 'คุณดื่มน้ำดิบที่ไม่ต้ม! เชื้อก่อโรคในน้ำเข้าสู่ทางเดินอาหาร...'
    },
    cookableTo: 'boiled_water'
  },

  boiled_water: {
    id: 'boiled_water',
    name: 'น้ำต้มสุกสะอาด',
    icon: '🍵',
    type: 'drink',
    description: 'น้ำที่ผ่านการต้มจนเดือดพล่าน ฆ่าเชื้อโรคสะอาด 100%',
    thirstRestore: 50,
    hpRestore: 5,
    risk: null
  },

  boots: {
    id: 'boots',
    name: 'รองเท้าบูทยาง',
    icon: '👢',
    type: 'equipment',
    slot: 'feet',
    description: 'สวมใส่เพื่อป้องกันเท้าสัมผัสน้ำขังและโคลน ป้องกันโรคฉี่หนู 100%',
    effectDescription: 'ป้องกันเชื้อโรคฉี่หนูเมื่อเดินลุยน้ำ'
  },

  mosquito_repellent: {
    id: 'mosquito_repellent',
    name: 'โลชั่นกันยุง',
    icon: '🧴',
    type: 'consumable_buff',
    description: 'ทาผิวเพื่อไล่ยุงลาย ป้องกันการถูกยุงกัดได้นาน 4 ชั่วโมงในเกม',
    buffDurationHours: 4,
    effectDescription: 'ป้องกันยุงลายกัดเป็นเวลา 4 ชม.'
  },

  abate_sand: {
    id: 'abate_sand',
    name: 'ทรายอะเบท (Abate)',
    icon: '🧪',
    type: 'tool',
    description: 'ทรายเคมีกำจัดลูกน้ำยุงลาย ใช้ใส่ในโอ่งน้ำเพื่อหยุดการแพร่พันธุ์',
    effectDescription: 'กำจัดลูกน้ำยุงลายในโอ่งน้ำ'
  },

  ors_packet: {
    id: 'ors_packet',
    name: 'ผงเกลือแร่ ORS',
    icon: '🧂',
    type: 'medicine',
    description: 'ผงน้ำตาลเกลือแร่ สำหรับชงดื่มรักษาอาการท้องเสีย ขาดน้ำ',
    thirstRestore: 45,
    hpRestore: 15,
    curesDisease: 'diarrhea',
    effectDescription: 'รักษาโรคอุจจาระร่วงเฉียบพลัน และฟื้นฟูน้ำ'
  },

  paracetamol: {
    id: 'paracetamol',
    name: 'พาราเซตามอล 500mg',
    icon: '💊',
    type: 'medicine',
    description: 'ยาลดไข้บรรเทาปวดที่ปลอดภัยที่สุดสำหรับโรคไข้เลือดออกและไข้หวัดใหญ่',
    hpRestore: 20,
    curesDiseases: ['dengue', 'influenza'],
    effectDescription: 'ลดไข้ และช่วยรักษาโรคไข้เลือดออก / ไข้หวัดใหญ่'
  },

  aspirin: {
    id: 'aspirin',
    name: 'ยาแอสไพริน (Aspirin)',
    icon: '⚠️',
    type: 'medicine',
    description: 'ยาแก้ปวดลดอักเสบ *คำเตือน: ห้ามใช้เด็ดขาดหากเป็นไข้เลือดออก!*',
    hpRestore: 10,
    dangerIfDisease: {
      disease: 'dengue',
      damage: 60,
      message: 'อันตรายถึงชีวิต! แอสไพรินทำให้เกล็ดเลือดหยุดทำงาน เกิดภาวะเลือดออกในกระเพาะอาหารอย่างรุนแรง!'
    },
    effectDescription: 'ยาแก้ปวด (อันตรายมากหากมีไข้เลือดออก)'
  },

  antibiotics: {
    id: 'antibiotics',
    name: 'ยาปฏิชีวนะจำเพาะ',
    icon: '💉',
    type: 'medicine',
    description: 'ยาฆ่าเชื้อแบคทีเรียสำหรับรักษาโรคไข้หูดับและโรคฉี่หนู (ไม่มีผลต่อเชื้อไวรัส)',
    hpRestore: 30,
    curesDiseases: ['strep_suis', 'leptospirosis'],
    effectDescription: 'รักษาโรคไข้หูดับ และโรคฉี่หนู'
  },

  face_mask: {
    id: 'face_mask',
    name: 'หน้ากากอนามัย',
    icon: '😷',
    type: 'equipment',
    slot: 'face',
    description: 'สวมใส่ป้องกันละอองฝอยในพื้นที่ชุมชนแออัด ป้องกันไข้หวัดใหญ่ได้ถึง 90% (ใช้งานได้นาน 8 ชม.)',
    buffDurationHours: 8,
    effectDescription: 'ป้องกันเชื้อไข้หวัดใหญ่ในที่ชุมชนแออัด'
  },

  spoiled_food: {
    id: 'spoiled_food',
    name: 'อาหารบูดเน่า',
    icon: '🪰',
    type: 'food',
    description: 'อาหารที่วางทิ้งไว้นอกตู้กับข้าวจนบูดเน่า (มีกลิ่นเหม็นเปรี้ยว เสี่ยงท้องร่วง 100%)',
    hungerRestore: 10,
    risk: {
      disease: 'diarrhea',
      chance: 1.0,
      message: 'คุณฝืนกินอาหารบูดเน่า! เชื้อแบคทีเรียเข้าสู่ระบบทางเดินอาหารจนเกิดอาการอุจจาระร่วงรุนแรง...'
    }
  },

  health_token: {
    id: 'health_token',
    name: 'เหรียญจิตอาสา อสม.',
    icon: '🏅',
    type: 'currency',
    description: 'เหรียญรางวัลจากการปฏิบัติหน้าที่ช่วยเหลืองานสาธารณสุขชุมชน ใช้แลกของรางวัลที่ รพ.สต.',
    effectDescription: 'แลกของรางวัลที่ รพ.สต.'
  }
};

window.ITEMS_DATA = ITEMS_DATA;
