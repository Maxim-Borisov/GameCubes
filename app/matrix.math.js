function __rad(a) { return (a * Math.PI / 180) }
function __grd(a) { return (a * 180 / Math.PI) }

function __v(x, y, z, w) {
  if (Array.isArray(x)) {
    w = x[3]; z = x[2]; y = x[1]; x = x[0];
  } else if (typeof x === 'object') {
    w = x.w; z = x.z; y = x.y; x = x.x;
  }

  return ({x, y, z, w});
}


class Matrix {

  static I(n, m) {
    let els = []; m = (m != null ? m : n);
    for (let i = 0; i < n; i++) {
      els[i] = [];
      for (let j = 0; j < m; j++) {
        els[i][j] = (i === j) ? 1 : 0;
      }
    }
    return new Matrix(els);
  }

  static FILL(n, m, d) {
    let els = []; d = (d || 0);
    for (let i = 0; i < n; i++) {
      els[i] = [];
      for (let j = 0; j < n; j++) {
        els[i][j] = d;
      }
    }
    return new Matrix(els);
  }

  constructor(n, m, f) {
    if (n instanceof Matrix || Array.isArray(n)) {
      this.elements = n.elements || n;
      return this;
    }

    this.elements = [];
    if (typeof n === 'number' && n > 0) {
      m = (m != null ? m : n);
      for (let i = 0; i < n; i++) {
        this.elements[i] = [];
        for (let j = 0; j < m; j++) {
          this.elements[i][j] = f;
        }
      }
    }
  }

  toString() {
    return this.elements;
  }

  clone() {
    let m = new Matrix(this.rows, this.cols);
    this.forEach((el, i, j) => (m.elements[i][j] = this.at(i, j)));
    return m;
  }


  get rows() {
    return this.elements.length;
  }

  get cols() {
    if (this.elements.length === 0) return 0;
    return this.elements[0].length;
  }

  at(i, j, val) {
    if (val == null) return this.elements[i][j];
    this.elements[i][j] = val;
    return this.elements[i][j];
  }

  map(fn) {
    let _rows = this.rows, _cols = this.cols;
    for (let i = 0; i < _cols; i++) {
      for (let j = 0; j < _rows; j++) {
        this.elements[i][j] = fn.call(this, this.at(i, j), i, j);
      }
    }
    return this;
  }

  forEach(fn) {
    let _rows = this.rows, _cols = this.cols;
    for (let i = 0; i < _cols; i++) {
      for (let j = 0; j < _rows; j++) {
        fn.call(this, this.at(i, j), i, j);
      }
    }
    return this;
  }

  flatten(transpose) {
    let els = this.elements;
    if (transpose) els = this.transpose().elements;
    return els.reduce((acc, val) => acc.concat(val), []);
  }

  add(/* ...args */) {
    if (this.elements.length === 0) return null;

    if (arguments.length === 1 && typeof arguments[0] === "number") return this.addScalar(arguments[0]);
    if (arguments.length === 1 && Array.isArray(arguments[0])) return this.addVector(arguments[0]);
    if (arguments[0] instanceof Matrix)   return this.addMatrix(arguments[0]);

    return this.addVector(arguments);
  }

  addScalar(n) {
    if (n == null) return this;
    return this.map((el) => (el + n));
  }

  addVector(v) {
    if (v == null) return this;
    return this.map((el, i, j) => (el + (v[j] != null ? v[j] : 0.0)));
  }

  addMatrix(m) {
    if (m == null) return this;
    return this.map((el, i, j) => (this.at(i, j) + m.at(i, j)));
  }

  mul(/* ...args */) {
    if (this.elements.length === 0) return null;

    if (arguments.length === 1 && typeof arguments[0] === "number") return this.mulScalar(arguments[0]);
    if (arguments.length === 1 && Array.isArray(arguments[0])) return this.mulVector(arguments[0]);
    if (arguments[0] instanceof Matrix) return this.mulMatrix(arguments[0]);

    return this.mulVector(arguments);
  }

  mulScalar(n) {
    if (n == null) return this;
    return this.map((el) => (el * n));
  }

