
export enum RadioMode {
  PTT = 'PUSH-TO-TALK',
  OPEN = 'OPEN MIC'
}

export enum ConnectionStatus {
  DISCONNECTED = 'DISCONNECTED',
  CONNECTING = 'CONNECTING',
  CONNECTED = 'STABLE',
  ERROR = 'SIGNAL ERROR'
}

export interface RadioState {
  frequency: number;
  mode: RadioMode;
  isTransmitting: boolean;
  isReceiving: boolean;
  status: ConnectionStatus;
  volume: number;
  squelch: number;
}
