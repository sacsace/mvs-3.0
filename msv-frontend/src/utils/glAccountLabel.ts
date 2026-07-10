type GlAccountLike = {
  code: string;
  name: string;
  name_en?: string | null;
};

/** UI 언어에 맞는 계정 표시명 */
export function getGlAccountLabel(account: GlAccountLike, language: string): string {
  const useEn = language.startsWith('en');
  const name = useEn && account.name_en ? account.name_en : account.name;
  return `${account.code} ${name}`;
}

export function getGlAccountName(account: GlAccountLike, language: string): string {
  const useEn = language.startsWith('en');
  return useEn && account.name_en ? account.name_en : account.name;
}
