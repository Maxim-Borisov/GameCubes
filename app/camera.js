let c = 0;

class Camera {

  constructor() {
    this._fov    = 120;
    this._aspect = 1.0;

    this._near = 0.01;
    this._far  = 10;

    this._lookAtX = 0;
    this._lookAtY = 0;
    this._lookAtZ = 0;

    this._world = Matrix.I(4);
    this._proj  = this._world;
  }

  get fieldOfView() {
    return this._fov;
  }

  get aspectRatio() {
    return this._aspect;
  }

  get units() {
    const fov  = Math.tan(__rad(this._fov));

    const ymax = this._near * fov * this._far;
    const ymin = -ymax;

    const xmin = ymin * this._aspect;
    const xmax = ymax * this._aspect;

    let u = this.point(1.0, 1.0, 1.0);

    return ({
      x: u.x, y: u.y, z: u.z,
      xmin: 0, xmax: (xmax - xmin) + 1, ymin: 0, ymax: (ymax - ymin) - (1.0 / this._aspect)
    });
  }

  point(x, y, z) {
    let v = __v.apply(this, arguments);
    v = this._proj.mul(v.x, v.y, v.z);
    // console.log(x, y, z, '=>', v)
    return ({x: v[0], y: v[1], z: v[2] });
  }

  setup(fov, aspect, near, far, scale) {
    this._fov    = fov;
    this._aspect = aspect;

    this._near = near;
    this._far  = far;

    fov = Math.tan(0.5 * __rad(fov));
    this._world.perspective(fov, this._aspect, this._near, this._far);

    let x  = (-0.5) * scale - 0.5;
    let y  = ( 0.5) * scale + 0.5;
    let z  = (-1.0) * scale;

    this.lookAt(x * aspect, y, z);
    this.move(0, 0, 0);
  }

  lookAt(x, y, z, w = 1.0) {
    let v = __v.apply(this, arguments);

    let p = Matrix.I(4);
    let m = this._world.clone();

    this._lookAtX = (v.x != null) ? v.x : this._lookAtX;
    this._lookAtY = (v.y != null) ? v.y : this._lookAtY;
    this._lookAtZ = (v.z != null) ? v.z : this._lookAtZ;

    p.move(this._lookAtX, this._lookAtY, this._lookAtZ);
    p.scale(w, w, w);

    this._proj = m.mul(p);
  }

  move(x, y, z) {
    let p = Matrix.I(4).move(x, y, z);
    this._proj = p.mul(this._proj);
  }

  render(scene) {
    scene.setUniformMat4fv('u_MVPMatrix', this._proj);
    scene.renderItems();
  }

}
