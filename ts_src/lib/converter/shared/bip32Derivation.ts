import { Bip32Derivation, KeyValue } from '../../interfaces';
import * as tools from 'uint8array-tools';
const range = (n: number): number[] => [...Array(n).keys()];

const isValidDERKey = (pubkey: Uint8Array): boolean =>
  (pubkey.length === 33 && [2, 3].includes(pubkey[0])) ||
  (pubkey.length === 65 && 4 === pubkey[0]);

export function makeConverter(
  TYPE_BYTE: number,
  isValidPubkey = isValidDERKey,
): {
  decode: (keyVal: KeyValue) => Bip32Derivation;
  encode: (data: Bip32Derivation) => KeyValue;
  check: (data: any) => data is Bip32Derivation;
  expected: string;
  canAddToArray: (
    array: Bip32Derivation[],
    item: Bip32Derivation,
    dupeSet: Set<string>,
  ) => boolean;
} {
  function decode(keyVal: KeyValue): Bip32Derivation {
    if (keyVal.key[0] !== TYPE_BYTE) {
      throw new Error(
        'Decode Error: could not decode bip32Derivation with key 0x' +
          tools.toHex(keyVal.key),
      );
    }
    const pubkey = keyVal.key.slice(1);
    if (!isValidPubkey(pubkey)) {
      throw new Error(
        'Decode Error: bip32Derivation has invalid pubkey in key 0x' +
          tools.toHex(keyVal.key),
      );
    }
    if ((keyVal.value.length / 4) % 1 !== 0) {
      throw new Error(
        'Decode Error: Input BIP32_DERIVATION value length should be multiple of 4',
      );
    }
    const data = {
      masterFingerprint: keyVal.value.slice(0, 4),
      pubkey,
      path: 'm',
    };
    for (const i of range(keyVal.value.length / 4 - 1)) {
      const val = tools.readUInt32(keyVal.value, i * 4 + 4, 'LE');
      const isHard = !!(val & 0x80000000);
      const idx = val & 0x7fffffff;
      data.path += '/' + idx.toString(10) + (isHard ? "'" : '');
    }
    return data;
  }

  function encode(data: Bip32Derivation): KeyValue {
    const head = Uint8Array.from([TYPE_BYTE]);
    const key = tools.concat([head, data.pubkey]);

    const splitPath = data.path.split('/');
    const value = new Uint8Array(splitPath.length * 4);

    value.set(data.masterFingerprint, 0);
    let offset = 4;
    splitPath.slice(1).forEach(level => {
      const isHard = level.slice(-1) === "'";
      let num = 0x7fffffff & parseInt(isHard ? level.slice(0, -1) : level, 10);
      if (isHard) num += 0x80000000;

      tools.writeUInt32(value, offset, num, 'LE');
      offset += 4;
    });

    return {
      key,
      value,
    };
  }

  const expected =
    '{ masterFingerprint: Uint8Array; pubkey: Uint8Array; path: string; }';
  function check(data: any): data is Bip32Derivation {
    return (
      data.pubkey instanceof Uint8Array &&
      data.masterFingerprint instanceof Uint8Array &&
      typeof data.path === 'string' &&
      isValidPubkey(data.pubkey) &&
      data.masterFingerprint.length === 4
    );
  }

  function canAddToArray(
    array: Bip32Derivation[],
    item: Bip32Derivation,
    dupeSet: Set<string>,
  ): boolean {
    const dupeString = tools.toHex(item.pubkey);
    if (dupeSet.has(dupeString)) return false;
    dupeSet.add(dupeString);
    return (
      array.filter(v => tools.compare(v.pubkey, item.pubkey) === 0).length === 0
    );
  }

  return {
    decode,
    encode,
    check,
    expected,
    canAddToArray,
  };
}
