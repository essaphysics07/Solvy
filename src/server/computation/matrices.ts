import { Rational, ZERO, ONE } from "./rational.ts";
export type Matrix = readonly (readonly Rational[])[];
export function dimensions(a: Matrix) {
  if (
    !a.length ||
    a.length > 5 ||
    !a[0].length ||
    a[0].length > 10 ||
    a.some((r) => r.length !== a[0].length)
  )
    throw new Error("Matrix dimensions must be bounded and rectangular");
  return { rows: a.length, columns: a[0].length };
}
export function identity(n: number): Rational[][] {
  if (!Number.isInteger(n) || n < 1 || n > 5) throw new Error("Matrix size");
  return Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => (i === j ? ONE : ZERO)),
  );
}
export function matrixMultiply(a: Matrix, b: Matrix): Rational[][] {
  const x = dimensions(a),
    y = dimensions(b);
  if (x.columns !== y.rows) throw new Error("Incompatible matrices");
  return a.map((row) =>
    Array.from({ length: y.columns }, (_, j) =>
      row.reduce((sum, c, k) => sum.add(c.mul(b[k][j])), ZERO),
    ),
  );
}
export function rref(a: Matrix, pivotColumns = dimensions(a).columns) {
  const { rows, columns } = dimensions(a);
  if (pivotColumns < 1 || pivotColumns > columns)
    throw new Error("Pivot columns");
  const out = a.map((r) => [...r]),
    pivots: number[] = [];
  let row = 0;
  for (let col = 0; col < pivotColumns && row < rows; col++) {
    const pivot = out.findIndex((r, i) => i >= row && !r[col].zero);
    if (pivot < 0) continue;
    [out[row], out[pivot]] = [out[pivot], out[row]];
    const divisor = out[row][col];
    out[row] = out[row].map((x) => x.div(divisor));
    for (let i = 0; i < rows; i++)
      if (i !== row) {
        const factor = out[i][col];
        out[i] = out[i].map((x, j) => x.sub(factor.mul(out[row][j])));
      }
    pivots.push(col);
    row++;
  }
  return { matrix: out, pivots };
}
export function determinant(a: Matrix): Rational {
  const { rows, columns } = dimensions(a);
  if (rows !== columns) throw new Error("Square matrix required");
  const out = a.map((r) => [...r]);
  let result = ONE;
  for (let col = 0; col < rows; col++) {
    const pivot = out.findIndex((r, i) => i >= col && !r[col].zero);
    if (pivot < 0) return ZERO;
    if (pivot !== col) {
      [out[pivot], out[col]] = [out[col], out[pivot]];
      result = result.neg();
    }
    const value = out[col][col];
    result = result.mul(value);
    for (let i = col + 1; i < rows; i++) {
      const factor = out[i][col].div(value);
      for (let j = col; j < rows; j++)
        out[i][j] = out[i][j].sub(factor.mul(out[col][j]));
    }
  }
  return result;
}
