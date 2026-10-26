export const GROUND_VERTEX_SHADER = `#version 300 es
const vec2 positions[3] = vec2[3](vec2(-1.,-1.),vec2(3.,-1.),vec2(-1.,3.));
void main() { gl_Position=vec4(positions[gl_VertexID],0.,1.); }
`;
export const GROUND_FRAGMENT_SHADER = `#version 300 es
precision highp float;
uniform sampler2D uTile;
uniform vec2 uSize;
uniform vec3 uView;
uniform float uSlope;
uniform vec2 uTileSize;
out vec4 color;
void main() {
  float z=uView.y+(uSize.y-gl_FragCoord.y-uSize.y*.58)/(uView.z*uSlope);
  float x=uView.x+(gl_FragCoord.x-uSize.x*.5)/uView.z;
  vec2 uv=vec2(x,z)/uTileSize;
  color=vec4(texture(uTile,uv).rgb,1.);
}
`;