  mulVector(v) {
    if (v == null) return this;
    return this.elements.map((row) => row.reduce((acc, el, j) => {
      let _a = (v[j] != null) ? v[j] : 1.0;
      return (acc + el * _a);
    }, 0));
  }

  mulMatrix(m) {
    if (m == null) return this;

    let mx = new Matrix(this.rows, m.cols);
    mx.map((a, i, j) => this.elements[i].reduce((acc, el, k) => (acc + (el * m.at(k, j))), 0.0));

    this.elements = mx.elements;
    return this;
  }

  rotate(a, x = 0.0, y = 0.0, z = 0.0) {
    let s = Math.sin(__rad(a));
    let c = Math.cos(__rad(a));
    let t = (1 - c);

    let mod = Math.sqrt(x*x + y*y + z*z);
    x /= mod; y /= mod; z /= mod;

    return this.mulMatrix(new Matrix([
      [ t * x * x + c,     t * x * y - s * z, t * x * z + s * y,  0.0 ],
      [ t * x * y + s * z, t * y * y + c,     t * y * z - s * x,  0.0 ],
      [ t * x * z - s * y, t * y * z + s * x, t * z * z + c,      0.0 ],
      [       0.0,               0.0,               0.0,          1.0 ],
    ]));
  }

  scale(x = 1.0, y = 1.0, z = 1.0) {
    return this.mulMatrix(new Matrix([
      [  x,  0.0, 0.0, 0.0 ],
      [ 0.0,  y,  0.0, 0.0 ],
      [ 0.0, 0.0,  z,  0.0 ],
      [ 0.0, 0.0, 0.0, 1.0 ],
    ]));
  }

  move(x = 0.0, y = 0.0, z = 0.0) {
    this.elements[0][3] += x;
    this.elements[1][3] += y;
    this.elements[2][3] += z;
    return this;
  }

  translate(x, y, z) {
    this.elements[0][3] = (x != null) ? x : this.elements[0][3];
    this.elements[1][3] = (y != null) ? y : this.elements[1][3];
    this.elements[2][3] = (z != null) ? z : this.elements[2][3];
    return this;
  }

  normalize() {
    let w = this.at(3, 0) + this.at(3, 1) + this.at(3, 2) + this.at(3, 3);
    if (w !== 1) this.map((el) => (el / w));
    return this;
  }

  transpose() {
    let m = new Matrix(this.cols, this.rows);

    this.elements.forEach((row, i) => {
      row.forEach((el, j) => {
        m.at(j, i, el);
      });
    });

    return m;
  }

  // fov - rad
  perspective(fov, aspect, znear, zfar) {
    const ymax = znear * fov;
    const ymin = -ymax;

    const xmin = ymin * aspect;
    const xmax = ymax * aspect;

    return this.frustum(ymin, ymax, xmin, xmax, znear, zfar);
  }

  ortho(bottom, top, left, right, znear, zfar) {
    let x = 2.0 / (right - left);
    let y = 2.0 / (top - bottom);
    let z = 2.0 / (zfar - znear);

    let tx = (right + left) / (right - left);
    let ty = (top + bottom) / (top - bottom);
    let tz = (zfar + znear) / (zfar - znear);

    this.elements = [
      [  x,  0.0, 0.0,   tx ],
      [ 0.0,  y,  0.0,   ty ],
      [ 0.0, 0.0,  z,    tz ],
      [ 0.0, 0.0, 0.0,  1.0 ]
    ];

    return this;
  }

  frustum(bottom, top, left, right, znear, zfar) {
    let x = (2.0) * (znear) / (right - left);
    let y = (2.0) * (znear) / (top - bottom);
    let z = (-1.0) * (zfar + znear) / (zfar - znear);

    let tx = ( 1.0) * (right + left) / (right - left);
    let ty = ( 1.0) * (top + bottom) / (top - bottom);
    let tz = (-2.0) * (zfar * znear) / (zfar - znear);

    this.elements = [
      [  x,  0.0,  tx,  0.0 ],
      [ 0.0,  y,   ty,  0.0 ],
      [ 0.0, 0.0,   z,   tz ],
      [ 0.0, 0.0, -1.0, 0.0 ]
    ];

    return this;
  }

}
