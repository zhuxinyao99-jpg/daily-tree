// Three.js scene setup for Daily Tree
// THREE must be loaded and available globally before this module.
// Set window.THREE before importing this module (done in index.html via UMD three.js)

export class ForestScene {
  constructor(canvas) {
    this.canvas = canvas;
    this.trees = [];
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.hoveredTree = null;
    this.cameraTargetY = 0;
    this.cameraY = 0;

    this._init();
    this._bindEvents();
  }

  _init() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0A0A0B);

    this.camera = new THREE.PerspectiveCamera(
      50,
      this.canvas.clientWidth / this.canvas.clientHeight,
      0.1,
      5000
    );
    this.camera.position.set(0, 80, 200);
    this.camera.lookAt(0, 40, 0);

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: false,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight);

    this.scene.fog = new THREE.Fog(0x0A0A0B, 250, 500);

    const ambient = new THREE.AmbientLight(0xffffff, 0.3);
    this.scene.add(ambient);

    const groundGeo = new THREE.PlaneGeometry(1000, 1000);
    const groundMat = new THREE.MeshBasicMaterial({
      color: 0x0F0F12,
      transparent: true,
      opacity: 0.5,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -1;
    this.scene.add(ground);

    this.clock = new THREE.Clock();
    this._animate();
  }

  _bindEvents() {
    this.canvas.addEventListener('click', (e) => this._onCanvasClick(e));
    window.addEventListener('resize', () => this._onResize());
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
    this.trees.forEach(tree => tree.update(elapsed));
    this.renderer.render(this.scene, this.camera);
  }

  _onCanvasClick(event) {
    const rect = this.canvas.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.mouse, this.camera);

    const allMeshes = [];
    this.trees.forEach(tree => {
      tree.group.traverse(child => {
        if (child.isMesh) allMeshes.push(child);
      });
    });

    const intersects = this.raycaster.intersectObjects(allMeshes);
    if (intersects.length > 0) {
      const hitTree = this.trees.find(t =>
        t.group.traverse(c => c === intersects[0].object).length > 0
      );
      if (hitTree && window.showYearDetail) {
        window.showYearDetail(hitTree.year);
      }
    }
  }

  removeAllTrees() {
    this.trees.forEach(t => this.scene.remove(t.group));
    this.trees = [];
  }

  growTree(tree) {
    if (!tree || !tree.group) return;
    const trunk = tree.group.children[0];
    if (!trunk) return;
    const startHeight = tree.group.userData.trunkHeight || 20;
    const targetHeight = startHeight + 6;
    let progress = 0;
    const animate = () => {
      progress += 0.04;
      if (progress >= 1) {
        tree.group.userData.trunkHeight = targetHeight;
        return;
      }
      const eased = 1 - Math.pow(1 - progress, 3);
      const newH = startHeight + (targetHeight - startHeight) * eased;
      trunk.scale.y = 1 + (newH / startHeight - 1) * eased;
      trunk.position.y = newH / 2;
      tree.circles.forEach(c => {
        c.position.y += (targetHeight - startHeight) * 0.03;
      });
      requestAnimationFrame(animate);
    };
    animate();
  }

  addTree(TreeClass, year, entryCount, options) {
    var opts = options || {};
    var tree = new TreeClass(year, entryCount, { THREE: THREE, lastEntryDate: opts.lastEntryDate || null });
    tree.group.position.x = (year - this._currentYear()) * 50;
    tree.group.position.z = (Math.random() - 0.5) * 30;
    this.scene.add(tree.group);
    this.trees.push(tree);
    return tree;
  }

  _currentYear() {
    return new Date().getFullYear();
  }
}
