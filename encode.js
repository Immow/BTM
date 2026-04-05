import * as fs from 'fs';
import { Parser } from "@etothepii/satisfactory-file-parser";

try {
	// 1. Load your edited JSON
	const blueprintData = JSON.parse(fs.readFileSync('./Myblueprint.json', 'utf8'));

	let mainFileHeader;
	const mainFileBodyChunks = [];

	console.log('Encoding blueprint data...');

	// 2. The Wiki Logic: Use callbacks to capture the header and body chunks
	const summary = Parser.WriteBlueprintFiles(
		blueprintData,
		(header) => {
			mainFileHeader = header;
		},
		(chunk) => {
			mainFileBodyChunks.push(chunk);
		}
	);

	// 3. Combine the chunks into a single Buffer
	// We use Buffer.concat to merge the header and all body parts
	const finalSbpBuffer = Buffer.concat([
		Buffer.from(mainFileHeader),
		...mainFileBodyChunks.map(chunk => Buffer.from(chunk))
	]);

	// 4. Write the .sbp and .sbpcfg files
	fs.writeFileSync('./Myblueprint_MODDED.sbp', finalSbpBuffer);
	fs.writeFileSync('./Myblueprint_MODDED.sbpcfg', Buffer.from(summary.configFileBinary));

	console.log('✅ Success! Created Myblueprint_MODDED.sbp and .sbpcfg');

} catch (error) {
	console.error('❌ Error encoding:', error.message);
}