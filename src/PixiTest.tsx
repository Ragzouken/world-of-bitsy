import * as React from 'react';
import * as Pixi from 'pixi.js';

import { App } from "./App";
import { renderTileset } from "./Rendering";
import { BitsyParser, BitsyWorld } from "@bitsy/parser";

function loadText(url: string, callback: (text: string) => void): void
{
  const rawFile = new XMLHttpRequest();
  rawFile.open("GET", url, false);
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

export class PixiComponent extends React.Component<IMainProps, IMainState> {
  private app: Pixi.Application;
  private gameCanvas: HTMLDivElement;

  private sprite: Pixi.Sprite;
  private world: BitsyWorld;
  private tileset: Pixi.Texture[];

  constructor(props : IMainProps) {
    super(props);
  }
  
  private loadTexture(): void
  {
    loadText("./955B75C9.bitsy.txt", text =>
    {
      this.world = BitsyParser.parse(text.split("\r\n"));
      this.tileset = renderTileset(this.world);

      const test = new PIXI.Texture(this.tileset[0].baseTexture)
      this.sprite = new PIXI.Sprite(test);
      this.sprite.pivot = new Pixi.Point(128, 128);
      this.app.stage.addChild(this.sprite);
    });
  }

  public refresh()
  {
    const keys = Object.keys(this.world.tiles);
    const index = Math.floor(Math.random() * keys.length);
    this.sprite.texture = this.tileset[index];
  }

  /**
   * After mounting, add the Pixi Renderer to the div and start the Application.
   */
  public componentDidMount() {
    this.app = new Pixi.Application(512, 512);
    this.gameCanvas.appendChild(this.app.view);
    this.app.start();

    //this.refresh();

    this.loadTexture();

    let orig: Pixi.Point | null;
    let drag: Pixi.Point | null;

    this.app.stage.interactive = true;

    this.app.stage.on("pointerdown", (event: Pixi.interaction.InteractionEvent) => {
      drag = event.data.getLocalPosition(this.app.stage);
      orig = new Pixi.Point(this.sprite.x, this.sprite.y);
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

      this.sprite.x = orig.x + dx;
      this.sprite.y = orig.y + dy;
    });

    this.app.ticker.add(delta => 
    {
      this.sprite.scale = new Pixi.Point(2, 2);
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
