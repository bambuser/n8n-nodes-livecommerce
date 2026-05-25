import type {
  IAuthenticateGeneric,
  ICredentialTestRequest,
  ICredentialType,
  INodeProperties,
} from 'n8n-workflow';

const REGION_ORIGIN_EXPRESSION =
  '={{ ($credentials.baseUrl || "").replace(/\\/$/, "") || ($credentials.region === "us" ? "https://liveshopping-api-us.bambuser.com" : "https://liveshopping-api-eu.bambuser.com") }}';

export class BambuserApi implements ICredentialType {
  name = 'bambuserApi';
  displayName = 'Bambuser API';
  icon = 'file:bambuser.svg' as const;
  documentationUrl = 'https://bambuser.com/docs';

  properties: INodeProperties[] = [
    {
      displayName: 'API Key',
      name: 'apiKey',
      type: 'string',
      typeOptions: { password: true },
      default: '',
      required: true,
    },
    {
      displayName: 'Region',
      name: 'region',
      type: 'options',
      options: [
        { name: 'EU', value: 'eu' },
        { name: 'US', value: 'us' },
      ],
      default: 'eu',
      required: true,
    },
    {
      displayName: 'Base URL Override',
      name: 'baseUrl',
      type: 'string',
      default: '',
      placeholder: 'https://liveshopping-api.bambuser.com',
      description: 'Leave empty to use the production URL for the selected region. Set to a stage or local mock URL to override.',
    },
  ];

  authenticate: IAuthenticateGeneric = {
    type: 'generic',
    properties: {
      headers: {
        Authorization: '=Token {{$credentials.apiKey}}',
      },
    },
  };

  test: ICredentialTestRequest = {
    request: {
      baseURL: REGION_ORIGIN_EXPRESSION,
      url: '/v1/shows',
      qs: { limit: 1 },
    },
  };
}
