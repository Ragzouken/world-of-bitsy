import { Texture, Rectangle, SCALE_MODES } from "pixi.js";
import { BitsyWorld } from "@bitsy/parser";

export function renderTileset(world: BitsyWorld): Texture[]
{
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;

    const context = canvas.getContext("2d")!;

     // can just straight up create this?
    const base = Texture.fromCanvas(canvas).baseTexture;
    base.scaleMode = SCALE_MODES.NEAREST;

    const textures: Texture[] = [];
    const ids = Object.keys(world.tiles);
    const fg = 0xFFFFFFFF;//world.palettes["0"].tile;
    const bg = 0xFF0000FF;//world.palettes["0"].background;

    for (let i = 0; i < ids.length; ++i)
    {
        const tile = world.tiles[ids[i]];

        const tx = i % 32;
        const ty = Math.floor(i / 32);

        const rect = new Rectangle(tx * 8, ty * 8, 8, 8);
        textures.push(new Texture(base, rect));

        const data = context.getImageData(tx * 8, ty * 8, 8, 8);
        const buf = new ArrayBuffer(data.data.length);
        const buf8 = new Uint8ClampedArray(buf);
        const buf32 = new Uint32Array(buf);

        const frame = tile.graphic[0];

        for (let i = 0; i < 64; ++i)
        {
            buf32[i] = frame[i] ? fg : bg;
        }

        data.data.set(buf8);
        context.putImageData(data, tx * 8, ty * 8);
    }

    base.update();

    return textures;
}

function renderTile2(buffer : Uint32Array,
                     foreground : number,
                     background : number,
                     pixels : boolean[]) : void
{
    for (let i = 0; i < 64; ++i)
    {
        buffer[i] = pixels[i] ? foreground : background;
    }
}

export function renderTile(context : CanvasRenderingContext2D,
                           foreground : number, 
                           background : number, 
                           pixels : boolean[]) : void
{
    const data = context.getImageData(0, 0, 8, 8);
    const buf = new ArrayBuffer(data.data.length);
    const buf8 = new Uint8ClampedArray(buf);

    renderTile2(new Uint32Array(buf), foreground, background, pixels);

    data.data.set(buf8);
    context.putImageData(data, 0, 0);
}
