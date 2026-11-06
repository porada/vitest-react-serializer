const { format } = await loadFormatter();

/**
 * Loads the formatter for the current environment. Vitest resolves browser
 * serializers in Node, so the choice relies on the module URL rather than
 * export conditions. Importing the entries directly avoids the package root’s
 * `import source` syntax, which Vite doesn’t support. The `vite` entry also
 * keeps WASM imports working after pre-bundling.
 */
async function loadFormatter() {
	if (import.meta.url.startsWith('file:')) {
		return import('@wasm-fmt/web_fmt/node');
	}

	const formatter = await import('@wasm-fmt/web_fmt/vite');
	await formatter.default();
	return formatter;
}

/**
 * Formats HTML with the initialized WASM formatter. The output follows Vitest’s
 * built-in snapshot serializers, which rely on `pretty-format` under the hood.
 */
export default function formatHTML(text: string, indentWidth = 2): string {
	try {
		const formatted = format(text, 'index.html', {
			indentStyle: 'space',
			indentWidth,
			markup: {
				'closingTagLineBreakForEmpty': 'never',
				'html.void.selfClosing': true,
				'maxAttrsPerLine': 1,
				'scriptIndent': true,
				'singleAttrSameLine': false,
				'styleIndent': true,
			},
		});

		// Preserve non-breaking spaces by trimming only ASCII whitespace.
		// The lookbehind prevents repeated scans of the same whitespace run
		return formatted.replaceAll(
			/^[\t\n\f\r ]+|(?<![\t\n\f\r ])[\t\n\f\r ]+$/gu,
			''
		);
	} catch (error) {
		throw new SyntaxError(
			`[vitest-react-serializer] Failed to format rendered component HTML:\n\n${String(error)}`,
			{ cause: error }
		);
	}
}
