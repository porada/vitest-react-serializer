import { createContext, forwardRef, lazy, memo, Suspense } from 'react';
import { expect, test } from 'vitest';
import {
	assertSynchronousReactTree,
	createRenderingErrorMessage,
	isReactSuspensionError,
	isReactThenable,
} from './index.ts';

test('accepts synchronous React trees', () => {
	const Context = createContext('foo');

	const MemoizedComponent = memo(() => <strong>bar</strong>);

	/* oxlint-disable-next-line react-x/no-forward-ref */
	const ForwardRefComponent = forwardRef(() => <strong>bar</strong>);

	expect(() =>
		assertSynchronousReactTree(
			<Context value="baz">
				bar
				<div />
				<MemoizedComponent />
				<ForwardRefComponent />
			</Context>
		)
	).not.toThrow();
});

test('identifies React suspension errors', () => {
	expect(
		isReactSuspensionError(
			new Error(
				'A component suspended while responding to synchronous input'
			)
		)
	).toBe(true);
	expect(isReactSuspensionError(new Error('Expected component error'))).toBe(
		false
	);
	expect(isReactSuspensionError('Expected component error')).toBe(false);
});

test('identifies React thenables', () => {
	expect(isReactThenable(Promise.resolve())).toBe(true);
	/* oxlint-disable-next-line unicorn/no-thenable */
	expect(isReactThenable({ then: true })).toBe(false);
	expect(isReactThenable({})).toBe(false);
	expect(isReactThenable(null)).toBe(false);
	expect(isReactThenable(() => {})).toBe(false);
});

test('prefixes upstream React rendering errors', () => {
	const error = new Error('Upstream rendering error');

	expect(createRenderingErrorMessage(error)).toMatchInlineSnapshot(`
		"[vitest-react-serializer] Failed to render component:

		Upstream rendering error"
	`);
});

test('rejects unsupported React component types', () => {
	const AsyncComponent = async () => {
		await Promise.resolve();
		return <strong>foo</strong>;
	};

	const LazyComponent = lazy(async () => {
		await Promise.resolve();
		return {
			default: () => <strong>foo</strong>,
		};
	});

	const MemoizedAsyncComponent = memo(AsyncComponent);

	/* oxlint-disable-next-line react-x/no-forward-ref */
	const AsyncForwardRefComponent = forwardRef(async () => {
		await Promise.resolve();
		return <strong>foo</strong>;
	});

	expect(() =>
		assertSynchronousReactTree(<AsyncComponent />)
	).toThrowErrorMatchingInlineSnapshot(
		`[TypeError: [vitest-react-serializer] Failed to render component. Async components are unsupported because they can’t be serialized deterministically]`
	);
	expect(() =>
		assertSynchronousReactTree(
			<Suspense fallback={<em>bar</em>}>
				<strong>foo</strong>
			</Suspense>
		)
	).toThrowErrorMatchingInlineSnapshot(
		`[TypeError: [vitest-react-serializer] Failed to render component. \`Suspense\` is unsupported because it can’t be serialized deterministically]`
	);
	expect(() =>
		assertSynchronousReactTree(<LazyComponent />)
	).toThrowErrorMatchingInlineSnapshot(
		`[TypeError: [vitest-react-serializer] Failed to render component. Lazy components are unsupported because they can’t be serialized deterministically]`
	);
	expect(() =>
		assertSynchronousReactTree(<MemoizedAsyncComponent />)
	).toThrow(TypeError);
	expect(() =>
		assertSynchronousReactTree(<AsyncForwardRefComponent />)
	).toThrow(TypeError);
});
