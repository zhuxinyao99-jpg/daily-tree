// Daily Tree V2 — Organic leaf-cluster tree
// THREE must be available globally before this module loads.

// Growth milestones: streak days map to visual stages
const GROWTH_STAGES = {
  0: 'seed',       // Day 0: Seed (no entries)
  1: 'sprout',     // Days 1-6: Tiny sprout
  7: 'sapling',    // Days 7-14: Small sapling
  15: 'young',     // Days 15-29: Young tree
  30: 'mature',    // Days 30-179: Mature tree
  180: 'elder',    // Days 180-364: Elder tree
  365: 'ancient',  // Day 365+: Ancient tree
};

function getGrowthStage(streakDays) {
  if (streakDays === 0) return GROWTH_STAGES[0];
  if (streakDays < 7) return GROWTH_STAGES[1];
  if (streakDays < 15) return GROWTH_STAGES[7];
  if (streakDays < 30) return GROWTH_STAGES[15];
  if (streakDays < 180) return GROWTH_STAGES[30];
  if (streakDays < 365) return GROWTH_STAGES[180];
  return GROWTH_STAGES[365];
}

// Seeded pseudo-random (LCG) — deterministic per year+index
function seededRng(seed) {
  let s = Math.abs(seed) || 1;
  return function () {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function getSeason() {
  const m = new Date().getMonth(); // 0-11
  if (m >= 2 && m <= 4) return 'spring';
  if (m >= 5 && m <= 7) return 'summer';
  if (m >= 8 && m <= 10) return 'autumn';
  return 'winter';
}

export class Tree {
  constructor(year, streakDays, options) {
    this.year       = year;
    this.streakDays = streakDays || 0;
    this.THREE      = options.THREE || window.THREE;
    this.isCurrentYear = (year === new Date().getFullYear());
    this.stage      = getGrowthStage(this.streakDays);

    console.log('[DEBUG] Tree constructed:', { year, streakDays: this.streakDays, stage: this.stage });

    this.group  = new this.THREE.Group();
    this.blobs  = [];     // leaf blob meshes
    this.glowMesh = null; // soft glow sphere

    this._build();
  }

  // ── State ────────────────────────────────────────────────────────────────

  getState() {
    // With streak-based system: empty if no streak, living if active streak exists
    return this.streakDays === 0 ? 'empty' : 'living';
  }

  // ── Colors ───────────────────────────────────────────────────────────────

  _leafColor(state) {
    const season = this.isCurrentYear ? getSeason() : 'summer';
    if (state === 'archived') return new this.THREE.Color(0x3D3020);
    if (state === 'dormant')  return new this.THREE.Color(0x2E3D30);
    // living — varies by season
    if (season === 'spring')  return new this.THREE.Color(0x7DB88A);
    if (season === 'summer')  return new this.THREE.Color(0x4A7C59);
    if (season === 'autumn')  return new this.THREE.Color(0xB8863C);
    if (season === 'winter')  return new this.THREE.Color(0x2A3530);
    return new this.THREE.Color(0x4A7C59);
  }

  _trunkColor(state) {
    if (state === 'living')   return new this.THREE.Color(0x8B7355);
    if (state === 'dormant')  return new this.THREE.Color(0x6B6050);
    if (state === 'archived') return new this.THREE.Color(0x4A3A2A);
    return new this.THREE.Color(0x3A2A1A);
  }

  // ── Build ────────────────────────────────────────────────────────────────

  _build() {
    const state = this.getState();
    this._buildTrunk(state);
    this._buildRoots(state);
    if (this.streakDays > 0 && state !== 'empty') {
      this._buildCanopy(state);
    }
    if (state === 'living') {
      this._buildGlow();
    }
  }

  _buildTrunk(state) {
    const h = this._trunkHeight();
    const geo = new this.THREE.CylinderGeometry(1.2, 2.2, h, 10, 1);
    const mat = new this.THREE.MeshStandardMaterial({
      color: this._trunkColor(state),
      roughness: 0.95,
      metalness: 0.0,
    });
    const trunk = new this.THREE.Mesh(geo, mat);
    trunk.position.y = h / 2;
    trunk.castShadow = true;
    this.group.add(trunk);
    this.trunk = trunk;
    this.group.userData.trunkHeight = h;
  }

  _buildRoots(state) {
    // Roots appear at sapling stage (7+ days)
    if (this.streakDays < 7) return;
    const rng = seededRng(this.year * 7 + 1);
    const rootMat = new this.THREE.MeshStandardMaterial({
      color: this._trunkColor(state),
      roughness: 0.98,
    });
    const numRoots = 3 + Math.floor(rng() * 2); // 3–4 roots
    for (let i = 0; i < numRoots; i++) {
      const angle = (i / numRoots) * Math.PI * 2 + rng() * 0.4;
      const len   = 5 + rng() * 4;
      const pts   = [
        new this.THREE.Vector3(0, 1, 0),
        new this.THREE.Vector3(Math.cos(angle) * len * 0.5, 0.4, Math.sin(angle) * len * 0.5),
        new this.THREE.Vector3(Math.cos(angle) * len, 0, Math.sin(angle) * len),
      ];
      const curve  = new this.THREE.CatmullRomCurve3(pts);
      const geo    = new this.THREE.TubeGeometry(curve, 8, 0.5, 5, false);
      const mesh   = new this.THREE.Mesh(geo, rootMat);
      this.group.add(mesh);
    }
  }

  _buildCanopy(state) {
    const h         = this._trunkHeight();
    const count     = this._blobCount();
    const rng       = seededRng(this.year * 13 + this.streakDays);
    const leafColor = this._leafColor(state);
    const opacity   = 0.75; // Living trees are always vibrant

    const crownY = h * 0.75;
    const crownW = 8 + Math.min(this.streakDays, 60) * 0.35;
    const crownH = 12 + Math.min(this.streakDays, 60) * 0.28;

    for (let i = 0; i < count; i++) {
      // Box-Muller for Gaussian distribution
      const u  = rng(), v = rng();
      const nx = Math.sqrt(-2 * Math.log(u + 0.001)) * Math.cos(2 * Math.PI * v);
      const ny = Math.sqrt(-2 * Math.log(rng() + 0.001)) * Math.cos(2 * Math.PI * rng());
      const nz = (rng() - 0.5) * 0.6;

      const bx = nx * crownW * 0.4;
      const by = crownY + Math.abs(ny) * crownH * 0.5 + ny * crownH * 0.2;
      const bz = nz * crownW * 0.25;

      const distFromCenter = Math.sqrt(nx * nx + ny * ny);
      const size = (4 + rng() * 5) * (1 - distFromCenter * 0.15);

      const geo = new this.THREE.SphereGeometry(Math.max(size, 2), 7, 6);
      geo.scale(1 + rng() * 0.4, 0.7 + rng() * 0.5, 0.8 + rng() * 0.3);

      const mat = new this.THREE.MeshStandardMaterial({
        color: leafColor,
        transparent: true,
        opacity: opacity * (0.6 + rng() * 0.4),
        roughness: 0.85,
        metalness: 0.0,
      });
      const blob = new this.THREE.Mesh(geo, mat);
      blob.position.set(bx, by, bz);
      blob.userData.baseOpacity = mat.opacity;
      blob.castShadow = true;
      this.group.add(blob);
      this.blobs.push(blob);
    }
  }

  _buildGlow() {
    const h      = this._trunkHeight();
    const crownY = h * 0.75;
    const geo = new this.THREE.SphereGeometry(this._crownRadius() * 0.6, 8, 8);
    const mat = new this.THREE.MeshBasicMaterial({
      color: 0x4A7C59,
      transparent: true,
      opacity: 0.06,
    });
    this.glowMesh = new this.THREE.Mesh(geo, mat);
    this.glowMesh.position.y = crownY;
    this.group.add(this.glowMesh);
  }

  // ── Geometry helpers ─────────────────────────────────────────────────────

  _trunkHeight() {
    return Math.min(18 + this.streakDays * 0.6, 60);
  }

  _blobCount() {
    if (this.streakDays === 0) return 0;
    return Math.min(4 + Math.floor(this.streakDays * 0.9), 60);
  }

  _crownRadius() {
    return 8 + Math.min(this.streakDays, 60) * 0.35;
  }

  // ── Animation ────────────────────────────────────────────────────────────

  update(elapsed) {
    const state = this.getState();
    if (state === 'living') {
      this.blobs.forEach((b, i) => {
        const phase = Math.sin(elapsed * 0.5 + i * 0.3) * 0.008;
        b.material.opacity = b.userData.baseOpacity + phase;
      });
      if (this.glowMesh) {
        this.glowMesh.material.opacity = 0.06 + Math.sin(elapsed * 0.9) * 0.02;
      }
      if (this.trunk) {
        this.trunk.rotation.z = Math.sin(elapsed * 0.4) * 0.01;
      }
    }
  }
}
