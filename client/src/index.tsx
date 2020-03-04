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

export interface DeviceResource {
  uri: string;
  obs: boolean;
  rt?: string;
  type?: string;
}
export interface DeviceInfo {
  id: string;
  device_id: string;
  name: string;
  resources: DeviceResource[];
  latest_update: Date;
  first_update: Date;
  latest_value: number;
}

ReactDOM.render(<App />, document.getElementById("root"));
