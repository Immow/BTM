import * as fs from 'fs';
import { Parser } from "@etothepii/satisfactory-file-parser";

try {
	// 1. Read the files into standard Buffers
	const sbpBuffer = fs.readFileSync('./Belt_Tiers.sbp');
	const cfgBuffer = fs.readFileSync('./Belt_Tiers.sbpcfg');

	// 2. Convert to ArrayBuffers (which the Parser requires)
	const mainFile = sbpBuffer.buffer.slice(sbpBuffer.byteOffset, sbpBuffer.byteOffset + sbpBuffer.byteLength);
	const configFile = cfgBuffer.buffer.slice(cfgBuffer.byteOffset, cfgBuffer.byteOffset + cfgBuffer.byteLength);

	// 3. Parse (Using 'mainFile' to match the variable above)
	console.log("Decoding blueprint...");
	const blueprint = Parser.ParseBlueprintFiles('Myblueprint', mainFile, configFile);

	// 4. Write to JSON with formatting (the '2' makes it readable)
	fs.writeFileSync('Myblueprint.json', JSON.stringify(blueprint, null, 2));

	console.log("✅ Success! Myblueprint.json has been created.");
} catch (error) {
	console.error("❌ Error decoding:", error.message);
}