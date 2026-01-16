import type {
	IAuthenticateGeneric,
	Icon,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class FddbApi implements ICredentialType {
	name = 'fddbApi';

	displayName = 'Fddb API';

	icon: Icon = { light: 'file:../icons/fddb.svg', dark: 'file:../icons/fddb.dark.svg' };

	// Link to your community node's README
	documentationUrl = 'https://github.com/org/-fddb?tab=readme-ov-file#credentials';

	properties: INodeProperties[] = [
		{
			displayName: 'Username',
			name: 'username',
			type: 'string',
			default: '',
		},
		{
			displayName: 'Password',
			name: 'password',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
		},
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			auth: {
				username: '={{$credentials.username}}',
				password: '={{$credentials.password}}',
			},
			headers: {
				'x-access-token': '={{$credentials.apiKey}}',
			},
			qs: {
				apikey: '={{$credentials.apiKey}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://fddb.info/api/v20',
			url: '/user/profile.xml',
		},
	};
}
