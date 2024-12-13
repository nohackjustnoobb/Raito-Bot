import {
  bold,
  FmtString,
  join,
  underline,
} from 'telegraf/format';

import { DOMParser } from '@b-fuze/deno-dom';

import Manga from '../models/manga.ts';

const BASE_URL = "https://nhentai.net/g/";

async function get(id: string) {
  const resp = await fetch(`${BASE_URL}${id}`);
  const doc = new DOMParser().parseFromString(await resp.text(), "text/html");

  const manga = new Manga();

  // cover
  const cover = doc
    .getElementById("cover")
    ?.getElementsByTagName("img")[0]
    .getAttribute("data-src");
  manga.cover = cover || undefined;

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

    if (title.tagName == "H1") manga.title.en = join(result);
    else manga.title.jp = join(result);
  }

  // tags & artists & languages
  const tags = doc.getElementById("tags")!;
  for (const elem of tags.children) {
    const text = elem.textContent.trim();

    // Tags
    if (
      text.startsWith("Parodies") ||
      text.startsWith("Tags") ||
      text.startsWith("Categories")
    ) {
      manga.tags.push(
        ...elem.getElementsByClassName("name").map((e) => e.innerText)
      );
    }

    // Artists
    if (text.startsWith("Artists")) {
      manga.artists.push(
        ...elem.getElementsByClassName("name").map((e) => e.innerText)
      );
    }

    // Language
    if (text.startsWith("Language")) {
      manga.language = elem.getElementsByClassName("name").at(-1)?.innerText;
    }
  }

  // urls
  const urls = doc
    .getElementById("thumbnail-container")
    ?.getElementsByTagName("img")
    .map((e) =>
      e
        .getAttribute("data-src")
        ?.replace(/\/\/t/, "//i")
        ?.replace(/t\.jpg/, ".jpg")
    )
    .filter((e) => e) as string[] | null;
  if (urls) manga.urls = urls;

  return manga;
}

export default get;
