import { FC } from '../codes';

import ModbusRequestBody from './request-body.js';

/** Write Multiple Coils Request Body
 * @extends ModbusRequestBody
 */
export default class WriteMultipleCoilsRequestBody extends ModbusRequestBody {
  private _address: number;
  private _values: boolean[] | Buffer;
  private _quantity: number;
  private _numberOfBytes: number;
  private _valuesAsBuffer!: Buffer;
  private _byteCount!: number;
  private _valuesAsArray!: boolean[];

  static fromBuffer(buffer: Buffer) {
    try {
      const fc = buffer.readUInt8(0);

      if (fc !== FC.WRITE_MULTIPLE_COILS) {
        return null;
      }

      const address = buffer.readUInt16BE(1);
      const quantity = buffer.readUInt16BE(3);
      const numberOfBytes = buffer.readUInt8(5);
      const values = buffer.slice(6, 6 + numberOfBytes);

      return new WriteMultipleCoilsRequestBody(address, values, quantity);
    } catch (e) {
      return null;
    }
  }

  /** Create a new Write Multiple Coils Request Body.
   * @param {number} address Write address.
   * @param {boolean[] | Buffer} values Values to be written. Either a Array of Boolean values or a Buffer.
   * @param {number} [quantity] In case of values being a Buffer, specify the number of coils that needs to be written.
   * @throws {InvalidStartAddressException} When address is larger than 0xFFFF.
   * @throws {InvalidArraySizeException}
   * @throws {InvalidBufferSizeException}
   */
  constructor(address: number, values: boolean[]);
  constructor(address: number, values: Buffer, quantity: number);
  constructor(address: number, values: boolean[] | Buffer, quantity?: number) {
    super(FC.WRITE_MULTIPLE_COILS);

    if (address > 0xffff) {
      throw new Error('InvalidStartAddress');
    }

    if (Array.isArray(values) && values.length > 0x07b0 * 8) {
      throw new Error('InvalidArraySize');
    }

    if (values instanceof Buffer) {
      if (values.length > 0x07b0) {
        throw new Error('InvalidBufferSize');
      }

      if (quantity !== undefined && values.length * 8 < quantity) {
        throw new Error('InvalidBufferSize');
      }
    }

    this._address = address;
    this._values = values;
    this._quantity = quantity || values.length;

    this._numberOfBytes = Math.ceil(this._quantity / 8);

    if (this._values instanceof Buffer) {
      this._valuesAsBuffer = this._values;
      this._byteCount = Math.ceil(this._quantity / 8) + 6;
      this._valuesAsArray = [];
      for (let i = 0; i < this._quantity; i += 1) {
        const pos = i % 8;
        const curByteIdx = Math.floor(i / 8);
        const curByte = this._values.readUInt8(curByteIdx);

        this._valuesAsArray.push((curByte & Math.pow(2, pos)) > 0);
      }
    }

    if (this._values instanceof Array) {
      this._byteCount = Math.ceil(this._values.length / 8) + 6;

      this._valuesAsArray = this._values;
      const len = Math.min(1968, this._values.length);

      let curByte = 0;
      let curByteIdx = 0;
      let cntr = 0;
      const bytes = Buffer.allocUnsafe(this._numberOfBytes);

      for (let i = 0; i < len; i += 1) {
        curByte += this._values[i] ? Math.pow(2, cntr) : 0;

        cntr = (cntr + 1) % 8;

        if (cntr === 0 || i === len - 1) {
          bytes.writeUInt8(curByte, curByteIdx);
          curByteIdx = curByteIdx + 1;
          curByte = 0;
        }
      }

      this._valuesAsBuffer = bytes;
    }
  }

  /** Address to be written to. */
  get address() {
    return this._address;
  }

  /** Values */
  get values() {
    return this._values;
  }

  get valuesAsArray() {
    return this._valuesAsArray;
  }

  get valuesAsBuffer() {
    return this._valuesAsBuffer;
  }

  /** Quantity of coils */
  get quantity() {
    return this._quantity;
  }

  get count() {
    return this.quantity;
  }

  get byteCount() {
    return this._byteCount;
  }

  get numberOfBytes() {
    return this._numberOfBytes;
  }

  get name() {
    return 'WriteMultipleCoils' as const;
  }

  public createPayload() {
    const payload = Buffer.alloc(this._byteCount);
    payload.writeUInt8(this._fc, 0); // function code
    payload.writeUInt16BE(this._address, 1); // start address
    payload.writeUInt16BE(this._quantity, 3); // quantity of coils
    payload.writeUInt8(this._numberOfBytes, 5); // byte count
    this._valuesAsBuffer.copy(payload, 6, 0, this._byteCount); // values

    return payload;
    // if (this._values instanceof Buffer) {

    // } else if (this._values instanceof Array) {
    //   const len = Math.min(1968, this._values.length)

    //   payload = Buffer.alloc(6 + this._numberOfBytes)
    //   const bytes = this._valuesAsBuffer

    //   payload.writeUInt8(this._fc, 0) // function code
    //   payload.writeUInt16BE(this._address, 1) // start address
    //   payload.writeUInt16BE(len, 3) // quantity of coils
    //   payload.writeUInt8(this._numberOfBytes, 5) // byte count

    //   bytes.copy(payload, 6) // values

    //   return payload
    // }
  }
}

export function isWriteMultipleCoilsRequestBody(
  x: any
): x is WriteMultipleCoilsRequestBody {
  if (x instanceof WriteMultipleCoilsRequestBody) {
    return true;
  } else {
    return false;
  }
}
