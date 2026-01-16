import { NodeConnectionTypes, type INodeType, type INodeTypeDescription } from 'n8n-workflow';
import { userOperations, userFields } from './resources/user';
import { diaryOperations, diaryFields } from './resources/diary';
import { foodOperations, foodFields } from './resources/food';

export class Fddb implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Fddb',
		name: 'fddb',
		icon: { light: 'file:../../icons/fddb.svg', dark: 'file:../../icons/fddb.dark.svg' },
		group: ['input'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Interact with the Fddb API',
		defaults: {
			name: 'Fddb',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [{ name: 'fddbApi', required: true }],
		requestDefaults: {
			baseURL: 'https://fddb.info/api/v20',
			headers: {
				'Accept': '*/*',
				'User-Agent': 'FDDB Mobile/4.0.1 (fddb.mobile.ios; build:202512181606; iOS 26.2.0) Alamofire/4.9.1',
				'Accept-Language': 'de-DE;q=1.0, en-DE;q=0.9',
				'Accept-Encoding': 'gzip;q=1.0, compress;q=0.5',
			},
		},
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'User',
						value: 'user',
					},
					{
						name: 'Diary',
						value: 'diary',
					},
					{
						name: 'Food',
						value: 'food',
					},
				],
				default: 'user',
			},
			...userOperations,
			...userFields,
            ...diaryOperations,
            ...diaryFields,
            ...foodOperations,
            ...foodFields,
		],
	};
}
