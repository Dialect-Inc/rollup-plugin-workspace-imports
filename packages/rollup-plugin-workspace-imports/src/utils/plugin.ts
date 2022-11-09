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

			if (importee.endsWith('.js')) {
				importee = importee.slice(0, Math.max(0, importee.length - 3))
			}

			// TODO: fix hardcoded extension
			const matchedPath = matchPath(`${importee}.ts`)

			if (matchedPath !== undefined) {
				return matchedPath
			}
		}
	}
}
