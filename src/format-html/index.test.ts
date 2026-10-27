import { expect, test } from 'vitest';
import formatHTML from './index.ts';

test('formats HTML', () => {
	expect(formatHTML('<ul><li>foo</li><li>bar</li></ul>'))
		.toMatchInlineSnapshot(`
		"<ul>
		  <li>foo</li>
		  <li>bar</li>
		</ul>"
	`);
});

test('rejects malformed markup', () => {
	let result: unknown;

	try {
		formatHTML('<div><span>foo</div>');
	} catch (error) {
		result = error;
	}

	expect(result).toBeInstanceOf(SyntaxError);
	expect((result as Error).cause).toBeTypeOf('string');
	expect((result as Error).message.split('\n')[0]).toMatchInlineSnapshot(
		`"[vitest-react-serializer] Failed to format rendered component HTML:"`
	);
});
