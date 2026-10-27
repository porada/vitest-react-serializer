import type { ReactNode } from 'react';
import type { SnapshotSerializer } from 'vitest';
import { format } from '@wasm-fmt/web_fmt';
import { isValidElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
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
		let formatted: string;

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

		try {
			formatted = format(minified, 'index.html', {
				// Match the output of Vitest’s built-in snapshot serializers
				// (which rely on `pretty-format` under the hood)
				indentStyle: 'space',
				markup: {
					'closingTagLineBreakForEmpty': 'never',
					'html.void.selfClosing': true,
					'maxAttrsPerLine': 1,
					'scriptIndent': true,
					'singleAttrSameLine': false,
					'styleIndent': true,
				},
			});
		} catch (error) {
			// `web_fmt` throws plain strings, which Vitest reports without a stack
			throw new SyntaxError(
				`[vitest-react-serializer] Failed to format rendered component HTML:\n\n${String(error)}`,
				{ cause: error }
			);
		}

		return formatted.trim().replaceAll('\n', `\n${indentation}`);
	},
	test(value) {
		return isValidElement(value as unknown);
	},
} as const satisfies SnapshotSerializer;
