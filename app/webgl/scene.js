// Three.js scene setup for Daily Tree
import * as THREE from 'three';

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
    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0A0A0B);

    // Camera
    this.camera = new THREE.PerspectiveCamera(
      50,
      this.canvas.clientWidth / this.canvas.clientHeight,
      0.1,
      5000
    );
    this.camera.position.set(0, 80, 200);
    this.camera.lookAt(0, 40, 0);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: false,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight);

    // Fog for depth
    this.scene.fog = new THREE.Fog(0x0A0A0B, 250, 500);

    // Ambient fill light
    const ambient = new THREE.AmbientLight(0xffffff, 0.3);
    this.scene.add(ambient);

    // Ground plane hint
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
    window.addEventListener('resize', () => this._onResize());
    this.canvas.addEventListener('mousemove', (e) => this._onMouseMove(e));
    this.canvas.addEventListener('click', (e) => this._onClick(e));
  }

  _onResize() {
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  _onMouseMove(e) {
    const rect = this.canvas.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const meshes = [];
    this.trees.forEach(t => {
      if (t.group) t.group.children.forEach(c => meshes.push(c));
    });

    const intersects = this.raycaster.intersectObjects(meshes);
    const newHovered = intersects.length > 0 ? this._findTree(intersects[0].object) : null;

    if (newHovered !== this.hoveredTree) {
      if (this.hoveredTree) this.hoveredTree.setHovered(false);
      if (newHovered) newHovered.setHovered(true);
      this.hoveredTree = newHovered;
      this.canvas.style.cursor = newHovered ? 'pointer' : 'default';
    }
  }

  _onClick(e) {
    if (!this.hoveredTree) return;
    const year = this.hoveredTree.year;
    const count = this.hoveredTree.entryCount;
    if (window.showYearDetail) window.showYearDetail(year, count);
  }

  _findTree(object) {
    return this.trees.find(t => t.group && t.group.children.includes(object)) || null;
  }

  _animate() {
    this._animationId = requestAnimationFrame(() => this._animate());
    const delta = this.clock.getDelta();
    const elapsed = this.clock.getElapsedTime();

    this.trees.forEach(tree => tree.update(delta, elapsed));

    // Gentle camera drift
    this.cameraY += (this.cameraTargetY - this.cameraY) * 0.05;
    this.camera.position.y = 80 + Math.sin(elapsed * 0.1) * 3;
    this.camera.lookAt(0, this.cameraY + 40, 0);

    this.renderer.render(this.scene, this.camera);
  }

  addTree(Tree, year, entryCount, options = {}) {
    const tree = new Tree(year, entryCount, { THREE, ...options });
    tree.group.position.x = (year - this._currentYear()) * 50;
    tree.group.position.z = (Math.random() - 0.5) * 30;
    this.scene.add(tree.group);
    this.trees.push(tree);
    return tree;
  }

  removeAllTrees() {
    this.trees.forEach(t => {
      if (t.group) this.scene.remove(t.group);
    });
    this.trees = [];
  }

  _currentYear() {
    return new Date().getFullYear();
  }

  destroy() {
    cancelAnimationFrame(this._animationId);
    window.removeEventListener('resize', this._onResize);
    this.renderer.dispose();
  }
}
