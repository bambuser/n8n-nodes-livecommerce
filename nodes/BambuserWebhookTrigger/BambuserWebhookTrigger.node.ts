import type {
  IDataObject,
  IHookFunctions,
  INodeType,
  INodeTypeDescription,
  IWebhookFunctions,
  IWebhookResponseData,
} from 'n8n-workflow';

import { resolveOrigin } from '../../lib/resolveOrigin';

export class BambuserWebhookTrigger implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Bambuser Webhook Trigger',
    name: 'bambuserWebhookTrigger',
    icon: 'file:bambuser-webhook.svg',
    group: ['trigger'],
    version: 1,
    description: 'Starts a workflow when Bambuser fires a webhook event. Registers the n8n URL with Bambuser on activation. Requires WRITE_WEBHOOKS scope. Note: deactivating the workflow does not remove the Bambuser subscription — delete it manually from the Bambuser dashboard.',
    defaults: { name: 'Bambuser Webhook Trigger' },
    inputs: [],
    outputs: ['main'],
    credentials: [{ name: 'bambuserApi', required: true, testedBy: 'bambuserApiTest' }],
    webhooks: [
      {
        name: 'default',
        httpMethod: 'POST',
        responseMode: 'onReceived',
        path: 'webhook',
      },
    ],
    properties: [
      {
        displayName: 'Topics',
        name: 'topics',
        type: 'multiOptions',
        required: true,
        options: [
          { name: 'Broadcast', value: 'broadcast' },
          { name: 'Product', value: 'product' },
          { name: 'Product Highlight', value: 'product-highlight' },
          { name: 'Show', value: 'show' },
          { name: 'User', value: 'user' },
        ],
        default: [],
        description: 'Event topics this webhook will receive',
      },
      {
        displayName: 'Subscription Name',
        name: 'subscriptionName',
        type: 'string',
        default: 'n8n',
        description: 'Label for the webhook registration in the Bambuser dashboard',
      },
    ],
		usableAsTool: true,
  };

  webhookMethods = {
    default: {
      async checkExists(this: IHookFunctions): Promise<boolean> {
        const staticData = this.getWorkflowStaticData('node');
        if (typeof staticData.webhookId !== 'string' || !staticData.webhookId) return false;
        // If the tunnel URL changed since last registration, re-register with the new URL.
        const currentUrl = this.getNodeWebhookUrl('default') as string;
        return staticData.webhookUrl === currentUrl;
      },

      async create(this: IHookFunctions): Promise<boolean> {
        const credentials = await this.getCredentials('bambuserApi');
        const origin = resolveOrigin(credentials.baseUrl as string, credentials.region as string);
        const webhookUrl = this.getNodeWebhookUrl('default') as string;
        const topics = this.getNodeParameter('topics') as string[];
        const subscriptionName = this.getNodeParameter('subscriptionName') as string;
        const staticData = this.getWorkflowStaticData('node');
        const body = { name: subscriptionName, url: webhookUrl, topics, headers: {} };

        // checkExists returns false both when there's no registration AND when the
        // URL drifted. In the latter case we already hold a webhookId — PUT to update
        // rather than POST to create a duplicate.
        if (typeof staticData.webhookId === 'string' && staticData.webhookId) {
          await this.helpers.httpRequestWithAuthentication.call(this, 'bambuserApi', {
            method: 'PUT',
            url: `${origin}/v1/webhooks/${staticData.webhookId}`,
            headers: { 'Content-Type': 'application/json' },
            body,
          });
          staticData.webhookUrl = webhookUrl;
          return true;
        }

        const response = await this.helpers.httpRequestWithAuthentication.call(this, 'bambuserApi', {
          method: 'POST',
          url: `${origin}/v1/webhooks`,
          headers: { 'Content-Type': 'application/json' },
          body,
        }) as { id: string };
        staticData.webhookId = response.id;
        staticData.webhookUrl = webhookUrl;
        return true;
      },

      async delete(this: IHookFunctions): Promise<boolean> {
        const staticData = this.getWorkflowStaticData('node');
        if (typeof staticData.webhookId !== 'string' || !staticData.webhookId) return true;

        const credentials = await this.getCredentials('bambuserApi');
        const origin = resolveOrigin(credentials.baseUrl as string, credentials.region as string);

        // Best-effort: ignore error if the remote subscription was already deleted
        await this.helpers.httpRequestWithAuthentication.call(this, 'bambuserApi', {
          method: 'DELETE',
          url: `${origin}/v1/webhooks/${staticData.webhookId}`,
        }).catch(() => {});

        delete staticData.webhookId;
        delete staticData.webhookUrl;
        return true;
      },
    },
  };

  async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
    const bodyData = this.getBodyData();
    return {
      workflowData: [[{ json: bodyData as IDataObject }]],
    };
  }
}
