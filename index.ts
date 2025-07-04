import { dirname } from "jsr:@std/path/dirname";

type FSFile = { name: string; path: string; type: "file" };
type FSSym = { name: string; path: string; type: "sym" };
type FSDir = { name: string; path: string; type: "dir" };
type FSDirRec = {
  name: string;
  path: string;
  type: "dir";
  children: Record<string, FSItemRec>;
};
type FSItemRec = FSFile | FSSym | FSDirRec;
type FSItem = FSFile | FSSym | FSDir;

export async function indexFlat(
  filepath: string,
): Promise<Record<string, FSItem>> {
  const entries = Deno.readDir("." + dirname(filepath));

  const out: Record<string, FSItem> = {};

  const dname = dirname(filepath);

  for await (const entry of entries) {
    if (entry.name[0] == "." || entry.name.startsWith("node_modules")) continue;

    out[entry.name] = {
      name: entry.name,
      path: `${dname == "/" ? "" : dname}/${entry.name}${entry.isDirectory ? "/" : ""}`,
      type: entry.isDirectory ? "dir" : entry.isFile ? "file" : "sym",
    };
  }

  return out;
}

export async function indexRec(
  filepath: string,
): Promise<Record<string, FSItemRec>> {
  const entries = Deno.readDir("." + dirname(filepath));

  const out: Record<string, FSItemRec> = {};

  const dname = dirname(filepath);

  for await (const entry of entries) {
    if (entry.name[0] == ".") continue;

    if (entry.isDirectory) {
      out[entry.name] = {
        name: entry.name,
        path: `${dname == "/" ? "" : dname}/${entry.name}/`,
        type: "dir",
        children: await indexRec(
          `${dname == "/" ? "" : dname}/${entry.name}/index.json`,
        ),
      };
    } else {
      out[entry.name] = {
        name: entry.name,
        path: `${dname == "/" ? "" : dname}/${entry.name}`,
        type: entry.isFile ? "file" : "sym",
      };
    }
  }

  return out;
}
