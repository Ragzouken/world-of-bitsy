import * as React from 'react';
import * as Pixi from 'pixi.js';

import { App } from "./App";
import { queueTileset, MTexture, renderQueuedTile, queue, coord2boid } from "./Rendering";
import { BitsyParser, BitsyWorld } from "@bitsy/parser";

const parsecsv: (csv: string) => string[][] = require("csv-parse/lib/sync");
const mtex = new MTexture(512, 512);
let offset: number = 0;

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

function norm(coord: number): number
{
  const n = 64;
  return ((coord % n) + n) % n;
}

export class PixiComponent extends React.Component<IMainProps, IMainState> {
  private app: Pixi.Application;
  private gameCanvas: HTMLDivElement;

  private sprite: PIXI.extras.TilingSprite;
  private world: BitsyWorld;

  private index: string[][] | null;
  private missing: {[index:string]: boolean};

  constructor(props : IMainProps) {
    super(props);
  }
  
  private addTileset(boid: string, log: string): void
  {
    const url = `https://raw.githubusercontent.com/Ragzouken/bitsy-archive/master/${boid}.bitsy.txt`

    loadText(url, text =>
    {
      this.world = BitsyParser.parse(text.split("\n"));
      queueTileset(this.world, log);
      //console.log(log);
      log = log + boid;
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

    this.addTileset(boid, `${entry[2]} by ${entry[3]}`);

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

    this.app.stage.on("pointerdown", (event: Pixi.interaction.InteractionEvent) => {
      drag = event.data.getLocalPosition(this.app.stage);
      orig = new Pixi.Point(this.sprite.tilePosition.x, this.sprite.tilePosition.y);

      const coord = event.data.getLocalPosition(this.sprite);

      coord.x -= this.sprite.tilePosition.x;
      coord.y -= this.sprite.tilePosition.y;

      const x = norm(Math.floor(coord.x / 8));
      const y = norm(Math.floor(coord.y / 8));

      console.log(coord2boid[`${x},${y}`]);
    });

    const resetDrag = () => 
    {
      drag = null;
      orig = null;
    };

    this.app.stage.on("pointerup", (event: Pixi.interaction.InteractionEvent) => resetDrag());
    document.onpointerup = () => resetDrag();
    window.onblur = () => resetDrag();

    this.app.stage.on("pointermove", (event: Pixi.interaction.InteractionEvent) => {
      if (!orig || !drag) return;

      const m = event.data.getLocalPosition(this.app.stage);
      const dx = m.x - drag.x;
      const dy = m.y - drag.y;

      this.sprite.tilePosition.x = orig.x + (dx / 2);
      this.sprite.tilePosition.y = orig.y + (dy / 2);
    });

    const test = new PIXI.Texture(mtex.base);
    this.sprite = new PIXI.extras.TilingSprite(test, this.app.renderer.width, this.app.renderer.height); //new PIXI.Sprite(test);
    //this.sprite.pivot = new Pixi.Point(256, 256);
    //this.sprite.x = 256;
    //this.sprite.y = 256;
    this.sprite.scale = new Pixi.Point(2, 2);
    this.app.stage.addChild(this.sprite);

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
      this.sprite.width = this.app.renderer.width;
      this.sprite.height = this.app.renderer.height;
    };
    
    window.onresize = (event) =>
    {    
      resize();
    }

    let timer = 0;

    this.app.ticker.add(delta => 
    {
      //this.sprite.scale = new Pixi.Point(2, 2);

      timer += delta;

      if (timer >= 15 && queue.length < 64)
      {
        if (this.index && this.missing && this.loadTexture())
        {
          timer -= 15;
        }
      }

      offset = renderQueuedTile(mtex, offset);

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
