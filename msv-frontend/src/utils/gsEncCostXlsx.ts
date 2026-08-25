/**
 * xlsx 브라우저 로더
 * CRA/webpack은 top-level named import 시 sideEffects:false 때문에 read가 undefined가 될 수 있음.
 * 업로드 시점에 dynamic import로 전체 모듈을 불러온다.
 */

import type { WorkSheet } from 'xlsx';

type XlsxRuntime = {
  read: typeof import('xlsx').read;
  utils: typeof import('xlsx').utils;
  SSF: typeof import('xlsx').SSF;
};

let xlsxCache: Promise<XlsxRuntime> | null = null;

function resolveXlsx(mod: XlsxRuntime & { default?: XlsxRuntime }): XlsxRuntime {
  if (typeof mod.read === 'function') return mod;
  if (mod.default && typeof mod.default.read === 'function') return mod.default;
  throw new Error('XLSX_LOAD_FAILED');
}

export async function loadGsEncXlsx(): Promise<XlsxRuntime> {
  if (!xlsxCache) {
    xlsxCache = import('xlsx').then((mod) =>
      resolveXlsx(mod as XlsxRuntime & { default?: XlsxRuntime })
    );
  }
  return xlsxCache;
}

export type { WorkSheet };
