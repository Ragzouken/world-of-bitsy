import * as React from 'react';
import * as Pixi from 'pixi.js';

import { App } from "./App";
import { renderTileset } from "./Rendering";
import { BitsyParser } from "@bitsy/parser";

interface IMainProps {
  app : App
}

interface IMainState {

}

const bitsy = document.getElementById("gamedata")!.innerText;
const world = BitsyParser.parse(bitsy.split("\n"));
const tileset = renderTileset(world);

export class PixiComponent extends React.Component<IMainProps, IMainState> {
  private app: Pixi.Application;
  private gameCanvas: HTMLDivElement;

  private sprite: Pixi.Sprite;

  constructor(props : IMainProps) {
    super(props);
  }
  
  public refresh()
  {
    const keys = Object.keys(world.tiles);
    const index = Math.floor(Math.random() * keys.length);
    this.sprite.texture = tileset[index];
  }

  /**
   * After mounting, add the Pixi Renderer to the div and start the Application.
   */
  public componentDidMount() {
    this.app = new Pixi.Application(512, 512);
    this.gameCanvas.appendChild(this.app.view);
    this.app.start();

    const test = new PIXI.Texture(tileset[0].baseTexture);

    this.sprite = new PIXI.Sprite(test);
    this.sprite.pivot = new Pixi.Point(128, 128);
    this.app.stage.addChild(this.sprite);

    //this.refresh();

    let orig: Pixi.Point | null;
    let drag: Pixi.Point | null;

    this.app.renderer.plugins.interaction.on("pointerdown", (event: Pixi.interaction.InteractionEvent) => {
      drag = event.data.getLocalPosition(this.app.stage);
      orig = new Pixi.Point(this.sprite.x, this.sprite.y);
    });

    this.app.renderer.plugins.interaction.on("pointerup", (event: Pixi.interaction.InteractionEvent) => {
      drag = null;
      orig = null;
    });

    this.app.renderer.plugins.interaction.on("pointermove", (event: Pixi.interaction.InteractionEvent) => {
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
