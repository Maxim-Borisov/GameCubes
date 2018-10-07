const GRID_SIZE = 15;

function _randInt(max = 20, min = 0) {
  return Math.round(Math.random() * (max - min)) + min;
}

//Generate random value between 5 and 25 (inclusive)
function _randomInteger(min = 5, max = 20){
  let value = Math.floor(Math.random() * (max - min + 1)) + min;
  return value;
}

class Scene {

  constructor() {
    this._now = Date.now();
    this._counter = 0;
    this._frequency = _randomInteger(); //The frequency of appearance of new cubes on the scene
                                        //The second cube will appear after _frequency scene updates
    this._items   = [];
    this._lastPos = null;

    this.light  = [ 0.0, 0.0, 0.0 ];
    this.camera = new Camera();

    this.pause = true;
    this._colorIdBuffer; //
  }

  initGL(canvas, fov = 60, scale = GRID_SIZE) {
    let gl, aspect;

    try {
      gl = canvas.getContext("webgl");
    } catch (e) { /* ... */ }

    if (!gl) {
      window.alert('WebGL is not supported by this version of browser. Try to update browser to the latest available version.');
      return null;
    }

    gl.viewport(0, 0, canvas.width, canvas.height);
    aspect = (canvas.width / canvas.height);

    this.gl = gl;
    this._canvas = canvas;

    this.camera.setup(fov, aspect, 0.1, 100, scale);

    let prog = this.gl.createProgram();

    new Shader('shader-vsh').compile(gl, prog);
    new Shader('shader-fsh').compile(gl, prog);

    this.gl.linkProgram(prog);

    if (!this.gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      throw new Error("Unable to initialize the shader program:\n" + gl.getProgramInfoLog(prog));
    }

    this.prog = prog;
    // this.initItems();
    this.debugScene(this.camera._aspect);

    return this;
  }

  clearScene() {
    this._items.forEach(el => el.destroy());
    this._items = [];
  }

  clearCounter() {
    this._counter = 0;
  }

  start(enabled) {
    this.pause = (enabled != null ? !enabled : true);

    if (this.pause && this._counter) {
      this.clearCounter();
    }

    this.clearScene();

    if (!this.pause && !this._counter) {
      this.addRandomItem();
    }
  }

  loop(timeout) {

    this.drawScene(); //

    if (!this.pause && (Date.now() - this._now) > timeout) {
      this.animate();

      this._now = Date.now();

      if(this._counter === this._frequency) { //After _frequency scene updates
        this.addRandomItem(); //Add new cube
        this._counter = 0; //Clear the counter
        this._frequency = _randomInteger(); //Determine when the next cube will appear
        //console.log("Next cube will appear after: " + this._frequency + " updates");
      }

      this._counter++;
    }
  }

  point(x, y, z) {
    let v = __v.apply(this, arguments);

    let fov   = this.camera.fieldOfView;
    let ratio = this.camera.aspectRatio;

    let k  = Math.cos(__rad(90 - 0.5 * fov));

    let halfWidth  = 0.5 * GRID_SIZE;
    let halfHeight = 0.5 * GRID_SIZE;

    let dx = (halfWidth  - Math.sqrt(v.x * v.x)) * (0.5 - k);
    let dy = (halfHeight - Math.sqrt(v.y * v.y)) * (0.5 - k);

    let fx = ((v.x - halfWidth) / halfWidth) * (1.0 - ratio);
    fx = (v.x * fx / v.x) || 0;

    v.x = (v.x + dx) * ratio - fx;
    v.y = (v.y + dy);

    return v;
  }

  addRandomItem() {
    let pt = {x: _randInt(GRID_SIZE), y: 0, z: _randInt(3)};
    let rt = {x: 90 * _randInt(4), y: 90 * _randInt(4)};
    new Cube(this, '' + pt.x + '-' + pt.y + '-' + pt.z).move(pt).rotate(rt);
    this._sortItems();
  }

  addItem(item) {
    if (item && item.addToScene) {
      this._items.push(item);
    }
  }

