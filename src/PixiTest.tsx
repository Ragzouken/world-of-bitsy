import * as React from 'react';
import * as Pixi from 'pixi.js';

import { App } from "./App";
import { renderTile } from "./Rendering";

interface IMainProps {
  app : App
}

interface IMainState {

}

export class PixiComponent extends React.Component<IMainProps, IMainState> {
  private app: Pixi.Application;
  private gameCanvas: HTMLDivElement;
  private pixiCircle : Pixi.Graphics;

  constructor(props : IMainProps) {
    super(props);
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

    const canvas = document.createElement('canvas');
    canvas.width = 8;
    canvas.height = 8;

    const ctx = canvas.getContext("2d")!;
    renderTile(ctx, 0xFF00FFFF, 0xFFFF00FF, Array(64).fill(false).map((v, i) => Math.random() > 0.5));

    const texture = PIXI.Texture.fromCanvas(canvas);
    texture.baseTexture.scaleMode = PIXI.SCALE_MODES.NEAREST;
    const sprite = new PIXI.Sprite(texture);
    sprite.texture.update();

    this.app.stage.addChild(sprite);

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
