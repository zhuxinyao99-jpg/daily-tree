// Daily Tree V2 — Single-tree frontal scene
// THREE must be loaded globally before this module.

export class ForestScene {
  constructor(canvas) {
    this.canvas = canvas;
    this.tree   = null;  // only the current year tree
    this._init();
  }

  _init() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0A0C10);

    this.camera = new THREE.PerspectiveCamera(
      45,
      this.canvas.clientWidth / this.canvas.clientHeight,
      0.1,
      2000
    );
    this.camera.position.set(0, 45, 160);
    this.camera.lookAt(0, 45, 0);

    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight);
    this.renderer.shadowMap.enabled = true;

    // Ground plane
    const groundGeo = new THREE.PlaneGeometry(500, 500);
    const groundMat = new THREE.MeshBasicMaterial({ color: 0x0D0F12 });
    const ground    = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    // Lighting: soft ambient + warm key light from upper right
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.35));
    const keyLight = new THREE.DirectionalLight(0xC8E8D0, 0.8);
    keyLight.position.set(60, 120, 80);
    keyLight.castShadow = true;
    this.scene.add(keyLight);
    const fillLight = new THREE.DirectionalLight(0x4A6A8A, 0.3);
    fillLight.position.set(-60, 40, -40);
    this.scene.add(fillLight);

    this.clock = new THREE.Clock();
    window.addEventListener('resize', () => this._onResize());
    this._animate();
  }

  _onResize() {
    if (!this.camera || !this.renderer) return;
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  _animate() {
    this._animId = requestAnimationFrame(() => this._animate());
    const elapsed = this.clock.getElapsedTime();
    if (this.tree) this.tree.update(elapsed);
    this.renderer.render(this.scene, this.camera);
  }

  /** Remove existing tree from scene */
  removeAllTrees() {
    if (this.tree) {
      this.scene.remove(this.tree.group);
      this.tree = null;
    }
  }

  /** Add the current year's tree (centered at origin) */
  addTree(TreeClass, year, entryCount, options) {
    const tree = new TreeClass(year, entryCount, {
      THREE,
      lastEntryDate: (options && options.lastEntryDate) || null,
    });
    tree.group.position.set(0, 0, 0);
    this.scene.add(tree.group);
    this.tree = tree;
    return tree;
  }
}
