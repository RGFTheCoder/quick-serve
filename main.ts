import { transform } from "swc";
import { red, blue, yellow } from "jsr:@std/fmt/colors";
import { basename } from "jsr:@std/path/basename";
import { group } from "./group.ts";
import { indexFlat, indexRec } from "./index.ts";

// use imports like this later
// import text from "./static/index.html" with { type: "text" };
//
const decoder = new TextDecoder("utf-8");
const [notfound, indexpage] = await Promise.all([
  Deno.readFile(import.meta.dirname + "/special/404.html").then((x) =>
    decoder.decode(x),
  ),
  Deno.readFile(import.meta.dirname + "/special/index.html").then((x) =>
    decoder.decode(x),
  ),
]);

if (import.meta.main) {
  Deno.serve({ hostname: "localhost", port: 8080 }, async (request) => {
    const url = new URL(request.url);
    const filepath = decodeURIComponent(url.pathname);

    using _ = group(
      `[${blue(new Date().toISOString())}] ${request.method} ${yellow(filepath)}`,
    );

    try {
      const fileInfo = await Deno.stat("." + filepath);

      if (fileInfo.isDirectory) {
        if (!filepath.endsWith("/")) {
          return Response.redirect(new URL(filepath + "/", request.url), 301);
        }
        console.log(`Serving directory listing for: ${yellow(filepath)}`);

        const userIndexDoc = await Deno.readFile("./special/notfound.html")
          .then((x) => decoder.decode(x))
          .catch(() => indexpage);

        return new Response(userIndexDoc, {
          headers: { "Content-Type": "text/html" },
        });
      }

      if (
        filepath.endsWith(".ts") &&
        request.headers.get("sec-fetch-dest") == "script"
      ) {
        using _ = group(
          `Transforming TypeScript file ${yellow(filepath)} to JavaScript for script request`,
        );
        const content = await Deno.readTextFile("." + filepath);
        const result = transform(content, {
          jsc: {
            target: "es2022",
            parser: {
              syntax: "typescript",
            },
          },
          sourceMaps: true,
        });

        const map =
          "map" in result && typeof result.map === "string"
            ? JSON.parse(result.map)
            : null;

        if (map) {
          map.sources[0] = filepath;

          result.code +=
            "\n//# sourceMappingURL=data:application/json;base64," +
            btoa(JSON.stringify(map));
        }

        console.log(
          `Successfully transformed ${yellow(filepath)} to JavaScript`,
        );
        return new Response(result.code, {
          headers: { "Content-Type": "application/javascript" },
        });
      }

      console.log(`Serving static file: ${yellow(filepath)}`);
      const file = await Deno.open("." + filepath, { read: true });
      return new Response(file.readable);
    } catch {
      if (filepath.endsWith(".js")) {
        try {
          const tsFile = "." + filepath.replace(/\.js$/, ".ts");
          using _ = group(
            `Attempting to transform TypeScript file ${yellow(tsFile)} to JavaScript`,
          );
          const tsContent = await Deno.readTextFile(tsFile);
          const result = transform(tsContent, {
            jsc: {
              target: "es2022",
              parser: {
                syntax: "typescript",
              },
            },

            sourceMaps: true,
          });

          const map =
            "map" in result && typeof result.map === "string"
              ? JSON.parse(result.map)
              : null;

          if (map) {
            map.sources[0] = filepath;

            result.code +=
              "\n//# sourceMappingURL=data:application/json;base64," +
              btoa(JSON.stringify(map));
          }

          console.log(
            `Successfully transformed ${yellow(tsFile)} to JavaScript`,
          );
          return new Response(result.code, {
            headers: { "Content-Type": "application/javascript" },
          });
        } catch {
          console.log(
            red(
              `\t\tNo TypeScript file found for ${yellow(filepath)}, falling back to normal file handling`,
            ),
          );
        }
      } else if (basename(filepath) == "index.json") {
        return new Response(JSON.stringify(await indexFlat(filepath)), {
          headers: { "Content-Type": "application/json" },
        });
      } else if (basename(filepath) == "rindex.json") {
        return new Response(JSON.stringify(await indexRec(filepath)), {
          headers: { "Content-Type": "application/json" },
        });
      }

      using _ = group(red(`404 Not Found: ${yellow(filepath)}`));

      // returns 200 code
      const userNotFoundDoc = await Deno.readFile("./special/notfound.html")
        .then((x) => decoder.decode(x))
        .catch(() => null);
      // returns 404 code
      const user404Doc = await Deno.readFile("./special/404.html")
        .then((x) => decoder.decode(x))
        .catch(() => notfound);

      if (userNotFoundDoc != null) {
        console.log(`Serving static ${yellow("404")} with code 200`);
        return new Response(userNotFoundDoc, {
          headers: { "Content-Type": "text/html" },
        });
      } else {
        console.log(`Serving static ${red("404")}`);
        return new Response(user404Doc, {
          status: 404,
          headers: { "Content-Type": "text/html" },
        });
      }
    }
  });
}
