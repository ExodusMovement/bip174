import { KeyValue, SighashType } from '../../interfaces';
import { InputTypes } from '../../typeFields.js';
import * as tools from 'uint8array-tools';

export function decode(keyVal: KeyValue): SighashType {
  if (keyVal.key[0] !== InputTypes.SIGHASH_TYPE) {
    throw new Error(
      'Decode Error: could not decode sighashType with key 0x' +
        tools.toHex(keyVal.key),
    );
  }
  return Number(tools.readUInt32(keyVal.value, 0, 'LE'));
}

export function encode(data: SighashType): KeyValue {
  const key = Uint8Array.from([InputTypes.SIGHASH_TYPE]);
  const value = new Uint8Array(4);
  tools.writeUInt32(value, 0, data, 'LE');
  return {
    key,
    value,
  };
}

export const expected = 'number';
export function check(data: any): data is SighashType {
  return typeof data === 'number';
}

export function canAdd(currentData: any, newData: any): boolean {
  return !!currentData && !!newData && currentData.sighashType === undefined;
}
