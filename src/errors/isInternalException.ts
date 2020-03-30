export type InternalErrorMessages =
  | 'InvalidStartAddress'
  | 'InvalidQuantity'
  | 'InvalidArraySize'
  | 'InvalidBufferSize'
  | 'InvalidCoilsInput'
  | 'InvalidType_MustBeBufferOrArray'
  | 'InvalidValue';

export interface InternalException extends Error {
  readonly message: InternalErrorMessages;
}

const InternalErrorMessagesArray: ReadonlyArray<InternalErrorMessages> = [
  'InvalidStartAddress',
  'InvalidQuantity',
  'InvalidArraySize',
  'InvalidBufferSize',
  'InvalidCoilsInput',
  'InvalidType_MustBeBufferOrArray',
  'InvalidValue'
];

export function isInternalException(x: any): x is InternalException {
  if (typeof x !== 'object') {
    return false;
  }

  if (InternalErrorMessagesArray.includes(x.message)) {
    return true;
  }

  return false;
}
