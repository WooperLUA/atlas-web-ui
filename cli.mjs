#!/usr/bin/env node

import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import readline from 'readline';

const REGISTRY_URL = 'https://raw.githubusercontent.com/WooperLUA/atlas-web-ui/master/registry.json';
const HEADERS = { 'User-Agent': 'atlas-ui-cli/1.0.0' };

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const prompt = (question) => new Promise((resolve) => rl.question(question, resolve));

async function main() {
    const args = process.argv.slice(2);
    const command = args[0];
    const componentName = args[1];
    let customPath = args[2];

    if (command !== 'add' || !componentName) {
        console.log('Usage: npx atlas-ui add <component-name> [custom-path]');
        console.log('Example: npx atlas-ui add button');
        console.log('Example: npx atlas-ui add button src/views/Home/MyButton.ts');
        process.exit(1);
    }

    console.log('⏳ Fetching registry...');

    try {
        const registryRes = await fetch(REGISTRY_URL, { headers: HEADERS });
        if (!registryRes.ok) throw new Error(`Failed to fetch registry: HTTP ${registryRes.status}`);
        const registry = await registryRes.json();

        const fileUrl = registry[componentName];
        if (!fileUrl) {
            console.error(`❌ Component "${componentName}" not found in registry.`);
            console.log('Available components:', Object.keys(registry).join(', '));
            process.exit(1);
        }

        if (!customPath) {
            customPath = await prompt(`Where would you like to install ${componentName}? (default: src/components/${componentName}.ts): `);
            customPath = customPath.trim() || `src/components/${componentName}.ts`;
        }

        let targetPath;
        if (!path.extname(customPath)) {
            targetPath = path.isAbsolute(customPath)
                ? path.join(customPath, `${componentName}.ts`)
                : path.join(process.cwd(), customPath, `${componentName}.ts`);
        } else {
            targetPath = path.isAbsolute(customPath) ? customPath : path.join(process.cwd(), customPath);
        }

        const targetDir = path.dirname(targetPath);
        console.log(`⏳ Downloading ${componentName}...`);
        const codeRes = await fetch(fileUrl, { headers: HEADERS });
        if (!codeRes.ok) throw new Error(`Failed to fetch ${componentName}: HTTP ${codeRes.status}`);
        let code = await codeRes.text();

        const needsMergeClass = code.includes('merge-class');

        if (needsMergeClass) {
            console.log('⏳ Ensuring merge-class utility is available locally...');
            const mergeClassUrl = registry['merge-class'];
            if (!mergeClassUrl) throw new Error('merge-class not found in registry');

            const mergeRes = await fetch(mergeClassUrl, { headers: HEADERS });
            const mergeCode = await mergeRes.text();
            const mergeClassPath = path.join(targetDir, 'merge-class.ts');

            await mkdir(targetDir, { recursive: true });
            await writeFile(mergeClassPath, mergeCode);

            code = code.replace(/['"](?:\.\.\/|@\/).*?merge-class['"]/g, "'./merge-class'");
        }

        await mkdir(targetDir, { recursive: true });
        await writeFile(targetPath, code);

        console.log(`✅ Successfully installed ${componentName} to ${path.relative(process.cwd(), targetPath)}`);
        if (needsMergeClass) {
            console.log(`✅ Ensured merge-class is available at ${path.relative(process.cwd(), path.join(targetDir, 'merge-class.ts'))}`);
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    } finally {
        rl.close();
    }
}

main();