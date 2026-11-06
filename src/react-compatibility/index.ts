import type { ReactElement, ReactNode } from 'react';
import { isValidElement } from 'react';
import { renderToString } from 'react-dom/server';

const REACT_TYPE_ACTIVITY = Symbol.for('react.activity');
const REACT_TYPE_CONTEXT = Symbol.for('react.context');
const REACT_TYPE_FORWARD_REF = Symbol.for('react.forward_ref');
const REACT_TYPE_LAZY = Symbol.for('react.lazy');
const REACT_TYPE_MEMO = Symbol.for('react.memo');

const UNSUPPORTED_MESSAGE_PREFIX =
	'[vitest-react-serializer] Failed to render component';

const UNSUPPORTED_MESSAGE_ASYNC_COMPONENT = `${UNSUPPORTED_MESSAGE_PREFIX}. Async components can’t be serialized because snapshots are generated synchronously`;
const UNSUPPORTED_MESSAGE_CHILDREN = `${UNSUPPORTED_MESSAGE_PREFIX}. Promise children can’t be serialized because synchronous access to their values isn’t guaranteed`;
const UNSUPPORTED_MESSAGE_LAZY_COMPONENT = `${UNSUPPORTED_MESSAGE_PREFIX}. Lazy components can’t be serialized because they aren’t guaranteed to render synchronously`;
const UNSUPPORTED_MESSAGE_SUSPENSE_FALLBACK = `${UNSUPPORTED_MESSAGE_PREFIX}. \`Suspense\` fallbacks can’t be serialized because they conceal suspended or failed renders`;

const MARKER_REACT_COMMENT = /<!--(?: |\/?[$&])-->/gu;
const MARKER_SUSPENSE_FALLBACK = /<!--\$(?!-->)/u;
const MARKER_SUSPENSE_FALLBACK_ERROR =
	/<!--\$!--><template[^>]* data-msg="(Switched to client rendering because the server rendering errored:[^"]*)"/gu;

const HTML_ESCAPES = /&(?:#x27|amp|gt|lt|quot);/gu;
const HTML_UNESCAPED_CHARACTERS: Readonly<Record<string, string>> = {
	'&#x27;': "'",
	'&amp;': '&',
	'&gt;': '>',
	'&lt;': '<',
	'&quot;': '"',
};

type ElementProps = {
	readonly children?: unknown;
	readonly mode?: unknown;
};

type WrappedComponentType = {
	readonly $$typeof?: unknown;
	readonly render?: unknown;
	readonly type?: unknown;
};

/**
 * Explains why a component type is unsupported by synchronous
 * snapshot serializers.
 */
function getUnsupportedRenderingMessage(value: unknown): string | undefined {
	if (
		typeof value === 'function' &&
		Object.prototype.toString.call(value) === '[object AsyncFunction]'
	) {
		return UNSUPPORTED_MESSAGE_ASYNC_COMPONENT;
	}

	if (typeof value !== 'object' || value === null) {
		return undefined;
	}

	const component = value as WrappedComponentType;

	if (component.$$typeof === REACT_TYPE_LAZY) {
		return UNSUPPORTED_MESSAGE_LAZY_COMPONENT;
	}

	if (component.$$typeof === REACT_TYPE_MEMO) {
		return getUnsupportedRenderingMessage(component.type);
	}

	if (component.$$typeof === REACT_TYPE_FORWARD_REF) {
		return getUnsupportedRenderingMessage(component.render);
	}

	return undefined;
}

/**
 * Identifies elements whose children React renders directly, rather than
 * passing them to a custom component.
 */
function rendersChildren(element: ReactElement<ElementProps>): boolean {
	const { props } = element;
	const type: unknown = element.type;

	if (typeof type === 'string') {
		return true;
	}

	if (type === REACT_TYPE_ACTIVITY) {
		return props.mode !== 'hidden';
	}

	if (typeof type === 'symbol') {
		return true;
	}

	return (
		typeof type === 'object' &&
		type !== null &&
		(type as WrappedComponentType).$$typeof === REACT_TYPE_CONTEXT
	);
}

/**
 * Checks React content for compatibility with synchronous serialization.
 */
export function assertSynchronousReactTree(value: unknown): void {
	if (isReactThenable(value)) {
		throw new TypeError(UNSUPPORTED_MESSAGE_CHILDREN);
	}

	// Let React consume iterators so the check doesn’t exhaust them
	if (Array.isArray(value)) {
		for (const child of value) {
			assertSynchronousReactTree(child);
		}

		return;
	}

	if (!isValidElement<ElementProps>(value)) {
		return;
	}

	const unsupportedRenderingMessage = getUnsupportedRenderingMessage(
		value.type
	);

	if (unsupportedRenderingMessage) {
		throw new TypeError(unsupportedRenderingMessage);
	}

	if (rendersChildren(value)) {
		assertSynchronousReactTree(value.props.children);
	}
}

/**
 * Renders static HTML, rejecting `Suspense` fallbacks. Uses `renderToString` to
 * detect fallbacks before removing React’s markers. Matching is text-based.
 * Recognized markers are removed even inside raw HTML, scripts, and styles.
 * Other comments starting with `<!--$` are treated as fallbacks.
 */
export function renderStaticMarkup(value: ReactNode): string {
	const html = renderToString(value);

	if (MARKER_SUSPENSE_FALLBACK.test(html)) {
		throw new TypeError(createSuspenseFallbackMessage(html));
	}

	return html.replaceAll(MARKER_REACT_COMMENT, '');
}

/**
 * Includes the errors behind `Suspense` fallbacks when available in
 * development builds.
 */
function createSuspenseFallbackMessage(html: string): string {
	const errors = Array.from(
		html.matchAll(MARKER_SUSPENSE_FALLBACK_ERROR),
		([, error = '']) =>
			error.replaceAll(HTML_ESCAPES, (escape) => {
				/* v8 ignore next -- @preserve */
				return HTML_UNESCAPED_CHARACTERS[escape] ?? escape;
			})
	);

	if (errors.length === 0) {
		return UNSUPPORTED_MESSAGE_SUSPENSE_FALLBACK;
	}

	return `${UNSUPPORTED_MESSAGE_SUSPENSE_FALLBACK}:\n\n${errors.join('\n\n')}`;
}

/**
 * Explains the synchronous rendering requirement when a component suspends.
 */
export function createSuspensionErrorMessage(error: Error): string {
	return `${UNSUPPORTED_MESSAGE_PREFIX}. Snapshot serializers run synchronously, but a component suspended:\n\n${error.message}`;
}

/**
 * Recognizes React’s error for suspension during synchronous rendering.
 */
export function isReactSuspensionError(value: unknown): value is Error {
	return (
		value instanceof Error &&
		value.message.includes(
			'suspended while responding to synchronous input'
		)
	);
}

/**
 * Recognizes values React treats as promises.
 */
export function isReactThenable(value: unknown): value is PromiseLike<unknown> {
	return (
		typeof value === 'object' &&
		value !== null &&
		'then' in value &&
		typeof value.then === 'function'
	);
}
