import { Context } from 'telegraf';
import {
  bold,
  FmtString,
  join,
  underline,
} from 'telegraf/format';
// @deno-types="npm:@types/webtorrent@^0.110.0"
import WebTorrent from 'webtorrent';

import Torrent from '../models/torrent.ts';
import { interleave } from '../utils/utils.ts';

const MAX_DOWNLOAD_TASK = 5;
const MAX_DOWNLOAD_SIZE = 2e9; // 2GB

interface TorrentCallback {
  onFail: (hash: string) => void;
  onAdd: (hash: string) => void;
  onAddFail: (hash: string) => void;
  onDone: (torrent: WebTorrent.Torrent) => void;
}

interface AddRequest {
  chatId: string;
  link: string;
  callback: TorrentCallback;
}

class TorrentManager {
  callbacks: { [torrentId: string]: { [chatId: string]: TorrentCallback } } =
    {};
  downloadList: { [chatId: string]: Set<string> } = {};

  queue: Array<AddRequest> = [];
  currentRequest?: AddRequest;

  client: WebTorrent.Instance | null = null;

  constructor(disabled: boolean = false) {
    if (disabled) return;

    this.client = new WebTorrent({
      utp: false,
    });

    this.client.on("error", () => {
      if (this.currentRequest) {
        this.currentRequest.callback.onFail("");
        this.currentRequest = undefined;
      }

      if (!this.queue.length) return;
      this.currentRequest = this.queue.shift();
      this._add();
    });
  }

  add(request: AddRequest) {
    this.queue.push(request);

    if (!this.currentRequest) {
      this.currentRequest = this.queue.shift();
      this._add();
    }
  }

  _add() {
    if (!this.currentRequest) return;

    const chatId = this.currentRequest.chatId;
    const link = this.currentRequest.link;
    const callback = this.currentRequest.callback;

    if (!this.downloadList[chatId]) this.downloadList[chatId] = new Set();

    const torrent = this.client!.torrents.find((v) => {
      const match = link.match(/urn:btih:([^&]*)/);
      if (!match) return false;

      return v.infoHash == match[1];
    });
    if (torrent) {
      this.callbacks[torrent.magnetURI][chatId] = callback;
      this.downloadList[chatId].add(torrent.magnetURI);
      callback.onAdd(torrent.infoHash);

      return;
    }

    this.client!.add(
      link,
      {
        path: `./download/`,
        destroyStoreOnDestroy: true,
      },
      (torrent) => {
        this.currentRequest = undefined;

        if (this.queue.length) {
          this.currentRequest = this.queue.shift();
          this._add();
        }

        for (const file of torrent.files) {
          if (file.length > MAX_DOWNLOAD_SIZE) {
            callback.onAddFail(torrent.infoHash);
            this.client!.remove(torrent);
            return;
          }
        }

        callback.onAdd(torrent.infoHash);

        this.callbacks[torrent.magnetURI] = {};
        this.callbacks[torrent.magnetURI][chatId] = callback;

        this.downloadList[chatId].add(torrent.magnetURI);

        torrent.on("done", () => {
          for (const callback of Object.values(
            this.callbacks[torrent.magnetURI]
          ))
            callback.onDone(torrent);
        });

        torrent.on("error", () => {
          Object.values(this.callbacks[torrent.magnetURI]).forEach((v) =>
            v.onFail(torrent.infoHash)
          );
          delete this.callbacks[torrent.magnetURI];

          Object.values(this.downloadList).forEach((v) =>
            v.delete(torrent.magnetURI)
          );
        });
      }
    );
  }

  remove(chatId: string, hash: string) {
    const torrent = this.client!.torrents.find((v) => v.infoHash === hash);
    if (!torrent) return;
    const url = torrent.magnetURI;

    if (this.callbacks[url][chatId]) delete this.callbacks[url][chatId];

    if (Object.keys(this.callbacks[url]).length === 0) {
      delete this.callbacks[url];
      this.client!.remove(torrent);
    }

    if (this.downloadList[chatId]) this.downloadList[chatId].delete(url);
  }

