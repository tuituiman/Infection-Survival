/**
 * quests.js - Daily Village Public Health Quests (อสม. จิตอาสา)
 */

class QuestSystem {
  constructor() {
    this.activeQuests = [];
    this.completedQuestsCount = 0;
    this.healthTokens = 0;
    this.generateDailyQuests(1);
  }

  // Generate 2 random daily public health missions
  generateDailyQuests(day) {
    const questPool = [
      {
        id: 'flip_shells',
        type: 'flip_shells',
        title: 'ตัดวงจรลูกน้ำยุงลาย',
        description: 'คว่ำกะลามะพร้าวและทำลายขยะน้ำขังรอบบ้าน 1 จุด',
        icon: '🧹',
        target: 1,
        progress: 0,
        rewardTokens: 1,
        completed: false
      },
      {
        id: 'apply_abate',
        type: 'apply_abate',
        title: 'ใส่ทรายอะเบทในโอ่งน้ำ',
        description: 'เบิกทรายอะเบทจาก รพ.สต. แล้วนำไปใส่โอ่งน้ำข้างบ้าน',
        icon: '🧪',
        target: 1,
        progress: 0,
        rewardTokens: 1,
        completed: false
      },
      {
        id: 'boil_water',
        type: 'boil_water',
        title: 'น้ำต้มสุกสะอาด 100%',
        description: 'ตักน้ำดิบจากบ่อแล้วนำไปต้มที่เตาให้เดือดสนิท',
        icon: '🍵',
        target: 1,
        progress: 0,
        rewardTokens: 1,
        completed: false
      },
      {
        id: 'cook_pork',
        type: 'cook_pork',
        title: 'กินสุก ป้องกันไข้หูดับ',
        description: 'ย่างเนื้อหมูสดจนสุก 100% ด้วยความร้อนสูงที่เตาไฟ',
        icon: '🍖',
        target: 1,
        progress: 0,
        rewardTokens: 1,
        completed: false
      },
      {
        id: 'wash_hands',
        type: 'wash_hands',
        title: 'ล้างมือด้วยสบู่ให้ถูกสุขอนามัย',
        description: 'ล้างมือที่อ่างล้างมือพร้อมสบู่ให้สะอาด 2 ครั้ง',
        icon: '🧼',
        target: 2,
        progress: 0,
        rewardTokens: 1,
        completed: false
      },
      {
        id: 'investigate_illness',
        type: 'investigate_illness',
        title: 'สอบสวนโรคชาวบ้านที่ป่วย',
        description: 'เข้าไปพูดคุยซักประวัติอาการและวินิจฉัยโรคให้ชาวบ้าน 1 คน',
        icon: '🔍',
        target: 1,
        progress: 0,
        rewardTokens: 2,
        completed: false
      },
      {
        id: 'get_mask',
        type: 'get_mask',
        title: 'เตรียมหน้ากากอนามัย',
        description: 'รับหน้ากากอนามัยจาก รพ.สต. หรือร้านของชำเพื่อความปลอดภัย',
        icon: '😷',
        target: 1,
        progress: 0,
        rewardTokens: 1,
        completed: false
      }
    ];

    // Pick 2 distinct quests based on day or randomized
    const shuffled = [...questPool].sort(() => Math.random() - 0.5);
    this.activeQuests = shuffled.slice(0, 2);
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

window.QuestSystem = QuestSystem;
