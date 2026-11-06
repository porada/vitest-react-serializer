import type { ReactNode } from 'react';
import { Suspense, use } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, expectTypeOf, test } from 'vitest';
import serializer, * as exports from './index.ts';

const TEST_JSX = (
	<ul>
		<li>foo</li>
		<li>bar</li>
	</ul>
);

test('exposes correct public API', () => {
	expectTypeOf(serializer).toEqualTypeOf<{
		readonly serialize: (
			value: any,
			config?: { readonly indent?: string; readonly min?: boolean },
			indentation?: string
		) => string;
		readonly test: (value: any) => boolean;
	}>();

	expect({ ...exports }).toMatchInlineSnapshot(`
		{
		  "default": {
		    "serialize": [Function],
		    "test": [Function],
		  },
		}
	`);
});

test('identifies React elements', () => {
	expect(serializer.test(<div />)).toBe(true);
	expect(serializer.test('div')).toBe(false);
});

test('preserves component errors', () => {
	const error = new Error('Expected component error');

	const ThrowsAtRuntime = () => {
		throw error;
	};

	let result: unknown;

	try {
		serializer.serialize(<ThrowsAtRuntime />);
	} catch (caughtError) {
		result = caughtError;
	}

	expect(result).toBe(error);
});

test('rejects async components', () => {
	const AsyncComponent = async () => {
		await Promise.resolve();

		return <strong>foo</strong>;
	};

	expect(() => serializer.serialize(<AsyncComponent />)).toThrow(TypeError);
});

test('rejects components that suspend', () => {
	const SuspendsAtRuntime = () => use(Promise.resolve(<strong>foo</strong>));

	let result: unknown;

	try {
		serializer.serialize(<SuspendsAtRuntime />);
	} catch (error) {
		result = error;
	}

	expect(result).toBeInstanceOf(TypeError);
	expect((result as Error).cause).toBeInstanceOf(Error);
	expect((result as Error).message.split('\n')[0]).toMatchInlineSnapshot(
		`"[vitest-react-serializer] Failed to render component. Snapshot serializers run synchronously, but a component suspended:"`
	);
});

test('rejects promises passed as children', () => {
	const promisedChild = Promise.resolve(<strong>foo</strong>);

	expect(() =>
		serializer.serialize(<div>{promisedChild}</div>)
	).toThrowErrorMatchingInlineSnapshot(
		`[TypeError: [vitest-react-serializer] Failed to render component. Promise children can’t be serialized because synchronous access to their values isn’t guaranteed]`
	);
});

test('rejects resolved promises passed as children', async () => {
	const promisedChild = Promise.resolve(<strong>foo</strong>);

	renderToStaticMarkup(<Suspense>{promisedChild}</Suspense>);
	await promisedChild;

	expect(() =>
		serializer.serialize(<div>{promisedChild}</div>)
	).toThrowErrorMatchingInlineSnapshot(
		`[TypeError: [vitest-react-serializer] Failed to render component. Promise children can’t be serialized because synchronous access to their values isn’t guaranteed]`
	);
});

test('renders children from single-use iterables', () => {
	const iterator = new Map([
		['foo', <li key="foo">foo</li>],
		['bar', <li key="bar">bar</li>],
	]).values();

	// Avoid React’s iterator warning while keeping the iterable single-use
	const items = { [Symbol.iterator]: () => iterator };

	expect(serializer.serialize(<ul>{items}</ul>)).toMatchInlineSnapshot(`
		"<ul>
		  <li>foo</li>
		  <li>bar</li>
		</ul>"
	`);
});

test('serializes synchronous `Suspense` content', () => {
	expect(
		serializer.serialize(
			<Suspense fallback={<em>bar</em>}>
				<strong>foo</strong>
			</Suspense>
		)
	).toMatchInlineSnapshot(`"<strong>foo</strong>"`);
});

test('rejects `Suspense` fallbacks inside components', () => {
	const SuspendsAtRuntime = () => use(new Promise<string>(() => {}));

	const Page = () => (
		<Suspense fallback={<em>bar</em>}>
			<SuspendsAtRuntime />
		</Suspense>
	);

	expect(() => serializer.serialize(<Page />)).toThrow(TypeError);
});

