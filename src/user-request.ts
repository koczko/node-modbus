import ModbusTCPRequest from './tcp-request';
import ModbusTCPResponse from './tcp-response';
import { UserRequestError } from './user-request-error';
import ModbusAbstractRequest from './abstract-request';
import ModbusAbstractResponse from './abstract-response';
import { RequestToResponse } from './request-response-map';
import { ModbusRequestBody } from './request';

const debug = require('debug')('user-request');

type Either<A> = A;

export type ModbusRequest = Either<ModbusTCPRequest>;
// export type ModbusResponse = Either<ModbusTCPResponse, ModbusRTUResponse>;

export class UserRequestMetrics {
  /**
   * Timestamp when the request was sent
   */
  createdAt: Date = new Date();
  /**
   * Timestamp when the request was sent
   */
  startedAt: Date = new Date();
  /**
   * Timestamp when the response was received
   */
  receivedAt: Date = new Date();
  /**
   * Difference in the start and end date in milliseconds
   */
  public get transferTime(): number {
    return this.receivedAt.getTime() - this.startedAt.getTime();
  }

  /**
   * Amount of time in milliseconds the request was waiting in
   * the cue.
   */
  public get waitTime(): number {
    return this.startedAt.getTime() - this.createdAt.getTime();
  }

  toJSON() {
    return {
      ...this,
      transferTime: this.transferTime
    };
  }
}

export interface UserRequestResolve<Req extends ModbusAbstractRequest> {
  request: Req;
  response: RequestToResponse<Req>;
  metrics: UserRequestMetrics;
}

export type PromiseUserRequest<Req extends ModbusAbstractRequest> = Promise<
  UserRequestResolve<Req>
>;

/** Request created for the user. It contains the actual modbus request,
 * the timeout handler and the promise delivered from the readCoils method
 * in the client.
 * @export
 * @class UserRequest
 * @template ReqBody
 * @template ResBody
 */
export default class UserRequest<Req extends ModbusAbstractRequest = any> {
  protected readonly _request: Req;
  protected readonly _timeout: number;
  protected readonly _promise: PromiseUserRequest<Req>;
  protected _resolve!: (value: UserRequestResolve<Req>) => void;
  protected _reject!: (err: UserRequestError<RequestToResponse<Req>>) => void;
  protected _timer!: NodeJS.Timeout;

  protected _metrics: UserRequestMetrics;

  /**
   * Creates an instance of UserRequest.
   * @param {Req} request
   * @param {number} [timeout=5000]
   * @memberof UserRequest
   */
  constructor(request: Req, timeout: number = 5000) {
    debug('creating new user request with timeout', timeout);
    this._request = request;
    this._timeout = timeout;

    this._metrics = new UserRequestMetrics();

    this._promise = new Promise<UserRequestResolve<Req>>((resolve, reject) => {
      this._resolve = resolve;
      this._reject = reject;
    });
  }

  public createPayload() {
    return this._request.createPayload();
  }

  public start(cb: Function) {
    this._metrics.startedAt = new Date();

    this._timer = setTimeout(() => {
      this._reject(
        new UserRequestError({
          err: 'Timeout',
          message: 'Req timed out'
        })
      );
      cb();
    }, this._timeout);
  }

  public get metrics() {
    return this._metrics;
  }

  public done() {
    clearTimeout(this._timer);
  }

  get request() {
    return this._request;
  }

  get timeout() {
    return this._timeout;
  }

  get promise() {
    return this._promise;
  }

  public resolve(response: RequestToResponse<Req>) {
    this._metrics.receivedAt = new Date();
    debug(
      'request completed in %d ms (sat in cue %d ms)',
      this.metrics.transferTime,
      this.metrics.waitTime
    );
    return this._resolve({
      response: response,
      request: this._request,
      metrics: this.metrics
    });
  }

  get reject() {
    return this._reject;
  }
}
