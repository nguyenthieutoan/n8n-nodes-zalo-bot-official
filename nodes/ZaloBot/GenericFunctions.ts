import {
	IExecuteFunctions,
	IHookFunctions,
	IWebhookFunctions,
	IDataObject,
	NodeApiError,
} from 'n8n-workflow';

/**
 * Make an API request to the Zalo Bot Platform API
 */
export async function zaloBotApiRequest(
	this: IExecuteFunctions | IHookFunctions | IWebhookFunctions,
	method: 'GET' | 'POST' | 'PUT' | 'DELETE',
	endpoint: string,
	body: IDataObject = {},
	query: IDataObject = {},
): Promise<any> {
	const credentials = await this.getCredentials('zaloBotApi');
	const botToken = credentials.botToken as string;
	const baseUrl = 'https://bot-api.zaloplatforms.com';

	// The endpoint should start with / (e.g. /sendMessage)
	const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

	const options = {
		method,
		url: `${baseUrl}/bot${botToken}${cleanEndpoint}`,
		body,
		qs: query,
		json: true,
	};

	try {
		const response = await this.helpers.httpRequest(options);
		
		if (response && response.ok === false) {
			throw new NodeApiError(this.getNode(), response);
		}
		
		return response;
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as any);
	}
}
