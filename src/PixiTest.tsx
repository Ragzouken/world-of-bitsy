import * as React from 'react';
import * as Pixi from 'pixi.js';

import { App } from "./App";
import { queueGraphics, MTexture, renderQueuedTile, queue, coord2boid } from "./Rendering";
import { BitsyParser, BitsyWorld } from "@bitsy/parser";

const parsecsv: (csv: string) => string[][] = require("csv-parse/lib/sync");
let offset: number = 0;

let textureIndex = 0;
const textures = [
  [new MTexture(  8,   8), new MTexture(  8,   8)],
  [new MTexture( 16,  16), new MTexture( 16,  16)],
  [new MTexture( 32,  32), new MTexture( 32,  32)],
  [new MTexture( 64,  64), new MTexture( 64,  64)],
  [new MTexture(128, 128), new MTexture(128, 128)],
  [new MTexture(256, 256), new MTexture(256, 256)],
  [new MTexture(512, 512), new MTexture(512, 512)]
];

const sprites: Pixi.extras.TilingSprite[][] = [];

const sizes = [
  1,
  2,
  4,
  8,
  16,
  32,
  64
]

const offsets = [
  1,
  4,
  16,
  64,
  256,
  1024,
  -1
];

function makeSprite(texture: MTexture): PIXI.extras.TilingSprite
{
  const test = new PIXI.Texture(texture.base);
  const sprite = new PIXI.extras.TilingSprite(test, 512, 512);
  sprite.scale = new Pixi.Point(2, 2);
  sprite.visible = false;

  return sprite;
}

function elevate(): MTexture[]
{
  const prev = textures[textureIndex];
  textureIndex += 1;
  const next = textures[textureIndex];

  const w = prev[0].canvas.width;
  const h = prev[0].canvas.height;

  for (let i = 0; i < 2; ++i)
  {
    const next_ = next[i];
    const prev_ = prev[i];

    next_.context.drawImage(prev_.canvas, 0, 0);
    next_.context.drawImage(prev_.canvas, w, 0);
    next_.context.drawImage(prev_.canvas, 0, h);
    next_.context.drawImage(prev_.canvas, w, h);
  }

  return next;
}

function loadText(url: string, callback: (text: string) => void): void
{
  const rawFile = new XMLHttpRequest();
  rawFile.open("GET", url);
	rawFile.onreadystatechange = () => {
    if (rawFile.readyState === 4) {
      if (rawFile.status === 200 || rawFile.status == 0) {
        callback(rawFile.responseText);
      }
    }
  };
  rawFile.send(null);
}

interface IMainProps {
  app : App
}

interface IMainState {

}

function norm(coord: number, offset: number = 0): number
{
  const n = sizes[textureIndex + offset];

  return ((coord % n) + n) % n;
}

export class PixiComponent extends React.Component<IMainProps, IMainState> {
  private app: Pixi.Application;
  private gameCanvas: HTMLDivElement;

  private world: BitsyWorld;

  private index?: string[][];
  private missing: {[index:string]: boolean};

  constructor(props : IMainProps) {
    super(props);
  }
  
  private addTileset(boid: string, entry: string[]): void
  {
    const url = `https://raw.githubusercontent.com/Ragzouken/bitsy-archive/master/${boid}.bitsy.txt`

    loadText(url, text =>
    {
      this.world = BitsyParser.parse(text.split("\n"));
      queueGraphics(this.world, entry);
    });
  }

  private loopIndex: number = 1;

  private loadTexture(): boolean
  {
    if (!this.index || !this.missing) return false;
    if (this.index && this.loopIndex >= this.index.length) return true;
    
    const entry = this.index[this.loopIndex];
    const boid = entry[0];
    this.loopIndex = this.loopIndex + 1;

    if (entry[3].trim() in this.missing) return false;

    this.addTileset(boid, entry);

    return true;
  }

  public refresh()
  {
    /*
    const keys = Object.keys(this.world.tiles);
    const index = Math.floor(Math.random() * keys.length);
    this.sprite.texture = this.tileset[index];
    */
  }

