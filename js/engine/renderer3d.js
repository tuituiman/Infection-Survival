/**
 * renderer3d.js - Three.js 3D Overview Renderer (low-poly "idle tycoon" style)
 *
 * Same public interface as the 2D GameRenderer (updateCamera / render) so game
 * logic is untouched. World logic stays in 2D pixel coords (x, y); this file maps
 * them to 3D as (x / 48, 0, y / 48) -> 1 tile = 1 unit.
 * Also exposes screenToGround() and screenDirToWorld() for InputController.
 */
import * as THREE from 'three';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

const TS = 48;
const BOX = new THREE.BoxGeometry(1, 1, 1);
const SPHERE = new THREE.SphereGeometry(1, 16, 12);
const DOME = new THREE.SphereGeometry(1, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2);
const TMP_COLOR = new THREE.Color();
const SKY_DAY = new THREE.Color('#bde9ff');
const SKY_NIGHT = new THREE.Color('#14203f');
const SKY_RAIN = new THREE.Color('#8e9aa6');

// ---------- small mesh helpers ----------
const matCache = new Map();
function mat(color, extra) {
  const key = color + (extra ? JSON.stringify(extra) : '');
  if (!matCache.has(key)) matCache.set(key, new THREE.MeshLambertMaterial({ color, ...extra }));
  return matCache.get(key);
}
function shade(m) { m.castShadow = true; m.receiveShadow = true; return m; }
function box(parent, w, h, d, color, x = 0, y = 0, z = 0, extra) {
  const m = shade(new THREE.Mesh(BOX, mat(color, extra)));
  m.scale.set(w, h, d);
  m.position.set(x, y + h / 2, z);
  parent.add(m);
  return m;
}
function cyl(parent, rt, rb, h, color, x = 0, y = 0, z = 0, extra) {
  const m = shade(new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, 18), mat(color, extra)));
  m.position.set(x, y + h / 2, z);
  parent.add(m);
  return m;
}
function ball(parent, r, color, x = 0, y = 0, z = 0, extra) {
  const m = shade(new THREE.Mesh(SPHERE, mat(color, extra)));
  m.scale.setScalar(r);
  m.position.set(x, y, z);
  parent.add(m);
  return m;
}
function label(html, cls = '') {
  const el = document.createElement('div');
  el.className = 'lbl3d ' + cls;
  el.innerHTML = html;
  return new CSS2DObject(el);
}
function lerpAngle(a, b, t) {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}

// "Bean" villager like the reference art
function makeCharacter(shirt, hair) {
  const g = new THREE.Group();
  const body = shade(new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.22, 4, 12), mat(shirt)));
  body.position.y = 0.5;
  g.add(body);
  ball(g, 0.19, '#ffd9a8', 0, 0.9, 0);
  const hairM = shade(new THREE.Mesh(DOME, mat(hair)));
  hairM.scale.setScalar(0.2);
  hairM.position.y = 0.93;
  hairM.rotation.x = -0.3;
  g.add(hairM);
  ball(g, 0.03, '#1e293b', -0.07, 0.92, 0.17);
  ball(g, 0.03, '#1e293b', 0.07, 0.92, 0.17);
  const mask = box(g, 0.24, 0.09, 0.08, '#f8fafc', 0, 0.78, 0.13);
  mask.visible = false;
  const legs = [-0.08, 0.08].map((x) => {
    const pivot = new THREE.Group();
    pivot.position.set(x, 0.3, 0);
    g.add(pivot);
    const leg = box(pivot, 0.1, 0.3, 0.1, '#334155', 0, -0.3, 0);
    return { pivot, leg };
  });
  return { group: g, legs, mask, angle: 0, targetAngle: 0, px: null, pz: null };
}

