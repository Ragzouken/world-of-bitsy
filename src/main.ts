import { BitsyParser, BitsyWorld, BitsyPalette, BitsyObject } from "@bitsy/parser";
import * as csvparse from 'csv-parse';
import { withPixels } from "./utility";
import { d2xy } from "./hilbert";

async function parsecsv(text: string): Promise<string[][]> {
    return new Promise((resolve, reject) => {
        csvparse(text, (error, records) => {
            if (error) reject(error);
            else resolve(records);
        });
    });
}

window.addEventListener('load', load);

async function load() {
    const renderer = document.getElementById('renderer') as HTMLCanvasElement;
    const rendererContext = renderer.getContext('2d')!;

    function onResize() {
        const vh = window.innerHeight / 100;
        document.documentElement.style.setProperty('--vh', `${vh}px`);

        renderer.width = document.body.clientWidth;
        renderer.height = document.body.clientHeight;
    }
    window.addEventListener('resize', onResize);
    onResize();

    let index: string[][] = [];
    const missing = new Set<string>();
    
    const indexGetting = fetch("https://raw.githubusercontent.com/Ragzouken/bitsy-archive/main/index.txt")
    .then(res => res.text())
    .then(text => parsecsv(text))
    .then(csv => index = csv);

    const missingGetting = fetch("https://raw.githubusercontent.com/Ragzouken/bitsy-archive/main/missing.txt")
    .then(res => res.text())
    .then(text => 
    {
        let lines = text.split("\n");

        for (let line of lines)
        {
            const i = line.indexOf(",");
            const author = line.slice(i + 1).trim();
            missing.add(author);
        }
    });

    const rendering = new Rendering();

    async function fetchWorld(boid: string) {
        const url = `https://raw.githubusercontent.com/Ragzouken/bitsy-archive/main/${boid}.bitsy.txt`;
        return fetch(url).then(res => res.text()).then(text => BitsyParser.parse(text.split("\n")));
    }

    async function addTileset(boid: string, csvRow: string[]) {
        try {
            const world = await fetchWorld(boid);
            rendering.queueBitsy(world, csvRow);
        } catch (e) {}
    }

    const shuffle = false;

    const fetchQueue: string[][] = [];
    const tried = new Set<string>();

    async function loadNext() {
        const csvRow = fetchQueue.shift();

        if (!csvRow) return true;

        const boid = csvRow[0];
        tried.add(boid);

        const author = csvRow[3].trim();
        if (author in missing) return false;
      
        addTileset(boid, csvRow);
      
        return true;
    }

    function renderQueuedTile(
        frame1: CanvasRenderingContext2D, 
        frame2: CanvasRenderingContext2D,
        offset: number,
    ): number {
        const item = rendering.queue.shift();

        if (!item) return offset;

        renderObject(frame1, offset, item.tile, item.palette, item.csvRow, 0);
        renderObject(frame2, offset, item.tile, item.palette, item.csvRow, 1);

        return (offset + 1) % 4096;
    }

    function grow() {
        const prev = textures[textureIndex];
        textureIndex += 1;
        const next = textures[textureIndex];

        const w = prev[0].canvas.width;
        const h = prev[0].canvas.height;

        for (let i = 0; i < 2; ++i)
        {
            const next_ = next[i];
            const prev_ = prev[i];

            next_.drawImage(prev_.canvas, 0, 0);
            next_.drawImage(prev_.canvas, w, 0);
            next_.drawImage(prev_.canvas, 0, h);
            next_.drawImage(prev_.canvas, w, h);
        }
    }

    const queueLimit = 64;
    const queueInterval = 500;
    let nextQueueTime = performance.now();

    const renderInterval = 100;
    let nextRenderTime = performance.now();

    const frameInterval = 200;
    let nextFrameTime = performance.now();

    let offset = 0;
    let frame = 0;

    function loop() {
        window.requestAnimationFrame(loop);

        if (performance.now() > nextQueueTime && rendering.queue.length < queueLimit) {
            if (loadNext()) nextQueueTime = performance.now() + queueInterval;
        }

        if (performance.now() > nextRenderTime) {
            nextRenderTime = performance.now() + renderInterval;
            
            if (offset == offsets[textureIndex]) {
                grow();
            }
            
            offset = renderQueuedTile(
                textures[textureIndex][0], 
                textures[textureIndex][1], 
                offset,
            );
        }

        if (performance.now() > nextFrameTime) {
            nextFrameTime = performance.now() + frameInterval;
            frame = 1 - frame;
        }

        //const pattern = 
        //.clearRect(0, 0, rendererContext.canvas.width, rendererContext.canvas.height);
        //rendererContext.drawImage(textures[textureIndex][frame].canvas, 0, 0); 
        rendererContext.save();
        rendererContext.fillStyle = rendererContext.createPattern(textures[textureIndex][frame].canvas, "repeat")!;
        rendererContext.beginPath();
        rendererContext.rect(0, 0, rendererContext.canvas.width, rendererContext.canvas.height);
        rendererContext.closePath();
        rendererContext.translate(0, Math.floor(performance.now() / 50.));
        rendererContext.fill();
        rendererContext.restore();
    }

    await Promise.all([indexGetting, missingGetting]);

    index.shift(); // remove header row
    Array.from(index).forEach((csvRow) => fetchQueue.push(csvRow));
    
    loop();
}

