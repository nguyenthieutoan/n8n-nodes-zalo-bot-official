import {
	IHookFunctions,
	IWebhookFunctions,
	INodeType,
	INodeTypeDescription,
	IWebhookResponseData,
	NodeConnectionTypes,
} from 'n8n-workflow';
import { createHash } from 'crypto';
import { zaloBotApiRequest } from './GenericFunctions';

export class ZaloBotTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Zalo Bot Trigger',
		name: 'zaloBotTrigger',
		icon: 'file:zalo-bot-icon.png',
		group: ['trigger'],
		version: [1, 2],
		defaultVersion: 2,
		subtitle: '=Events: {{$parameter["events"] ? $parameter["events"].join(", ") : "All"}}',
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
		properties: [
			{
				displayName: 'Trigger On',
				name: 'events',
				type: 'multiOptions',
				displayOptions: {
					show: {
						'@version': [2],
					},
				},
				options: [
					{
						name: '*',
						value: '*',
						description: 'All updates',
					},
					{
						name: 'Text Message',
						value: 'message.text.received',
						description: 'Trigger on new incoming text message',
					},
					{
						name: 'Image Message',
						value: 'message.image.received',
						description: 'Trigger on new incoming image message',
					},
					{
						name: 'Sticker Message',
						value: 'message.sticker.received',
						description: 'Trigger on new incoming sticker message',
					},
					{
						name: 'Voice Message',
						value: 'message.voice.received',
						description: 'Trigger on new incoming voice message',
					},
					{
						name: 'Unsupported Message',
						value: 'message.unsupported.received',
						description: 'Trigger on unsupported webhook events (e.g. child protection data masking)',
					},
				],
				default: ['*'],
				required: true,
				description: 'Select which Zalo events will trigger this workflow',
			},
		],
	};

	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const webhookUrl = this.getNodeWebhookUrl('default') as string;

				try {
					const response = await zaloBotApiRequest.call(this, 'POST', '/getWebhookInfo');
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

				// Generate a secure webhook token by hashing the bot token with SHA256
				const secretToken = createHash('sha256')
					.update(botToken)
					.digest('hex')
					.substring(0, 32);

				try {
					const response = await zaloBotApiRequest.call(this, 'POST', '/setWebhook', {
						url: webhookUrl,
						secret_token: secretToken,
					});
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
				try {
					const response = await zaloBotApiRequest.call(this, 'POST', '/deleteWebhook');
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
		const nodeVersion = this.getNode().typeVersion;

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

		// Event filtering for Version 2+
		if (nodeVersion >= 2) {
			const events = this.getNodeParameter('events', []) as string[];
			const eventPayload = (bodyData.result || bodyData) as any;
			const eventName = eventPayload.event_name as string;

			if (events.length > 0 && !events.includes('*')) {
				if (!events.includes(eventName)) {
					return {
						noWebhookResponse: true,
					};
				}
			}
		}

		// Format received event payload to pass it along the n8n execution pipeline
		return {
			workflowData: [
				this.helpers.returnJsonArray((bodyData.result || bodyData) as any),
			],
		};
	}
}
