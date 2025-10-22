// Tiny deterministic LCG for seeded randomness
export function makeRng(seed: number | string) {
  let s =
    typeof seed === 'number'
      ? seed >>> 0
      : Array.from(String(seed)).reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 2166136261);
  if (s === 0) s = 0xdeadbeef;
  return function next() {
    // LCG (Numerical Recipes)
    s = (1664525 * s + 1013904223) >>> 0;
    return (s & 0xffffffff) / 0x100000000; // [0,1)
  };
}
