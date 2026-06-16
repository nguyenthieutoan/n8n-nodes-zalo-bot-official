import {
	ICredentialType,
	INodeProperties,
	ICredentialTestRequest,
} from 'n8n-workflow';

export class ZaloBotApi implements ICredentialType {
	name = 'zaloBotApi';
	displayName = 'Zalo Bot API';
	documentationUrl = 'https://bot.zapps.me/docs';
	icon = 'file:zalo-bot-icon.png' as const;
	properties: INodeProperties[] = [
		{
			displayName: 'Bot Token',
			name: 'botToken',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			required: true,
			description: 'The bot token retrieved from Zalo Bot Manager, formatted as {bot_id}:{secret_key}',
		},
	];

	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://bot-api.zaloplatforms.com',
			url: '/bot={{$credentials.botToken}}/getMe',
			method: 'POST',
		},
	};
}
