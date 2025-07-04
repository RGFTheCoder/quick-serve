const groupDisposer = {
  [Symbol.dispose]() {
    console.groupEnd();
  },
};

export function group(label: string) {
  console.group(label);
  return groupDisposer;
}
