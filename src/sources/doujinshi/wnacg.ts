import { DOMParser } from '@b-fuze/deno-dom';

import Doujinshi from '../../models/doujinshi.ts';
import getWrapper from './getWrapper.ts';

const BASE_URL = "https://wnacg.com";

async function get(id: string) {
  let resp = await fetch(`${BASE_URL}/photos-index-aid-${id}.html`);
  if (!resp.ok) throw new Error("Failed to Fetch Doujinshi.");

  const doc = new DOMParser().parseFromString(await resp.text(), "text/html");
  const doujinshi = new Doujinshi();

  const info = doc.getElementById("bodywrap")!;

  doujinshi.title = { jp: info.getElementsByTagName("h2")[0].textContent };

  const tags = doc.getElementsByClassName("tagshow").map((v) => v.textContent);

  doujinshi.artists.push(tags.shift()!);
  doujinshi.tags = tags;

  const typeAndLang = doc.querySelector("div.uwconn label");
  if (typeAndLang) {
    const match = typeAndLang.textContent.match(/分類：(.*)／(.*)/);
    if (match) {
      doujinshi.type = match[1];
      doujinshi.language = match[2];
    }
  }

  doujinshi.cover = info
    .getElementsByTagName("img")[0]
    .getAttribute("src")
    ?.replace(/\/\//, "https:");

  resp = await fetch(`${BASE_URL}/photos-gallery-aid-${id}.html`);
  if (!resp.ok) throw new Error("Failed to Fetch Doujinshi.");
  const text = await resp.text();

  const rawUrls = JSON.parse(
    `"${text.split("\n")[11].match(/var imglist = (.*);"\);/)![1]}"`
  ) as string;
  const filteredUrls = rawUrls.replaceAll(/fast_img_host\+/g, "");
  const parsedUrls = eval(filteredUrls) as Array<{ url: string }>;
  parsedUrls.pop();

  doujinshi.urls = parsedUrls.map((v) => "https:" + v.url);

  return doujinshi;
}

export default getWrapper(get);
export { get };
