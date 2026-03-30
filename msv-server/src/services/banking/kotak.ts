import axios from 'axios';
import { env } from '../../config/env';
import { BankTransferPayload } from './icici';

export const kotakTransfer = async (payload: BankTransferPayload) => {
  if (!env.KOTAK_API_URL) {
    throw new Error('KOTAK_API_URL이 설정되지 않았습니다.');
  }
  const url = `${env.KOTAK_API_URL}${env.KOTAK_TRANSFER_PATH}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };
  if (env.KOTAK_API_KEY) {
    headers['x-api-key'] = env.KOTAK_API_KEY;
  }
  const response = await axios.post(url, payload, { headers, timeout: 20000 });
  return response.data;
};
