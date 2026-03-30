import { BankTransferPayload, iciciTransfer } from './icici';
import { kotakTransfer } from './kotak';

export type BankProvider = 'icici' | 'kotak';

export const transferToBank = async (provider: BankProvider, payload: BankTransferPayload) => {
  if (provider === 'icici') {
    return iciciTransfer(payload);
  }
  if (provider === 'kotak') {
    return kotakTransfer(payload);
  }
  throw new Error('지원하지 않는 은행입니다.');
};