  _sortItems() {
    this._items.sort((a, b) => {
      return (a.pos.z - b.pos.z);
    });
  }

  removeItem(idx) {
    let item = this._items.splice(idx, 1)[0];
    item && item.destroy();
  }

  setUniformMat4fv(param, mat) {
    let pUniform = this.gl.getUniformLocation(this.prog, param);
    this.gl.uniformMatrix4fv(pUniform, false, new Float32Array((mat instanceof Matrix) ? mat.flatten() : mat));
  }

  setUniformVec3fv(param, mat) {
    let pUniform = this.gl.getUniformLocation(this.prog, param);
    this.gl.uniform3fv(pUniform, new Float32Array((mat instanceof Matrix) ? mat.flatten() : mat));
  }

  //
  setUniformVec4fv(param, mat) {
    let pUniform = this.gl.getUniformLocation(this.prog, param); //
    this.gl.uniform4fv(pUniform, new Float32Array((mat instanceof Matrix) ? mat.flatten() : mat)); //
  }

  //
  setUniform1i(param, value){
    let pUniform = this.gl.getUniformLocation(this.prog, param);
    this.gl.uniform1i(pUniform, value); //
  }

  newElementArray(array) {
    let gl = this.gl;

    let buffer = gl.createBuffer();

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, array, gl.STATIC_DRAW);

    return buffer;
  }

  newAttributeArray(array) {
    let gl = this.gl;

    let buffer = gl.createBuffer();

    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, array, gl.STATIC_DRAW);

    return buffer;
  }

  bindElementArray(buffer) {
    this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, buffer);
  }

  bindAttributeArray(name, n, buffer, stride = 0, offest = 0) {
    let gl = this.gl;

    let ptr = gl.getAttribLocation(this.prog, name);
    gl.enableVertexAttribArray(ptr);

    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.vertexAttribPointer(ptr, n, gl.FLOAT, false, stride, offest);
  }

  releaseAttributeArray(name) {
    let gl = this.gl;

    let ptr = gl.getAttribLocation(this.prog, name);
    gl.disableVertexAttribArray(ptr);
  }

  removeGLBuffer(buffer) {
    let gl = this.gl;
    gl.deleteBuffer(buffer);
  }

  // TODO: map to absolute 2d coordinate
  // below is example mapping
  _mapMousePosition(x, y) {
    return ({ // convert to [-1..1] range
      x: 2.0 * ((x - this._canvas.offsetLeft) - 0.5 * this._canvas.clientWidth) / this._canvas.clientWidth,
      y: 2.0 * (0.5 * this._canvas.clientHeight - (y - this._canvas.offsetTop)) / this._canvas.clientHeight,
      z: 0
    });
  }

//=================================== CONTROLLING ===================================

  //
  getCoordinates(ev){
  let x, y;
  let topIndent = 0;
  let leftIndent = 0;
  let object = this._canvas;

  while (object && object.tagName !== "body"){ //
    topIndent   += object.offsetTop;
    leftIndent  += object.offsetLeft;
    object = object.offsetParent; //
  }

  //
  leftIndent += window.pageXOffset;
  topIndent  -= window.pageYOffset;

  //
  x = ev.clientX - leftIndent;
  y = this._canvas.offsetHeight - (ev.clientY - topIndent);

  console.log("Coordinate X: " + x + " | Coordinate Y: " + y);
  return {x: x, y: y};
  }

  //
  getPixelColor(coordinates){
    let gl = this.gl;
    let pixelColor = new Uint8Array(4); //1 px * 1 px * 4 byte

    gl.bindFramebuffer(gl.FRAMEBUFFER, this._colorIdBuffer); //
    gl.readPixels(coordinates.x, coordinates.y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixelColor); //
    gl.bindFramebuffer(gl.FRAMEBUFFER, null); //

    console.log("Pixel color: " + pixelColor);
    return pixelColor;
  }

  //
  compareColors(pixelColor, colorId){
    return (
      Math.abs(Math.round(colorId[0]*255) - pixelColor[0]) <= 1 && //
      Math.abs(Math.round(colorId[1]*255) - pixelColor[1]) <= 1 &&
      Math.abs(Math.round(colorId[2]*255) - pixelColor[2]) <= 1
    );
  }

  mousePress(ev) {
    let coordinates = this.getCoordinates(ev);

    let pixelColor = this.getPixelColor(coordinates);

    let cubeNumber = this._items.findIndex(el => {
      return this.compareColors(pixelColor, el._colorId);
    });

    console.log("Cube Number:  " + cubeNumber);
  }

  mouseMove(ev) {

  }

  mouseRelease(ev) {

  }

  mouseClick(x, y, z) {

  }

  itemSelected(item, idx) {

  }

  // TODO: use above grid to debug scene
  debugScene() {
    for (let i = 0; i <= GRID_SIZE; i++) {
      for (let j = 0; j <= GRID_SIZE; j++) {
        if ((i + j) % 2) {
          new Cube(this, '' + j + '-' + i).move(this.point(i, j, 3));
        }
      }
    }

    this._sortItems();
  }

