export async function* extractDataLines(lineStream: AsyncIterable<string>): AsyncIterable<string> {
  for await (const line of lineStream) {
    if (!line.startsWith('data: ')) continue;

    const data = line.slice(6);
    if (!data.trim()) continue;

    yield data;
  }
}
