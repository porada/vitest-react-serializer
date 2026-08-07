import type { ReactNode } from 'react';
import type { SnapshotSerializer } from 'vitest';
import prettier from '@prettier/sync';
import { isValidElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
	assertSynchronousReactTree,
	isReactSuspensionError,
	isReactThenable,
	UNSUPPORTED_RENDERING_MESSAGE,
} from './react-compatibility/index.ts';

export default {
	serialize(value, _config?: unknown, indentation = '') {
		let minified: string;

		try {
			assertSynchronousReactTree(value as ReactNode);
			minified = renderToStaticMarkup(value as ReactNode);
		} catch (error) {
			if (isReactSuspensionError(error) || isReactThenable(error)) {
				throw new TypeError(UNSUPPORTED_RENDERING_MESSAGE, {
					cause: error,
				});
			}

			throw error;
		}

		const formatted = prettier.format(minified, {
			parser: 'html',

			// Match the output of Vitest’s built-in snapshot serializers
			// (which rely on `pretty-format` under the hood)
			bracketSameLine: false,
			endOfLine: 'lf',
			htmlWhitespaceSensitivity: 'css',
			printWidth: 80,
			singleAttributePerLine: true,
			singleQuote: false,
			tabWidth: 2,
			useTabs: false,
		});

		return formatted.trim().replaceAll('\n', `\n${indentation}`);
	},
	test(value) {
		return isValidElement(value as unknown);
	},
} as const satisfies SnapshotSerializer;
