import * as fs from 'fs';
import * as path from 'path';
import { Parser } from "@etothepii/satisfactory-file-parser";

// Configuration
const SRC_DIR = './source';    // Put your cow.sbp, fox.sbp here
const DECODE_DIR = './decode'; // JSON files will go here
const OUTPUT_DIR = './output'; // Final .sbp files will go here

// Ensure directories exist
[SRC_DIR, DECODE_DIR, OUTPUT_DIR].forEach(dir => {
	if (!fs.existsSync(dir)) fs.mkdirSync(dir);
});

// The 6 Tiers of Satisfactory Belts
const BELT_TIERS = [
	{ tier: 1, class: "ConveyorBeltMk1", recipe: "Recipe_ConveyorBeltMk1" },
	{ tier: 2, class: "ConveyorBeltMk2", recipe: "Recipe_ConveyorBeltMk2" },
	{ tier: 3, class: "ConveyorBeltMk3", recipe: "Recipe_ConveyorBeltMk3" },
	{ tier: 4, class: "ConveyorBeltMk4", recipe: "Recipe_ConveyorBeltMk4" },
	{ tier: 5, class: "ConveyorBeltMk5", recipe: "Recipe_ConveyorBeltMk5" },
	{ tier: 6, class: "ConveyorBeltMk6", recipe: "Recipe_ConveyorBeltMk6" }
];

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

		// STEP 3 & 4: Create 6 Tiered Variations
		for (const target of BELT_TIERS) {
			// Deep copy the blueprint object
			const modifiedBP = JSON.parse(JSON.stringify(blueprint));
			const newName = `${baseName}_Mk${target.tier}`;
			modifiedBP.name = newName;

			// Loop through all entities and replace belt classes
			modifiedBP.objects.forEach(obj => {
				// Regex to find any ConveyorBeltMkX and replace with target
				if (obj.typePath && obj.typePath.includes("ConveyorBelt")) {
					obj.typePath = obj.typePath.replace(/ConveyorBeltMk\d/g, target.class);
				}
				// Also update parent names/references if they exist
				if (obj.parentEntityName && obj.parentEntityName.includes("ConveyorBelt")) {
					obj.parentEntityName = obj.parentEntityName.replace(/ConveyorBeltMk\d/g, target.class);
				}
			});

			// Update Recipes in the header so the game knows the cost
			if (modifiedBP.header && modifiedBP.header.recipeReferences) {
				modifiedBP.header.recipeReferences.forEach(recipe => {
					recipe.pathName = recipe.pathName.replace(/Recipe_ConveyorBeltMk\d/g, target.recipe);
				});
			}

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
		}

		console.log(`✅ Finished 6 variations for ${baseName}`);
	}
}

runPipeline().catch(console.error);