import { INodeProperties } from 'n8n-workflow';
import { parseFoodItems } from '../ParseFunctions';

export const foodOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['food'],
			},
		},
		options: [
			{
				name: 'Search',
				value: 'search',
				action: 'Search food item',
				description: 'Search for food items',
				routing: {
					request: {
						method: 'POST',
						url: 'https://api.fddb.info/api/v1/search',
						qs: {
							lang: '={{$parameter.lang}}',
							q: '={{$parameter.q}}',
                            page: '={{$parameter.page}}',
                            pageSize: '={{$parameter.pageSize}}',
						},
					},
                    output: {
                        postReceive: [parseFoodItems],
                    },
				},
			},
		],
		default: 'search',
	},
];

export const foodFields: INodeProperties[] = [
	{
		displayName: 'Query',
		name: 'q',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['food'],
				operation: ['search'],
			},
		},
		description: 'Search term',
	},
	{
		displayName: 'Language',
		name: 'lang',
		type: 'string',
		default: 'de',
		displayOptions: {
			show: {
				resource: ['food'],
				operation: ['search'],
			},
		},
		description: 'Language code (e.g., de)',
	},
	{
		displayName: 'Page',
		name: 'page',
		type: 'number',
		default: 1,
		displayOptions: {
			show: {
				resource: ['food'],
				operation: ['search'],
			},
		},
	},
	{
		displayName: 'Page Size',
		name: 'pageSize',
		type: 'number',
		default: 20,
		displayOptions: {
			show: {
				resource: ['food'],
				operation: ['search'],
			},
		},
	}
];
