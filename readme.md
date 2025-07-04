# Quick Serve

## Install

```sh
deno install --global --allow-net --allow-read -n serve -f --config ./deno.json ./main.ts
```

## Features

- Requesting `*.js` (or `*.ts` from an ESM context) when only `*.ts` exists will transpile.
- Requesting `index.json` or `rindex.json` will return the (recursive?) index of that folder.
- Requesting a directory or unknown file will return `special/index.html` and `special/404.html` respectively.
  - Use `special/notfound.html` to return a `200` status code for not found requests.
