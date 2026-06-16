import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeApiError,
} from 'n8n-workflow';

export class ZaloBot implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Zalo Bot',
		name: 'zaloBot',
		icon: 'file:zalo-bot-icon.png',
		group: ['transform'],
		version: 1,
		description: 'Send messages, photos, voice, and manage interactions on the Zalo Bot platform',
		defaults: {
			name: 'Zalo Bot',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'zaloBotApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Message',
						value: 'message',
					},
					{
						name: 'Bot Info',
						value: 'botInfo',
					},
				],
				default: 'message',
			},
			// Message Operations
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['message'],
					},
				},
				options: [
					{
						name: 'Send Text Message',
						value: 'sendMessage',
						description: 'Send a plain text or rich text message',
					},
					{
						name: 'Send Photo',
						value: 'sendPhoto',
						description: 'Send a photo from a public URL',
					},
					{
						name: 'Send Sticker',
						value: 'sendSticker',
						description: 'Send an expressive sticker from Zalo',
					},
					{
						name: 'Send Voice Message',
						value: 'sendVoice',
						description: 'Send an audio file (.aac format) to a 1-1 chat',
					},
					{
						name: 'Send Chat Action',
						value: 'sendChatAction',
						description: 'Send a simulated chat action status (e.g. typing)',
					},
				],
				default: 'sendMessage',
			},
			// Bot Info Operations
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['botInfo'],
					},
				},
				options: [
					{
						name: 'Get Info',
						value: 'getMe',
						description: 'Get basic details about the authenticated Bot',
					},
				],
				default: 'getMe',
			},
			// Parameters for Message Resource
			{
				displayName: 'Chat ID',
				name: 'chatId',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						resource: ['message'],
					},
				},
				default: '',
				description: 'The unique identifier of the recipient chat (Note: Send Voice only supports 1-1 user chats)',
			},
			{
				displayName: 'Text',
				name: 'text',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						resource: ['message'],
						operation: ['sendMessage'],
					},
				},
				default: '',
				description: 'The content of the text message (maximum 2000 characters)',
			},
			{
				displayName: 'Parse Mode',
				name: 'parseMode',
				type: 'options',
				options: [
					{ name: 'None (Plain Text)', value: 'none' },
					{ name: 'Markdown', value: 'markdown' },
					{ name: 'HTML', value: 'html' },
				],
				displayOptions: {
					show: {
						resource: ['message'],
						operation: ['sendMessage'],
					},
				},
				default: 'none',
				description: 'Select formatting parser mode for rich text support',
			},
			{
				displayName: 'Photo URL',
				name: 'photoUrl',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						resource: ['message'],
						operation: ['sendPhoto'],
					},
				},
				default: '',
				description: 'The public URL of the image file to send',
			},
			{
				displayName: 'Caption',
				name: 'caption',
				type: 'string',
				displayOptions: {
					show: {
						resource: ['message'],
						operation: ['sendPhoto'],
					},
				},
				default: '',
				description: 'The description caption to display beneath the image',
			},
			{
				displayName: 'Sticker ID',
				name: 'stickerId',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						resource: ['message'],
						operation: ['sendSticker'],
					},
				},
				default: '',
				description: 'The identifier of the sticker from stickers.zaloapp.com library',
			},
			{
				displayName: 'Voice URL',
				name: 'voiceUrl',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						resource: ['message'],
						operation: ['sendVoice'],
					},
				},
				default: '',
				description: 'The public URL of the audio file (.aac format only). 1-1 chats only.',
			},
			{
				displayName: 'Action',
				name: 'action',
				type: 'options',
				options: [
					{ name: 'Typing', value: 'typing' },
				],
				required: true,
				displayOptions: {
					show: {
						resource: ['message'],
						operation: ['sendChatAction'],
					},
				},
				default: 'typing',
				description: 'Trigger simulated bot activity indicators',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const credentials = await this.getCredentials('zaloBotApi');
		const botToken = credentials.botToken as string;
		const baseUrl = 'https://bot-api.zaloplatforms.com';

		for (let i = 0; i < items.length; i++) {
			try {
				const resource = this.getNodeParameter('resource', i) as string;
				const operation = this.getNodeParameter('operation', i) as string;

				let endpoint = '';
				let body: any = {};

				if (resource === 'message') {
					const chatId = this.getNodeParameter('chatId', i) as string;
					body.chat_id = chatId;

					if (operation === 'sendMessage') {
						endpoint = `/bot${botToken}/sendMessage`;
						const text = this.getNodeParameter('text', i) as string;
						const parseMode = this.getNodeParameter('parseMode', i) as string;
						body.text = text;
						if (parseMode !== 'none') {
							body.parse_mode = parseMode;
						}
					} else if (operation === 'sendPhoto') {
						endpoint = `/bot${botToken}/sendPhoto`;
						const photoUrl = this.getNodeParameter('photoUrl', i) as string;
						const caption = this.getNodeParameter('caption', i) as string;
						body.photo = photoUrl;
						if (caption) {
							body.caption = caption;
						}
					} else if (operation === 'sendSticker') {
						endpoint = `/bot${botToken}/sendSticker`;
						const stickerId = this.getNodeParameter('stickerId', i) as string;
						body.sticker = stickerId;
					} else if (operation === 'sendVoice') {
						endpoint = `/bot${botToken}/sendVoice`;
						const voiceUrl = this.getNodeParameter('voiceUrl', i) as string;
						body.voice_url = voiceUrl;
					} else if (operation === 'sendChatAction') {
						endpoint = `/bot${botToken}/sendChatAction`;
						const action = this.getNodeParameter('action', i) as string;
						body.action = action;
					}
				} else if (resource === 'botInfo') {
					if (operation === 'getMe') {
						endpoint = `/bot${botToken}/getMe`;
					}
				}

				const options = {
					method: 'POST' as const,
					url: `${baseUrl}${endpoint}`,
					body,
					json: true,
				};

				let response: any;
				try {
					response = await this.helpers.httpRequest(options);
				} catch (error) {
					throw new NodeApiError(this.getNode(), error as any);
				}

				if (response && response.ok === false) {
					throw new NodeApiError(this.getNode(), response);
				}

				returnData.push({
					json: response.result || response,
					pairedItem: {
						item: i,
					},
				});
			} catch (error) {
				if (this.continueOnFail()) {
					const errorMessage = error instanceof Error ? error.message : String(error);
					returnData.push({ json: { error: errorMessage }, pairedItem: { item: i } });
					continue;
				}
				throw error;
			}
		}

		return [returnData];
	}
}
