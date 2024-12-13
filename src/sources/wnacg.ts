import { DOMParser } from "@b-fuze/deno-dom";

import Manga from "../models/manga.ts";

const BASE_URL = "https://wnacg.com";

async function get(id: string) {
  let resp = await fetch(`${BASE_URL}/photos-index-aid-${id}.html`);
  if (!resp.ok) throw new Error("Failed to Fetch Manga.");

  const doc = new DOMParser().parseFromString(await resp.text(), "text/html");
  const manga = new Manga();

  const info = doc.getElementById("bodywrap")!;

  manga.title = { jp: info.getElementsByTagName("h2")[0].textContent };

  const tags = doc.getElementsByClassName("tagshow").map((v) => v.textContent);

  manga.artists.push(tags.pop()!);
  manga.tags = tags;
  manga.cover = info
    .getElementsByTagName("img")[0]
    .getAttribute("src")
    ?.replace(/\/\//, "https:");

  resp = await fetch(`${BASE_URL}/photos-gallery-aid-${id}.html`);
  if (!resp.ok) throw new Error("Failed to Fetch Manga.");
  const text = await resp.text();

  const rawUrls = JSON.parse(
    `"${text.split("\n")[11].match(/var imglist = (.*);"\);/)![1]}"`
  ) as string;
  const filteredUrls = rawUrls.replaceAll(/fast_img_host\+/g, "");
  const parsedUrls = eval(filteredUrls) as Array<{ url: string }>;
  parsedUrls.pop();

  manga.urls = parsedUrls.map((v) => "https:" + v.url);

  return manga;
}

export default get;
