import {
	IExecuteSingleFunctions,
	INodeExecutionData,
	INodeProperties,
    JsonObject,
} from 'n8n-workflow';
import { xmlToJson } from '../utils/XmlParser';

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

interface IDiaryEntry {
	diary_date: string;
	diaryshortitem: {
		data: {
			amount: string;
			diary_serving_amount: string;
			diary_serving_name: string;
			aggregate_state: string;
			kcal: string;
			fat_gram: string;
			kh_gram: string;
			sugar_gram: string;
			protein_gram: string;
			df_gram: string;
			water_gram: string;
			alcohol_gram: string;
			fat_sat_gram: string;
		};
		description: {
			name: string;
			option?: string;
		};
	};
}

export async function parseDiary(
	this: IExecuteSingleFunctions,
	items: INodeExecutionData[],
): Promise<INodeExecutionData[]> {
	const returnItems: INodeExecutionData[] = [];

	for (const item of items) {
		const result = item.json.result as { diaryelement?: unknown | unknown[] };

		if (!result || !result.diaryelement) {
			continue;
		}

		let diaryData = result.diaryelement;

		if (!Array.isArray(diaryData)) {
			diaryData = [diaryData];
		}

		for (const entry of diaryData as IDiaryEntry[]) {
			const data = entry.diaryshortitem.data;
			const description = entry.diaryshortitem.description;

			const amount = parseFloat(data.amount);
			const diaryServingAmount = parseFloat(data.diary_serving_amount);
			const factor = amount > 0 ? diaryServingAmount / amount : 0;

			const getValue = (val: string | undefined): number => {
				if (!val || val === '-1') return 0;
				return parseFloat(val);
			};

			const newItem: JsonObject = {
				diary_date: entry.diary_date,
				name: description.option ? `${description.name} (${description.option})` : description.name,
				diary_item: {
						diary_serving_name: data.diary_serving_name,
						aggregate_state: data.aggregate_state,
						total_calories: Math.floor(getValue(data.kcal) * factor),
						total_fat_gram: Math.floor(getValue(data.fat_gram) * factor),
						total_carbs_gram: Math.floor(getValue(data.kh_gram) * factor),
						total_sugar_gram: Math.floor(getValue(data.sugar_gram) * factor),
						total_protein_gram: Math.floor(getValue(data.protein_gram) * factor),
						total_fiber_gram: Math.floor(getValue(data.df_gram) * factor),
						total_water_gram: Math.floor(getValue(data.water_gram) * factor),
						total_alcohol_gram: Math.floor(getValue(data.alcohol_gram) * factor),
						total_saturated_fat_gram: Math.floor(getValue(data.fat_sat_gram) * factor),
				},
			};

			returnItems.push({
				json: newItem,
				pairedItem: item.pairedItem,
			});
		}
	}

	return returnItems;
}
