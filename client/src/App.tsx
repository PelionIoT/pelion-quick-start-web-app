import moment from "moment";
import React, { useEffect, useState } from "react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import superagent from "superagent";
import { Devices, Names, Paths, ResourceValue, DeviceInfo, DeviceResource } from ".";

const apiUrl = window.location.href;

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
  const [selectedDevice, setSelectedDevice] = useState<string>();
  const [selectedResource, setSelectedResource] = useState<string>();
  const [usePut, setUsePut] = useState(true);
  const [sendingRequest, setSendingRequest] = useState(false);
  const [payload, setPayload] = useState("");

  const devices: Devices = {};
  const selectedDeviceInfo = deviceInfo.find(d => d.device_id === selectedDevice);

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
            resources: JSON.parse(a.resources).sort((a: DeviceResource, b: DeviceResource) =>
              a.uri.localeCompare(b.uri)
            ),
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

  const showDevices = (d: Devices) =>
    Object.keys(d)
      .sort((a, b) => a.localeCompare(b))
      .map(res => showDevice(d[res], res));

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
          val1 && val2 && val1.value !== val2.value ? (val1.value > val2.value ? "green" : "red") : "black";
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
      <ResponsiveContainer aspect={4 / 3} minHeight={200}>
        <LineChart data={values}>
          <Line dot={false} type="monotone" dataKey="value" animationEasing="linear" />
          <XAxis
            scale="time"
            dataKey="epoch"
            type="number"
            domain={["auto", "auto"]}
            tickFormatter={d => moment(d).format("LT")}
          />
          <YAxis domain={[Math.floor(min - margin), Math.ceil(max + margin)]} />
          <Tooltip labelFormatter={d => moment(d).format("ll LTS")} />
        </LineChart>
      </ResponsiveContainer>
    );
  };

  return (
    <div className="App">
      <header className="App-header">
        <button
          onClick={() => {
            if(window.confirm('Reset db values?')){superagent.get(new URL("/reset-values", apiUrl).toString()).then(() => getValues())};           
          }}
        >
          Reset db values
        </button>
        <select value={selectedDevice} onChange={e => setSelectedDevice(e.target.value)}>
          <option />
          {deviceInfo.map(d => (
            <option key={d.id} value={d.device_id}>
              {d.name || d.device_id}
            </option>
          ))}
        </select>
        <select value={selectedResource} onChange={e => setSelectedResource(e.target.value)}>
          <option />
          {selectedDeviceInfo?.resources.map((r, key) => (
            <option key={key} value={r.uri}>{`${r.uri} ${r.rt ?? ""}`}</option>
          ))}
        </select>
        <input type="radio" id="put" name="putPost" checked={usePut} onChange={() => setUsePut(true)} />
        <label htmlFor="put">PUT - Write</label>
        <input type="radio" id="post" name="putPost" checked={!usePut} onChange={() => setUsePut(false)} />
        <label htmlFor="post">POST - Execute</label>
        <input type="text" value={payload} onChange={e => setPayload(e.target.value)} />
        <button
          disabled={!selectedResource && !selectedDevice && !sendingRequest}
          onClick={async e => {
            setSendingRequest(true);
            const func = usePut ? superagent.put : superagent.post;
            func(new URL(`/devices/${selectedDevice}${selectedResource}`, apiUrl).toString())
              .type("json")
              .send({ payload })
              .then(() => {})
              .finally(() => setSendingRequest(false));
          }}
        >
          Send request
        </button>
      </header>
      <article className="App-article">
        {showDevices(devices)}
        {values.length === 0 && <h1 className="noData">No data available</h1>}
      </article>
    </div>
  );
};

export default App;
