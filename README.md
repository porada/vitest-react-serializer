[![](https://img.shields.io/npm/v/vitest-react-serializer)](https://www.npmjs.com/package/vitest-react-serializer)
[![](https://img.shields.io/github/actions/workflow/status/porada/vitest-react-serializer/test.yaml)](https://github.com/porada/vitest-react-serializer/actions/workflows/test.yaml)
[![](https://img.shields.io/codecov/c/github/porada/vitest-react-serializer)](https://codecov.io/github/porada/vitest-react-serializer)

# vitest-react-serializer

Serialize React components into formatted HTML. Built for human-readable, reviewable component [snapshot testing with Vitest](https://vitest.dev/guide/snapshot.html).

## Example

```ts
import { expect, test } from 'vitest';
import { FolderIcon } from './icons/index.ts';

test('renders without issues', () => {
    expect(
        <FolderIcon weight="fill" size={48} className="foo" />
    ).toMatchSnapshot();
});
```

```ts
// Snapshot with `vitest-react-serializer`
exports[`renders without issues 1`] = `
<svg
  xmlns="http://www.w3.org/2000/svg"
  width="48"
  height="48"
  fill="currentColor"
  viewBox="0 0 256 256"
  class="foo"
>
  <path
    d="M232,88V200.89A15.13,15.13,0,0,1,216.89,216H40a16,16,0,0,1-16-16V64A16,16,0,0,1,40,48H93.33a16.12,16.12,0,0,1,9.6,3.2L130.67,72H216A16,16,0,0,1,232,88Z"
  ></path>
</svg>
`;

// Snapshot without `vitest-react-serializer`
exports[`renders without issues 1`] = `
<FolderIcon
  className="foo"
  size={48}
  weight="fill"
/>
`;
```

## Install

```sh
npm install --save-dev vitest-react-serializer
```

```sh
pnpm add --save-dev vitest-react-serializer
```

## Usage

Reference `vitest-react-serializer` in your `vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        snapshotSerializers: ['vitest-react-serializer'],
    },
});
```

Alternatively, scope the serializer to a test file (or even a single test) using `expect.addSnapshotSerializer`.

```ts
import { beforeAll, expect } from 'vitest';
import reactSerializer from 'vitest-react-serializer';

beforeAll(() => {
    expect.addSnapshotSerializer(reactSerializer);
});
```
