import axios from 'axios';
import { env } from '../../config/env';

export type BankTransferPayload = {
  amount: number;
  currency: string;
  beneficiaryName: string;
  beneficiaryAccount: string;
  ifsc: string;
  bankName?: string;
  reference?: string;
  remarks?: string;
};

export const iciciTransfer = async (payload: BankTransferPayload) => {
  if (!env.ICICI_API_URL) {
    throw new Error('ICICI_API_URL이 설정되지 않았습니다.');
  }
  const url = `${env.ICICI_API_URL}${env.ICICI_TRANSFER_PATH}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };
  if (env.ICICI_API_KEY) {
    headers['x-api-key'] = env.ICICI_API_KEY;
  }
  const response = await axios.post(url, payload, { headers, timeout: 20000 });
  return response.data;
};
