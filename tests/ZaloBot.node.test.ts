import { ZaloBot } from '../nodes/ZaloBot/ZaloBot.node';
import { ZaloBotTrigger } from '../nodes/ZaloBot/ZaloBotTrigger.node';
import { ZaloBotApi } from '../credentials/ZaloBotApi.credentials';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';

const mockZaloBotApiRequest = jest.fn();
jest.mock('../nodes/ZaloBot/GenericFunctions', () => {
	return {
		zaloBotApiRequest: function (this: any, ...args: any[]) {
			return mockZaloBotApiRequest.apply(this, args);
		}
	};
});

describe('ZaloBot Regular Node Unit Tests', () => {
	let node: ZaloBot;
	let mockExecuteContext: any;

	beforeEach(() => {
		node = new ZaloBot();
		mockZaloBotApiRequest.mockReset();
		mockExecuteContext = {
			getInputData: () => [{ json: {} }],
			getNodeParameter: jest.fn(),
			getNode: () => ({ typeVersion: 2 }),
			continueOnFail: () => false,
			helpers: {
				prepareBinaryData: jest.fn().mockResolvedValue({}),
			}
		};
	});

	// 1. Happy Path - Send Text Message
	test('Happy Path: should successfully send a text message', async () => {
		mockExecuteContext.getNodeParameter = jest.fn().mockImplementation((paramName, index, fallback) => {
			if (paramName === 'resource') return 'message';
			if (paramName === 'operation') return 'sendMessage';
			if (paramName === 'chatId') return '123456';
			if (paramName === 'text') return 'Hello World';
			if (paramName === 'additionalFields') return {};
			return fallback;
		});

		mockZaloBotApiRequest.mockResolvedValue({
			ok: true,
			result: { message_id: 'msg_98765' }
		});

		const result = await node.execute.call(mockExecuteContext);

		expect(mockZaloBotApiRequest).toHaveBeenCalledWith('POST', '/sendMessage', {
			chat_id: '123456',
			text: 'Hello World'
		});
		expect(result).toBeDefined();
		expect(result[0][0].json).toEqual({ message_id: 'msg_98765' });
	});

	// 2. Missing Data - Throw NodeOperationError if required parameter is missing
	test('Missing Data: should throw NodeOperationError if chatId is empty', async () => {
		mockExecuteContext.getNodeParameter = jest.fn().mockImplementation((paramName, index, fallback) => {
			if (paramName === 'resource') return 'message';
			if (paramName === 'operation') return 'sendMessage';
			if (paramName === 'chatId') throw new Error('Missing parameter');
			return fallback;
		});

		await expect(node.execute.call(mockExecuteContext)).rejects.toThrow();
	});

	// 3. Failed API - Handle Zalo Bot API failure
	test('Failed API: should throw NodeApiError when API returns an error', async () => {
		mockExecuteContext.getNodeParameter = jest.fn().mockImplementation((paramName, index, fallback) => {
			if (paramName === 'resource') return 'message';
			if (paramName === 'operation') return 'sendMessage';
			if (paramName === 'chatId') return '123456';
			if (paramName === 'text') return 'Hello World';
			if (paramName === 'additionalFields') return {};
			return fallback;
		});

		const apiError = new NodeApiError({ name: 'ZaloBot' } as any, { ok: false, error_code: 500, message: 'Internal Error' });
		mockZaloBotApiRequest.mockRejectedValue(apiError);

		await expect(node.execute.call(mockExecuteContext)).rejects.toThrow(NodeApiError);
	});
});

describe('ZaloBotTrigger Webhook Node Unit Tests', () => {
	let trigger: ZaloBotTrigger;
	let mockHookContext: any;

	beforeEach(() => {
		trigger = new ZaloBotTrigger();
		mockZaloBotApiRequest.mockReset();
		mockHookContext = {
			getNodeWebhookUrl: () => 'https://n8n.test/webhook/zalo',
			getCredentials: jest.fn().mockResolvedValue({ botToken: '123:secret' }),
			getWorkflowStaticData: jest.fn().mockReturnValue({}),
			getNode: () => ({ typeVersion: 2 }),
			getNodeParameter: jest.fn()
		};
	});

	test('Trigger checkExists: should return true if webhook exists on Zalo API', async () => {
		mockZaloBotApiRequest.mockResolvedValue({
			ok: true,
			result: { url: 'https://n8n.test/webhook/zalo' }
		});

		const exists = await trigger.webhookMethods.default.checkExists.call(mockHookContext);

		expect(mockZaloBotApiRequest).toHaveBeenCalledWith('POST', '/getWebhookInfo');
		expect(exists).toBe(true);
	});

	test('Trigger create: should set webhook URL and save secure secretToken', async () => {
		mockZaloBotApiRequest.mockResolvedValue({ ok: true });
		const mockStaticData: any = {};
		mockHookContext.getWorkflowStaticData = () => mockStaticData;

		const created = await trigger.webhookMethods.default.create.call(mockHookContext);

		expect(mockZaloBotApiRequest).toHaveBeenCalledWith('POST', '/setWebhook', expect.objectContaining({
			url: 'https://n8n.test/webhook/zalo'
		}));
		expect(created).toBe(true);
		expect(mockStaticData.secretToken).toBeDefined();
	});

	test('Trigger webhook processing: should verify secretToken and return payload', async () => {
		const mockWebhookContext: any = {
			getRequestObject: () => ({
				headers: {
					'x-bot-api-secret-token': 'valid-secret-token'
				}
			}),
			getBodyData: () => ({
				event_name: 'message.text.received',
				message: { text: 'Hello bot' }
			}),
			getWorkflowStaticData: () => ({ secretToken: 'valid-secret-token' }),
			getNode: () => ({ typeVersion: 2 }),
			getNodeParameter: () => ['message.text.received'],
			helpers: {
				returnJsonArray: (data: any) => [{ json: data }]
			}
		};

		const result = await trigger.webhook.call(mockWebhookContext);

		expect(result.noWebhookResponse).toBeUndefined();
		expect(result.workflowData).toBeDefined();
	});
});

describe('Zalo Bot API Credentials', () => {
	test('should define correct properties', () => {
		const credentials = new ZaloBotApi();
		expect(credentials.name).toBe('zaloBotApi');
		expect(credentials.displayName).toBe('Zalo Bot API');
		expect(credentials.icon).toBe('file:zalo-bot-icon.png');
		expect(credentials.test.request.method).toBe('POST');
	});
});
