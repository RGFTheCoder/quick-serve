import { transform } from "https://deno.land/x/swc@0.2.1/mod.ts";
import { red, blue, yellow } from "jsr:@std/fmt/colors";

if (import.meta.main) {
  Deno.serve({ hostname: "localhost", port: 8080 }, async (request) => {
    const url = new URL(request.url);
    const filepath = decodeURIComponent(url.pathname);

    console.group(
      `[${blue(new Date().toISOString())}] ${request.method} ${yellow(filepath)}`,
    );

    try {
      const fileInfo = await Deno.stat("." + filepath);

      if (fileInfo.isDirectory) {
        console.log(`Serving directory listing for: ${yellow(filepath)}`);
        const dirEntries = [`<li><a href="..">..</a></li>`];
        for await (const entry of Deno.readDir("." + filepath)) {
          dirEntries.push(
            `<li><a href="./${encodeURIComponent(entry.name)}">${entry.name}</a></li>`,
          );
        }
        console.groupEnd();
        return new Response(
          `<!DOCTYPE html>
          <html>
            <body>
              <h1>Directory: ${filepath}</h1>
              <ul>${dirEntries.join("")}</ul>
            </body>
          </html>`,
          {
            headers: { "Content-Type": "text/html" },
          },
        );
      }

      if (
        filepath.endsWith(".ts") &&
        request.headers.get("sec-fetch-dest") == "script"
      ) {
        console.group(
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
        });
        console.log(
          `Successfully transformed ${yellow(filepath)} to JavaScript`,
        );
        console.groupEnd();
        console.groupEnd();
        return new Response(result.code, {
          headers: { "Content-Type": "application/javascript" },
        });
      }

      console.log(`Serving static file: ${yellow(filepath)}`);
      console.groupEnd();
      const file = await Deno.open("." + filepath, { read: true });
      return new Response(file.readable);
    } catch {
      if (filepath.endsWith(".js")) {
        try {
          const tsFile = "." + filepath.replace(/\.js$/, ".ts");
          console.group(
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
          });
          console.log(
            `Successfully transformed ${yellow(tsFile)} to JavaScript`,
          );
          console.groupEnd();
          console.groupEnd();
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
      }

      console.log(red(`\t404 Not Found: ${yellow(filepath)}`));
      console.groupEnd();
      return new Response("404 Not Found", { status: 404 });
    }
  });
}
