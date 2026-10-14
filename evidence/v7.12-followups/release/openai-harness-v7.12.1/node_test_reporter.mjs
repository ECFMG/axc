// Node's public test event stream; successful suite wrappers are not test cases.
export default async function* report(source) {
  for await (const event of source) {
    if (['test:pass', 'test:fail'].includes(event.type)) {
      const data = event.data;
      yield JSON.stringify({ type: event.type, file: data.file, name: data.name,
        skipped: Boolean(data.skip || data.todo), suite: data.details?.type === 'suite',
        error: data.details?.error?.message }) + '\n';
    }
  }
}
