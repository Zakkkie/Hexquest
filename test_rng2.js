const makeRng = (seed) => {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  s = (s * 16807) % 2147483647;
  s = (s * 16807) % 2147483647;
  s = (s * 16807) % 2147483647;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
};

let count = 0;
for (let i = 0; i < 1000; i++) {
  const rng = makeRng(i);
  if (rng() < 0.002) count++;
}
console.log(count);
