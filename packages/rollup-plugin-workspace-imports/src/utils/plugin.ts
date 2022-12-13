import path from 'node:path'
import { findUpSync } from 'find-up'
import tsConfigPaths, { MatchPath } from 'tsconfig-paths'

export function workspaceImports() {
	return {
		name: 'workspace-imports',
		resolveId(importee: string, importer: string | undefined) {
			if (!importee.startsWith('~') || importer === undefined) {
				return null
			}

			const tsconfigJsonPath = findUpSync('tsconfig.json', {
				cwd: path.dirname(importer)
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

			let matchedPath: string | undefined;
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
			}

			if (matchedPath !== undefined) {
				return matchedPath
			}
		}
	}
}
