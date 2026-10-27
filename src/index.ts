import type { ReactNode } from 'react';
import type { SnapshotSerializer } from 'vitest';
import { isValidElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import formatHTML from './format-html/index.ts';
import {
	assertSynchronousReactTree,
	createChildrenRenderingErrorMessage,
	createRenderingErrorMessage,
	isReactSuspensionError,
	isReactThenable,
} from './react-compatibility/index.ts';

export default {
	serialize(value, _config?: unknown, indentation = '') {
		let minified: string;

		try {
			assertSynchronousReactTree(value as ReactNode);
			minified = renderToStaticMarkup(value as ReactNode);
		} catch (error) {
			if (isReactSuspensionError(error)) {
				throw new TypeError(createRenderingErrorMessage(error), {
					cause: error,
				});
			}

			if (isReactThenable(error)) {
				throw new TypeError(createChildrenRenderingErrorMessage(), {
					cause: error,
				});
			}

			throw error;
		}

		return formatHTML(minified).replaceAll('\n', `\n${indentation}`);
	},
	test(value) {
		return isValidElement(value as unknown);
	},
} as const satisfies SnapshotSerializer;
