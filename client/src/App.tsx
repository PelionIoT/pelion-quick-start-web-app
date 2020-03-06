import React, { useEffect, useState } from "react";
import superagent from "superagent";
import { DeviceInfo, DeviceResource, Devices, Names, ResourceValue } from ".";
import DeviceList from "./deviceList";
import ResourceGraphs from "./resourceGraphs";
import Toolbar from "./toolbar";

export const apiUrl = window.location.href;

const PAUSE_FOR_POLL = 1000 * 5; // 5 seconds

const resourceNames: Names = {
  "/3200/.*/5501": "Counter",
  "/3303/.*/5700": "Temperature sensor",
  "/3304/.*/5700": "Relative humidity",
  "/3305/.*/5800": "Power",
  "/3306/.*/5700": "On/Off",
  "/3323/.*/5700": "Air pressure",
};

const App: React.FC = () => {
  const [values, setValues] = useState<ResourceValue[]>([]);
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo[]>([]);
  const [deviceNames, setDeviceNames] = useState<Names>({});

  const devices: Devices = {};

  const getValues = () => {
    superagent
      .get(new URL("/values", apiUrl).toString())
      .then(parseValues)
      .finally(() => window.setTimeout(getValues, PAUSE_FOR_POLL));
    superagent.get(new URL("/devices", apiUrl).toString()).then(parseDeviceInfo);
  };

  const parseValues = (result: superagent.Response) => {
    if (result.body) {
      const val: ResourceValue[] = result.body.results.map((a: any) => ({
        ...a,
        value: parseFloat(a.value),
        time: new Date(a.time),
        epoch: new Date(a.time).valueOf(),
      }));
      setValues(val);
    }
  };

  const parseDeviceInfo = (result: superagent.Response) => {
    if (result.body) {
      setDeviceInfo(
        result.body.results
          .map((a: any) => ({
            ...a,
            latest_update: new Date(a.latest_update),
            first_update: new Date(a.first_update),
            resources: JSON.parse(
              a.resources === "" ? "[]" : a.resources
            ).sort((a: DeviceResource, b: DeviceResource) => a.uri.localeCompare(b.uri)),
          }))
          .sort((a: DeviceInfo, b: DeviceInfo) => a.name.localeCompare(b.name))
      );
      setDeviceNames(
        result.body.results
          .map((a: any) => ({ [a.device_id]: a.name }))
          .reduce((acc: Names, cur: { [index: string]: string }) => ({ ...acc, ...cur }), {})
      );
    }
  };
  useEffect(getValues, []);

  values.map(v => {
    if (!devices[v.device_id]) {
      devices[v.device_id] = {};
    }
    if (!devices[v.device_id][v.path]) {
      devices[v.device_id][v.path] = [];
    }
    devices[v.device_id][v.path].push(v);
    return v;
  });

  return (
    <div className="App">
      <header className="App-header">
        <Toolbar deviceInfo={deviceInfo} getValues={getValues} />
      </header>
      <article className="App-article">
        <DeviceList deviceInfo={deviceInfo} />
        <hr /> <br />
        <div className="App-graph-grid">
          {values.length === 0 && deviceInfo.length === 0 && <h1 className="noData">No data available</h1>}
          <ResourceGraphs devices={devices} resourceNames={resourceNames} deviceNames={deviceNames} />
        </div>
      </article>
    </div>
  );
};

export default App;
