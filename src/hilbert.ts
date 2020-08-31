const flipXY = (point: { x: number, y: number }) => ({ x: point.y, y: point.x });

export function d2xy(d: number) {
    d = Math.floor(d);
    let curPos = { x: 0, y: 0 };
    let s = 1;
    let iter = 0;
    let size = 0;
    
    while (d > 0 || s < size) {
        let ry = 1 & (d / 2);
        let rx = 1 & (ry ^ d);

        if (rx == 0) {
            if (ry == 1) {
                curPos = {
                    x: s - 1 - curPos.x,
                    y: s - 1 - curPos.y
                };
            }
            curPos = flipXY(curPos);
        }

        curPos = {
            x: curPos.x + s * rx,
            y: curPos.y + s * ry
        };

        s *= 2;
        d = Math.floor(d / 4);
        iter = (iter + 1) % 2;
    }

    return iter === 0 ? flipXY(curPos) : curPos;
};
