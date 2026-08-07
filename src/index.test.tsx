import type { SnapshotSerializer } from 'vitest';
import { Suspense, use } from 'react';
import { expect, expectTypeOf, test } from 'vitest';
import serializer from './index.ts';

test('exposes correct public API', () => {
	expectTypeOf(serializer).toExtend<SnapshotSerializer>();

	expect(serializer).toStrictEqual({
		serialize: expect.any(Function),
		test: expect.any(Function),
	});
});

test('identifies React elements', () => {
	expect(serializer.test(<div />)).toBe(true);
	expect(serializer.test('div')).toBe(false);
});

test('preserves component errors', () => {
	const componentError = new Error('Expected component error');

	const ThrowsAtRuntime = () => {
		throw componentError;
	};

	let thrownError: unknown;

	try {
		serializer.serialize(<ThrowsAtRuntime />);
	} catch (error) {
		thrownError = error;
	}

	expect(thrownError).toBe(componentError);
});

test('rejects React trees that cannot render synchronously', () => {
	const AsyncComponent = async () => {
		await Promise.resolve();

		return <strong>Ready</strong>;
	};

	const SuspendsAtRuntime = () =>
		use(Promise.resolve(<strong>Ready</strong>));
	const promisedChild = Promise.resolve(<strong>Ready</strong>);

	expect(() =>
		serializer.serialize(<AsyncComponent />)
	).toThrowErrorMatchingInlineSnapshot(
		`[TypeError: \`vitest-react-serializer\` only supports React trees that render synchronously. Suspense, lazy components, and async components cannot be serialized deterministically.]`
	);
	expect(() => serializer.serialize(<SuspendsAtRuntime />)).toThrow(
		TypeError
	);
	expect(() => serializer.serialize(<div>{promisedChild}</div>)).toThrow(
		TypeError
	);

	expect(() =>
		serializer.serialize(
			<Suspense fallback={<em>Loading</em>}>
				<strong>Ready</strong>
			</Suspense>
		)
	).toThrow(TypeError);
});

test('works with Vitest’s snapshot API', () => {
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
					Email Address
					<input
						id="username"
						type="email"
						name="username"
						autoComplete="username"
						required
						autoFocus
					/>
				</label>
			</div>
			<div className="form-field">
				<label htmlFor="password">
					Password
					<input
						id="password"
						type="password"
						name="password"
						autoComplete="current-password"
						minLength={8}
						required
					/>
				</label>
			</div>
			<button type="submit" disabled={false}>
				Sign in
			</button>
			<footer>
				<p className="login-help">
					Forgot password?{' '}
					<a className="login-help-link" href="/login/password-reset">
						Reset it here
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

	expect.addSnapshotSerializer(serializer);

	expect(<Button />).toMatchSnapshot();
	expect(<Form />).toMatchSnapshot();
	expect(<Profile />).toMatchSnapshot();
	expect({ profile: <Profile /> }).toMatchSnapshot();
});
