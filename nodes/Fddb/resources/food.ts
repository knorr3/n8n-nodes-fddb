import {
	IExecuteSingleFunctions,
	INodeExecutionData,
	INodeProperties,
    JsonObject,
    JsonValue,
} from 'n8n-workflow';

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

interface IFddbItem {
	id: string;
	name: string;
	option: string;
	producer: string;
	kj: string;
	carbs: string;
	protein: string;
	fat: string;
	satFat: string;
	sugar: string;
	df: string;
	imageUrl: string;
	servings: JsonValue;
	key?: number | string;
}

export async function parseFoodItems(
	this: IExecuteSingleFunctions,
	items: INodeExecutionData[],
	responseData: unknown,
): Promise<INodeExecutionData[]> {
	const returnItems: INodeExecutionData[] = [];

	const response = responseData as { body?: { items?: unknown } };
	const itemsArray = response.body?.items;

	if (Array.isArray(itemsArray)) {
		for (const item of itemsArray as IFddbItem[]) {
			const newItem: JsonObject = {
				id: item.id,
				name: item.name,
				option: item.option,
				producer: item.producer,
				calories: Math.floor(parseFloat(item.kj) * 0.2390057361),
				carbs: item.carbs,
				protein: item.protein,
				fat: item.fat,
				saturatedFat: item.satFat,
				sugar: item.sugar,
				fiber: item.df,
				image: item.imageUrl,
				serving: item.servings,
			};

			returnItems.push({
				json: newItem,
				pairedItem: {
					item: (item.key as number) || 0,
				},
			});
		}
	} else {
		returnItems.push({
			json: responseData as JsonObject,
			pairedItem: {
				item: (items[0]?.key ?? 0) as number,
			},
		});
	}

	return returnItems;
}
