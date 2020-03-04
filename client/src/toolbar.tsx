import React, { useState } from "react";
import superagent from "superagent";
import { DeviceInfo } from ".";
import { apiUrl } from "./App";

interface ToolbarProps {
  deviceInfo: DeviceInfo[];
  getValues: () => void;
}
const Toolbar: React.FC<ToolbarProps> = ({ deviceInfo, getValues }) => {
  const [selectedDevice, setSelectedDevice] = useState<string>();
  const [selectedResource, setSelectedResource] = useState<string>();
  const [usePut, setUsePut] = useState(true);
  const [sendingRequest, setSendingRequest] = useState(false);
  const [payload, setPayload] = useState("");
  const selectedDeviceInfo = deviceInfo.find(d => d.device_id === selectedDevice);

  return (
    <React.Fragment>
      <button
        onClick={() => {
          if (window.confirm("Reset db values?")) {
            superagent.get(new URL("/reset-values", apiUrl).toString()).then(() => getValues());
          }
        }}
      >
        Reset db values
      </button>
      <select value={selectedDevice} onChange={e => setSelectedDevice(e.target.value)}>
        <option />
        {deviceInfo
          .filter(a => a.state === "registered")
          .map(d => (
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
    </React.Fragment>
  );
};

export default Toolbar;
