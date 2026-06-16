import {
	IHookFunctions,
	IWebhookFunctions,
	INodeType,
	INodeTypeDescription,
	IWebhookResponseData,
	NodeConnectionTypes,
} from 'n8n-workflow';
import { createHash } from 'crypto';

export class ZaloBotTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Zalo Bot Trigger',
		name: 'zaloBotTrigger',
		icon: 'file:zalo-bot-icon.png',
		group: ['trigger'],
		version: 1,
		description: 'Trigger a workflow when a real-time message event is received from Zalo',
		defaults: {
			name: 'Zalo Bot Trigger',
		},
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'zaloBotApi',
				required: true,
			},
		],
		webhooks: [
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode: 'onReceived',
				path: 'webhook',
			},
		],
		properties: [],
	};

	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const webhookUrl = this.getNodeWebhookUrl('default') as string;
				const credentials = await this.getCredentials('zaloBotApi');
				const botToken = credentials.botToken as string;
				const baseUrl = 'https://bot-api.zaloplatforms.com';

				const options = {
					method: 'POST' as const,
					url: `${baseUrl}/bot${botToken}/getWebhookInfo`,
					json: true,
				};

				try {
					const response = await this.helpers.httpRequest(options) as any;
					if (response && response.ok && response.result && response.result.url) {
						const normalizeUrl = (url: string) => url.replace(/\/+$/, '');
						if (normalizeUrl(response.result.url) === normalizeUrl(webhookUrl)) {
							return true;
						}
					}
					return false;
				} catch (error) {
					return false;
				}
			},

			async create(this: IHookFunctions): Promise<boolean> {
				const webhookUrl = this.getNodeWebhookUrl('default') as string;
				const credentials = await this.getCredentials('zaloBotApi');
				const botToken = credentials.botToken as string;
				const baseUrl = 'https://bot-api.zaloplatforms.com';

				// Generate a secure webhook token by hashing the bot token with SHA256
				const secretToken = createHash('sha256')
					.update(botToken)
					.digest('hex')
					.substring(0, 32);

				const options = {
					method: 'POST' as const,
					url: `${baseUrl}/bot${botToken}/setWebhook`,
					body: {
						url: webhookUrl,
						secret_token: secretToken,
					},
					json: true,
				};

				try {
					const response = await this.helpers.httpRequest(options) as any;
					if (response && response.ok) {
						// Save the secret token in node static data for future request verification
						const webhookData = this.getWorkflowStaticData('node');
						webhookData.secretToken = secretToken;
						return true;
					}
				} catch (error) {
					return false;
				}
				return false;
			},

			async delete(this: IHookFunctions): Promise<boolean> {
				const credentials = await this.getCredentials('zaloBotApi');
				const botToken = credentials.botToken as string;
				const baseUrl = 'https://bot-api.zaloplatforms.com';

				const options = {
					method: 'POST' as const,
					url: `${baseUrl}/bot${botToken}/deleteWebhook`,
					json: true,
				};

				try {
					const response = await this.helpers.httpRequest(options) as any;
					return !!(response && response.ok);
				} catch (error) {
					return false;
				}
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const req = this.getRequestObject();
		const headers = req.headers;
		const bodyData = this.getBodyData();

		// Retrieve the saved secret token from active workflow static data
		const webhookData = this.getWorkflowStaticData('node');
		const savedSecretToken = webhookData.secretToken as string;

		// Verify origin and validity of the incoming webhook request
		const incomingSecretToken = headers['x-bot-api-secret-token'];
		if (incomingSecretToken !== savedSecretToken) {
			return {
				noWebhookResponse: true,
			};
		}

		// Format received event payload to pass it along the n8n execution pipeline
		return {
			workflowData: [
				this.helpers.returnJsonArray((bodyData.result || bodyData) as any),
			],
		};
	}
}
