# vitest-react-serializer

Serialize React components into formatted HTML. Built for human-readable, reviewable [snapshot testing](https://vitest.dev/guide/snapshot.html) with Vitest.

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

Alternatively, scope the serializer to a test file (or even a single test) using [`expect.addSnapshotSerializer`](https://vitest.dev/api/expect.html#expect-addsnapshotserializer).

```ts
import { beforeAll, expect } from 'vitest';
import reactSerializer from 'vitest-react-serializer';

beforeAll(() => {
	expect.addSnapshotSerializer(reactSerializer);
});
```