class GameRenderer3D {
  constructor(canvas) {
    this.canvas = canvas;
    this.camera = { x: 0, y: 0 }; // 2D-compat camera (px)
    this.time = 0;
    this.built = false;

    this.gl = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.gl.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.gl.shadowMap.enabled = true;
    this.gl.shadowMap.type = THREE.PCFSoftShadowMap;

    this.scene = new THREE.Scene();
    this.scene.background = SKY_DAY.clone();
    this.scene.fog = new THREE.Fog(SKY_DAY.clone(), 30, 75);

    // Fixed tilted overview camera
    this.cam = new THREE.PerspectiveCamera(32, 1, 0.5, 200);
    this.yaw = THREE.MathUtils.degToRad(30);
    this.pitch = THREE.MathUtils.degToRad(52);
    this.target = new THREE.Vector3();
    this.snapped = false;

    // Lights
    this.hemi = new THREE.HemisphereLight('#ffffff', '#7cc35a', 1.6);
    this.sun = new THREE.DirectionalLight('#ffffff', 2.4);
    this.sun.castShadow = true;
    const shadowRes = window.matchMedia('(pointer: coarse)').matches ? 1024 : 2048;
    this.sun.shadow.mapSize.set(shadowRes, shadowRes);
    const sc = this.sun.shadow.camera;
    sc.left = sc.bottom = -16;
    sc.right = sc.top = 16;
    sc.near = 1;
    sc.far = 60;
    this.sun.shadow.bias = -0.0005;
    this.sun.shadow.normalBias = 0.02;
    this.scene.add(this.hemi, this.sun, this.sun.target);

    // HTML labels layer (Thai font stays crisp)
    this.labels = new CSS2DRenderer();
    Object.assign(this.labels.domElement.style, {
      position: 'absolute', top: '0', left: '0', pointerEvents: 'none', zIndex: '4'
    });
    (canvas.parentElement || document.body).appendChild(this.labels.domElement);

    this.raycaster = new THREE.Raycaster();
    this.groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    this.ndc = new THREE.Vector2();
    this.hit = new THREE.Vector3();

    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.gl.setSize(this.width, this.height);
    this.labels.setSize(this.width, this.height);
    this.cam.aspect = this.width / this.height;
    this.cam.updateProjectionMatrix();
    this.dist = this.width < this.height ? 30 : 22; // portrait phones zoom out
  }

  // ---------- Input helpers ----------
  screenToGround(sx, sy) {
    this.ndc.set((sx / this.width) * 2 - 1, -(sy / this.height) * 2 + 1);
    this.raycaster.setFromCamera(this.ndc, this.cam);
    if (!this.raycaster.ray.intersectPlane(this.groundPlane, this.hit)) return null;
    return { x: this.hit.x * TS, y: this.hit.z * TS };
  }

  // Screen-space direction (right = +x, down = +y) -> world 2D direction
  screenDirToWorld(dx, dy) {
    const c = Math.cos(this.yaw), s = Math.sin(this.yaw);
    return { x: c * dx + s * dy, y: -s * dx + c * dy };
  }

