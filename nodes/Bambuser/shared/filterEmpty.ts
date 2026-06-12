import type { IDataObject } from 'n8n-workflow';

export const filterEmpty = (obj: Record<string, unknown>): IDataObject =>
  Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== '' && v !== undefined && v !== null),
  ) as IDataObject;
