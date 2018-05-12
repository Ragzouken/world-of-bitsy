import * as React from 'react';
import * as Pixi from 'pixi.js';

import { App } from "./App";
import { renderTile } from "./Rendering";
import { parseBitsy } from "./Bitsy";

interface IMainProps {
  app : App
}

interface IMainState {

}

export class PixiComponent extends React.Component<IMainProps, IMainState> {
  private app: Pixi.Application;
  private gameCanvas: HTMLDivElement;
  private pixiCircle : Pixi.Graphics;

  private ctx: CanvasRenderingContext2D;
  private texture: Pixi.Texture;

  constructor(props : IMainProps) {
    super(props);
  }
  
  public refresh()
  {
    const bitsy = document.getElementById("gamedata")!.innerText;
    const world = parseBitsy(bitsy.split("\n"));

    const keys = Object.keys(world.tiles);
    const index = Math.floor(Math.random() * keys.length);
    const key = keys[index];

    renderTile(this.ctx, 0xFF00FFFF, 0xFFFF00FF, world.tiles[key].graphic[0]);
    this.texture.update();
  }

  /**
   * After mounting, add the Pixi Renderer to the div and start the Application.
   */
  public componentDidMount() {
    this.app = new Pixi.Application(512, 512);
    this.gameCanvas.appendChild(this.app.view);
    this.app.start();

    this.pixiCircle = new PIXI.Graphics();
    this.pixiCircle.lineStyle(2, 0xFF00FF);  // (thickness, color)
    this.pixiCircle.drawCircle(0, 0, 10);   // (x,y,radius)
    this.pixiCircle.endFill(); 
    this.app.stage.addChild(this.pixiCircle);

    const tileCanvas = document.createElement('canvas');
    tileCanvas.width = 8;
    tileCanvas.height = 8;

    this.ctx = tileCanvas.getContext("2d")!;

    this.texture = PIXI.Texture.fromCanvas(tileCanvas);
    this.texture.baseTexture.scaleMode = PIXI.SCALE_MODES.NEAREST;
    const sprite = new PIXI.Sprite(this.texture);
    this.app.stage.addChild(sprite);
    
    this.refresh();

    this.app.ticker.add(delta => 
    {
      this.pixiCircle.x += delta * 1;
      this.pixiCircle.y += delta * 1;
      
      sprite.x = 150;
      sprite.y = 150;
      sprite.scale = new Pixi.Point(8, 8);

      this.props.app.setState({"hello": this.pixiCircle.x.toString()});
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
