import type { ReactNode } from 'react';
import type { SnapshotSerializer } from 'vitest';
import { isValidElement } from 'react';
import formatHTML from './format-html/index.ts';
import {
	assertSynchronousReactTree,
	createSuspensionErrorMessage,
	isReactSuspensionError,
	renderStaticMarkup,
} from './react-compatibility/index.ts';

export default {
	serialize(
		value,
		config?: { readonly indent?: string; readonly min?: boolean },
		indentation = ''
	) {
		let minified: string;

		try {
			assertSynchronousReactTree(value);
			minified = renderStaticMarkup(value as ReactNode);
		} catch (error) {
			if (isReactSuspensionError(error)) {
				throw new TypeError(createSuspensionErrorMessage(error), {
					cause: error,
				});
			}

			throw error;
		}

		// Treat an empty `indent` as `min`. The formatter rejects zero widths
		if (config?.indent === '' || config?.min) {
			return minified;
		}

		return formatHTML(minified, config?.indent?.length).replaceAll(
			'\n',
			`\n${indentation}`
		);
	},
	test(value) {
		return isValidElement(value as unknown);
	},
} as const satisfies SnapshotSerializer;
