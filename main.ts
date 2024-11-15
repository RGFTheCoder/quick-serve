import { transform } from "https://deno.land/x/swc@0.2.1/mod.ts";

if (import.meta.main) {
  Deno.serve({ hostname: "localhost", port: 8080 }, async (request) => {
    const url = new URL(request.url);
    const filepath = decodeURIComponent(url.pathname);

    try {
      const fileInfo = await Deno.stat("." + filepath);

      if (fileInfo.isDirectory) {
        const dirEntries = [`<li><a href="..">..</a></li>`];
        for await (const entry of Deno.readDir("." + filepath)) {
          dirEntries.push(
            `<li><a href="./${encodeURIComponent(entry.name)}">${entry.name}</a></li>`,
          );
        }
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

      if (filepath.endsWith(".js")) {
        try {
          const tsFile = "." + filepath.replace(/\.js$/, ".ts");
          const tsContent = await Deno.readTextFile(tsFile);
          // const { transform } = await import("@swc/core");
          const result = transform(tsContent, {
            jsc: {
              target: "es2022",
              parser: {
                syntax: "typescript",
              },
            },
          });
          return new Response(result.code, {
            headers: { "Content-Type": "application/javascript" },
          });
        } catch {
          // Fall through to normal file handling if .ts doesn't exist
        }
      }

      if (
        filepath.endsWith(".ts") &&
        request.headers.get("sec-fetch-dest") == "script"
      ) {
        const content = await Deno.readTextFile("." + filepath);
        // const { transform } = await import("@swc/core");
        const result = transform(content, {
          jsc: {
            target: "es2022",
            parser: {
              syntax: "typescript",
            },
          },
        });
        return new Response(result.code, {
          headers: { "Content-Type": "application/javascript" },
        });
      }

      const file = await Deno.open("." + filepath, { read: true });
      return new Response(file.readable);
    } catch {
      return new Response("404 Not Found", { status: 404 });
    }
  });
}
