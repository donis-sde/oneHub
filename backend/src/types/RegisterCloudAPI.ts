export interface RegisterCloudAPIDto {
  subId: string;
}

export function isRegisterCloudAPIDto(v: unknown): v is RegisterCloudAPIDto {
  return (
    typeof v === 'object' && !!v && 'subId' in v && typeof v.subId === 'string'
  );
}
