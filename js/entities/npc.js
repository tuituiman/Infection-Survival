/**
 * npc.js - Community Villager NPCs with Patrol AI & Disease Investigation Mode
 */

class VillagerNPC {
  constructor(config) {
    this.id = config.id;
    this.name = config.name;
    this.title = config.title;
    this.icon = config.icon || '👤';
    this.x = config.x;
    this.y = config.y;
    this.radius = 16;
    this.baseSpeed = 38;
    this.speed = this.baseSpeed;
    this.facing = 'down';
    this.isMoving = false;
    this.animTime = 0;

    // Patrol waypoints
    this.patrolPoints = config.patrolPoints || [{ x: this.x, y: this.y }];
    this.targetPointIndex = 0;
    this.waitTimer = Math.random() * 2;

    // Disease state & Investigation Quiz
    this.isSick = config.isSick || false;
    this.diseaseId = config.diseaseId || null;
    this.investigated = false;
    this.symptomsQuote = config.symptomsQuote || '';
    this.correctDiagnosis = config.correctDiagnosis || '';
    this.diagnosisChoices = config.diagnosisChoices || [];
    this.adviceLesson = config.adviceLesson || '';

    // Normal ambient dialogue
    this.normalDialogue = config.normalDialogue || 'สวัสดีจ้ะ วันนี้อากาศเปลี่ยนแปลงบ่อย รักษาสุขภาพด้วยนะ';
  }

  update(dt, world) {
    // If sick, move slower
    const currentSpeed = this.isSick ? this.baseSpeed * 0.5 : this.baseSpeed;

    if (this.waitTimer > 0) {
      this.waitTimer -= dt;
      this.isMoving = false;
      return;
    }

    if (!this.patrolPoints || this.patrolPoints.length <= 1) {
      this.isMoving = false;
      return;
    }

    const target = this.patrolPoints[this.targetPointIndex];
    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const dist = Math.hypot(dx, dy);

    if (dist < 4) {
      this.x = target.x;
      this.y = target.y;
      this.isMoving = false;
      this.waitTimer = 3.0 + Math.random() * 4.0;
      this.targetPointIndex = (this.targetPointIndex + 1) % this.patrolPoints.length;
      return;
    }

    this.isMoving = true;
    this.animTime += dt * 6;

    const moveX = (dx / dist) * currentSpeed * dt;
    const moveY = (dy / dist) * currentSpeed * dt;

    if (Math.abs(dx) > Math.abs(dy)) {
      this.facing = dx > 0 ? 'right' : 'left';
    } else {
      this.facing = dy > 0 ? 'down' : 'up';
    }

    this.x += moveX;
    this.y += moveY;
  }

  // Get current status bubble icon
  getStatusBubble() {
    if (!this.isSick) return null;
    switch (this.diseaseId) {
      case 'strep_suis': return '🥩'; // Ear ringing / Pork
      case 'leptospirosis': return '🦵'; // Calf pain
      case 'influenza': return '🤧'; // Cough / Sneeze
      case 'dengue': return '🦟'; // Dengue fever
      case 'diarrhea': return '🤢'; // Stomach
      default: return '🤒';
    }
  }
}

