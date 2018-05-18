import { BaseTexture, SCALE_MODES } from "pixi.js";
import { BitsyWorld, BitsyPalette, BitsyObject } from "@bitsy/parser";

import { d2xy } from "./hilbert";

const coord2boid: {[index:string]: string[]} = {};
export { coord2boid };

export class MTexture
{
    public base: BaseTexture;
    public context: CanvasRenderingContext2D;
    public canvas: HTMLCanvasElement;

    public constructor(width: number, height: number)
    {
        this.canvas = document.createElement('canvas');
        this.canvas.width = width;
        this.canvas.height = height;
    
        this.context = this.canvas.getContext("2d")!;
        this.base = new BaseTexture(this.canvas, SCALE_MODES.NEAREST);
    }
}

function findPalette(world: BitsyWorld): BitsyPalette | null
{
    let palette: BitsyPalette | null = null;

    if ("0" in world.palettes)
    {
        palette = world.palettes["0"];

        if (palette.background != palette.tile)
        {
            return palette;
        }
    }

    for (let id in world.palettes)
    {
        palette = world.palettes[id];

        if (palette.background != palette.tile)
        {
            return palette;
        }
    }

    return palette;
}

export function renderObject(mtex: MTexture, 
                             index: number, 
                             object: BitsyObject,
                             palette: BitsyPalette,
                             entry: string[],
                             frame: number): void
{
    const h = d2xy(index);
    const tx = h.x;
    const ty = h.y;

    coord2boid[`${tx},${ty}`] = entry;

    const data = mtex.context.getImageData(tx * 8, ty * 8, 8, 8);
    const buf = new ArrayBuffer(data.data.length);
    const buf8 = new Uint8ClampedArray(buf);
    const buf32 = new Uint32Array(buf);

    const graphic = object.graphic[frame % object.graphic.length];
    
    const fg = palette.colors[object.palette];
    const bg = palette.background;

    for (let i = 0; i < 64; ++i)
    {
        buf32[i] = graphic[i] ? fg : bg;
    }

    data.data.set(buf8);
    mtex.context.putImageData(data, tx * 8, ty * 8);
}

let queue: [BitsyPalette, BitsyObject, string[]][] = [];
export { queue };

export function queueGraphics(world: 
                              BitsyWorld, 
                              entry: string[],
                              tiles: boolean = true,
                              sprites: boolean = true,
                              items: boolean = true): void
{
    const palette = findPalette(world);

    if (palette)
    {
        if (tiles)
        {
            const ids = Object.keys(world.tiles);
            for (let i = 0; i < ids.length; ++i)
            {
                const tile = world.tiles[ids[i]];

                queue.push([palette, tile, entry]);
            }
        }

        if (sprites)
        {
            const ids = Object.keys(world.sprites);
            for (let i = 0; i < ids.length; ++i)
            {
                const tile = world.sprites[ids[i]];

                queue.push([palette, tile, entry]);
            }
        }

        if (items)
        {
            const ids = Object.keys(world.items);
            for (let i = 0; i < ids.length; ++i)
            {
                const tile = world.items[ids[i]];

                queue.push([palette, tile, entry]);
            }
        }
    }
}

export function renderQueuedTile(frame1: MTexture, 
                                 frame2: MTexture,
                                 offset: number): number
{
    if (queue.length == 0) return offset;

    const item = queue.shift()!;

    renderObject(frame1, offset, item[1], item[0], item[2], 0);
    renderObject(frame2, offset, item[1], item[0], item[2], 1);
    frame1.base.update();
    frame2.base.update();

    return (offset + 1) % 4096;
}
