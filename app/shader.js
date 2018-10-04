class Shader {

  constructor(id) {
    let shaderScript, currentChild;

    shaderScript = document.getElementById(id);
    currentChild = shaderScript && shaderScript.firstChild;

    let rawShader = '';
    while(currentChild) {
      if (currentChild.nodeType === currentChild.TEXT_NODE) {
        rawShader += currentChild.textContent;
      }
      currentChild = currentChild.nextSibling;
    }

    this.type = shaderScript && shaderScript.type;
    this._raw = rawShader.replace(/[^\x00-\x7F]/g, "");
  }

  compile(gl, program) {
    if (this.type === "x-shader/x-fragment") {
      this.shader = gl.createShader(gl.FRAGMENT_SHADER);
    } else if (this.type === "x-shader/x-vertex") {
      this.shader = gl.createShader(gl.VERTEX_SHADER);
    } else {
      throw new Error('Shader not supported: ' + this.type);
    }

    gl.shaderSource(this.shader, this._raw);
    gl.compileShader(this.shader);

    if (!gl.getShaderParameter(this.shader, gl.COMPILE_STATUS)) {
      throw new Error("Shader compile error: " + gl.getShaderInfoLog(this.shader));
    }

    if (program) this.attach(gl, program);

    return this;
  }

  attach(gl, program) {
    gl.attachShader(program, this.shader);
    return this;
  }

}
