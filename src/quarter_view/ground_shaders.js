export const GROUND_VERTEX_SHADER = `#version 300 es
const vec2 positions[3] = vec2[3](vec2(-1.,-1.),vec2(3.,-1.),vec2(-1.,3.));
void main() { gl_Position=vec4(positions[gl_VertexID],0.,1.); }
`;
export const GROUND_FRAGMENT_SHADER = `#version 300 es
precision highp float;
uniform sampler2D uTile;
uniform vec2 uSize;
uniform vec3 uView;
uniform vec3 uProjection;
uniform vec2 uTileSize;
out vec4 color;
void main() {
  vec3 base=vec3(23.,37.,31.)/255.;
  float screenZ=(uSize.y-gl_FragCoord.y-uSize.y*.58)/uView.z;
  float denominator=uProjection.x*uProjection.z+screenZ*uProjection.y;
  if(denominator<=0.) { color=vec4(base,1.);return; }
  float relativeZ=screenZ*uProjection.z/denominator;
  float z=uView.y+relativeZ;
  if(abs(z)>2000.) { color=vec4(base,1.);return; }
  float scale=uProjection.z/(uProjection.z-relativeZ*uProjection.y);
  float x=uView.x+(gl_FragCoord.x-uSize.x*.5)/(uView.z*scale);
  vec2 grid=vec2(x/(uTileSize.x*.5)+z/uTileSize.y,x/(uTileSize.x*.5)-z/uTileSize.y);
  float row=floor(grid.x+.5)-floor(grid.y+.5);
  if(abs(row)>24.) { color=vec4(base,1.);return; }
  vec2 uv=vec2(z<0.?-x:x,abs(z))/uTileSize;
  vec3 tile=texture(uTile,uv).rgb;
  vec2 distanceToEdge=abs(fract(grid)-vec2(.5))/max(fwidth(grid),vec2(.000001));
  float edge=1.-smoothstep(0.,.75,min(distanceToEdge.x,distanceToEdge.y));
  color=vec4(mix(tile,vec3(113.,130.,106.)/255.,edge*(37./255.)),1.);
}
`;
