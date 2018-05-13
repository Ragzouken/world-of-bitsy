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
  private pixiCircle : Pixi.Graphics;

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

    this.pixiCircle = new PIXI.Graphics();
    this.pixiCircle.lineStyle(2, 0xFF00FF);  // (thickness, color)
    this.pixiCircle.drawCircle(0, 0, 10);   // (x,y,radius)
    this.pixiCircle.endFill(); 
    this.app.stage.addChild(this.pixiCircle);

    const test = new PIXI.Texture(tileset[0].baseTexture);

    this.sprite = new PIXI.Sprite(test);
    this.app.stage.addChild(this.sprite);
    
    //this.refresh();

    this.app.ticker.add(delta => 
    {
      this.pixiCircle.x += delta * 1;
      this.pixiCircle.y += delta * 1;
      
      this.sprite.x = 0;
      this.sprite.y = 0;
      this.sprite.scale = new Pixi.Point(2, 2);

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
