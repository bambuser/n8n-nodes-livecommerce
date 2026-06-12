import type {
  IAuthenticateGeneric,
  ICredentialType,
  INodeProperties,
} from 'n8n-workflow';

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

  // Tested by Bambuser.node.ts's `credentialTest.bambuserApiTest` method
  // (referenced via `testedBy` on each node's credentials array). A declarative
  // `test` block is not viable: the Bambuser API has no scope-free authenticated
  // endpoint, so any single test URL would 403 for keys scoped to one service
  // area. The custom method treats 403 as a valid credential (auth succeeded,
  // scope insufficient) and only fails on 401.
}
