import type { ReactNode } from 'react';
import { Children, isValidElement, Suspense } from 'react';

const reactForwardRefType = Symbol.for('react.forward_ref');
const reactLazyType = Symbol.for('react.lazy');
const reactMemoType = Symbol.for('react.memo');

const RENDERING_ERROR_PREFIX =
	'[vitest-react-serializer] Failed to render component';

const UNSUPPORTED_ASYNC_COMPONENT_MESSAGE = `${RENDERING_ERROR_PREFIX}. Async components are unsupported because they can’t be serialized deterministically`;
const UNSUPPORTED_CHILDREN_MESSAGE = `${RENDERING_ERROR_PREFIX}. Asynchronous children are unsupported because they can’t be serialized deterministically`;
const UNSUPPORTED_LAZY_COMPONENT_MESSAGE = `${RENDERING_ERROR_PREFIX}. Lazy components are unsupported because they can’t be serialized deterministically`;
const UNSUPPORTED_SUSPENSE_MESSAGE = `${RENDERING_ERROR_PREFIX}. \`Suspense\` is unsupported because it can’t be serialized deterministically`;

type WrappedComponentType = {
	readonly $$typeof?: unknown;
	readonly render?: unknown;
	readonly type?: unknown;
};

function getUnsupportedRenderingMessage(value: unknown): string | undefined {
	if (value === Suspense) {
		return UNSUPPORTED_SUSPENSE_MESSAGE;
	}

	if (
		typeof value === 'function' &&
		Object.prototype.toString.call(value) === '[object AsyncFunction]'
	) {
		return UNSUPPORTED_ASYNC_COMPONENT_MESSAGE;
	}

	if (typeof value !== 'object' || value === null) {
		return undefined;
	}

	const component = value as WrappedComponentType;

	if (component.$$typeof === reactLazyType) {
		return UNSUPPORTED_LAZY_COMPONENT_MESSAGE;
	}

	if (component.$$typeof === reactMemoType) {
		return getUnsupportedRenderingMessage(component.type);
	}

	if (component.$$typeof === reactForwardRefType) {
		return getUnsupportedRenderingMessage(component.render);
	}

	return undefined;
}

export function assertSynchronousReactTree(value: ReactNode): void {
	Children.forEach(value, (child) => {
		if (!isValidElement(child)) {
			return;
		}

		const unsupportedRenderingMessage = getUnsupportedRenderingMessage(
			child.type
		);

		if (unsupportedRenderingMessage) {
			throw new TypeError(unsupportedRenderingMessage);
		}

		const { children } = child.props as { children?: ReactNode };
		assertSynchronousReactTree(children);
	});
}

export function createRenderingErrorMessage(error: Error): string {
	return `${RENDERING_ERROR_PREFIX}:\n\n${error.message}`;
}

export function createChildrenRenderingErrorMessage(): string {
	return UNSUPPORTED_CHILDREN_MESSAGE;
}

export function isReactSuspensionError(value: unknown): value is Error {
	return (
		value instanceof Error &&
		value.message.includes(
			'suspended while responding to synchronous input'
		)
	);
}

export function isReactThenable(value: unknown): value is PromiseLike<unknown> {
	return (
		typeof value === 'object' &&
		value !== null &&
		'then' in value &&
		typeof value.then === 'function'
	);
}
