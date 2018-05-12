export class BitsyWorld
{
    public palettes: {[index:string]: BitsyPalette} = {};
    public tiles: {[index:string]: BitsyTile} = {};
}

export class BitsyTile
{
    public id: string;
    public name: string;
    public graphic: BitsyGraphic;
}

export type BitsyGraphicFrame = boolean[];
export type BitsyGraphic = BitsyGraphicFrame[];

export class BitsyPalette
{
    public id: string;
    public name: string;
    public colors: number[];

    public constructor()
    {
        this.colors = [];
    }

    public get background(): number { return this.colors[0]; }
    public get tile(): number { return this.colors[1]; }
    public get sprite(): number { return this.colors[2]; }
}

export function parseBitsy(lines: string[]) : BitsyWorld
{
    let lineCounter = 0;

    const world = new BitsyWorld();

    function done(): boolean
    {
        return lineCounter >= lines.length;
    }

    function checkLine(check: string)
    {
        return lines[lineCounter].startsWith(check);
    }

    function checkBlank()
    {
        return done() || lines[lineCounter].trim().length == 0;
    }

    function skipLine()
    {
        console.log("SKIP " + takeLine());
    }

    function takeLine(): string
    {
        const line = lines[lineCounter];
        lines[lineCounter] = "";
        lineCounter += 1;

        return line;
    }

    function takeSplit(delimiter: string) : string[]
    {
        return takeLine().split(delimiter);
    }

    function takeSplitOnce(delimiter: string) : [string, string]
    {
        const line = takeLine();
        const i = line.indexOf(delimiter);
        
        return [line.slice(0, i), line.slice(i + delimiter.length)]; 
    }

    function takeColor(): number
    {
        const [r, g, b] = takeSplit(",");
        
        return (parseInt(r) << 24)
             | (parseInt(g) << 16)
             | (parseInt(b) <<  8)
             | 255;
    }

    function tryTakeName(object: {"name": string})
    {
        object.name = checkLine("NAME") ? takeSplitOnce(" ")[1] : "";
    }

    function takePalette()
    {
        const palette = new BitsyPalette();
        palette.id = takeSplitOnce(" ")[1];
        
        tryTakeName(palette);

        while (!checkBlank())
        {
            palette.colors.push(takeColor());
        }

        world.palettes[palette.id] = palette;
    }

    function takeFrame(): BitsyGraphicFrame
    {
        const frame: BitsyGraphicFrame = new Array(64).fill(false);

        for (let i = 0; i < 8; ++i)
        {
            const line = takeLine();

            for (let j = 0; j < 8; ++j)
            {
                frame[i * 8 + j] = line.charAt(j) == "1";
            }
        }

        return frame;
    }

    function takeGraphic(): BitsyGraphic
    {
        const graphic: BitsyGraphic = [];

        do
        {
            graphic.push(takeFrame());
        }
        while (checkLine(">"));
        
        return graphic;
    }

    function takeTile()
    {
        const tile = new BitsyTile();
        tile.id = takeSplitOnce(" ")[1];

        tile.graphic = takeGraphic();
        tryTakeName(tile);

        world.tiles[tile.id] = tile;
    }

    while (!done())
    {
             if (checkLine("PAL")) takePalette();
        else if (checkLine("TIL")) takeTile();
        else
        {
            while (!checkBlank())
            {
                skipLine();
            }

            skipLine();
        }
    }

    return world;
}