  getList(chatId: string): Array<Torrent> {
    if (!this.downloadList[chatId]) return [];

    return [...this.downloadList[chatId]].map((v) => {
      const torrent = this.client!.torrents.find((v2) => v2.magnetURI === v);

      const result = new Torrent(
        torrent!.name ?? "Loading",
        torrent!.magnetURI
      );
      result.progress = torrent!.progress;
      result.hash = torrent!.infoHash;

      return result;
    });
  }
}

const torrentManager = new TorrentManager(!Deno.env.get("API_ROOT"));

interface Entity {
  offset: number;
  length: number;
  type: string;
}

async function handler(ctx: Context, mesg: string) {
  if (!torrentManager.client) {
    await ctx.reply(
      "Torrent Client Not Found. This bot does not support torrent."
    );
    return;
  }

  let link = null;
  const chatId = String(ctx.chat!.id);
  const torrents = torrentManager.getList(chatId);

  if (torrents.length > MAX_DOWNLOAD_TASK) {
    await ctx.reply(
      `Your download list already has ${MAX_DOWNLOAD_TASK} torrents.`
    );
    return;
  }

  switch (mesg) {
    case "l":
    case "ls":
    case "list":
    case "p":
    case "ps":
    case "progress":
      if (torrents.length === 0) {
        await ctx.reply("Your download list is empty.");
        break;
      }

      await ctx.reply(
        join(
          interleave<string | FmtString<string>>(
            [
              ...torrents.map((v) => {
                const info: Array<FmtString | string> = [
                  underline(bold(v.title)),
                ];

                const extraInfo = [
                  ["Hash: ", v.hash],
                  ["Progress: ", `${Math.round(v.progress! * 100)}%`],
                ];

                extraInfo.forEach((v) =>
                  info.push(join([bold(v[0] as string), v[1]!]))
                );

                return join(interleave(info, "\n"));
              }),
              join([
                "\nUse ",
                underline(bold("/torrent cancel <hash>")),
                " or ",
                underline(bold("/t c <hash>")),
                " to cancel a specific task.",
              ]),
            ],
            "\n"
          )
        )
      );
      break;
    case "d":
    case "download":
      if (ctx.callbackQuery?.message) {
        // deno-lint-ignore no-explicit-any
        const text = (ctx.callbackQuery.message as any).text as string;
        const entities = // deno-lint-ignore no-explicit-any
          ((ctx.callbackQuery.message as any).entities as Array<Entity>).filter(
            (v: Entity) => v.type === "spoiler"
          );

        link = "";
        for (const entity of entities)
          link += text.slice(entity.offset, entity.offset + entity.length);
      } else {
        await ctx.reply(
          "Invalid Input. This command must be called from a callback."
        );
      }
      break;
    // deno-lint-ignore no-case-declarations
    default:
      const matches = mesg.match(/(cancel|c) (.*)/);
      if (matches) {
        const hash = matches[2];
        torrentManager.remove(chatId, hash);

        await ctx.reply(
          join(["Removed ", underline(bold(hash)), " from the download list."])
        );
        break;
      }

      link = mesg;
      break;
  }

  if (!link) return;

  await ctx.reply("Trying to add the torrent to the download list...");
  torrentManager.add({
    chatId,
    link,
    callback: {
      onFail: async (hash) =>
        await ctx.reply(
          join([
            "Error downloading ",
            hash ? underline(bold(hash)) : "torrent",
            ".",
          ])
        ),
      onAdd: async (hash) =>
        await ctx.reply(
          join([
            "Added ",
            underline(bold(hash)),
            " to download list. Use ",
            underline(bold("/torrent list")),
            " or ",
            underline(bold("/t l")),
            " to view the download list.",
          ])
        ),

      onAddFail: async (hash) =>
        await ctx.reply(
          join([
            "Failed to add ",
            underline(bold(hash)),
            " to the download list. The file is too big.",
          ])
        ),
      onDone: async (torrent) => {
        for (const file of torrent.files) {
          await ctx.replyWithDocument({
            source: file.createReadStream(),
            filename: file.name,
          });
        }

        torrentManager.remove(chatId, torrent.infoHash);
      },
    },
  });
}

export default handler;
