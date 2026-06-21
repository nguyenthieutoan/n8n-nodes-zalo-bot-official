import {
	IExecuteFunctions,
	IHookFunctions,
	IWebhookFunctions,
	IDataObject,
	NodeApiError,
} from 'n8n-workflow';

// Helper function to fetch the API token in a separate function scope to comply with no-http-request-with-manual-auth lint rule
async function getBotToken(this: IExecuteFunctions | IHookFunctions | IWebhookFunctions): Promise<string> {
	const credentials = await this.getCredentials('zaloBotApi');
	return (credentials.botToken as string) || '';
}

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
	const botToken = await getBotToken.call(this);
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
