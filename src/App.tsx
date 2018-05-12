import * as React from 'react';
import './App.css';

import { PixiComponent } from './PixiTest'; 

import logo from './logo.svg';

export class App extends React.Component {
  public constructor(props : {})
  {
    super(props);
    this.state = {
      "hello": "hi"
    };
  }

  public render() {
    return (
      <div className="App">
        <header className="App-header">
          <img src={logo} className="App-logo" alt="logo" />
          <h1 className="App-title">Welcome to React</h1>
        </header>
        <p className="App-intro">
          {this.state["hello"]}
        </p>

        <PixiComponent app={this} />
      </div>
    );
  }
}

export default App;
