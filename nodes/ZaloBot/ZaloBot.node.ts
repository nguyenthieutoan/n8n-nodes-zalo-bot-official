import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { zaloBotApiRequest } from './GenericFunctions';

export class ZaloBot implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Zalo Bot',
		name: 'zaloBot',
		icon: 'file:zalo-bot-icon.png',
		group: ['transform'],
		version: [1, 2],
		defaultVersion: 2,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Send messages, photos, voice, and manage interactions on the Zalo Bot platform',
		defaults: {
			name: 'Zalo Bot',
		},
		usableAsTool: true,
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
						name: 'Bot',
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
						action: 'Send a text message',
					},
					{
						name: 'Send Photo',
						value: 'sendPhoto',
						description: 'Send a photo from a public URL',
						action: 'Send a photo',
					},
					{
						name: 'Send Sticker',
						value: 'sendSticker',
						description: 'Send an expressive sticker from Zalo',
						action: 'Send a sticker',
					},
					{
						name: 'Send Voice Message',
						value: 'sendVoice',
						description: 'Send an audio file (.aac format) to a 1-1 chat',
						action: 'Send a voice message',
					},
					{
						name: 'Send Chat Action',
						value: 'sendChatAction',
						description: 'Send a simulated chat action status (e.g. typing)',
						action: 'Send a chat action',
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
						action: 'Get bot info',
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
			// Version 1.0: Parse Mode is a root property
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
						'@version': [1],
						resource: ['message'],
						operation: ['sendMessage'],
					},
				},
				default: 'none',
				description: 'Select formatting parser mode for rich text support',
			},
			// Version 1.1: parseMode inside additionalFields collection (Progressive Disclosure)
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: {
					show: {
						'@version': [2],
						resource: ['message'],
						operation: ['sendMessage'],
					},
				},
				options: [
					{
						displayName: 'Parse Mode',
						name: 'parseMode',
						type: 'options',
						options: [
							{ name: 'None (Plain Text)', value: 'none' },
							{ name: 'Markdown', value: 'markdown' },
							{ name: 'HTML', value: 'html' },
						],
						default: 'none',
						description: 'Select formatting parser mode for rich text support',
					},
				],
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
			// Version 1.0: Caption is a root property
			{
				displayName: 'Caption',
				name: 'caption',
				type: 'string',
				displayOptions: {
					show: {
						'@version': [1],
						resource: ['message'],
						operation: ['sendPhoto'],
					},
				},
				default: '',
				description: 'The description caption to display beneath the image',
			},
			// Version 1.1: caption inside additionalFields collection (Progressive Disclosure)
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: {
					show: {
						'@version': [2],
						resource: ['message'],
						operation: ['sendPhoto'],
					},
				},
				options: [
					{
						displayName: 'Caption',
						name: 'caption',
						type: 'string',
						default: '',
						description: 'The description caption to display beneath the image',
					},
				],
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
		const nodeVersion = this.getNode().typeVersion;

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
						endpoint = '/sendMessage';
						const text = this.getNodeParameter('text', i) as string;
						body.text = text;

						let parseMode = 'none';
						if (nodeVersion === 1) {
							parseMode = this.getNodeParameter('parseMode', i) as string;
						} else {
							const additionalFields = this.getNodeParameter('additionalFields', i, {}) as any;
							if (additionalFields.parseMode) {
								parseMode = additionalFields.parseMode as string;
							}
						}

						if (parseMode !== 'none') {
							body.parse_mode = parseMode;
						}
					} else if (operation === 'sendPhoto') {
						endpoint = '/sendPhoto';
						const photoUrl = this.getNodeParameter('photoUrl', i) as string;
						body.photo = photoUrl;

						let caption = '';
						if (nodeVersion === 1) {
							caption = this.getNodeParameter('caption', i) as string;
						} else {
							const additionalFields = this.getNodeParameter('additionalFields', i, {}) as any;
							if (additionalFields.caption) {
								caption = additionalFields.caption as string;
							}
						}

						if (caption) {
							body.caption = caption;
						}
					} else if (operation === 'sendSticker') {
						endpoint = '/sendSticker';
						const stickerId = this.getNodeParameter('stickerId', i) as string;
						body.sticker = stickerId;
					} else if (operation === 'sendVoice') {
						endpoint = '/sendVoice';
						const voiceUrl = this.getNodeParameter('voiceUrl', i) as string;
						body.voice_url = voiceUrl;
					} else if (operation === 'sendChatAction') {
						endpoint = '/sendChatAction';
						const action = this.getNodeParameter('action', i) as string;
						body.action = action;
					}
				} else if (resource === 'botInfo') {
					if (operation === 'getMe') {
						endpoint = '/getMe';
					}
				}

				const response = await zaloBotApiRequest.call(this, 'POST', endpoint, body);

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
