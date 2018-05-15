export type Point = {"x": number, "y": number}

function invert(point: Point) 
{
  return {
    x: point.y,
    y: point.x
  };
}

function maybeRotate(point: Point, iter: number): Point
{
  const anchorAxisOrder = 'xy';

  if (anchorAxisOrder == 'xy') {
    if (iter == 0) {
      return invert(point);
    }
  } else {
    if (iter == 1) {
      return invert(point);
    }
  }

  return point;
};

export function d2xy(d: number): Point
{
  d = Math.floor(d);
  var curPos = {
    x: 0,
    y: 0
  };
  var s = 1;
  var iter = 0;
  var size = 0;
  while (d > 0 || s < size) {
    var ry = 1 & (d / 2);
    var rx = 1 & (ry ^ d);

    // Rotate, if need be
    if (rx == 0) {
      if (ry == 1) {
        curPos = {
          x: s - 1 - curPos.x,
          y: s - 1 - curPos.y
        };
      }
      curPos = invert(curPos);
    }

    curPos = {
      x: curPos.x + s * rx,
      y: curPos.y + s * ry
    };

    s *= 2;
    d = Math.floor(d / 4);
    iter = (iter + 1) % 2;
  }

  return maybeRotate(curPos, iter);
};
