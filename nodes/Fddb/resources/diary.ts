import { INodeProperties } from 'n8n-workflow';
import { xmlToJson, parseDiary } from '../ParseFunctions';

export const diaryOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['diary'],
			},
		},
		options: [
			{
				name: 'Get Interval',
				value: 'getInterval',
				action: 'Get diary interval',
				description: 'Get diary entries for a specific time interval',
				routing: {
					request: {
						method: 'GET',
						url: '=/diary/get_interval_{{new Date($parameter.startDate).getDate()}}_{{new Date($parameter.startDate).getMonth() + 1}}_{{new Date($parameter.startDate).getFullYear()}}_{{new Date($parameter.endDate).getDate()}}_{{new Date($parameter.endDate).getMonth() + 1}}_{{new Date($parameter.endDate).getFullYear()}}.xml',
						qs: {
							lang: '={{$parameter.lang}}',
							timezone: '={{$parameter.timezone}}',
						},
					},
                    output: {
                        postReceive: [
							xmlToJson,
							parseDiary
						],
                    },
				},
			},
			{
				name: 'Track Food Item',
				value: 'track',
				action: 'Track food item',
				description: 'Add items to diary',
				routing: {
					request: {
						method: 'POST',
						url: '/diary/bulkadd_item.json',
						qs: {
							lang: '={{$parameter.lang}}',
						},
						body: {
							items: '={{$parameter.items.item.map((i: any) => ({ item_id: i.item_id, custom_serving: i.custom_serving, timestamp: Math.round(new Date(i.timestamp).getTime() / 1000) }))}}',
						},
					},
				},
			},
		],
		default: 'getInterval',
	},
];

export const diaryFields: INodeProperties[] = [
	{
		displayName: 'Start Date',
		name: 'startDate',
		type: 'dateTime',
		default: '',
		displayOptions: {
			show: {
				resource: ['diary'],
				operation: ['getInterval'],
			},
		},
		required: true,
	},
	{
		displayName: 'End Date',
		name: 'endDate',
		type: 'dateTime',
		default: '',
		displayOptions: {
			show: {
				resource: ['diary'],
				operation: ['getInterval'],
			},
		},
		required: true,
	},
	{
		displayName: 'Timezone',
		name: 'timezone',
		type: 'string',
		default: 'UTC',
		displayOptions: {
			show: {
				resource: ['diary'],
				operation: ['getInterval'],
			},
		},
	},
    {
        displayName: 'Items',
        name: 'items',
        type: 'fixedCollection',
        default: {},
        typeOptions: {
            multipleValues: true,
        },
        displayOptions: {
            show: {
                resource: ['diary'],
                operation: ['track'],
            },
        },
        options: [
            {
                name: 'item',
                displayName: 'Item',
                values: [
                    {
                        displayName: 'Item ID',
                        name: 'item_id',
                        type: 'string',
                        default: '',
                        required: true,
                    },
                    {
                        displayName: 'Timestamp',
                        name: 'timestamp',
                        type: 'dateTime',
                        default: '',
                        description: 'Date and time of the entry',
                        required: true,
                    },
                    {
                        displayName: 'Custom Serving',
                        name: 'custom_serving',
                        type: 'number',
                        default: 0,
                        description: 'Amount in grams or portion',
                        required: true,
                    },
                ],
            },
        ],
    },
];