type TileEntry = {
    palette: BitsyPalette,
    tile: BitsyObject,
    csvRow: string[],
}

const defaultPalette = new BitsyPalette();
defaultPalette.name = "default";
defaultPalette.colors = [0x0052cc, 0x809fff, 0xffffff];

export interface RenderingOptions {}

export class Rendering {
    readonly queue: TileEntry[] = [];

    constructor(options: Partial<RenderingOptions> = {}) {}

    queueBitsy(world: BitsyWorld, csvRow: string[]) {
        const palette = this.findPalette(world);

        [world.tiles, world.sprites, world.items].forEach((objects) => {
            const ids = Object.keys(objects);

            ids.forEach((id) => {
                const tile = objects[id];
                this.queue.push({ palette, tile, csvRow });
            });
        });
    }

    findPalette(world: BitsyWorld): BitsyPalette
    {
        if ("0" in world.palettes && this.isPaletteValid(world.palettes["0"])) {
            return world.palettes["0"];
        }
        
        for (let id in world.palettes) {
            if (this.isPaletteValid(world.palettes[id])) {
                return world.palettes[id];
            }
        }

        return defaultPalette;
    }

    isPaletteValid(palette: BitsyPalette): boolean {
        return palette.background != palette.tile;
    }
}

function createContext2d(width: number, height: number) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d')!;
    return context;
}

let textureIndex = 0;
const sizes = [1, 2, 4, 8, 16, 32, 64];
const offsets = sizes.map(size => size * size);
offsets.push(-1);
const textures: CanvasRenderingContext2D[][] = [];
sizes.forEach((size) => {
    textures.push([
        createContext2d(size * 8, size * 8),
        createContext2d(size * 8, size * 8),
    ]);
});

const tileContext = createContext2d(8, 8);
const coord2csvRow = new Map<string, string[]>();

function correct(color: number) {
    const hex = ((color | 0xFF000000) >>> 0).toString(16);
    const r = hex.slice(2, 4);
    const g = hex.slice(4, 6);
    const b = hex.slice(6, 8);

    return parseInt("ff" + b + g + r, 16) >>> 0;
}

function renderObject(
    context: CanvasRenderingContext2D, 
    index: number,
    object: BitsyObject,
    palette: BitsyPalette,
    csvRow: string[],
    frame: number,
): void {
    const { x, y } = d2xy(index);

    coord2csvRow.set(`${x},${y}`, csvRow);

    const graphic = object.graphic[frame % object.graphic.length];

    const fg = correct(palette.colors[object.palette]);
    const bg = correct(palette.background);

    withPixels(tileContext, pixels => {
        for (let i = 0; i < 64; ++i) {
            pixels[i] = graphic[i] ? fg : bg;
        }
    });

    context.drawImage(tileContext.canvas, x * 8, y * 8);
}
