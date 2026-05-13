// Tree generation and animation for Daily Tree
// THREE must be available globally as `THREE` before this module loads.

export class Tree {
  constructor(year, entryCount, options) {
    this.year = year;
    this.entryCount = entryCount || 0;
    this.THREE = options.THREE || window.THREE;
    this.lastEntryDate = options.lastEntryDate || null;

    this.group = new this.THREE.Group();
    this.group.userData.trunkHeight = 20;
    this.circles = [];
    this.leaves = [];

    this._build();
  }

  _build() {
    this._buildTrunk();
    this._buildCanopy();
  }

  _buildTrunk() {
    var h = this._computeTrunkHeight();
    this.group.userData.trunkHeight = h;

    var geo = new this.THREE.CylinderGeometry(1.5, 2.5, h, 8);
    var mat = new this.THREE.MeshStandardMaterial({
      color: this._getTrunkColor(),
      roughness: 0.9,
      metalness: 0.0,
    });
    var trunk = new this.THREE.Mesh(geo, mat);
    trunk.position.y = h / 2;
    trunk.castShadow = true;
    this.group.add(trunk);
    this.trunk = trunk;
  }

  _buildCanopy() {
    var entryCount = this.entryCount;
    var maxCircles = Math.min(entryCount, 30);
    var state = this._getTreeState();

    for (var i = 0; i < maxCircles; i++) {
      var ratio = (i + 1) / maxCircles;
      var y = 8 + ratio * (this.group.userData.trunkHeight - 10);
      var r = 6 + entryCount * 0.3 + ratio * 5;
      var circle = this._makeCircle(r, state, ratio);
      circle.position.y = y;
      this.group.add(circle);
      this.circles.push(circle);
    }

    if (entryCount > 0) {
      var topY = this.group.userData.trunkHeight;
      var numLeaves = Math.min(entryCount, 12);
      for (var j = 0; j < numLeaves; j++) {
        var leaf = this._makeLeaf(state, 3 + Math.random() * 3);
        var angle = (j / numLeaves) * Math.PI * 2;
        var spread = 4 + entryCount * 0.3;
        leaf.position.set(
          Math.cos(angle) * spread,
          topY + Math.random() * 8,
          Math.sin(angle) * spread
        );
        this.group.add(leaf);
        this.leaves.push(leaf);
      }
    }
  }

  _makeCircle(radius, state, ratio) {
    var geo = new this.THREE.CircleGeometry(radius, 32);
    var color = this._getStateColor(state);
    var mat = new this.THREE.MeshStandardMaterial({
      color: color,
      transparent: true,
      opacity: this._getStateOpacity(state, ratio),
      roughness: 0.7,
      metalness: 0.1,
      side: this.THREE.DoubleSide,
    });
    var mesh = new this.THREE.Mesh(geo, mat);
    // Face upward (camera looks down from above at ~45deg)
    mesh.rotation.x = Math.PI / 2;
    mesh.userData.baseOpacity = mat.opacity;
    return mesh;
  }

  _makeLeaf(state, size) {
    var geo = new this.THREE.SphereGeometry(size || 3, 6, 6);
    var mat = new this.THREE.MeshStandardMaterial({
      color: this._getStateColor(state),
      transparent: true,
      opacity: this._getStateOpacity(state, 1),
      roughness: 0.8,
    });
    var mesh = new this.THREE.Mesh(geo, mat);
    mesh.userData.baseOpacity = mat.opacity;
    return mesh;
  }

  _computeTrunkHeight() {
    return Math.min(20 + this.entryCount * 3, 80);
  }

  _getTreeState() {
    if (this.entryCount === 0) return 'empty';
    var now = Date.now();
    var msPerDay = 86400000;
    var daysSince = (now - new Date(this.lastEntryDate).getTime()) / msPerDay;
    if (daysSince <= 14) return 'living';
    if (daysSince <= 30) return 'dormant';
    return 'archived';
  }

  _getStateColor(state) {
    if (state === 'living') return 0x4A7C59;
    if (state === 'dormant') return 0x3D4F5F;
    if (state === 'archived') return 0x5C4A3A;
    return 0x2A2A2A;
  }

  _getTrunkColor() {
    var s = this._getTreeState();
    if (s === 'living') return 0x8B7355;
    if (s === 'dormant') return 0x6B6050;
    if (s === 'archived') return 0x4A3A2A;
    return 0x3A2A1A;
  }

  _getStateOpacity(state, ratio) {
    if (state === 'living') return 0.75 - ratio * 0.2;
    if (state === 'dormant') return 0.4 - ratio * 0.2;
    if (state === 'archived') return 0.3 - ratio * 0.15;
    return 0.15;
  }

  update(elapsed) {
    var s = this._getTreeState();
    if (s === 'living') {
      var breathe = Math.sin(elapsed * 0.8 + this.year * 0.5) * 0.04;
      this.circles.forEach(function(c, i) {
        if (c.material) {
          c.material.opacity = c.userData.baseOpacity + breathe * (1 - i / this.circles.length);
        }
      }, this);
    } else if (s === 'dormant') {
      var slow = Math.sin(elapsed * 0.3 + this.year * 0.3) * 0.015;
      this.circles.forEach(function(c) {
        if (c.material) c.material.opacity = c.userData.baseOpacity + slow;
      });
    }
  }
}
