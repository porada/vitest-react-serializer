import type { ReactNode } from 'react';
import type { SnapshotSerializer } from 'vitest';
import prettier from '@prettier/sync';
import { isValidElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

export default {
	serialize(value) {
		const minified = renderToStaticMarkup(value as ReactNode);

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

		return formatted.trim();
	},
	test(value) {
		return isValidElement(value as unknown);
	},
} as const satisfies SnapshotSerializer;
