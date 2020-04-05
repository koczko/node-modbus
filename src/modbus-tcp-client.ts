import MBClient from './modbus-client.js';
import MBTCPClientRequestHandler from './tcp-client-request-handler.js';
import ModbusTCPClientResponseHandler from './tcp-client-response-handler.js';
import { Socket } from 'net';
import ModbusTCPRequest from './tcp-request.js';
import ModbusTCPResponse from './tcp-response.js';

export interface ModbusTCPConnectionOptions {
  socket: Socket;
  unitId: number;
  timeout: number;
  host: string;
  portNumber: number;
  retryTime: number;
}

const defaultModbusTCPConnectionOptions: Partial<ModbusTCPConnectionOptions> = {
  unitId: 1,
  timeout: 5000,
  portNumber: 502,
  retryTime: 5000
};

/** This client must be initiated with a net.Socket object. The module does not handle reconnections
 * or anything related to keep the connection up in case of an unplugged cable or a closed server. See
 * the node-net-reconnect module for these issues.
 * @extends MBClient
 * @class
 * @example <caption>Create new Modbus/TCP Client</caption>
 * const client = new Modbus.tcp.Client({host: 'localhost' })
 * client.connect();
 *
 * socket.on('connect', function () {
 *
 *  client.readCoils(...)
 *
 * })
 *
 */
export default class ModbusTCPClient extends MBClient<
  Socket,
  ModbusTCPRequest
> {
  protected _requestHandler: MBTCPClientRequestHandler;
  protected _responseHandler: ModbusTCPClientResponseHandler;
  protected readonly options: ModbusTCPConnectionOptions;

  protected readonly _unitId: number;
  protected readonly _timeout: number;

  protected closing: boolean;
  protected state: string;
  protected closedOnPurpose: boolean;

  /**
   * Creates a new Modbus/TCP Client.
   * @param {defaultModbusTCPConnectionOptions} opts The TCP Socket.
   * @memberof ModbusTCPClient
   */
  constructor(options: Partial<ModbusTCPConnectionOptions>) {
    //console.info(options);
    const socket = options.socket ?? new Socket();
    const opts: ModbusTCPConnectionOptions = {
      ...defaultModbusTCPConnectionOptions,
      ...options
    } as ModbusTCPConnectionOptions;
    opts.unitId = opts.unitId ?? 1;
    opts.timeout = opts.timeout ?? 1;
    //console.info(options);
    super(socket);

    this.closing = false;
    this.state = 'offline';
    this.closedOnPurpose = false;

    socket.on('connect', this.onConnect.bind(this));
    socket.on('timeout', this.onError.bind(this));
    socket.on('close', this.onClose.bind(this));
    socket.on('error', this.onError.bind(this));

    this._requestHandler = new MBTCPClientRequestHandler(
      socket,
      opts.unitId,
      opts.timeout
    );
    this._responseHandler = new ModbusTCPClientResponseHandler();

    this.options = opts;

    this._unitId = opts.unitId;
    this._timeout = opts.timeout;
  }

  public setOptions(
    options: Omit<ModbusTCPConnectionOptions, 'socket' | 'unitId'>
  ): ModbusTCPClient {
    this.options.host = options.host;
    this.options.portNumber = options.portNumber;
    this.options.retryTime = options.retryTime;
    this.options.timeout = options.timeout;
    return this;
  }

  public connect(): ModbusTCPClient {
    this.closedOnPurpose = false;
    if (!this.socket.connecting) {
      this.socket.setKeepAlive(true, 1000);
      this.socket.connect({
        host: this.options.host,
        port: this.options.portNumber
      });
    }
    return this;
  }

  public disconnect(): ModbusTCPClient {
    this.closedOnPurpose = true;
    this.socket.end();
    return this;
  }

  private reconnect(): void {
    if (!this.closedOnPurpose) {
      setTimeout(() => {
        this.connect();
      }, this.options.retryTime);
    }
  }

  private onConnect(): void {
    if (this.closing) {
      return;
    }
  }

  private onClose(hadError: unknown): void {
    if (this.closing) {
      return;
    }

    this.state = 'offline';
    if (!hadError) {
      //debug('connection closed on purpose');
    } else {
      //debug('connection closed with errors, reconnecting');
    }

    this.reconnect();
  }

  private onError(): void {
    if (this.closing) {
      return;
    }
  }

  public end(): void {
    this.closing = true;
    return this.socket.end();
  }

  get slaveId() {
    return this.options.unitId;
  }

  get unitId() {
    return this.options.unitId;
  }
}
