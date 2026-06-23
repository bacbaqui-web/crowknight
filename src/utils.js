export function loadImages(map) {
  return Promise.all(
    Object.entries(map).map(
      ([k, s]) =>
        new Promise((res, rej) => {
          const i = new Image();
          i.onload = () => res([k, i]);
          i.onerror = () => rej(new Error(s));
          i.src = s;
        })
    )
  ).then(Object.fromEntries);
}
export const deg = (v) => (v * Math.PI) / 180;
export const lerp = (a, b, t) => a + (b - a) * t;
export const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
export const clone = (value) => JSON.parse(JSON.stringify(value));

export function getPath(source, path) {
  return path.reduce((current, key) => current[key], source);
}

export function setPath(source, path, value) {
  const key = path.at(-1);
  const parent = path.slice(0, -1).reduce((current, item) => current[item], source);
  parent[key] = value;
}
