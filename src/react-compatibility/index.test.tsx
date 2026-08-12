import type { ExoticComponent } from 'react';
import { createContext, lazy, memo, Suspense } from 'react';
import { expect, test } from 'vitest';
import {
	assertSynchronousReactTree,
	createRenderingErrorMessage,
	isReactSuspensionError,
	isReactThenable,
} from './index.ts';

test('accepts synchronous React trees', () => {
	const Context = createContext('default');

	const MemoizedComponent = memo(() => <strong>Ready</strong>);

	const ForwardRefComponent = {
		$$typeof: Symbol.for('react.forward_ref'),
		render: (_properties: unknown, _reference: unknown) => (
			<strong>Ready</strong>
		),
	} as unknown as ExoticComponent;

	expect(() =>
		assertSynchronousReactTree(
			<Context value="current">
				Ready
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
	const valueWithNonFunctionThen = {};
	const thenProperty = ['t', 'hen'].join('');
	Reflect.set(valueWithNonFunctionThen, thenProperty, true);

	expect(isReactThenable(Promise.resolve())).toBe(true);
	expect(isReactThenable(valueWithNonFunctionThen)).toBe(false);
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
		return <strong>Ready</strong>;
	};

	const LazyComponent = lazy(async () => {
		await Promise.resolve();
		return {
			default: () => <strong>Ready</strong>,
		};
	});

	const MemoizedAsyncComponent = memo(AsyncComponent);

	const AsyncForwardRefComponent = {
		$$typeof: Symbol.for('react.forward_ref'),
		render: async (_properties: unknown, _reference: unknown) => {
			await Promise.resolve();
			return <strong>Ready</strong>;
		},
	} as unknown as ExoticComponent;

	expect(() =>
		assertSynchronousReactTree(<AsyncComponent />)
	).toThrowErrorMatchingInlineSnapshot(
		`[TypeError: [vitest-react-serializer] Failed to render component. Async components are unsupported because they can’t be serialized deterministically]`
	);
	expect(() =>
		assertSynchronousReactTree(
			<Suspense fallback={<em>Loading</em>}>
				<strong>Ready</strong>
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
