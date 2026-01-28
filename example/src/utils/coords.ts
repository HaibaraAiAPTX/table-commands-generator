export function pointToCell(
  p: { x: number; y: number },
  args: { cellWidth: number; cellHeight: number },
): { row: number; col: number } {
  return {
    row: Math.floor(p.y / args.cellHeight),
    col: Math.floor(p.x / args.cellWidth),
  }
}
