import type { ReactElement } from 'react';
import {
	Activity,
	createContext,
	createElement,
	forwardRef,
	lazy,
	memo,
	Suspense,
	use,
} from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, test } from 'vitest';
import {
	assertSynchronousReactTree,
	createSuspensionErrorMessage,
	isReactSuspensionError,
	isReactThenable,
	renderStaticMarkup,
} from './index.ts';

test('accepts synchronous React trees', () => {
	const Context = createContext('foo');

	const MemoizedComponent = memo(() => <strong>bar</strong>);

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

test('leaves invalid element types to React', () => {
	expect(() =>
		assertSynchronousReactTree(
			<div>{createElement(undefined as never)}</div>
		)
	).not.toThrow();
	expect(() =>
		assertSynchronousReactTree(<div>{createElement(null as never)}</div>)
	).not.toThrow();
});

test('skips children supplied to custom components', () => {
	const AsyncComponent = async () => {
		await Promise.resolve();
		return <strong>foo</strong>;
	};

	const Show = ({
		children,
		when,
	}: {
		children: ReactElement;
		when: boolean;
	}) => (when ? children : null);

	expect(() =>
		assertSynchronousReactTree(
			<Show when={false}>
				<AsyncComponent />
			</Show>
		)
	).not.toThrow();
});

test('rejects promises in children rendered directly by React', () => {
	const Context = createContext('foo');
	const promise = Promise.resolve(<strong>bar</strong>);

	expect(() => assertSynchronousReactTree(<div>{promise}</div>)).toThrow(
		TypeError
	);
	expect(() => assertSynchronousReactTree(<>{promise}</>)).toThrow(TypeError);
	expect(() =>
		assertSynchronousReactTree(<Context value="baz">{promise}</Context>)
	).toThrow(TypeError);
	expect(() => assertSynchronousReactTree(<ul>{[[promise]]}</ul>)).toThrow(
		TypeError
	);
});

test('checks only visible `Activity` children', () => {
	const promise = Promise.resolve(<strong>foo</strong>);

	expect(() =>
		assertSynchronousReactTree(<Activity mode="hidden">{promise}</Activity>)
	).not.toThrow();
	expect(() =>
		assertSynchronousReactTree(
			<Activity mode="visible">{promise}</Activity>
		)
	).toThrow(TypeError);
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
	expect(isReactThenable({ then: true })).toBe(false);
	expect(isReactThenable({})).toBe(false);
	expect(isReactThenable(null)).toBe(false);
	expect(isReactThenable(Object.assign(() => {}, { then: () => {} }))).toBe(
		false
	);
});

test('adds serializer context to React suspension errors', () => {
	const error = new Error(
		'A component suspended while responding to synchronous input'
	);

	expect(createSuspensionErrorMessage(error)).toMatchInlineSnapshot(`
		"[vitest-react-serializer] Failed to render component. Snapshot serializers run synchronously, but a component suspended:

		A component suspended while responding to synchronous input"
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

	const AsyncForwardRefComponent = forwardRef(async () => {
		await Promise.resolve();
		return <strong>foo</strong>;
	});

	expect(() =>
		assertSynchronousReactTree(<AsyncComponent />)
	).toThrowErrorMatchingInlineSnapshot(
		`[TypeError: [vitest-react-serializer] Failed to render component. Async components can’t be serialized because snapshots are generated synchronously]`
	);
	expect(() =>
		assertSynchronousReactTree(<LazyComponent />)
	).toThrowErrorMatchingInlineSnapshot(
		`[TypeError: [vitest-react-serializer] Failed to render component. Lazy components can’t be serialized because they aren’t guaranteed to render synchronously]`
	);
	expect(() =>
		assertSynchronousReactTree(<MemoizedAsyncComponent />)
	).toThrow(TypeError);
	expect(() =>
		assertSynchronousReactTree(<AsyncForwardRefComponent />)
	).toThrow(TypeError);
});

test('matches `renderToStaticMarkup` output', () => {
	const element = (
		<p>
			foo {1}
			<Suspense fallback={<em>bar</em>}>
				<strong>baz</strong>
			</Suspense>
			<Activity mode="visible">qux</Activity>
		</p>
	);

	expect(renderStaticMarkup(element)).toBe(renderToStaticMarkup(element));
});

test('rejects rendered `Suspense` fallbacks', () => {
	const SuspendsAtRuntime = () => use(new Promise<string>(() => {}));

	expect(() =>
		renderStaticMarkup(
			<Suspense fallback={<em>foo</em>}>
				<SuspendsAtRuntime />
			</Suspense>
		)
	).toThrowErrorMatchingInlineSnapshot(
		`[TypeError: [vitest-react-serializer] Failed to render component. \`Suspense\` fallbacks can’t be serialized because they conceal suspended or failed renders]`
	);
});

test('includes errors behind rendered `Suspense` fallbacks', () => {
	const SuspendsAtRuntime = () => use(new Promise<string>(() => {}));

	const ThrowsAtRuntime = () => {
		throw new Error('Thrown <Component /> error');
	};

	const ThrowsNonError = () => {
		throw 'Thrown <Component /> value';
	};

	expect(() =>
		renderStaticMarkup(
			<>
				<Suspense fallback={<em>foo</em>}>
					<SuspendsAtRuntime />
				</Suspense>
				<Suspense fallback={<em>bar</em>}>
					<ThrowsAtRuntime />
				</Suspense>
				<Suspense fallback={<em>baz</em>}>
					<ThrowsNonError />
				</Suspense>
			</>
		)
	).toThrowErrorMatchingInlineSnapshot(`
		[TypeError: [vitest-react-serializer] Failed to render component. \`Suspense\` fallbacks can’t be serialized because they conceal suspended or failed renders:

		Switched to client rendering because the server rendering errored:

		Thrown <Component /> error

		Switched to client rendering because the server rendering errored:

		Thrown <Component /> value]
	`);
});
