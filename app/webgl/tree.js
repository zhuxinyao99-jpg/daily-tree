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

// Season-specific color palettes
const SEASON_COLORS = {
  spring: {
    leaf: 0x7DB88A,    // pale fresh green
    trunk: 0x8B7355,   // warm brown
  },
  summer: {
    leaf: 0x4A7C59,    // deep forest green
    trunk: 0x8B7355,   // rich brown
  },
  autumn: {
    leaf: 0xB8863C,    // golden rust
    trunk: 0x9B7C6B,   // richer brown
  },
  winter: {
    leaf: 0x2A3530,    // pale desaturated green
    trunk: 0x6B6050,   // silvery-brown
  },
};

export class Tree {
  constructor(year, streakDays, options) {
    this.year       = year;
    this.streakDays = streakDays || 0;
    this.THREE      = options.THREE || window.THREE;
    this.isCurrentYear = (year === new Date().getFullYear());
    this.stage      = getGrowthStage(this.streakDays);

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
    if (state === 'empty') return new this.THREE.Color(0x4A7C59);
    // living trees show vibrant seasonal colors
    return new this.THREE.Color(SEASON_COLORS[season].leaf);
  }

  _trunkColor(state) {
    const season = this.isCurrentYear ? getSeason() : 'summer';
    if (state === 'empty') return new this.THREE.Color(0x6B6050);
    // trunk color evolves slightly with season
    return new this.THREE.Color(SEASON_COLORS[season].trunk);
  }

  // ── Build ────────────────────────────────────────────────────────────────

  _build() {
    const state = this.getState();
    this._buildRoots(state);
    this._buildTrunk(state);
    if (this.streakDays > 0 && state !== 'empty') {
      this._buildBranches(state);
      this._buildLeafClusters(state);
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

  _buildBranches(state) {
    const h = this._trunkHeight();
    const rng = seededRng(this.year * 11 + this.streakDays);
    const trunkMat = new this.THREE.MeshStandardMaterial({
      color: this._trunkColor(state),
      roughness: 0.92,
      metalness: 0.05,
    });

    // Generate 3-5 main branches radiating from trunk
    const numBranches = 3 + Math.floor(rng() * 2);
    for (let i = 0; i < numBranches; i++) {
      const angle = (i / numBranches) * Math.PI * 2 + rng() * 0.3;
      const startHeight = h * (0.4 + rng() * 0.3);
      const length = 8 + rng() * 6;
      const endX = Math.cos(angle) * length;
      const endZ = Math.sin(angle) * length;
      const endY = startHeight + (rng() - 0.5) * 2;

      // Main branch curve
      const pts = [
        new this.THREE.Vector3(0, startHeight, 0),
        new this.THREE.Vector3(endX * 0.5, startHeight + (endY - startHeight) * 0.4, endZ * 0.5),
        new this.THREE.Vector3(endX, endY, endZ),
      ];
      const curve = new this.THREE.CatmullRomCurve3(pts);
      const geo = new this.THREE.TubeGeometry(curve, 10, 0.4, 6, false);
      const branch = new this.THREE.Mesh(geo, trunkMat);
      branch.castShadow = true;
      this.group.add(branch);

      // Sub-branches from main branch
      if (this.streakDays >= 15) {
        const numSubBranches = 2 + Math.floor(rng() * 2);
        for (let j = 0; j < numSubBranches; j++) {
          const t = 0.4 + rng() * 0.4;
          const subStart = curve.getPoint(t);
          const subAngle = angle + (rng() - 0.5) * 1;
          const subLen = 3 + rng() * 3;
          const subPts = [
            subStart,
            new this.THREE.Vector3(
              subStart.x + Math.cos(subAngle) * subLen * 0.5,
              subStart.y + rng() * 1,
              subStart.z + Math.sin(subAngle) * subLen * 0.5
            ),
            new this.THREE.Vector3(
              subStart.x + Math.cos(subAngle) * subLen,
              subStart.y - 1,
              subStart.z + Math.sin(subAngle) * subLen
            ),
          ];
          const subCurve = new this.THREE.CatmullRomCurve3(subPts);
          const subGeo = new this.THREE.TubeGeometry(subCurve, 6, 0.2, 4, false);
          const subBranch = new this.THREE.Mesh(subGeo, trunkMat);
          subBranch.castShadow = true;
          this.group.add(subBranch);
        }
      }
    }
  }

  _buildRoots(state) {
    // Roots appear at sapling stage (7+ days)
    if (this.streakDays < 7) return;
    const rng = seededRng(this.year * 7 + 1);
    const rootMat = new this.THREE.MeshStandardMaterial({
      color: this._trunkColor(state),
      roughness: 0.98,
    });

    // More roots for older trees
    const numRoots = Math.min(3 + Math.floor(rng() * 2) + Math.floor(this.streakDays / 90), 8);
    for (let i = 0; i < numRoots; i++) {
      const angle = (i / numRoots) * Math.PI * 2 + rng() * 0.4;
      const len = 5 + rng() * 4 + this.streakDays * 0.02;
      const pts = [
        new this.THREE.Vector3(0, 1, 0),
        new this.THREE.Vector3(Math.cos(angle) * len * 0.5, 0.4, Math.sin(angle) * len * 0.5),
        new this.THREE.Vector3(Math.cos(angle) * len, 0, Math.sin(angle) * len),
      ];
      const curve = new this.THREE.CatmullRomCurve3(pts);
      const geo = new this.THREE.TubeGeometry(curve, 8, 0.5, 5, false);
      const mesh = new this.THREE.Mesh(geo, rootMat);
      mesh.castShadow = true;
      this.group.add(mesh);

      // Sub-roots for elder trees (180+ days)
      if (this.streakDays >= 180) {
        const t = 0.6 + rng() * 0.2;
        const subStart = curve.getPoint(t);
        const subAngle = angle + (rng() - 0.5) * 0.5;
        const subLen = 2 + rng() * 2;
        const subPts = [
          subStart,
          new this.THREE.Vector3(
            subStart.x + Math.cos(subAngle) * subLen * 0.5,
            subStart.y - 0.3,
            subStart.z + Math.sin(subAngle) * subLen * 0.5
          ),
          new this.THREE.Vector3(
            subStart.x + Math.cos(subAngle) * subLen,
            subStart.y - 0.7,
            subStart.z + Math.sin(subAngle) * subLen
          ),
        ];
        const subCurve = new this.THREE.CatmullRomCurve3(subPts);
        const subGeo = new this.THREE.TubeGeometry(subCurve, 6, 0.25, 4, false);
        const subMesh = new this.THREE.Mesh(subGeo, rootMat);
        subMesh.castShadow = true;
        this.group.add(subMesh);
      }
    }
  }

  _buildLeafClusters(state) {
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
