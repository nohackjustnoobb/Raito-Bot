import { bold, FmtString, join, underline } from "telegraf/format";

import { DOMParser } from "@b-fuze/deno-dom";

import Doujinshi from "../../models/doujinshi.ts";
import getWrapper from "./getWrapper.ts";

const BASE_URL = "nhentai.net";

// TODO bypass cloudflare
// https://github.com/ZFC-Digital/cf-clearance-scraper
async function get(id: string) {
  const resp = await fetch(`https://${BASE_URL}/g/${id}`);
  if (!resp.ok) throw new Error("Failed to Fetch the Doujinshi.");

  const doc = new DOMParser().parseFromString(await resp.text(), "text/html");

  const doujinshi = new Doujinshi();

  // cover
  const cover = doc
    .getElementById("cover")
    ?.getElementsByTagName("img")[0]
    .getAttribute("data-src");
  doujinshi.cover = cover || undefined;

  // title
  const titles = doc.getElementsByClassName("title");
  for (const title of titles) {
    const result: Array<string | FmtString> = [];
    title.getElementsByTagName("span").forEach((elem) => {
      switch (elem.className) {
        case "pretty":
          result.push(underline(bold(elem.textContent, "")));
          break;
        default:
          result.push(elem.textContent);
          break;
      }
    });

    if (title.tagName == "H1") doujinshi.title.en = join(result);
    else doujinshi.title.jp = join(result);
  }

  // tags & artists & languages
  const tags = doc.getElementById("tags")!;
  for (const elem of tags.children) {
    const text = elem.textContent.trim();

    // Tags
    if (text.startsWith("Tags")) {
      doujinshi.tags.push(
        ...elem.getElementsByClassName("name").map((e) => e.innerText)
      );
    }

    // Artists
    if (text.startsWith("Artists")) {
      doujinshi.artists.push(
        ...elem.getElementsByClassName("name").map((e) => e.innerText)
      );
    }

    // Language
    if (text.startsWith("Language")) {
      doujinshi.language = elem
        .getElementsByClassName("name")
        .at(-1)?.innerText;
    }

    if (text.startsWith("Categories")) {
      doujinshi.type = elem.getElementsByClassName("name")[0]?.innerText;
    }

    if (text.startsWith("Parodies")) {
      doujinshi.parodies = elem.getElementsByClassName("name")[0]?.innerText;
    }
  }

  // urls
  const urls = doc
    .getElementById("thumbnail-container")
    ?.getElementsByTagName("img")
    .map((e) => {
      const src = e.getAttribute("data-src");
      if (!src) return src;

      const match = src.match(/.*t(\d).*\/(\d*)\/(\d*)t\.([a-zA-Z]*)/);
      if (!match || match!.length !== 5) return null;

      return `https://i${match![1]}.${BASE_URL}/galleries/${match![2]}/${
        match![3]
      }.${match![4]}`;
    })
    .filter((e) => e) as string[] | null;
  if (urls) doujinshi.urls = urls;

  return doujinshi;
}

export default getWrapper(get);
export { get };
