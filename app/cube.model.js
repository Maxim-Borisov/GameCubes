function qNormalizeAngle(angle, norm = 720)
{

  if (angle < -norm) {
    return (angle + norm);
  } else if (angle >= norm) {
    return (angle - norm);
  }

  return angle
}

function qPlainCoord({ x, y, z}) {
  return ({x: x / z, y: y / z});
}

class Cube {

  constructor(scene, id, size, anchor) {
    this._m = Matrix.I(4);
    this._id = id;

    this._rot = {x: 0, y: 0, z: 0};
    this._pos = {x: 0, y: 0, z: 0};

    this._size   = size   || 1.0;
    this._anchor = anchor || {x: 0.5, y: -0.5, z: 0};

    this._destructed = false;

    this.whiteColor = [ 1.0,  1.0,  1.0,  1.0 ];

    this.vertices = [
      // Front face
      -1.0, -1.0,  1.0,
       1.0, -1.0,  1.0,
       1.0,  1.0,  1.0,
      -1.0,  1.0,  1.0,

      // Back face
      -1.0, -1.0, -1.0,
      -1.0,  1.0, -1.0,
       1.0,  1.0, -1.0,
       1.0, -1.0, -1.0,

      // Top face
      -1.0,  1.0, -1.0,
      -1.0,  1.0,  1.0,
       1.0,  1.0,  1.0,
       1.0,  1.0, -1.0,

      // Bottom face
      -1.0, -1.0, -1.0,
       1.0, -1.0, -1.0,
       1.0, -1.0,  1.0,
      -1.0, -1.0,  1.0,

      // Right face
       1.0, -1.0, -1.0,
       1.0,  1.0, -1.0,
       1.0,  1.0,  1.0,
       1.0, -1.0,  1.0,

      // Left face
      -1.0, -1.0, -1.0,
      -1.0, -1.0,  1.0,
      -1.0,  1.0,  1.0,
      -1.0,  1.0, -1.0,
    ];

    this.indices = [
      0,  1,  2,      0,  2,  3,    // front
      4,  5,  6,      4,  6,  7,    // back
      8,  9,  10,     8,  10, 11,   // top
      12, 13, 14,     12, 14, 15,   // bottom
      16, 17, 18,     16, 18, 19,   // right
      20, 21, 22,     20, 22, 23,   // left
    ];

    this.colors = [];
    for (let j = 0; j < this.indices.length; ++j) {
      const c = this.whiteColor;

      // Repeat each color four times for the four vertices of the face
      this.colors = this.colors.concat(c, c, c, c);
    }

    this.buildNormales();
    this.addToScene(scene);

    scene.addItem(this);
    this.scene = scene;
  }

  destroy() {
    this._destructed = true;

    this.scene.removeGLBuffer(this.indexBuffer);
    this.indexBuffer = null;

    this.scene.removeGLBuffer(this.vertexBuffer);
    this.vertexBuffer = null;

    this.scene.removeGLBuffer(this.normalesBuffer);
    this.normalesBuffer = null;

    this.scene.removeGLBuffer(this.colorBuffer);
    this.colorBuffer = null;
  }

  get pos() {
    return ({
      x:  (this._pos.x + this._anchor.x),
      y: -(this._pos.y + this._anchor.y),
      z: -(this._pos.z + this._anchor.z)
    });
  }

  get size() {
    return this._size;
  }

  m(opts = {}) {
    let m = this._m.clone();

    m.translate(this._pos.x + this._anchor.x, this._pos.y + this._anchor.y, this._pos.z + this._anchor.z);
    m.scale(this._size / 2, this._size / 2, this._size / 2);

    if (opts.rotate == null || opts.rotate === true) {
      m.rotate(this._rot.x, 1.0, 0.0, 0.0 );
      m.rotate(this._rot.y, 0.0, 1.0, 0.0 );
      m.rotate(this._rot.z, 0.0, 0.0, 1.0 );
    }

    return m;
  }

  vertex(i) {
    return this.vertices.slice(i * 3, (i * 3) + 3);
  }

  buildNormales() {
    this.normales = [];

    for (let i = 0; i < this.indices.length;) {
        let a = this.vertex(this.indices[i]);
        let b = this.vertex(this.indices[i+1]);
        let c = this.vertex(this.indices[i+2]);

        let qx = b[0] - a[0];
        let qy = b[1] - a[1];
        let qz = b[2] - a[2];

        let px = c[0] - a[0];
        let py = c[1] - a[1];
        let pz = c[2] - a[2];

        let normale = [
          (py * qz - pz * qy),
          (pz * qx - px * qz),
          (px * qy - py * qx)
        ];

        this.normales[ this.indices[i]   ] = normale;
        this.normales[ this.indices[i+1] ] = normale;
        this.normales[ this.indices[i+2] ] = normale;

        i += 3;
    }

    this.normales = this.normales.reduce((acc, m) => acc.concat(m), []);
  }

  addToScene(scene) {
    this.vertexBuffer   = scene.newAttributeArray(new Float32Array(this.vertices));
    this.colorBuffer    = scene.newAttributeArray(new Float32Array(this.colors));
    this.normalesBuffer = scene.newAttributeArray(new Float32Array(this.normales));

    this.indexBuffer    = scene.newElementArray(new Uint16Array(this.indices));
    return this;
  }

  _bind(scene) {
    scene.bindAttributeArray("a_Color",    4, this.colorBuffer);
    scene.bindAttributeArray("a_Position", 3, this.vertexBuffer);
    scene.bindAttributeArray("a_Normal",   3, this.normalesBuffer);

    scene.bindElementArray(this.indexBuffer);
  }

  _unbing(scene) {
    scene.releaseAttributeArray("a_Color");
    scene.releaseAttributeArray("a_Normal");
    scene.releaseAttributeArray("a_Position");
  }

  render(scene) {
    scene = scene || this.scene;
    if (this._destructed) return;

    scene.setUniformMat4fv('u_MVMatrix', this.m());

    this._bind(scene);
    scene.drawElements(this.indices.length);
    this._unbing(scene);
  }

  move(x, y, z) {
    let v = __v.apply(this, arguments);

    this._pos.x += this.size * (v.x || 0);
    this._pos.y -= this.size * (v.y || 0);
    this._pos.z -= this.size * (v.z || 0);

    return this;
  }

  rotate(x, y, z) {
    let v = __v.apply(this, arguments);

    this._rot.x = qNormalizeAngle(this._rot.x + (v.x || 0));
    this._rot.y = qNormalizeAngle(this._rot.y + (v.y || 0));
    this._rot.z = qNormalizeAngle(this._rot.z + (v.z || 0));

    return this;
  }

  // TODO: check point against cube vertexes
  // below is example on how it could be done
  collide2D(x, y) {
    let proj  = this.scene.camera._proj;
    let view  = proj.clone().mul(this.m({rotate: false}));

    let tl = __v(view.mul(this.vertex(3)));
    let br = __v(view.mul(this.vertex(1)));
    let pt = ({x: x, y: y});

    tl = qPlainCoord(tl);
    br = qPlainCoord(br);

    return ((tl.x <= pt.x && pt.x <= br.x) && (br.y <= pt.y && pt.y <= tl.y));
  }

}
