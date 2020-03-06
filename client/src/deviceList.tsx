import moment, { Duration } from "moment";
import React from "react";
import { DeviceInfo } from ".";

moment.defaultFormat = "YYYY-MM-DD HH:mm:ss";

interface DeviceListProps {
  deviceInfo: DeviceInfo[];
}

const DeviceList: React.FunctionComponent<DeviceListProps> = ({ deviceInfo }) => {
  if (deviceInfo.length === 0) {
    return null;
  }
  const zeroPad = (num: string, size = 2) => ("000000000" + num).substr(-size);

  const formatDuration = (d: Duration) => {
    const duration = [d.years(), d.months(), d.days(), d.hours(), d.minutes(), d.seconds()];
    return duration.map(e => zeroPad(e.toString())).join(" ");
  };
  return (
    <table>
      <thead>
        <tr>
          <th>Name</th>
          <th>First value seen</th>
          <th>Latest value seen</th>
          <th>Connection Up time</th>
          <th>Counter value</th>
          <th>Up time based on counter</th>
          <th>Online</th>
        </tr>
      </thead>
      <tbody>
        {deviceInfo.map(d => {
          const last = moment(d.latest_update);
          const first = moment(d.first_update);
          const uptime = moment.duration(last.diff(first));
          const stillUp = moment.duration(moment().diff(last), "milliseconds");
          const appUpTime = moment.duration(d.latest_value * 5, "seconds");
          return (
            <tr key={d.id}>
              <td title={d.device_id}>{d.name}</td>
              <td title={first.fromNow()}>
                <code>{first.format()}</code>
              </td>
              <td title={last.fromNow()}>
                <code>{last.format()}</code>
              </td>
              <td title={uptime.humanize()}>
                <code>{formatDuration(uptime)}</code>
              </td>
              <td>{d.latest_value}</td>
              <td title={appUpTime.humanize()}>
                <code>{formatDuration(appUpTime)}</code>
              </td>
              <td>{stillUp.asMinutes() >= 5 ? "👎" : "✅"}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
};

export default DeviceList;
