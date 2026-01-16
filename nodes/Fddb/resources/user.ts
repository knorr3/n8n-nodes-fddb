import { INodeProperties } from 'n8n-workflow';
import { xmlToJson, parseHistory, parseProfile } from '../ParseFunctions';

export const userOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['user'],
			},
		},
		options: [
			{
				name: 'Get Profile',
				value: 'getProfile',
				action: 'Get profile',
				description: 'Get user profile',
				routing: {
					request: {
						method: 'GET',
						url: '/user/profile.xml',
						qs: {
							lang: '={{$parameter.lang}}',
						},
					},
                    output: {
                        postReceive: [
							xmlToJson,
							parseProfile,
						],
                    },
				},
			},
			{
				name: 'Get Weight History',
				value: 'getWeightHistory',
				action: 'Get weight history',
				description: 'Get user weight history',
				routing: {
					request: {
						method: 'GET',
						url: '/user/history.xml',
						qs: {
							lang: '={{$parameter.lang}}',
						},
					},
                    output: {
						postReceive: [
							xmlToJson,
							parseHistory,
						],
                    },
				},
			},
		],
		default: 'getProfile',
	},
];

export const userFields: INodeProperties[] = [
	{
		displayName: 'Language',
		name: 'lang',
		type: 'string',
		default: 'de',
		displayOptions: {
			show: {
				resource: ['user'],
			},
		},
		description: 'Language code (e.g., de)',
	},
];
