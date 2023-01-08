import fs from 'node:fs'
import path from 'node:path'

import { findUpSync } from 'find-up'
import tsConfigPaths, { type MatchPath } from 'tsconfig-paths'

export function workspaceImports() {
	return {
		name: 'workspace-imports',
		resolveId(importee: string, importer: string | undefined) {
			if (importee.startsWith('~') && importer !== undefined) {
				const tsconfigJsonPath = findUpSync('tsconfig.json', {
					cwd: path.dirname(importer),
				})
				const config = tsConfigPaths.loadConfig(tsconfigJsonPath)
				if (config.resultType === 'failed') {
					throw new Error(`Failed to load tsconfig.json from ${importer}`)
				}

				const { absoluteBaseUrl, paths } = config
				let matchPath: MatchPath

				// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
				if (paths === undefined) {
					matchPath = () => undefined
				} else {
					matchPath = tsConfigPaths.createMatchPath(absoluteBaseUrl, paths)
				}

				let matchedPath: string | undefined
				if (importee.endsWith('.js')) {
					importee = importee.slice(0, Math.max(0, importee.length - 3))
					matchedPath = matchPath(`${importee}.ts`)
				} else if (importee.endsWith('.jsx')) {
					importee = importee.slice(0, Math.max(0, importee.length - 4))
					matchedPath = matchPath(`${importee}.tsx`)
				} else if (importee.endsWith('.cjs')) {
					importee = importee.slice(0, Math.max(0, importee.length - 4))
					matchedPath = matchPath(`${importee}.cts`)
				} else if (importee.endsWith('.mjs')) {
					importee = importee.slice(0, Math.max(0, importee.length - 4))
					matchedPath = matchPath(`${importee}.mts`)
				} else {
					matchedPath = matchPath(importee)
				}

				if (matchedPath !== undefined) {
					return matchedPath
				}
			}
			// The import doesn't use '~', but it still might use .js imports so we fix it to avoid the need of having to also use rollup-plugin-js-imports
			else {
				if (importer?.includes('/node_modules/')) {
					return
				}

				const importeeFullPath =
					importer === undefined
						? importee
						: path.resolve(path.dirname(importer), importee)
				for (const extension of ['.js', '.jsx', '.cjs', '.mjs']) {
					if (importeeFullPath.endsWith(extension)) {
						// Check if the TypeScript equivalent exists
						const typescriptFile = importeeFullPath.replace(
							new RegExp(`\\${extension}$`),
							extension.replace('j', 't')
						)
						if (fs.existsSync(typescriptFile)) {
							return typescriptFile
						}
					}
				}

				const trimExtension = (filePath: string) =>
					filePath.replace(/\.[^/.]+$/, '')
				// Check if the file exists without an extension (e.g. `.vue.js` -> `.vue`)
				const nonExtensionFile = trimExtension(importeeFullPath)
				if (fs.existsSync(nonExtensionFile)) {
					return nonExtensionFile
				}
			}
		},
	}
}