//=================================== DRAWING ===================================
  //Create texture buffer which will hold colorId information
  createTexBuffer(gl, width, height){
    let textureBuffer = gl.createTexture(); //

    gl.bindTexture(gl.TEXTURE_2D, textureBuffer); //
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null); //

    //Texture settings
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);

    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, textureBuffer, 0); //
  }

  //Create render buffer which will hold depth information
  createRenderBuffer(gl, width, height){
   let depthBuffer = gl.createRenderbuffer(); //

    gl.bindRenderbuffer(gl.RENDERBUFFER, depthBuffer); //
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, width, height); //
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depthBuffer); //
   }

  //Сleaning up
  finalize(gl){
    gl.bindRenderbuffer(gl.RENDERBUFFER, null);
    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  //
  createFrameBuffer(gl){
    let framebuffer = gl.createFramebuffer(); //
    let width = this._canvas.width;
    let height = this._canvas.height;

    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer); //

    this.createTexBuffer(gl, width, height);

    this.createRenderBuffer(gl, width, height);

    this.finalize(gl);

    return framebuffer; //
  }

  drawScene(){
    let gl = this.gl;    // OpenGL context
    let pl = this.prog;  // Shader pipeline program

    //Initialization section
    gl.useProgram(pl);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);

    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);

    gl.depthFunc(gl.LEQUAL);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    //Working section
    this._colorIdBuffer = this.createFrameBuffer(gl); //

    this.setUniformVec3fv('u_LightPos', this.light);

    //Off-screen rendering
    this.setUniform1i("u_OffScreen", true); //

    gl.bindFramebuffer(gl.FRAMEBUFFER, this._colorIdBuffer);
    this.camera.render(this);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    this.setUniform1i("u_OffScreen", true);

    //On-screen rendering
    this.camera.render(this);

    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.CULL_FACE);

    gl.flush();

  }

  drawElements(count, mode, type) {
    let gl = this.gl;
    gl.drawElements(mode || gl.TRIANGLES, count, type || gl.UNSIGNED_SHORT, 0);
  }


  renderItems() {
    this._items.forEach(el => el.render(this));
  }

  animate() {
    let pt = this.point(0, GRID_SIZE, 0);
    this._items.forEach(el => {
      //console.log("The speed of cube id " + el._id + " is " + el._speed);
      //console.log("The position of cube id " + el._id + " is " + el.pos.y);
      // TODO: add check for collision with existing cubes
      //if (el.pos.y < pt.y) el.move(0, 1, 0);
      if((el.pos.y + el._speed) > pt.y){ //If cube on the next iteration given its current speed will stop below the floor
        el.move(0, (pt.y - el.pos.y), 0); //Reduce its speed to the value that will allow it to stop at floor level
      }

      if (el.pos.y < pt.y){ //If cube not near the floor
        el.move(0, el._speed, 0); //Just move it considering its speed
      }
    });
  }
}
