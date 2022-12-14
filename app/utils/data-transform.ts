// input - arr [{a:"id_1", b:2}, {a:"id_2", b:4}], keySelector (obj) => obj.a
// output - {id_1: {}, id_2: {}}
export const _toMap = <T, V = T>(
  arr: T[],
  keySelector: (d: T) => string,
  valueSelector?: (d: T) => V
): Record<string, V> => {
  const map = {};
  for (const d of arr) {
    const key = keySelector(d);
    const value = valueSelector ? valueSelector(d) : d;
    map[key] = value;
  }
  return map;
};

export const _chunk = <T>(array: T[], size: number): T[][] => {
  const result: Array<T[]> = [];
  let i, j;
  for (i = 0, j = array.length; i < j; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
};

// all methods below are not validated

export const _merge = <T, U, V, W>(
  arrA: T[],
  arrB: U[],
  comparator: (a: T, b: U) => boolean, // if true, processing with take place
  matchProcessor: (a: T, b: U) => V,
  noMatchProcessor: (a: T, b: U) => W
) => {
  const res: (V | W)[] = [];
  arrA.forEach((a) => {
    arrB.forEach((b) => {
      if (comparator(a, b)) {
        res.push(matchProcessor(a, b));
      } else {
        res.push(noMatchProcessor(a, b));
      }
    });
  });
  return res;
};

export const _intersection = <T, U, V>(
  arrA: T[],
  arrB: U[],
  comparator: (a: T, b: U) => boolean,
  processor: (a: T, b: U) => V
) => {
  const res: V[] = [];
  arrA.forEach((a) => {
    arrB.forEach((b) => {
      if (comparator(a, b)) {
        res.push(processor(a, b));
      }
    });
  });
  return res;
};

export const _exclude = <T, U, V>(
  arrA: T[],
  arrB: U[],
  comparator: (a: T, b: U) => boolean, // if true, a will be filtered out
  processor: (a: T) => V
) => {
  const res: V[] = [];
  arrA.forEach((a) => {
    const matchB = arrB.find((b) => comparator(a, b));
    // no match
    if (!matchB) {
      res.push(processor(a));
    }
  });
  return res;
};
