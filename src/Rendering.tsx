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
