/* eslint-disable */
import type { BambuserCredentialData } from './executeContext';

export const skipIfNoStageKey = (): boolean =>
  !process.env.BAMBUSER_STAGE_API_KEY || !process.env.BAMBUSER_STAGE_BASE_URL;

export const stageCredential = (): BambuserCredentialData => {
  const apiKey = process.env.BAMBUSER_STAGE_API_KEY;
  const baseUrl = process.env.BAMBUSER_STAGE_BASE_URL;
  if (!apiKey || !baseUrl) {
    throw new Error('BAMBUSER_STAGE_API_KEY and BAMBUSER_STAGE_BASE_URL must be set to run stage tests');
  }
  return { apiKey, region: 'eu', baseUrl };
};
