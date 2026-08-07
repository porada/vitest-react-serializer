import type { ReactNode } from 'react';
import { Children, isValidElement, Suspense } from 'react';

const reactForwardRefType = Symbol.for('react.forward_ref');
const reactLazyType = Symbol.for('react.lazy');
const reactMemoType = Symbol.for('react.memo');

export const UNSUPPORTED_RENDERING_MESSAGE =
	'`vitest-react-serializer` only supports React trees that render synchronously. Suspense, lazy components, and async components cannot be serialized deterministically.';

type WrappedComponentType = {
	readonly $$typeof?: unknown;
	readonly render?: unknown;
	readonly type?: unknown;
};

const isUnsupportedComponentType = (value: unknown): boolean => {
	if (value === Suspense) {
		return true;
	}

	if (typeof value === 'function') {
		return (
			Object.prototype.toString.call(value) === '[object AsyncFunction]'
		);
	}

	if (typeof value !== 'object' || value === null) {
		return false;
	}

	const component = value as WrappedComponentType;

	if (component.$$typeof === reactLazyType) {
		return true;
	}

	if (component.$$typeof === reactMemoType) {
		return isUnsupportedComponentType(component.type);
	}

	if (component.$$typeof === reactForwardRefType) {
		return isUnsupportedComponentType(component.render);
	}

	return false;
};

export const assertSynchronousReactTree = (value: ReactNode): void => {
	Children.forEach(value, (child) => {
		if (!isValidElement(child)) {
			return;
		}

		if (isUnsupportedComponentType(child.type)) {
			throw new TypeError(UNSUPPORTED_RENDERING_MESSAGE);
		}

		const { children } = child.props as { children?: ReactNode };
		assertSynchronousReactTree(children);
	});
};

export const isReactSuspensionError = (value: unknown): value is Error =>
	value instanceof Error &&
	value.message.includes('suspended while responding to synchronous input');

export const isReactThenable = (
	value: unknown
): value is PromiseLike<unknown> =>
	typeof value === 'object' &&
	value !== null &&
	'then' in value &&
	typeof value.then === 'function';
