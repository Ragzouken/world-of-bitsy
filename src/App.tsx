import * as React from 'react';
import './App.css';

import { PixiComponent } from './PixiTest'; 

//import logo from './logo.svg';

export class App extends React.Component {
  private test: PixiComponent;

  public constructor(props : {})
  {
    super(props);
    this.state = {
      "hello": "hi"
    };
  }

  public render() {
    const f = () => this.test.refresh();
    const r = (c: PixiComponent) => this.test = c; 

    return (
      <div className="App">
        <p><button onClick={f}>Test</button></p>

        <PixiComponent app={this} ref={r} />
      </div>
    );
  }
}

export default App;
