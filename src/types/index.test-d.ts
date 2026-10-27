import type * as ViteFormatter from '@wasm-fmt/web_fmt/vite';
import { expectTypeOf, test } from 'vitest';

test('exposes valid types', () => {
	expectTypeOf<typeof ViteFormatter>().toHaveProperty('default');
	expectTypeOf<typeof ViteFormatter>().toHaveProperty('format');
});
