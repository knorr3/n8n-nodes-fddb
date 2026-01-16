import {
	IExecuteSingleFunctions,
	INodeExecutionData,
	INodeProperties,
    JsonObject,
} from 'n8n-workflow';
import { xmlToJson } from '../utils/XmlParser';

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

export async function parseHistory(
	this: IExecuteSingleFunctions,
	items: INodeExecutionData[],
): Promise<INodeExecutionData[]> {
	const returnItems: INodeExecutionData[] = [];

	for (const item of items) {
		const result = item.json.result as { history?: unknown | unknown[] };
		
		if (!result || !result.history) {
			continue;
		}

		let historyData = result.history;

		if (!Array.isArray(historyData)) {
			historyData = [historyData];
		}

		for (const entry of historyData as Array<{ date: string; weight: string; dvkj?: string }>) {
			const newItem: JsonObject = {
				date: new Date(parseInt(entry.date, 10) * 1000).toISOString(),
				weight: parseFloat(entry.weight),
			};

			returnItems.push({
				json: newItem,
				pairedItem: item.pairedItem,
			});
		}
	}

	return returnItems;
}


export async function parseProfile(
	this: IExecuteSingleFunctions,
	items: INodeExecutionData[],
): Promise<INodeExecutionData[]> {
	const returnItems: INodeExecutionData[] = [];

	for (const item of items) {
		const result = item.json as { profile?: unknown | unknown[] };
		
		if (!result || !result.profile) {
			continue;
		}

		let profileData = result.profile;

		if (!Array.isArray(profileData)) {
			profileData = [profileData];
		}

		for (const profile of profileData as JsonObject[]) {
			const newItem: JsonObject = {
				gender: profile.gender,
				yearofbirth: parseInt(profile.yearofbirth as string, 10),
				monthofbirth: parseInt(profile.monthofbirth as string, 10),
				dayofbirth: parseInt(profile.dayofbirth as string, 10),
				heightcm: parseInt(profile.heightcm as string, 10),
				dailyCaloriesBudget: Math.floor(parseInt(profile.dvkj as string, 10) * 0.2390057361),
				goalCarbs: parseInt(profile.goalkh as string, 10),
				goalProtein: parseInt(profile.goalprotein as string, 10),
				goalWater: parseInt(profile.goalwater as string, 10),
			};

			returnItems.push({
				json: newItem,
				pairedItem: item.pairedItem,
			});
		}
	}

	return returnItems;
}