test('serializes HTML', () => {
	const Button = () => {
		const handleClick = () => {
			alert('You clicked me!');
		};

		return (
			<button type="button" onClick={handleClick}>
				Click me
			</button>
		);
	};

	const Form = () => (
		<form
			action="/login"
			method="post"
			name="login"
			autoComplete="on"
			noValidate
		>
			<div className="form-field">
				<label htmlFor="username">
					Email address
					<input
						id="username"
						type="email"
						name="username"
						autoComplete="username webauthn"
						required
						autoFocus
					/>
				</label>
			</div>
			<button type="submit">Continue</button>
			<footer>
				<p className="form-notice">
					Don’t have an account?{' '}
					<a className="form-notice-link" href="/sign-up">
						Sign up
					</a>
					.
				</p>
			</footer>
		</form>
	);

	const Profile = () => (
		<section>
			<h1>Hedy Lamarr</h1>
			<ul>
				<li>
					<strong>Profession:</strong> Actress and inventor
				</li>
				<li>
					<strong>Awards:</strong> National Inventors Hall of Fame
				</li>
				<li>
					<strong>Born:</strong> November 9, 1914
				</li>
			</ul>
			<p>
				Hedy Lamarr was an Austrian-born American actress and inventor
				who pioneered early techniques for spread spectrum
				communications.
			</p>
		</section>
	);

	const Signature = () => (
		<footer>
			<address>
				Hedy Lamarr Foundation
				<br />
				Vienna, Austria
			</address>
			<hr />
			<img src="logo.svg" alt="Hedy Lamarr Foundation" loading="lazy" />
		</footer>
	);

	expect.addSnapshotSerializer(serializer);

	expect(<Button />).toMatchInlineSnapshot(
		`<button type="button">Click me</button>`
	);

	expect(<Form />).toMatchInlineSnapshot(`
		<form
		  name="login"
		  autoComplete="on"
		  noValidate=""
		  action="/login"
		  method="post"
		>
		  <div class="form-field">
		    <label for="username">Email address<input
		        id="username"
		        type="email"
		        autoComplete="username webauthn"
		        required=""
		        autofocus=""
		        name="username"
		      /></label>
		  </div>
		  <button type="submit">Continue</button>
		  <footer>
		    <p class="form-notice">
		      Don’t have an account? <a
		        class="form-notice-link"
		        href="/sign-up"
		      >Sign up</a>.
		    </p>
		  </footer>
		</form>
	`);

	expect(<Profile />).toMatchInlineSnapshot(`
		<section>
		  <h1>Hedy Lamarr</h1>
		  <ul>
		    <li><strong>Profession:</strong> Actress and inventor</li>
		    <li><strong>Awards:</strong> National Inventors Hall of Fame</li>
		    <li><strong>Born:</strong> November 9, 1914</li>
		  </ul>
		  <p>
		    Hedy Lamarr was an Austrian-born American actress and inventor who pioneered
		    early techniques for spread spectrum communications.
		  </p>
		</section>
	`);

	expect(<Signature />).toMatchInlineSnapshot(`
		<footer>
		  <address>Hedy Lamarr Foundation<br />Vienna, Austria</address>
		  <hr /><img
		    src="logo.svg"
		    alt="Hedy Lamarr Foundation"
		    loading="lazy"
		  />
		</footer>
	`);
});

test('respects indentation', () => {
	const Code = () => (
		<figure>
			<pre>
				<code>
					{'function foo(bar, baz) {\n\treturn bar + baz;\n}'}
				</code>
			</pre>
		</figure>
	);

	const Head = () => (
		<head>
			<title>Foo</title>
			<style>{'.foo{color:red}'}</style>
			<script>{'const foo=1;console.log(foo)'}</script>
		</head>
	);

	expect.addSnapshotSerializer(serializer);

	const nest = (children: ReactNode) => ({
		props: {
			children,
		},
	});

	expect(nest(<Code />)).toMatchInlineSnapshot(`
		{
		  "props": {
		    "children": <figure>
		      <pre><code>function foo(bar, baz) {
		    	return bar + baz;
		    }</code></pre>
		    </figure>,
		  },
		}
	`);

	expect(nest(<Head />)).toMatchInlineSnapshot(`
		{
		  "props": {
		    "children": <head>
		      <title>Foo</title>
		      <style>
		        .foo {
		          color: red;
		        }
		      </style>
		      <script>
		        const foo = 1;
		        console.log(foo);
		      </script>
		    </head>,
		  },
		}
	`);
});

test('respects `indent`', () => {
	expect(serializer.serialize(TEST_JSX, { indent: '    ' }))
		.toMatchInlineSnapshot(`
		"<ul>
		    <li>foo</li>
		    <li>bar</li>
		</ul>"
	`);
});

test('respects `min`', () => {
	expect(serializer.serialize(TEST_JSX, { min: true })).toMatchInlineSnapshot(
		`"<ul><li>foo</li><li>bar</li></ul>"`
	);
});

test('minifies output for an empty `indent`', () => {
	expect(serializer.serialize(TEST_JSX, { indent: '', min: false })).toBe(
		serializer.serialize(TEST_JSX, { min: true })
	);
});

test('rejects `indent` widths beyond the formatter’s limit', () => {
	expect(() =>
		serializer.serialize(TEST_JSX, { indent: ' '.repeat(999) })
	).toThrow(SyntaxError);
});