// Master NPC Definitions Factory
function createVillageNPCs(tileSize) {
  return [
    new VillagerNPC({
      id: 'npc_somchai',
      name: 'ลุงสมชาย',
      title: 'พ่อค้าเขียงหมู',
      icon: '👨‍🦳',
      x: 7.5 * tileSize,
      y: 17.0 * tileSize,
      patrolPoints: [
        { x: 7.5 * tileSize, y: 17.0 * tileSize },
        { x: 10.0 * tileSize, y: 17.0 * tileSize },
        { x: 6.5 * tileSize, y: 16.5 * tileSize }
      ],
      isSick: true,
      diseaseId: 'strep_suis',
      normalDialogue: 'หมูสดๆ วันนี้เพิ่งแล่มาเลยจ้ะ เอาไปทำอาหารกินสุกๆ อร่อยและปลอดภัยแน่นอน!',
      symptomsQuote: 'โอ๊ย... ลุงไข้ขึ้นสูงเฉียบพลัน ปวดหัวเหมือนหัวจะระเบิด หนาวสั่น คลื่นไส้ และหูเริ่มอื้อดับ มีเสียงวิ้งๆ ความถี่สูงในหูเหมือนเสียงจิ้งหรีดร้องตลอดเวลาเลยพ่อหนุ่ม!',
      correctDiagnosis: 'strep_suis',
      diagnosisChoices: [
        { id: 'strep_suis', name: 'โรคไข้หูดับ (Streptococcus suis)', correct: true, feedback: 'ถูกต้อง! เชื้อแบคทีเรียจากเนื้อหมู/เลือดหมูดิบทำลายเยื่อหุ้มสมองและประสาทหู รีบไป รพ.สต. เพื่อฉีดยาปฏิชีวนะทันทีก่อนหูหนวกถาวร!' },
        { id: 'dengue', name: 'โรคไข้เลือดออก', correct: false, feedback: 'ไม่ถูกต้อง! ไข้เลือดออกเกิดจากยุงลาย ไม่มีอาการเสียงวิ้งในหูหรือสูญเสียการได้ยิน' },
        { id: 'diarrhea', name: 'โรคอุจจาระร่วงเฉียบพลัน', correct: false, feedback: 'ไม่ถูกต้อง! อาการเด่นไม่ใช่ระบบทางเดินอาหาร แต่เป็นระบบประสาทการได้ยิน' }
      ],
      adviceLesson: 'จำไว้เสมอ: ลาบดิบ หลู้ดิบ ก้อยดิบ หรือตะเกียบคีบหมูกระทะร่วมกัน เสี่ยงโรคไข้หูดับจนหูหนวกตลอดชีวิต ต้องกินสุก 100% เสมอ!'
    }),

    new VillagerNPC({
      id: 'npc_den',
      name: 'น้าเด่น',
      title: 'ชาวนาประจำหมู่บ้าน',
      icon: '👨‍🌾',
      x: 14.0 * tileSize,
      y: 10.5 * tileSize,
      patrolPoints: [
        { x: 14.0 * tileSize, y: 10.5 * tileSize },
        { x: 15.5 * tileSize, y: 12.0 * tileSize },
        { x: 12.5 * tileSize, y: 11.0 * tileSize }
      ],
      isSick: true,
      diseaseId: 'leptospirosis',
      normalDialogue: 'ทำนาทำสวนช่วงนี้ต้องระวังน้ำขังดินโคลน สวมรองเท้าบูทไว้ปลอดภัยที่สุด!',
      symptomsQuote: 'น้าเพิ่งไปลุยน้ำขังเกี่ยวหญ้าในสวนมา 2 วันก่อน ตอนนี้ไข้ขึ้นสูง หนาวสั่น ตาแดงก่ำ และปวดกล้ามเนื้อน่องรุนแรงมาก! แค่เอามือแตะที่น่องก็เจ็บจนก้าวขาไม่ออก...',
      correctDiagnosis: 'leptospirosis',
      diagnosisChoices: [
        { id: 'leptospirosis', name: 'โรคฉี่หนู (Leptospirosis)', correct: true, feedback: 'ถูกต้องแม่นยำ! เชื้อเลปโตสไปราจากฉี่หนูในน้ำขังปนเปื้อนผ่านผิวหนัง อาการจำเพาะคือปวดกล้ามเนื้อน่องรุนแรงและตาแดง รีบไป รพ.สต. รับยาปฏิชีวนะด่วน!' },
        { id: 'strep_suis', name: 'โรคไข้หูดับ', correct: false, feedback: 'ไม่ถูกต้อง! ไข้หูดับเกิดจากการกินหมูดิบ ไม่ได้มีอาการปวดกล้ามเนื้อน่องรุนแรงเฉพาะจุด' },
        { id: 'influenza', name: 'โรคไข้หวัดใหญ่', correct: false, feedback: 'ไม่ถูกต้อง! ไข้หวัดใหญ่ไม่มีอาการปวดน่องรุนแรงจนก้าวขาไม่ออกและตาแดงก่ำจากการลุยน้ำ' }
      ],
      adviceLesson: 'เมื่อมีน้ำท่วมขังหรือทำสวน ต้องสวมบูทยางกันน้ำทุกครั้ง และล้างเท้าฟอกสบู่ทันทีหลังสัมผัสน้ำขัง!'
    }),

    new VillagerNPC({
      id: 'npc_sai',
      name: 'ยายสาย',
      title: 'ผู้สูงอายุในชุมชน',
      icon: '👵',
      x: 23.5 * tileSize,
      y: 8.0 * tileSize,
      patrolPoints: [
        { x: 23.5 * tileSize, y: 8.0 * tileSize },
        { x: 25.0 * tileSize, y: 9.5 * tileSize },
        { x: 22.0 * tileSize, y: 8.5 * tileSize }
      ],
      isSick: true,
      diseaseId: 'influenza',
      normalDialogue: 'อายุมากแล้ว ภูมิคุ้มกันไม่ค่อยดี ไปไหนมาไหนต้องสวมหน้ากากอนามัยไว้ก่อนจ้ะลูก',
      symptomsQuote: 'ยายไปนั่งคุยในตลาดสดมาเมื่อวาน ตอนนี้ไข้ขึ้นสูงเฉียบพลัน หนาวสั่น ปวดเมื่อยตามตัวจนลุกไม่ขึ้น ไอแห้งๆ เจ็บคอ น้ำมูกไหล อ่อนเพลียหมดแรงเลยจ้ะ...',
      correctDiagnosis: 'influenza',
      diagnosisChoices: [
        { id: 'influenza', name: 'โรคไข้หวัดใหญ่ (Influenza)', correct: true, feedback: 'ถูกต้อง! เชื้อไวรัสจากละอองฝอยในที่แออัด ยายสายเป็นกลุ่มเสี่ยง 608 ต้องนอนพักในมุ้ง ดื่มน้ำอุ่น ทานพาราเซตามอล ห้ามกินยาแก้อักเสบ/ปฏิชีวนะเด็ดขาด!' },
        { id: 'leptospirosis', name: 'โรคฉี่หนู', correct: false, feedback: 'ไม่ถูกต้อง! โรคฉี่หนูเกิดจากการลุยน้ำขัง ไม่ได้มีอาการไอ เจ็บคอ หรือน้ำมูกไหล' },
        { id: 'dengue', name: 'โรคไข้เลือดออก', correct: false, feedback: 'ไม่ถูกต้อง! ไข้เลือดออกไม่มีอาการไอ เจ็บคอ มีน้ำมูกเด่นชัดเหมือนไข้หวัดใหญ่' }
      ],
      adviceLesson: 'ผู้สูงอายุควรฉีดวัคซีนไข้หวัดใหญ่ทุกปี สวมหน้ากากในที่แออัด และจำไว้ว่ายาฆ่าเชื้อแบคทีเรียไม่สามารถฆ่าไวรัสไข้หวัดใหญ่ได้!'
    })
  ];
}

window.VillagerNPC = VillagerNPC;
window.createVillageNPCs = createVillageNPCs;
