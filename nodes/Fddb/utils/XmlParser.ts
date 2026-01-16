import {
	IExecuteSingleFunctions,
	INodeExecutionData,
	JsonObject,
	NodeApiError,
} from 'n8n-workflow';

export type XmlValue = string | XmlNode | Array<string | XmlNode>;

export interface XmlNode {
	[key: string]: XmlValue;
}

export class XmlParser {
	private pos: number = 0;
	private xml: string = '';

	parse(xml: string): XmlNode {
		this.xml = xml;
		this.pos = 0;
		this.skipWhitespace();
		
		if (this.xml.startsWith('<?xml', this.pos)) {
			// Skip XML declaration
			const end = this.xml.indexOf('?>', this.pos);
			if (end !== -1) {
				this.pos = end + 2;
			}
		}

		const result: XmlNode = {};
		while (this.pos < this.xml.length) {
			this.skipWhitespace();
			if (this.pos >= this.xml.length) break;

			// Check if we are at a tag
			if (this.xml[this.pos] === '<') {
				const { name, value } = this.parseElement();
				if (name) {
					// Root element handling (usually just one, but logic supports siblings)
					if (result[name]) {
						if (!Array.isArray(result[name])) {
							result[name] = [result[name] as string | XmlNode];
						}
						(result[name] as Array<string | XmlNode>).push(value as string | XmlNode);
					} else {
						result[name] = value;
					}
				}
			} else {
				// Unexpected content at root
				this.pos++;
			}
		}
		return result;
	}

	private parseElement(): { name: string; value: XmlValue } {
		this.skipWhitespace();
		if (this.xml[this.pos] !== '<') {
			throw new Error(`Expected < at position ${this.pos}`);
		}
		this.pos++; // Skip <

		// Parse tag name
		const nameStart = this.pos;
		while (this.pos < this.xml.length && !/\s|>/.test(this.xml[this.pos]) && this.xml[this.pos] !== '/') {
			this.pos++;
		}
		const tagName = this.xml.substring(nameStart, this.pos);

		// Parse attributes
		const attributes: XmlNode = {};
		while (this.pos < this.xml.length) {
			this.skipWhitespace();
			if (this.xml[this.pos] === '>' || this.xml[this.pos] === '/') break;

			// Attribute name
			const attrStart = this.pos;
			while (this.pos < this.xml.length && this.xml[this.pos] !== '=' && !/\s/.test(this.xml[this.pos])) {
				this.pos++;
			}
			const attrName = this.xml.substring(attrStart, this.pos);

			this.skipWhitespace();
			if (this.xml[this.pos] === '=') {
				this.pos++; // Skip =
				this.skipWhitespace();
				// Attribute value
				const quote = this.xml[this.pos];
				if (quote === '"' || quote === "'") {
					this.pos++; // Skip opening quote
					const valStart = this.pos;
					while (this.pos < this.xml.length && this.xml[this.pos] !== quote) {
						this.pos++;
					}
					const attrVal = this.xml.substring(valStart, this.pos);
					this.pos++; // Skip closing quote
					attributes[attrName] = attrVal;
				}
			}
		}

		// Check for self-closing tag
		if (this.xml[this.pos] === '/') {
			this.pos++; // Skip /
			if (this.xml[this.pos] === '>') {
				this.pos++; // Skip >
				return { name: tagName, value: Object.keys(attributes).length > 0 ? attributes : '' };
			}
		}

		this.pos++; // Skip >

		// Parse children or text content
		const children: XmlNode = {};
		let textContent = '';
		let hasChildren = false;

		while (this.pos < this.xml.length) {
			const nextTag = this.xml.indexOf('<', this.pos);
			if (nextTag === -1) break; // Should not happen in valid XML

			const text = this.xml.substring(this.pos, nextTag);
			if (text.trim().length > 0) {
				textContent += text;
			}
			this.pos = nextTag;

			// Check for end tag
			if (this.xml.startsWith(`</${tagName}>`, this.pos)) {
				this.pos += tagName.length + 3; // Skip </tagName>
				break;
			}
			
			// Comment
			if (this.xml.startsWith('<!--', this.pos)) {
				const commentEnd = this.xml.indexOf('-->', this.pos);
				if (commentEnd !== -1) {
					this.pos = commentEnd + 3;
					continue;
				}
			}
			
			// CDATA
			if (this.xml.startsWith('<![CDATA[', this.pos)) {
				const cdataEnd = this.xml.indexOf(']]>', this.pos);
				if (cdataEnd !== -1) {
					textContent += this.xml.substring(this.pos + 9, cdataEnd);
					this.pos = cdataEnd + 3;
					continue;
				}
			}

			// Parse child element
			hasChildren = true;
			const child = this.parseElement();
			if (child.name) {
				if (children[child.name]) {
					if (!Array.isArray(children[child.name])) {
						children[child.name] = [children[child.name] as string | XmlNode];
					}
					(children[child.name] as Array<string | XmlNode>).push(child.value as string | XmlNode);
				} else {
					children[child.name] = child.value;
				}
			}
		}
		
		// Construct result based on explicitArray: false, mergeAttrs: true behavior
		// If has attributes and text content, but no children -> usually library dependent. 
		// xml2js with mergeAttrs puts text in `_` field if there are attributes.
		
		if (Object.keys(attributes).length > 0) {
			if (hasChildren) {
				return { name: tagName, value: { ...attributes, ...children } };
			} else {
				if (textContent.length > 0) {
					// With mergeAttrs, if we have attributes and text, text usually goes to "_"
					// But if text is whitespace only we ignore it? implemented trim check above.
					return { name: tagName, value: { ...attributes, _: textContent } };
				}
				return { name: tagName, value: attributes };
			}
		} else {
			if (hasChildren) {
				return { name: tagName, value: children };
			} else {
				return { name: tagName, value: textContent };
			}
		}
	}

	private skipWhitespace() {
		while (this.pos < this.xml.length && /\s/.test(this.xml[this.pos])) {
			this.pos++;
		}
	}
}

export function parseXml(xml: string): Promise<XmlNode> {
	return new Promise((resolve, reject) => {
		try {
			const parser = new XmlParser();
			resolve(parser.parse(xml));
		} catch (error) {
			reject(error);
		}
	});
}

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
		const jsonResult = await parseXml(xmlString);
		
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
