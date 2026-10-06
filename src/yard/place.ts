export function inYard(x: number, z: number, cols: number, rows: number): boolean {
  return x >= 0 && x < cols && z >= 0 && z < rows
}
