export interface RegisteredDevice {
  id: string;
  name: string;
  state: string;
}

export interface RegisteredDevicesResponse {
  data: RegisteredDevice[];
}

export interface DeviceResource {
  uri: string;
}

export interface NotificationResponse {
  notifications: {
    ep: string;
    path: string;
    payload: string;
  }[];
  "async-responses": {
    id: string;
    payload: string;
  }[];
}

export interface SubscriptionBody {
  "endpoint-name": string;
  "resource-path": string[];
}

export interface Results {
  results: any[];
}

export interface NotificationData {
  path?: string;
  maxAge?: string;
  payload?: string | number;
  deviceId?: string;
  contentType?: string;
}