  // ---------- Scene construction ----------
  build(world) {
    this.built = true;
    const { cols, rows, tiles } = world;
    const d = new THREE.Object3D();
    const TOP = { 0: 0, 1: 0.02, 2: 0.01, 3: 0.04, 4: 0.04, 5: -0.14, 6: 0 };
    const COL = {
      0: ['#a3e46b', '#9adc62'], 1: ['#f2c58a', '#ecbd80'], 2: ['#9aa3ad', '#939ca6'],
      3: ['#f9d29d', '#f3c890'], 4: ['#f9d29d', '#f3c890'], 5: ['#4fb8e8', '#49b0e0'],
      6: ['#7fcf55', '#77c64d']
    };
    const isFloor = (x, y) => tiles[y] && tiles[y][x] === 3;

    // Ground: one instanced mesh for every tile
    const ground = new THREE.InstancedMesh(BOX, new THREE.MeshLambertMaterial(), cols * rows);
    ground.receiveShadow = true;
    const walls = [];
    const blades = [];
    let i = 0;
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const t = tiles[y][x];
        d.position.set(x + 0.5, TOP[t] - 0.15, y + 0.5);
        d.scale.set(1, 0.3, 1);
        d.updateMatrix();
        ground.setMatrixAt(i, d.matrix);
        ground.setColorAt(i, TMP_COLOR.set(COL[t][(x + y) & 1]));
        i++;
        if (t === 4) {
          // Back (north/west) walls tall, front walls low so interiors stay visible
          const backSide = isFloor(x, y + 1) || isFloor(x + 1, y) || isFloor(x + 1, y + 1);
          const frontSide = isFloor(x, y - 1) || isFloor(x - 1, y);
          walls.push([x, y, backSide && !frontSide ? 1.4 : 0.35]);
        }
        if (t === 6) {
          for (let k = 0; k < 3; k++) blades.push([x + 0.2 + 0.3 * k, y + 0.25 + ((x * 7 + k * 3 + y) % 5) * 0.12]);
        }
      }
    }
    this.scene.add(ground);

    // Walls + blue top trim
    const wallMesh = shade(new THREE.InstancedMesh(BOX, mat('#f1f5f9'), walls.length));
    const trim = shade(new THREE.InstancedMesh(BOX, mat('#38bdf8'), walls.length));
    walls.forEach(([x, y, h], k) => {
      d.position.set(x + 0.5, 0.04 + h / 2, y + 0.5);
      d.scale.set(1, h, 1);
      d.updateMatrix();
      wallMesh.setMatrixAt(k, d.matrix);
      d.position.y = 0.04 + h + 0.04;
      d.scale.set(1.02, 0.08, 1.02);
      d.updateMatrix();
      trim.setMatrixAt(k, d.matrix);
    });
    this.scene.add(wallMesh, trim);

    // Tall grass blades
    if (blades.length) {
      const bladeMesh = shade(new THREE.InstancedMesh(new THREE.ConeGeometry(0.08, 0.55, 4), mat('#4caf3a', { flatShading: true }), blades.length));
      d.scale.set(1, 1, 1);
      blades.forEach(([bx, bz], k) => {
        d.position.set(bx, 0.27, bz);
        d.rotation.y = k;
        d.updateMatrix();
        bladeMesh.setMatrixAt(k, d.matrix);
      });
      d.rotation.y = 0;
      this.scene.add(bladeMesh);
    }

    // Outer lawn
    const lawn = new THREE.Mesh(new THREE.PlaneGeometry(300, 300), mat('#93d65e'));
    lawn.rotation.x = -Math.PI / 2;
    lawn.position.set(cols / 2, -0.02, rows / 2);
    lawn.receiveShadow = true;
    this.scene.add(lawn);

    this.buildTrees(world);

    // Interactive entities, NPCs, player
    this.ents = world.interactiveEntities.map((ent) => this.buildEntity(ent));

    this.npcViews = (world.npcs || []).map((npc) => {
      const shirt = npc.id === 'npc_somchai' ? '#ef4444' : npc.id === 'npc_sai' ? '#a855f7' : '#10b981';
      const hair = (npc.id === 'npc_somchai' || npc.id === 'npc_sai') ? '#e2e8f0' : '#1e293b';
      const c = makeCharacter(shirt, hair);
      const lb = label(`<span class="bub"></span><span class="nm">${npc.name}</span>`, 'npc');
      lb.position.y = 1.45;
      lb.element.style.pointerEvents = 'auto';
      lb.element.style.cursor = 'pointer';
      lb.element.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        if (window.inputController && window.game && window.game.world) {
          const npcTarget = window.game.world.getNearbyEntity(npc.x, npc.y, 40) || {
            id: npc.id, name: npc.name, icon: npc.icon, isNpc: true, npcRef: npc,
            dialogue: npc.isSick ? `${npc.name}: "${npc.symptomsQuote}"` : `${npc.name}: "${npc.normalDialogue}"`,
            options: []
          };
          window.inputController.targetEntity(npcTarget);
        }
      });
      c.group.add(lb);
      c.bub = lb.element.querySelector('.bub');
      c.bubText = null;
      this.scene.add(c.group);
      return { npc, c };
    });

    this.playerView = makeCharacter('#38bdf8', '#1e293b');
    this.playerView.boots = null;
    this.aura = new THREE.Mesh(
      new THREE.TorusGeometry(0.55, 0.03, 8, 40),
      new THREE.MeshBasicMaterial({ color: '#38bdf8', transparent: true, opacity: 0.6 })
    );
    this.aura.rotation.x = -Math.PI / 2;
    this.aura.position.y = 0.1;
    this.playerView.group.add(this.aura);
    this.scene.add(this.playerView.group);

    // Interaction ring
    this.ring = new THREE.Mesh(
      new THREE.RingGeometry(0.85, 1, 48),
      new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.9, depthWrite: false })
    );
    this.ring.rotation.x = -Math.PI / 2;
    this.ring.position.y = 0.07;
    this.scene.add(this.ring);

    // Puddles (synced every frame)
    this.puddles = [];
    this.puddleGeo = new THREE.CircleGeometry(1, 28);
    this.puddleMat = new THREE.MeshLambertMaterial({ color: '#5aa9e6', transparent: true, opacity: 0.6, depthWrite: false });

    // Mosquito swarm
    this.mosq = new THREE.Points(
      new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(new Float32Array(40 * 3), 3)),
      new THREE.PointsMaterial({ color: '#111111', size: 0.07 })
    );
    this.mosq.frustumCulled = false;
    this.scene.add(this.mosq);

    // Rain streaks
    const RAIN = 700;
    this.rainData = [];
    for (let k = 0; k < RAIN; k++) {
      this.rainData.push({ x: (Math.random() - 0.5) * 28, y: Math.random() * 12, z: (Math.random() - 0.5) * 28, v: 10 + Math.random() * 6 });
    }
    this.rain = new THREE.LineSegments(
      new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(new Float32Array(RAIN * 6), 3)),
      new THREE.LineBasicMaterial({ color: '#d6ecff', transparent: true, opacity: 0.55 })
    );
    this.rain.frustumCulled = false;
    this.scene.add(this.rain);
  }

  buildTrees(world) {
    const spots = [];
    const { cols, rows, tiles } = world;
    const ok = (x, y) => {
      const tx = Math.floor(x), ty = Math.floor(y);
      return !(tiles[ty] && tiles[ty][tx] === 2);
    };
    for (let x = 0.5; x < cols; x += 2) {
      for (const y of [0.5, -1.3, rows - 0.5, rows + 1.3]) if (ok(x, Math.min(Math.max(y, 0), rows - 1))) spots.push([x + ((x * 13) % 3) * 0.2, y]);
    }
    for (let y = 2.5; y < rows - 2; y += 2) {
      for (const x of [0.5, -1.3, cols - 0.5, cols + 1.3]) if (ok(Math.min(Math.max(x, 0), cols - 1), y)) spots.push([x, y + ((y * 7) % 3) * 0.2]);
    }
    const trunks = shade(new THREE.InstancedMesh(new THREE.CylinderGeometry(0.1, 0.14, 0.6, 6), mat('#9a6a3e'), spots.length));
    const leaves = shade(new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.55, 0), mat('#5fbf3f', { flatShading: true }), spots.length));
    const d = new THREE.Object3D();
    spots.forEach(([x, z], k) => {
      const s = 0.8 + ((k * 37) % 10) / 20;
      d.position.set(x, 0.3 * s, z);
      d.scale.setScalar(s);
      d.rotation.y = k;
      d.updateMatrix();
      trunks.setMatrixAt(k, d.matrix);
      d.position.y = 0.95 * s;
      d.updateMatrix();
      leaves.setMatrixAt(k, d.matrix);
    });
    this.scene.add(trunks, leaves);
  }

  buildEntity(ent) {
    const g = new THREE.Group();
    const w = ent.w / TS, dd = ent.h / TS;
    g.position.set((ent.x + ent.w / 2) / TS, 0.04, (ent.y + ent.h / 2) / TS);
    const dyn = {};
    let top = 1;

    switch (ent.id) {
      case 'home_bed':
        box(g, w, 0.25, dd, '#c0703a');
        box(g, w - 0.1, 0.12, dd - 0.1, '#f8fafc', 0, 0.25);
        box(g, w - 0.06, 0.07, dd * 0.55, '#60a5fa', 0, 0.36, dd * 0.18);
        box(g, w * 0.6, 0.1, 0.25, '#ffffff', 0, 0.37, -dd / 2 + 0.25);
        box(g, w, 0.65, 0.08, '#a0522d', 0, 0, -dd / 2);
        top = 0.8;
        break;
      case 'home_stove':
        box(g, w, 0.6, dd, '#475569');
        box(g, w * 0.9, 0.04, dd * 0.9, '#1e293b', 0, 0.6);
        dyn.fire = ball(g, 0.14, '#ff7a1a', 0, 0.72, 0, { emissive: '#ff5500' });
        top = 0.95;
        break;
      case 'wash_basin':
        cyl(g, 0.08, 0.12, 0.6, '#94a3b8');
        cyl(g, 0.3, 0.2, 0.15, '#e2e8f0', 0, 0.6);
        cyl(g, 0.25, 0.25, 0.02, '#38bdf8', 0, 0.73);
        box(g, 0.12, 0.05, 0.08, '#f472b6', 0.18, 0.75, 0.1);
        top = 0.9;
        break;
      case 'food_cupboard':
        box(g, w, 1.1, dd * 0.7, '#a16207');
        box(g, w * 0.8, 0.85, 0.02, '#e7c983', 0, 0.12, dd * 0.35);
        box(g, w * 0.8, 0.04, 0.03, '#a16207', 0, 0.55, dd * 0.36);
        top = 1.25;
        break;
      case 'water_jar':
        cyl(g, 0.3, 0.24, 0.7, '#9a4a1f');
        cyl(g, 0.26, 0.31, 0.06, '#7c3a17', 0, 0.68);
        dyn.water = cyl(g, 0.25, 0.25, 0.02, '#38bdf8', 0, 0.66);
        dyn.lid = cyl(g, 0.34, 0.34, 0.06, '#64748b', 0, 0.74);
        top = 0.95;
        break;
      case 'coconut_shells':
        dyn.shells = [];
        dyn.waters = [];
        [[-0.25, -0.1], [0.15, -0.2], [0.05, 0.22], [-0.2, 0.25]].forEach(([x, z]) => {
          const s = shade(new THREE.Mesh(DOME, mat('#6b3a12')));
          s.scale.setScalar(0.15);
          s.position.set(x, 0, z);
          g.add(s);
          dyn.shells.push(s);
          dyn.waters.push(cyl(g, 0.12, 0.12, 0.01, '#38bdf8', x, 0.13, z));
        });
        cyl(g, 0.06, 0.06, 0.3, '#86efac', 0.3, 0, 0.2, { transparent: true, opacity: 0.7 });
        top = 0.6;
        break;
      case 'water_pump':
        cyl(g, 0.45, 0.5, 0.35, '#94a3b8');
        cyl(g, 0.37, 0.37, 0.02, '#2b8fd6', 0, 0.33);
        box(g, 0.1, 0.9, 0.1, '#475569', 0.32, 0.35);
        box(g, 0.3, 0.08, 0.08, '#475569', 0.2, 1.15);
        top = 1.4;
        break;
      case 'meat_stall':
      case 'street_food':
      case 'grocery_stall': {
        const stripe = { meat_stall: '#ef4444', street_food: '#22c55e', grocery_stall: '#3b82f6' }[ent.id];
        box(g, w, 0.55, dd * 0.6, '#b7793f', 0, 0, dd * 0.15);
        for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) box(g, 0.06, 1.25, 0.06, '#8b5a2b', x * (w / 2 - 0.05), 0, z * (dd / 2 - 0.05));
        for (let k = 0; k < 4; k++) box(g, w / 4, 0.06, dd + 0.1, k % 2 ? '#ffffff' : stripe, -w / 2 + w / 8 + (k * w) / 4, 1.25);
        const goods = { meat_stall: '#fb7185', street_food: '#f97316', grocery_stall: '#facc15' }[ent.id];
        for (let k = 0; k < 3; k++) box(g, 0.22, 0.12, 0.2, goods, -w / 3 + (k * w) / 3, 0.55, dd * 0.15);
        top = 1.45;
        break;
      }
      case 'clinic_counter':
        box(g, w, 0.7, dd, '#f1f5f9');
        box(g, 0.08, 0.3, 0.02, '#ef4444', 0, 0.2, dd / 2 + 0.01);
        box(g, 0.3, 0.08, 0.02, '#ef4444', 0, 0.31, dd / 2 + 0.01);
        box(g, 0.32, 0.24, 0.04, '#1e293b', 0.3, 0.7, -0.1);
        top = 1.1;
        break;
      default:
        box(g, w, 0.6, dd, '#94a3b8');
    }

    const lb = label(`<span class="ic">${ent.icon}</span><span class="st"></span><span class="nm">${ent.name}</span>`);
    lb.position.set(0, top + 0.3, 0);
    lb.element.style.pointerEvents = 'auto';
    lb.element.style.cursor = 'pointer';
    lb.element.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      if (window.inputController) {
        window.inputController.targetEntity(ent);
      }
    });
    g.add(lb);
    this.scene.add(g);
    return { ent, g, dyn, el: lb.element, st: lb.element.querySelector('.st'), stKey: null };
  }

  // ---------- Per-frame updates ----------
  updateCharacter(c, x, y, moving, anim, dt) {
    const X = x / TS, Z = y / TS;
    if (c.px !== null) {
      const dx = X - c.px, dz = Z - c.pz;
      if (dx * dx + dz * dz > 1e-7) c.targetAngle = Math.atan2(dx, dz);
    }
    c.px = X;
    c.pz = Z;
    c.angle = lerpAngle(c.angle, c.targetAngle, Math.min(1, dt * 12));
    c.group.position.set(X, moving ? Math.abs(Math.sin(anim)) * 0.06 : 0, Z);
    c.group.rotation.y = c.angle;
    const swing = moving ? Math.sin(anim) * 0.7 : 0;
    c.legs[0].pivot.rotation.x = swing;
    c.legs[1].pivot.rotation.x = -swing;
  }

  updateEntity(o, nearby) {
    const { ent, dyn } = o;
    let st = '', bad = false;
    if (ent.id === 'water_jar') {
      dyn.lid.visible = !!ent.hasCover;
      dyn.water.material = mat(ent.hasAbate ? '#34d399' : '#38bdf8');
      if (ent.hasCover) st = 'ปิดฝาแล้ว';
      else if (ent.hasAbate) st = 'ใส่ทรายแล้ว';
      else { st = '⚠️ ลูกน้ำยุง'; bad = true; }
    } else if (ent.id === 'coconut_shells') {
      dyn.shells.forEach((s) => {
        s.rotation.x = ent.cleared ? 0 : Math.PI;
        s.position.y = ent.cleared ? 0 : 0.15;
      });
      dyn.waters.forEach((wt) => { wt.visible = !ent.cleared; });
      if (ent.cleared) st = 'คว่ำสะอาดแล้ว';
      else { st = '⚠️ น้ำขัง'; bad = true; }
    } else if (ent.id === 'home_stove') {
      dyn.fire.scale.setScalar(0.13 + Math.sin(this.time * 12) * 0.02);
    }
    const key = st + bad;
    if (key !== o.stKey) {
      o.stKey = key;
      o.st.textContent = st;
      o.st.className = 'st' + (bad ? ' bad' : '');
    }
    o.el.classList.toggle('near', ent === nearby);
  }

  syncPuddles(world) {
    const list = world.puddles || [];
    while (this.puddles.length < list.length) {
      const grp = new THREE.Group();
      const m = new THREE.Mesh(this.puddleGeo, this.puddleMat);
      m.rotation.x = -Math.PI / 2;
      m.position.y = 0.03;
      m.receiveShadow = true;
      const lb = label('⚠️ น้ำขัง', 'warn');
      lb.position.y = 0.25;
      grp.add(m, lb);
      this.scene.add(grp);
      this.puddles.push({ grp, m, lb });
    }
    this.puddles.forEach((o, k) => {
      const p = list[k];
      const on = !!(p && p.active);
      o.grp.visible = on;
      o.lb.visible = on;
      if (!on) return;
      const r = p.radius / TS;
      o.grp.position.set(p.x / TS, 0, p.y / TS);
      o.m.scale.set(r, r * 0.8, 1);
    });
  }

  updateLighting(weather) {
    const h = (((weather.hour || 12) % 24) + 24) % 24;
    const clamp = THREE.MathUtils.clamp;
    const day = clamp((h - 5) / 2, 0, 1) * clamp((20 - h) / 2, 0, 1);
    const golden = day > 0 && day < 1 ? 1 - day : 0;
    const rain = weather.weatherType === 'rain';
    const dim = rain ? 0.55 : 1;

    this.sun.intensity = (0.25 + 2.3 * day) * dim;
    this.sun.color.set('#ffffff').lerp(TMP_COLOR.set('#ffa25a'), golden * 0.8);
    if (weather.weatherType === 'hot') this.sun.color.lerp(TMP_COLOR.set('#ffe08a'), 0.35);
    this.hemi.intensity = (0.45 + 1.25 * day) * dim;
    this.hemi.color.set('#8fa3ff').lerp(TMP_COLOR.set('#ffffff'), day);

    const sky = this.scene.background;
    sky.copy(SKY_NIGHT).lerp(SKY_DAY, day);
    if (rain) sky.lerp(SKY_RAIN, 0.6);
    this.scene.fog.color.copy(sky);

    // Sun sweeps east -> west during the day
    const a = clamp((h - 6) / 12, 0, 1) * Math.PI;
    this.sun.position.set(this.target.x + Math.cos(a) * 14, Math.max(Math.sin(a), 0.35) * 20, this.target.z + 8);
    this.sun.target.position.copy(this.target);
  }

  updateCamera(targetX, targetY) {
    const tx = targetX / TS, tz = targetY / TS;
    if (!this.snapped) {
      this.target.set(tx, 0, tz);
      this.snapped = true;
    } else {
      this.target.x += (tx - this.target.x) * 0.12;
      this.target.z += (tz - this.target.z) * 0.12;
    }
    const flat = Math.cos(this.pitch) * this.dist;
    this.cam.position.set(
      this.target.x + Math.sin(this.yaw) * flat,
      Math.sin(this.pitch) * this.dist,
      this.target.z + Math.cos(this.yaw) * flat
    );
    this.cam.lookAt(this.target);
    this.camera.x = this.target.x * TS - this.width / 2;
    this.camera.y = this.target.z * TS - this.height / 2;
  }

  render(world, player, weather, disease, nearby, dt) {
    if (!this.built) this.build(world);
    this.time += dt;
    this.updateLighting(weather);

    // Player
    const P = this.playerView;
    this.updateCharacter(P, player.x, player.y, player.isMoving, player.animTime, dt);
    if (P.boots !== player.hasBoots) {
      P.boots = player.hasBoots;
      P.legs.forEach((l) => { l.leg.material = mat(player.hasBoots ? '#f59e0b' : '#334155'); });
    }
    P.mask.visible = !!player.hasMask;
    this.aura.visible = player.repellentHoursLeft > 0;
    if (this.aura.visible) this.aura.scale.setScalar(1 + Math.sin(this.time * 3) * 0.06);

    // NPCs
    for (const { npc, c } of this.npcViews) {
      this.updateCharacter(c, npc.x, npc.y, npc.isMoving, npc.animTime || 0, dt);
      let txt = '', cls = 'bub';
      if (npc.isSick && !npc.investigated) txt = npc.getStatusBubble() || '🤒';
      else if (npc.investigated) { txt = '✅'; cls = 'bub ok'; }
      if (txt + cls !== c.bubText) {
        c.bubText = txt + cls;
        c.bub.textContent = txt;
        c.bub.className = cls;
      }
    }

    // Entities, puddles
    for (const o of this.ents) this.updateEntity(o, nearby);
    this.syncPuddles(world);

    // Interaction ring
    if (nearby) {
      let cx, cz, r;
      if (nearby.npcRef) { cx = nearby.npcRef.x / TS; cz = nearby.npcRef.y / TS; r = 0.6; }
      else { cx = (nearby.x + nearby.w / 2) / TS; cz = (nearby.y + nearby.h / 2) / TS; r = Math.max(nearby.w, nearby.h) / TS * 0.75; }
      this.ring.visible = true;
      this.ring.position.x = cx;
      this.ring.position.z = cz;
      this.ring.scale.setScalar(r * (1 + Math.sin(this.time * 5) * 0.06));
    } else {
      this.ring.visible = false;
    }

    // Mosquitoes
    const buzz = world.isMosquitoZone(player.x, player.y);
    this.mosq.visible = buzz;
    if (buzz) {
      const pos = this.mosq.geometry.attributes.position;
      for (let k = 0; k < pos.count; k++) {
        const ang = Math.random() * Math.PI * 2, rr = 0.4 + Math.random() * 0.9;
        pos.setXYZ(k, P.px + Math.cos(ang) * rr, 0.4 + Math.random() * 0.9, P.pz + Math.sin(ang) * rr);
      }
      pos.needsUpdate = true;
    }

    // Rain
    const raining = weather.weatherType === 'rain';
    this.rain.visible = raining;
    if (raining) {
      const pos = this.rain.geometry.attributes.position;
      this.rainData.forEach((r, k) => {
        r.y -= r.v * dt;
        if (r.y < 0) r.y += 12;
        const x = this.target.x + r.x, z = this.target.z + r.z;
        pos.setXYZ(k * 2, x, r.y, z);
        pos.setXYZ(k * 2 + 1, x - 0.05, r.y - 0.4, z);
      });
      pos.needsUpdate = true;
    }

    this.gl.render(this.scene, this.cam);
    this.labels.render(this.scene, this.cam);
  }
}

window.GameRenderer3D = GameRenderer3D;