  /**
   * After mounting, add the Pixi Renderer to the div and start the Application.
   */
  public componentDidMount() {
    this.app = new Pixi.Application(window.innerWidth, window.innerHeight);
    this.gameCanvas.appendChild(this.app.view);
    this.app.start();

    //this.refresh();

    this.loadTexture();

    let orig: Pixi.Point | null;
    let drag: Pixi.Point | null;

    loadText("https://raw.githubusercontent.com/Ragzouken/bitsy-archive/master/index.txt", text => this.index = parsecsv(text));
    loadText("https://raw.githubusercontent.com/Ragzouken/bitsy-archive/master/missing.txt", text => 
    {
      let lines = text.split("\n");
      this.missing = {};

      for (let line of lines)
      {
        const i = line.indexOf(",");
        const author = line.slice(i + 1).trim();
        this.missing[author] = true;
      }
    });

    this.app.stage.interactive = true;

    function getGame(x: number, y: number): string[]
    {
      x = norm(x);
      y = norm(y);

      let entry = coord2boid[`${x},${y}`];

      if (!entry)
      {
        x = norm(x, -1);
        y = norm(y, -1);
        return coord2boid[`${x},${y}`];
      }

      return entry;
    }

    this.app.stage.on("pointerdown", (event: Pixi.interaction.InteractionEvent) => {
      drag = event.data.getLocalPosition(this.app.stage);
      orig = new Pixi.Point(tilePosX, tilePosY);

      const coord = event.data.getLocalPosition(sprites[0][0]);

      coord.x -= tilePosX;
      coord.y -= tilePosY;

      const x = norm(Math.floor(coord.x / 8));
      const y = norm(Math.floor(coord.y / 8));

      const entry = getGame(x, y);

      if (entry)
      {
        console.log(`${entry[2]} by ${entry[3]}`);
      }
      else
      {
        console.log(`${x},${y} of ${textureIndex}`);
      }
    });

    document.onmousedown = (event: MouseEvent) =>
    {
      if (event.ctrlKey || event.metaKey)
      {
        let coordX = event.clientX;
        let coordY = event.clientY; 

        coordX -= tilePosX;
        coordY -= tilePosY;

        const x = norm(Math.floor(coordX / 8));
        const y = norm(Math.floor(coordY / 8));

        const entry = getGame(x, y);

        if (entry)
        {
          const url = entry[4];
          window.open(url,'_blank');
        }
      }
    };

    const resetDrag = () => 
    {
      drag = null;
      orig = null;
    };

    let tilePosX = 0;
    let tilePosY = 0;

    this.app.stage.on("pointerup", (event: Pixi.interaction.InteractionEvent) => resetDrag());
    document.onpointerup = () => resetDrag();
    window.onblur = () => resetDrag();

    this.app.stage.on("pointermove", (event: Pixi.interaction.InteractionEvent) => {
      if (!orig || !drag) return;

      const m = event.data.getLocalPosition(this.app.stage);
      const dx = m.x - drag.x;
      const dy = m.y - drag.y;

      tilePosX = orig.x + (dx / 2);
      tilePosY = orig.y + (dy / 2);
    });

    for (let i = 0; i < textures.length; ++i)
    {
      const f1 = makeSprite(textures[i][0]);
      const f2 = makeSprite(textures[i][1]);

      sprites.push([f1, f2])
      this.app.stage.addChild(f1);
      this.app.stage.addChild(f2);
    }

    document.body.style.overflow = 'hidden';

    const resize = () =>
    {
      var w = document.documentElement.clientWidth;    
      var h = document.documentElement.clientHeight;    
      //this part resizes the canvas but keeps ratio the same    
      this.app.renderer.view.style.width = w + "px";    
      this.app.renderer.view.style.height = h + "px";    
      //this part adjusts the ratio:    
      this.app.renderer.resize(w,h);
    };
    
    window.onresize = (event) =>
    {    
      resize();
    }

    let timer = 0;
    let timer2 = 0;
    let timer3 = 0;

    let frame = 0;

    this.app.ticker.add(delta => 
    {
      //this.sprite.scale = new Pixi.Point(2, 2);

      for (let pair of sprites)
      {
        for (let frame of pair)
        {
          frame.tilePosition.x = tilePosX;
          frame.tilePosition.y = tilePosY;
          frame.width = this.app.renderer.width;
          frame.height = this.app.renderer.height;
          frame.visible = false;
        }
      }

      sprites[textureIndex][frame].visible = true;

      timer += delta;
      timer2 += delta;
      timer3 += (delta / 60);

      if (timer3 >= .4)
      {
        timer3 -= .4;
        frame = 1 - frame;
      }

      if (timer >= 15 && queue.length < 64)
      {
        if (this.index && this.missing && this.loadTexture())
        {
          timer -= 15;
        }
      }

      if (timer2 > 1)
      {
        timer2 -= 1;

        if (offset == offsets[textureIndex])
        {
          elevate();
        }

        offset = renderQueuedTile(textures[textureIndex][0],
                                  textures[textureIndex][1], 
                                  offset);
      }

      resize();
    });
  }
  
  /**
   * Stop the Application when unmounting.
   */
  public componentWillUnmount() {
    this.app.stop();
  }
  
  /**
   * Simply render the div that will contain the Pixi Renderer.
   */
  public render() {
    const component = this;
    return (
      <div ref={(thisDiv) => {component.gameCanvas = thisDiv!}} />
    );
  }
}
