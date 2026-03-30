#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import vm from 'node:vm';

const repoRoot = '/Users/martendr.gray/Documents/New project/DJ-Website';
const catalogPath = `${repoRoot}/assets/data/merch-catalog.js`;
const outPath = `${repoRoot}/assets/data/live-link-status.js`;

const catalogCode = readFileSync(catalogPath, 'utf8');
const context = { window: {} };
vm.createContext(context);
vm.runInContext(catalogCode, context);

const catalog = context.window.MERCH_CATALOG;
if (!catalog || !Array.isArray(catalog.items)) {
  throw new Error('MERCH_CATALOG konnte nicht geladen werden.');
}

const external = (href) => typeof href === 'string' && /^https?:\/\//i.test(href);
const storeHref = 'https://www.shirtee.com/de/store/drgray-mrsdrgray/';

const uniqueUrls = [...new Set(catalog.items.map((item) => item.href).filter(external))];

async function checkUrl(url) {
  try {
    const response = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      headers: {
        'user-agent': 'DJ-Website-LinkSync/1.0 (+https://www.drgray-mrsdrgray.com)'
      }
    });

    return {
      sourceHref: url,
      finalUrl: response.url || url,
      httpCode: Number(response.status || 0),
      verified: Number(response.status || 0) === 200
    };
  } catch {
    return {
      sourceHref: url,
      finalUrl: url,
      httpCode: 0,
      verified: false
    };
  }
}

const resultsByUrl = {};
for (const url of uniqueUrls) {
  resultsByUrl[url] = await checkUrl(url);
}

const items = {};
for (const item of catalog.items) {
  if (!external(item.href)) {
    continue;
  }
  const result = resultsByUrl[item.href];
  items[item.id] = {
    ...result,
    fallbackHref: storeHref
  };
}

const payload = {
  storeHref,
  items
};

const output = `window.LIVE_LINK_STATUS = ${JSON.stringify(payload, null, 2)};\n`;
writeFileSync(outPath, output, 'utf8');
console.log(`Wrote ${outPath}`);
