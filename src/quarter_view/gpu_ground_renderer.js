import { QUARTER_PROJECTION } from './camera.js';
import { GROUND_TILE_SIZE, createGroundTexture } from './ground_texture.js';
import { GROUND_VERTEX_SHADER, GROUND_FRAGMENT_SHADER } from './ground_shaders.js';
import { createGroundOverlay } from './ground_overlay.js';

function compile(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const message = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(message);
  }
  return shader;
}
function pipeline(gl) {
  const vertex = compile(gl, gl.VERTEX_SHADER, GROUND_VERTEX_SHADER),
    fragment = compile(gl, gl.FRAGMENT_SHADER, GROUND_FRAGMENT_SHADER);
  const program = gl.createProgram();
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    gl.deleteProgram(program);
    throw new Error('Ground shader link failed');
  }
  gl.useProgram(program);
  const texture = gl.createTexture(),
    data = createGroundTexture();
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, data.width, data.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, data.pixels);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.generateMipmap(gl.TEXTURE_2D);
  const location = (name) => gl.getUniformLocation(program, name);
  gl.uniform1i(location('uTile'), 0);
  gl.uniform2f(location('uTileSize'), GROUND_TILE_SIZE.x, GROUND_TILE_SIZE.z);
  gl.uniform1f(location('uSlope'), QUARTER_PROJECTION.slope);
  return { program, texture, size: location('uSize'), view: location('uView') };
}
export function createGpuGroundRenderer(ctx, world, createSurface) {
  let canvas, gl, state;
  try {
    canvas = createSurface();
    gl = canvas.getContext('webgl2', {
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      preserveDrawingBuffer: true,
    });
    if (!gl || typeof gl.createShader !== 'function') return null;
    state = pipeline(gl);
  } catch {
    return null;
  }
  const maxSize = gl.getParameter(gl.MAX_RENDERBUFFER_SIZE),
    overlay = createGroundOverlay(ctx, world);
  let ready = true,
    previous = null;
  const stats = { groundHits: 0, groundBuilds: 1 };
  canvas.addEventListener('webglcontextlost', (event) => {
    event.preventDefault();
    ready = false;
    previous = null;
  });
  canvas.addEventListener('webglcontextrestored', () => {
    try {
      state = pipeline(gl);
      ready = true;
      previous = null;
      stats.groundBuilds++;
    } catch {
      ready = false;
    }
  });
  const draw = (hero, view) => {
    if (!ready || gl.isContextLost() || world.viewW > maxSize || world.viewH > maxSize) return false;
    const key = [world.viewW, world.viewH, view.x, view.depth, view.zoom];
    if (!previous || key.some((value, i) => value !== previous[i])) {
      if (canvas.width !== world.viewW) canvas.width = world.viewW;
      if (canvas.height !== world.viewH) canvas.height = world.viewH;
      gl.viewport(0, 0, world.viewW, world.viewH);
      gl.uniform2f(state.size, world.viewW, world.viewH);
      gl.uniform3f(
        state.view,
        ((view.x % GROUND_TILE_SIZE.x) + GROUND_TILE_SIZE.x) % GROUND_TILE_SIZE.x,
        view.depth,
        view.zoom
      );
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      previous = key;
    }
    stats.groundHits++;
    ctx.drawImage(canvas, 0, 0);
    overlay(hero, view);
    return true;
  };
  draw.stats = stats;
  return draw;
}
