import { marked } from 'marked';

import { DOMParser } from '@b-fuze/deno-dom';

import Torrent from '../../models/torrent.ts';
import getWrapper from './getWrapper.ts';

const BASE_URL = "nyaa.si";

async function parseTextFromMarkDown(mdString: string) {
  const htmlString = await marked(mdString);
  const doc = new DOMParser().parseFromString(htmlString, "text/html");

  return doc.body.textContent.trim();
}

async function get(id: string, baseUrl: string): Promise<Torrent> {
  const resp = await fetch(`https://${baseUrl}/view/${id}`);
  if (!resp.ok) throw new Error("Failed to Fetch the torrent.");

  const doc = new DOMParser().parseFromString(await resp.text(), "text/html");

  const title = doc
    .querySelector(".panel > .panel-heading > .panel-title")!
    .textContent.trim();
  const category = doc
    .querySelector(".panel > .panel-body > .row > .col-md-5")!
    .textContent.trim();
  const link = doc
    .querySelector("div.panel-footer.clearfix > a.card-footer-item")!
    .getAttribute("href")!;
  const description = await parseTextFromMarkDown(
    doc.querySelector("#torrent-description")!.textContent.trim()
  );
  const fileList = Array.from(
    doc.querySelectorAll("div.torrent-file-list ul li")
  )
    .filter((v) => !v.querySelector("a.folder"))
    .map((v) => v.textContent!.trim());

  return new Torrent(title, link, fileList, description, category);
}

export default getWrapper((id) => get(id, BASE_URL));
export { get };
