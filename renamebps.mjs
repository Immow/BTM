import * as fs from 'fs';
import * as path from 'path';
import { Parser } from "@etothepii/satisfactory-file-parser";


// Renames the bps to the name of the file

// Configuration
const SRC_DIR = './source';    // Put your cow.sbp, fox.sbp here
const DECODE_DIR = './decode'; // JSON files will go here
const OUTPUT_DIR = './output'; // Final .sbp files will go here

// Ensure directories exist
[SRC_DIR, DECODE_DIR, OUTPUT_DIR].forEach(dir => {
	if (!fs.existsSync(dir)) fs.mkdirSync(dir);
});

async function runPipeline() {
	const files = fs.readdirSync(SRC_DIR).filter(f => f.endsWith('.sbp'));

	for (const sbpFile of files) {
		const baseName = path.basename(sbpFile, '.sbp');
		const cfgFile = `${baseName}.sbpcfg`;

		if (!fs.existsSync(path.join(SRC_DIR, cfgFile))) {
			console.warn(`⚠️ Skipping ${sbpFile}, missing .sbpcfg`);
			continue;
		}

		console.log(`📦 Processing: ${baseName}...`);

		// STEP 2: Decode
		const sbpBuf = fs.readFileSync(path.join(SRC_DIR, sbpFile));
		const cfgBuf = fs.readFileSync(path.join(SRC_DIR, cfgFile));

		const blueprint = Parser.ParseBlueprintFiles(
			baseName,
			sbpBuf.buffer.slice(sbpBuf.byteOffset, sbpBuf.byteOffset + sbpBuf.byteLength),
			cfgBuf.buffer.slice(cfgBuf.byteOffset, cfgBuf.byteOffset + cfgBuf.byteLength)
		);

		// Save original JSON to decode folder
		fs.writeFileSync(path.join(DECODE_DIR, `${baseName}.json`), JSON.stringify(blueprint, null, 2));

		// Deep copy the blueprint object
		const modifiedBP = JSON.parse(JSON.stringify(blueprint));
		const newName = `${baseName}`;
		modifiedBP.name = newName;

		// Save the modified JSON
		fs.writeFileSync(path.join(DECODE_DIR, `${newName}.json`), JSON.stringify(modifiedBP, null, 2));

		// STEP 5: Encode back to .sbp
		let mainFileHeader;
		const mainFileBodyChunks = [];

		const summary = Parser.WriteBlueprintFiles(
			modifiedBP,
			(h) => mainFileHeader = h,
			(c) => mainFileBodyChunks.push(c)
		);

		const finalSbp = Buffer.concat([Buffer.from(mainFileHeader), ...mainFileBodyChunks.map(c => Buffer.from(c))]);

		fs.writeFileSync(path.join(OUTPUT_DIR, `${newName}.sbp`), finalSbp);
		fs.writeFileSync(path.join(OUTPUT_DIR, `${newName}.sbpcfg`), Buffer.from(summary.configFileBinary));

		console.log(`✅ Finished 6 variations for ${baseName}`);
	}
}

runPipeline().catch(console.error);