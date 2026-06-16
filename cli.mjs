#!/usr/bin/env node

import {writeFile, mkdir} from 'fs/promises';
import path from 'path';

const REGISTRY_URL = 'https://raw.githubusercontent.com/WooperLUA/atlas-web-ui/main/registry.json';

async function main()
{
    const args = process.argv.slice(2);
    const command = args[0];
    const componentName = args[1];

    if (command !== 'add' || !componentName)
    {
        console.log('Usage: npx atlas-web-ui add <component-name>');
        console.log('Example: npx atlas-web-ui add button');
        process.exit(1);
    }

    console.log(`⏳ Fetching registry...`);

    try
    {
        const registryRes = await fetch(REGISTRY_URL);
        if (!registryRes.ok) throw new Error('Failed to fetch registry');
        const registry = await registryRes.json();

        const fileUrl = registry[componentName];
        if (!fileUrl)
        {
            console.error(`❌ Component "${componentName}" not found in registry.`);
            console.log('Available components:', Object.keys(registry).join(', '));
            process.exit(1);
        }

        console.log(`⏳ Downloading ${componentName}...`);
        const codeRes = await fetch(fileUrl);
        if (!codeRes.ok) throw new Error(`Failed to fetch ${componentName}`);
        const code = await codeRes.text();

        const isUtility = componentName === 'merge-class';
        const targetDir = path.join(process.cwd(), isUtility ? 'src/utils' : 'src/components/ui');

        await mkdir(targetDir, {recursive: true});
        const targetPath = path.join(targetDir, `${componentName}.ts`);

        await writeFile(targetPath, code);
        console.log(`✅ Successfully installed ${componentName} to ${targetPath.replace(process.cwd(), '.')}`);

    } catch (error)
    {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

main();