export function spiral(width: number, height: number) {
  const cells: [number, number][] = [];
  let x = 0,
    y = 0,
    dx = 0,
    dy = -1,
    direction_switch = true;

  for (let i = 0; i < width * height; i++) {
    if (
      -width / 2 < x &&
      x <= width / 2 &&
      -height / 2 < y &&
      y <= height / 2
    ) {
      cells.push([x, y]);
    }

    if (
      (direction_switch && x === y) ||
      (x < 0 && x === -y) ||
      (x > 0 && x === 1 - y)
    ) {
      [dx, dy] = [-dy, dx];
      direction_switch = x !== y || dx === -1;
    }

    x += dx;
    y += dy;
  }

  return cells;
}
