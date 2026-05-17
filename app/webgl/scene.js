// Daily Tree V2 — Single-tree frontal scene
// THREE must be loaded globally before this module.

export class ForestScene {
  constructor(canvas) {
    this.canvas = canvas;
    this.tree   = null;  // only the current year tree

    // Tree rotation state (mobile-friendly)
    this.treeRotationX = 0;
    this.treeRotationY = 0;
    this.targetRotationX = 0;
    this.targetRotationY = 0;
    this.isDragging = false;
    this.dragStartX = 0;
    this.dragStartY = 0;

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
    this._bindTreeRotationEvents();
    this._animate();
  }

  _bindTreeRotationEvents() {
    // Desktop mouse
    this.canvas.addEventListener('mousedown', (e) => this._onDragStart(e));
    this.canvas.addEventListener('mousemove', (e) => this._onDragMove(e));
    this.canvas.addEventListener('mouseup', (e) => this._onDragEnd(e));
    this.canvas.addEventListener('mouseleave', (e) => this._onDragEnd(e));

    // Mobile touch
    this.canvas.addEventListener('touchstart', (e) => this._onDragStart(e), false);
    this.canvas.addEventListener('touchmove', (e) => this._onDragMove(e), false);
    this.canvas.addEventListener('touchend', (e) => this._onDragEnd(e), false);
  }

  _getPointerPos(e) {
    if (e.touches) {
      return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    } else {
      return { x: e.clientX, y: e.clientY };
    }
  }

  _onDragStart(e) {
    this.isDragging = true;
    const pos = this._getPointerPos(e);
    this.dragStartX = pos.x;
    this.dragStartY = pos.y;
  }

  _onDragMove(e) {
    if (!this.isDragging) return;
    e.preventDefault();

    const pos = this._getPointerPos(e);
    const deltaX = pos.x - this.dragStartX;
    const deltaY = pos.y - this.dragStartY;

    // Convert drag to rotation (0.005 radians per pixel)
    this.targetRotationY += deltaX * 0.005;
    this.targetRotationX += deltaY * 0.005;

    // Clamp X rotation to prevent flipping
    this.targetRotationX = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, this.targetRotationX));

    this.dragStartX = pos.x;
    this.dragStartY = pos.y;
  }

  _onDragEnd(e) {
    this.isDragging = false;
  }

  _applyTreeRotation() {
    if (!this.tree) return;

    // Apply damping when not dragging (momentum decay)
    if (!this.isDragging) {
      this.targetRotationX *= 0.95;
      this.targetRotationY *= 0.95;
    }

    // Apply rotations to tree
    this.tree.group.rotation.order = 'YXZ';
    this.tree.group.rotation.y = this.targetRotationY;
    this.tree.group.rotation.x = this.targetRotationX;
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
    if (this.tree) {
      this.tree.update(elapsed);
      this._applyTreeRotation();
    }
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
  addTree(TreeClass, year, streakDays, options) {
    const tree = new TreeClass(year, streakDays, {
      THREE,
      lastEntryDate: (options && options.lastEntryDate) || null,
    });
    tree.group.position.set(0, 0, 0);
    this.scene.add(tree.group);
    this.tree = tree;
    return tree;
  }
}
