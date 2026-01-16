import {
	IExecuteSingleFunctions,
	INodeExecutionData,
	JsonObject,
	NodeApiError,
} from 'n8n-workflow';
import { parseStringPromise } from 'xml2js';

export async function xmlToJson(
	this: IExecuteSingleFunctions,
	items: INodeExecutionData[],
	responseData: unknown,
): Promise<INodeExecutionData[]> {
	const returnItems: INodeExecutionData[] = [];

	let xmlString = responseData;
	// Handle cases where responseData might be wrapped
	if (typeof responseData === 'object' && responseData !== null && 'body' in responseData) {
		xmlString = (responseData as { body: unknown }).body;
	}

	if (typeof xmlString !== 'string') {
		// If it's not a string, return as is (maybe it was already parsed or is empty)
        // If it is an object/buffer, try to return it in json property
        if (typeof xmlString === 'object' && xmlString !== null) {
             return items.map((item) => ({
                json: xmlString as JsonObject,
                pairedItem: { item: item.key as number },
            }));
        }
		return items;
	}

	try {
        // explicitArray: false -> do not put child elements in array if there is only one
        // mergeAttrs: true -> attributes become properties
		const jsonResult = await parseStringPromise(xmlString, { explicitArray: false, mergeAttrs: true });
		
        items.forEach((item) => {
			returnItems.push({
				json: jsonResult as JsonObject,
				pairedItem: {
					item: item.key as number,
				},
			});
		});

	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject, { message: 'Failed to convert XML to JSON' });
	}

	return returnItems;
}

export async function parseFoodItems(
	this: IExecuteSingleFunctions,
	items: INodeExecutionData[],
	responseData: any,
): Promise<INodeExecutionData[]> {
	const returnItems: INodeExecutionData[] = [];
    
	const itemsArray = responseData.body.items;

	if (Array.isArray(itemsArray)) {
		for (const item of itemsArray) {
			const newItem: JsonObject = {
                id: item.id,
                name: item.name,
				option: item.option,
                producer: item.producer,
                calories: Math.floor(item.kj * 0.2390057361),
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
					item: item.key as number,
				},
			});
		}
	} else {
        returnItems.push({
            json: responseData,
            pairedItem: {
                item: (items[0]?.key ?? 0) as number,
            }
        });
    }

	return returnItems;
}


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

		for (const entry of diaryData as any[]) {
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
						kcal: Math.floor(getValue(data.kcal) * factor),
						fat_gram: Math.floor(getValue(data.fat_gram) * factor),
						kh_gram: Math.floor(getValue(data.kh_gram) * factor),
						sugar_gram: Math.floor(getValue(data.sugar_gram) * factor),
						protein_gram: Math.floor(getValue(data.protein_gram) * factor),
						df_gram: Math.floor(getValue(data.df_gram) * factor),
						water_gram: Math.floor(getValue(data.water_gram) * factor),
						alcohol_gram: Math.floor(getValue(data.alcohol_gram) * factor),
						fat_sat_gram: Math.floor(getValue(data.fat_sat_gram) * factor),
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
