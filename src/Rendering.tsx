import { BaseTexture, SCALE_MODES } from "pixi.js";
import { BitsyWorld, BitsyPalette, BitsyTile } from "@bitsy/parser";

import { d2xy } from "./hilbert";

export class MTexture
{
    public base: BaseTexture;
    public context: CanvasRenderingContext2D;

    public constructor(width: number, height: number)
    {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
    
        this.context = canvas.getContext("2d")!;
        this.base = new BaseTexture(canvas, SCALE_MODES.NEAREST);
    }
}

function findPalette(world: BitsyWorld): BitsyPalette | null
{
    let palette: BitsyPalette | null = null;

    for (let id in world.palettes)
    {
        let possible = world.palettes[id];

        if (possible.background != possible.tile)
        {
            palette = possible;
            break;
        }
    }

    return palette;
}

export function renderTile(mtex: MTexture, 
                           index: number, 
                           tile: BitsyTile,
                           palette: BitsyPalette): void
{
    const h = d2xy(index);
    const tx = h.x;
    const ty = h.y;

    const data = mtex.context.getImageData(tx * 8, ty * 8, 8, 8);
    const buf = new ArrayBuffer(data.data.length);
    const buf8 = new Uint8ClampedArray(buf);
    const buf32 = new Uint32Array(buf);

    const frame = tile.graphic[0];
    const fg = palette.tile;
    const bg = palette.background;

    for (let i = 0; i < 64; ++i)
    {
        buf32[i] = frame[i] ? fg : bg;
    }

    data.data.set(buf8);
    mtex.context.putImageData(data, tx * 8, ty * 8);
}

export function renderTileset(world: BitsyWorld, mtex: MTexture | null = null, offset: number): number
{
    if (!mtex) 
    {
        mtex = new MTexture(512, 512);
    }

    const ids = Object.keys(world.tiles);
    const palette = findPalette(world);

    if (palette)
    {
        for (let i = 0; i < ids.length; ++i)
        {
            const tile = world.tiles[ids[i]];

            offset = (offset + 1) % 4096;

            renderTile(mtex, offset, tile, palette);
        }
    }

    mtex.base.update();

    return offset;
}
