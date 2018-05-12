import * as fs from 'fs';

class BitsyPalette
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

const data = fs.readFileSync("tools/955B75C9.bitsy.txt", "UTF-8");
const lines = data.split("\r\n");

function parseBitsy(lines: string[])
{
    let lineCounter = 0;

    const palettes = {}

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
        return done() || lines[lineCounter].length == 0;
    }

    function skipLine()
    {
        takeLine();
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

    function takePalette()
    {
        const palette = new BitsyPalette();
        palette.id = takeSplitOnce(" ")[1];
        palette.name = checkLine("NAME") ? takeSplitOnce(" ")[1] : "";

        while (!checkBlank())
        {
            palette.colors.push(takeColor());
        }

        palettes[palette.id] = palette;

        console.log(palette);
    }

    while (!done())
    {
        if (checkLine("PAL"))
        {
            takePalette();
        }
        else
        {
            while (!checkBlank())
            {
                skipLine();
            }

            skipLine();
        }
    }
}

parseBitsy(lines);
