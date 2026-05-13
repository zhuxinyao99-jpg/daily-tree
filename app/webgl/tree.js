// Tree generation and animation for Daily Tree
import * as THREE from 'three';

export class Tree {
  constructor(year, entryCount, options = {}) {
    this.year = year;
    this.entryCount = entryCount;
    this.options = options;
    this.group = null;
    this.circles = [];
    this.isBreathing = true;
    this.breathePhase = Math.random() * Math.PI * 2;
    this.breathingSpeed = 0.4 + Math.random() * 0.2;
    this.baseOpacities = [];

    // State
    this.lastEntryDate = options.lastEntryDate || new Date().toISOString();
    this.state = this._computeState();
    this.group = this._build();
  }

  _computeState() {
    const now = Date.now();
    const last = new Date(this.lastEntryDate).getTime();
    const daysSince = (now - last) / (1000 * 60 * 60 * 24);
    if (daysSince > 30) return 'archived';
    if (daysSince > 14) return 'dormant';
    return 'living';
  }

  _build() {
    const THREE = this.options.THREE;
    const group = new THREE.Group();

    // Trunk
    const trunkHeight = Math.max(20, this.entryCount * 6);
    const trunkGeo = new THREE.CylinderGeometry(1.5, 2.5, trunkHeight, 8);
    const trunkColor = this._trunkColor();
    const trunkMat = new THREE.MeshBasicMaterial({ color: trunkColor });
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = trunkHeight / 2;
    group.add(trunk);

    // Canopy circles
    const colors = this._canopyColors();
    const circleCount = Math.min(8, Math.max(3, Math.floor(this.entryCount / 10) + 2));
    const baseRadius = Math.max(15, Math.min(35, this.entryCount * 2 + 15));

    for (let i = 0; i < circleCount; i++) {
      const r = baseRadius * (0.5 + Math.random() * 0.7);
      const geo = new THREE.CircleGeometry(r, 32);
      const mat = new THREE.MeshBasicMaterial({
        color: colors[i % colors.length],
        transparent: true,
        opacity: 0.4 + Math.random() * 0.35,
        side: THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(geo, mat);

      const angle = (i / circleCount) * Math.PI * 2 + Math.random() * 0.8;
      const dist = baseRadius * 0.3 * Math.random();
      mesh.position.set(
        Math.cos(angle) * dist,
        trunkHeight + r * 0.3 + Math.random() * r * 0.5,
        Math.sin(angle) * dist
      );
      mesh.userData.baseScale = 1;
      mesh.userData.phaseOffset = Math.random() * Math.PI * 2;
      mesh.userData.baseOpacity = mat.opacity;

      this.baseOpacities.push(mat.opacity);
      this.circles.push(mesh);
      group.add(mesh);
    }

    // Store trunkHeight for reference
    group.userData.trunkHeight = trunkHeight;
    group.userData.baseRadius = baseRadius;

    return group;
  }

  _trunkColor() {
    const THREE = this.options.THREE;
    if (this.state === 'dormant') return 0x3D4F5F;
    if (this.state === 'archived') return 0x5A5A5A;
    return 0x8B7355;
  }

  _canopyColors() {
    const THREE = this.options.THREE;
    if (this.state === 'archived') return [0x555555, 0x444444, 0x666666];
    if (this.state === 'dormant') return [0x3D4F5F, 0x4A6070, 0x354555];
    return [0x4A7C59, 0x6B9B7A, 0x3D6B4A, 0x5B8A6A];
  }

  update(deltaTime, globalTime) {
    if (!this.group) return;
    if (this.state === 'archived') return;

    const isBreathing = this.state === 'living';

    this.circles.forEach((circle, i) => {
      if (isBreathing) {
        const breathe = Math.sin(globalTime * this.breathingSpeed + this.breathePhase + circle.userData.phaseOffset);
        const scale = 0.96 + breathe * 0.04;
        circle.scale.setScalar(scale);
      } else {
        // Dormant: very slow opacity pulse
        const pulse = Math.sin(globalTime * 0.15 + i);
        circle.material.opacity = this.baseOpacities[i] * (0.22 + pulse * 0.08);
      }
    });
  }

  setHovered(hovered) {
    if (!this.group) return;
    const targetOpacity = hovered ? 0.95 : (this.state === 'dormant' ? 0.35 : 0.8);
    this.circles.forEach(c => {
      c.material.opacity = targetOpacity;
    });
  }

  grow(callback) {
    if (!this.group) return;
    const trunkHeight = this.group.userData.trunkHeight;
    const targetHeight = Math.max(20, this.entryCount * 6);
    const diff = targetHeight - trunkHeight;

    let progress = 0;
    const animate = () => {
      progress += 0.03;
      if (progress >= 1) {
        this.entryCount++;
        if (callback) callback();
        return;
      }
      const eased = 1 - Math.pow(1 - progress, 3);
      const newHeight = trunkHeight + diff * eased;
      this.group.children[0].scale.y = 1 + (targetHeight / trunkHeight - 1) * eased;
      this.group.children[0].position.y = newHeight / 2;
      requestAnimationFrame(animate);
    };
    animate();
  }
}
