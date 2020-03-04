import moment from "moment";
import React from "react";
import { DeviceInfo } from ".";

moment.defaultFormat = "lll";

interface DeviceListProps {
  deviceInfo: DeviceInfo[];
}

const DeviceList: React.FunctionComponent<DeviceListProps> = ({ deviceInfo }) => {
  return (
    <table>
      <thead>
        <tr>
          <th>Name</th>
          <th>First value seen</th>
          <th>Latest value seen</th>
          <th>Up time</th>
          <th>Latest value</th>
          <th>Online</th>
        </tr>
      </thead>
      <tbody>
        {deviceInfo.map(d => {
          const last = moment(d.latest_update);
          const first = moment(d.first_update);
          const uptime = moment.duration(last.diff(first));
          const stillUp = moment.duration(moment().diff(last), "milliseconds");
          return (
            <tr key={d.id}>
              <td title={d.device_id}>{d.name}</td>
              <td title={first.format()}>{first.fromNow()}</td>
              <td title={last.format()}>{last.fromNow()}</td>
              <td>{uptime.humanize()}</td>
              <td>{d.latest_value}</td>
              <td>{stillUp.asMinutes() >= 5 ? "👎" : "✅"}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
};

export default DeviceList;
