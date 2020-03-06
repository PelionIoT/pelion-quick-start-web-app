import moment from "moment";
import React from "react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Devices, Names, Paths, ResourceValue } from ".";

const TOPAZ = "#00C1DE";
const OPAL = "#FFFFFF";
const PERIDOT = "#95d600";
const AMBER = "#ff6b00";
const ONYX = "#273037";

interface ToolbarProps {
  devices: Devices;
  resourceNames: Names;
  deviceNames: Names;
}
const ResourceGraphs: React.FC<ToolbarProps> = ({ devices, deviceNames, resourceNames }) => {
  const showDevice = (paths: Paths, deviceId: string) =>
    Object.keys(paths)
      .sort((a, b) => a.localeCompare(b))
      .map(res => {
        const deviceName = deviceNames[deviceId]
          ? deviceNames[deviceId]
          : `${deviceId.slice(0, 6)}...${deviceId.slice(-6)}`;
        const matchPath = Object.keys(resourceNames)
          .map(e => (res.match(e) ? e : false))
          .reduce((acc, cur) => (!!cur ? cur : acc), "");
        const resourceName = matchPath && resourceNames[matchPath] ? resourceNames[matchPath] : res;
        const [val1, val2] = paths[res];
        const styleColour =
          val1 && val2 && val1.value !== val2.value ? (val1.value > val2.value ? PERIDOT : AMBER) : OPAL;
        return (
          <div className="device" key={res}>
            <h3 title={deviceId}>
              {deviceName} - {resourceName}
            </h3>
            <div className="App-graph">
              <div className="graph">{showPath(paths[res])}</div>
              <div className="value">
                <h1 title={moment(val1.time, "lll").toString()}>
                  <span style={{ color: styleColour }}>{val1.value.toFixed(1)}</span>
                </h1>
              </div>
            </div>
          </div>
        );
      });

  const showPath = (values: ResourceValue[]) => {
    const max = Math.ceil(values.reduce((a, c) => (a ? (c.value > a ? c.value : a) : c.value), -Infinity));
    const min = Math.floor(values.reduce((a, c) => (c.value < a ? c.value : a), Infinity));
    const margin = Math.ceil((max - min) * 0.1);
    return (
      <ResponsiveContainer aspect={16 / 9} minHeight={150}>
        <LineChart data={values}>
          <Line dot={false} type="monotone" dataKey="value" animationEasing="linear" stroke={TOPAZ} strokeWidth="3px" />
          <XAxis
            scale="time"
            dataKey="epoch"
            type="number"
            stroke={OPAL}
            domain={["auto", "auto"]}
            tickFormatter={d => moment(d).format("LT")}
          />
          <YAxis stroke={OPAL} domain={[Math.floor(min - margin), Math.ceil(max + margin)]} />
          <Tooltip labelFormatter={d => moment(d).format("ll LTS")} contentStyle={{ backgroundColor: ONYX }} />
        </LineChart>
      </ResponsiveContainer>
    );
  };

  const showDevices = (d: Devices) =>
    Object.keys(d)
      .sort((a, b) => a.localeCompare(b))
      .map(res => showDevice(d[res], res));

  return <React.Fragment>{showDevices(devices)}</React.Fragment>;
};

export default ResourceGraphs;
