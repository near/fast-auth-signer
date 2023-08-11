export interface Device {
  device: string;
  os: string;
  publicKeys: string[];
  uid: string;
}

export interface DeleteDevice {
  firebaseId: string | null;
  publicKeys: string[];
}
