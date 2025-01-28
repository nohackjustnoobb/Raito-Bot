import { Context } from 'telegraf';

// TODO implement
class TorrentManager {
  chats: { [chatId: string]: { [torrentId: string]: () => void } } = {};
  client = null;

  async add(chatId: string, link: string, callback: () => void) {
    if (!this.chats[chatId]) this.chats[chatId] = {};

    // const torrent = await this.client!.add({
    //   filename: link,
    //   downloadDir: `~/download/torrent/${chatId}`,
    // });

    // console.log(torrent);
  }
}

const torrentManager = new TorrentManager();

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

  switch (mesg) {
    case "l":
    case "ls":
    case "list":
    case "p":
    case "ps":
      break;
    case "c":
    case "cancel":
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
    default:
      link = mesg;
      break;
  }

  if (!link) return;

  await torrentManager.add(String(ctx.chat!.id), link, () => {});
}

export default handler;
