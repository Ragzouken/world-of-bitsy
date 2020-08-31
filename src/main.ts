import { BitsyParser, BitsyWorld, BitsyPalette, BitsyObject } from "@bitsy/parser";
import { withPixels, randomInt } from "./utility";
import { d2xy } from "./hilbert";

const url = new URL(window.location.href);
const options = {
    size: parseInt(url.searchParams.get("size") || "6", 10),
    shuffle: url.searchParams.get("shuffle") !== "false",
    show: new Set((url.searchParams.get("show") || "tiles,sprites,items").split(",")),
    tooltip: url.searchParams.get("tooltip") !== "false",
};

async function parsecsv(text: string): Promise<string[][]> {
    const lines = text.split('\n');
    const entries = lines.map((line) => line.slice(1, -1).split('","'));
    return entries;
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
    const tooltip = document.getElementById('tooltip')!;
    tooltip.hidden = !options.tooltip;

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

        return (offset + 1) % offsetLimit;
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

    let offsetX = 0;
    let offsetY = 0;

    const scale = 4;

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

        const active = textures[textureIndex][frame].canvas;

        offsetX = Math.floor(rendererContext.canvas.width / 2.);
        offsetY = Math.floor(performance.now() / 50.) % (active.height * 4);

        const matrix = new DOMMatrix();
        matrix.translateSelf(offsetX, offsetY);
        matrix.scaleSelf(scale, scale);
        const pattern = rendererContext.createPattern(active, "repeat")!;
        pattern.setTransform(matrix);

        rendererContext.imageSmoothingEnabled = false;
        rendererContext.fillStyle = pattern;
        rendererContext.fillRect(0, 0, rendererContext.canvas.width, rendererContext.canvas.height);

        rendering.renderNextObjectToTile();
    }

    renderer.addEventListener('click', (event) => {
        event.stopPropagation();
        event.preventDefault();

        const [cx, cy] = [event.clientX, event.clientY];
        const [px, py] = [cx - offsetX, cy - offsetY];
        const gx = Math.floor(px / (8 * scale));
        const gy = Math.floor(py / (8 * scale));

        for (let i = textureIndex; i >= 0; --i) {
            const size = sizes[i];
            const [tx, ty] = [(gx + size * 1000) % size, (gy + size * 1000) % size];

            const csvRow = coord2csvRow.get(`${tx},${ty}`);
            if (csvRow) {
                const [title, author, url] = [csvRow[2], csvRow[3], csvRow[4]];
                tooltip.innerHTML = `<a href="${url}">${title} by ${author}</a>`;
                console.log('final', tx, ty);
                break;
            }
        }
    });

    const available = await getAvailability();
    await Promise.all([indexGetting]);
    index = index.filter((csvRow) => available.has(csvRow[0]));

    Array.from(index).forEach((csvRow) => fetchQueue.push(csvRow))
        
    if (options.shuffle)
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
        const objects: BitsyObject[] = [];
        if (options.show.has('tiles')) objects.push(...Object.values(world.tiles));
        if (options.show.has('sprites')) objects.push(...Object.values(world.sprites));
        if (options.show.has('items')) objects.push(...Object.values(world.items));
        const entries = objects.map((object) => ({ csvRow, palette, object }));
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
const sizes = Array.from(Array(options.size).keys()).map(i => Math.pow(2, i));
const offsets = sizes.map(size => size * size);
offsets.push(-1);
const offsetLimit = Math.pow(4, options.size - 1);
const textures: CanvasRenderingContext2D[][] = [];
sizes.forEach((size) => {
    textures.push([
        createContext2d(size * 8, size * 8),
        createContext2d(size * 8, size * 8),
    ]);
});

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
