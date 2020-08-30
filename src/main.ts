import { BitsyParser, BitsyWorld, BitsyPalette, BitsyObject } from "@bitsy/parser";
import * as csvparse from 'csv-parse';
import { withPixels, randomInt } from "./utility";
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

async function getAvailability() {
    const res = await fetch("https://api.github.com/repos/ragzouken/bitsy-archive/git/trees/7496468bcefaa8e0055f1dccd26232cc04c2d7c3");
    const json = await res.json();
    const tree = json.tree as any[];
    const names = tree.map((entry) => entry.path as string);
    const boids = names.filter((name) => name.endsWith('.bitsy.txt')).map((name) => name.slice(0, 8));
    return new Set(boids);
}

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
    
    const indexGetting = fetch("https://raw.githubusercontent.com/Ragzouken/bitsy-archive/main/index.txt")
    .then(res => res.text())
    .then(text => parsecsv(text))
    .then(csv => index = csv);

    const rendering = new Rendering();

    async function fetchWorld(boid: string) {
        const url = `https://raw.githubusercontent.com/Ragzouken/bitsy-archive/main/${boid}.bitsy.txt`;
        return fetch(url).then(res => res.text()).then(text => BitsyParser.parse(text.split("\n")));
    }

    async function addTileset(boid: string, csvRow: string[]) {
        try {
            const world = await fetchWorld(boid);
            rendering.queueBitsy(world, csvRow);
            return true;
        } catch (e) {
            return false;
        }
    }

    const shuffle = false;

    let fetchQueue: string[][] = [];
    const tried = new Set<string>();

    async function loadNext() {
        const csvRow = fetchQueue.shift();

        if (!csvRow) return true;

        const boid = csvRow[0];
        tried.add(boid);

        const author = csvRow[3].trim();  
        addTileset(boid, csvRow);
      
        return true;
    }

    function renderQueuedTile(
        frame1: CanvasRenderingContext2D, 
        frame2: CanvasRenderingContext2D,
        offset: number,
    ): number {
        const item = rendering.tiles.shift();

        if (!item) return offset;

        const { x, y } = d2xy(offset);
        coord2csvRow.set(`${x},${y}`, item.csvRow);

        frame1.drawImage(item.frames[0].canvas, x * 8, y * 8);
        frame2.drawImage(item.frames[1].canvas, x * 8, y * 8);

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
    const queueInterval = 100;
    let nextQueueTime = performance.now();

    const renderInterval = 20;
    let nextRenderTime = performance.now();

    const frameInterval = 400;
    let nextFrameTime = performance.now();

    let offset = 0;
    let frame = 0;

    function loop() {
        window.requestAnimationFrame(loop);

        if (performance.now() > nextQueueTime && rendering.objects.length < queueLimit) {
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

        const matrix = new DOMMatrix();
        matrix.translateSelf(-rendererContext.canvas.width/2, Math.floor(performance.now() / 50.));
        matrix.scaleSelf(4, 4);
        const pattern = rendererContext.createPattern(textures[textureIndex][frame].canvas, "repeat")!;
        pattern.setTransform(matrix);

        rendererContext.imageSmoothingEnabled = false;
        rendererContext.fillStyle = pattern;
        rendererContext.fillRect(0, 0, rendererContext.canvas.width, rendererContext.canvas.height);

        rendering.renderNextObjectToTile();
    }

    const available = await getAvailability();
    await Promise.all([indexGetting]);
    index = index.filter((csvRow) => available.has(csvRow[0]));

    Array.from(index).forEach((csvRow) => fetchQueue.push(csvRow))
    fetchQueue = shuffled(fetchQueue);
    
    loop();
}

type ObjectEntry = {
    object: BitsyObject,
    palette: BitsyPalette,
    csvRow: string[],
}

type TileEntry = {
    frames: CanvasRenderingContext2D[],
    csvRow: string[],
}

const defaultPalette = new BitsyPalette();
defaultPalette.name = "default";
defaultPalette.colors = [0x0052cc, 0x809fff, 0xffffff];

export interface RenderingOptions {}

export class Rendering {
    readonly objects: ObjectEntry[] = [];
    readonly tiles: TileEntry[] = [];

    constructor(options: Partial<RenderingOptions> = {}) {}

    queueBitsy(world: BitsyWorld, csvRow: string[]) {
        const palette = this.findPalette(world);
        const objects = [world.tiles, world.sprites, world.items].map((record) => Object.values(record));
        const flat = ([] as BitsyObject[]).concat.apply([], objects);
        const entries = flat.map((object) => ({ csvRow, palette, object }));
        this.objects.push(...entries);
    }

    renderNextObjectToTile() {
        const entry = this.objects.shift();
        if (!entry) return;

        const { object, csvRow, palette } = entry;
        const frames = [
            objectToContext(object, palette, 0), 
            objectToContext(object, palette, 1),
        ];

        this.tiles.push({ csvRow, frames });
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

function shuffled<T>(array: T[]): T[] {
    const result: T[] = [];
    while (array.length > 0) {
        result.push(...array.splice(randomInt(0, array.length), 1));
    }
    return result;
}

function correct(color: number) {
    const hex = ((color | 0xFF000000) >>> 0).toString(16);
    const r = hex.slice(2, 4);
    const g = hex.slice(4, 6);
    const b = hex.slice(6, 8);

    return parseInt("ff" + b + g + r, 16) >>> 0;
}

function objectToContext(object: BitsyObject, palette: BitsyPalette, frame: number) {
    const graphic = object.graphic[frame % object.graphic.length];
    const fg = correct(palette.colors[object.palette]);
    const bg = correct(palette.background);
    
    const context = createContext2d(8, 8);
    withPixels(context, pixels => {
        for (let i = 0; i < 64; ++i) {
            pixels[i] = graphic[i] ? fg : bg;
        }
    });
    return context;
}
