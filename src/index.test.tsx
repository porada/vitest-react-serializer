import type { SnapshotSerializer } from 'vitest';
import { createElement, Fragment } from 'react';
import { expect, expectTypeOf, test } from 'vitest';
import serializer from './index.ts';

test('exposes correct public API', () => {
	expectTypeOf(serializer).toExtend<SnapshotSerializer>();

	expect(serializer).toStrictEqual({
		serialize: expect.any(Function),
		test: expect.any(Function),
	});
});

test('identifies React elements correctly', () => {
	const { test } = serializer;

	expect(test('')).toBe(false);
	expect(test('foo')).toBe(false);
	expect(test(() => {})).toBe(false);
	expect(test([])).toBe(false);
	expect(test({})).toBe(false);
	expect(test(1)).toBe(false);
	expect(test(true)).toBe(false);
	expect(test('<div />')).toBe(false);
	expect(test('<div></div>')).toBe(false);

	expect(test(<div />)).toBe(true);
	expect(test(createElement('div'))).toBe(true);

	expect(test(<></>)).toBe(true);
	expect(test(<Fragment />)).toBe(true);
	expect(test(createElement(Fragment))).toBe(true);

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

	expect(test(<Button />)).toBe(true);
	expect(test(Button)).toBe(false);

	/* @ts-expect-error */
	expect(test()).toBe(false);
});

test('serializes React components to formatted HTML', () => {
	const { serialize } = serializer;

	expect(serialize(<div />)).toBe('<div></div>');
	expect(serialize(createElement('div'))).toBe('<div></div>');

	expect(serialize(<></>)).toBe('');
	expect(serialize(<Fragment />)).toBe('');
	expect(serialize(createElement(Fragment))).toBe('');

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

	expect(serialize(<Button />)).toBe(
		'<button type="button">Click me</button>'
	);

	/* @ts-expect-error */
	expect(serialize()).toBe('');
});

test('is compaible with Vitest API', () => {
	expect.addSnapshotSerializer(serializer);

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

	expect(<Button />).toMatchSnapshot();
	expect(<Profile />).toMatchSnapshot();
});
