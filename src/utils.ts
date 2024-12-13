function getArgs(command: string) {
  const matches = command.match(/\/(.*) (.*)/i);
  return matches ? matches[2] : "";
}
function interleave<T>(arr: Array<T>, thing: T) {
  return ([] as Array<T>).concat(...arr.map((n) => [n, thing])).slice(0, -1);
}

function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export { chunkArray, getArgs, interleave, sleep };
