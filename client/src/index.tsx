import React from "react";
import ReactDOM from "react-dom";
import App from "./App";
import "./index.css";

export interface ResourceValue {
  id: number;
  device_id: string;
  path: string;
  time: Date;
  value: number;
  epoch: number;
}

export interface Paths {
  [path: string]: ResourceValue[];
}

export interface Devices {
  [device: string]: Paths;
}

export interface Names {
  [index: string]: string;
}

ReactDOM.render(<App />, document.getElementById("root"));
