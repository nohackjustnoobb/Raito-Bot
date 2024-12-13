import { bold, join } from "telegraf/format";

import Bot from "./models/bot.ts";
import Manga from "./models/manga.ts";
import nGet from "./sources/nhentai.ts";
import wGet from "./sources/wnacg.ts";
import { chunkArray, getArgs, interleave, sleep } from "./utils.ts";

const CHUNK_SIZE = 9;
const TIMEOUT = 1000;

const bot = new Bot();

bot.register("echo", "echo the given message (for testing only)", (ctx) => {
  const mesg = getArgs(ctx.text);
  ctx.reply(mesg || "Invalid Input. The input cannot be empty.");
});

type ExtractOriginalType<T> = T extends Partial<infer U> ? U : never;

async function getAndReply(
  ctx: ExtractOriginalType<typeof bot.bot.context>,
  get: (id: string) => Promise<Manga>
) {
  const mesg = getArgs(ctx.text!);
  const parsed = parseInt(mesg);

  if (isNaN(parsed))
    return ctx.reply("Invalid Input. The input must be a number.");

  let isEdited = false;
  const reply = ctx.reply("Fetching Manga...");

  try {
    const manga = await get(mesg);

    const info = [];

    if (manga.title.en) info.push(manga.title.en);
    if (manga.title.jp) info.push(manga.title.jp);

    const extraInfo = [];
    if (!manga.artists.length)
      extraInfo.push(["Artists: ", manga.artists.join(", ")]);
    if (manga.language) extraInfo.push(["Language: ", manga.language]);
    extraInfo.push(["Pages: ", manga.urls.length]);
    if (manga.tags.length) extraInfo.push(["Tags: ", manga.tags.join(", ")]);

    extraInfo.forEach((v) => info.push(join([bold(v[0]), v[1]])));

    const finishedReply = await reply;
    isEdited = true;
    if (manga.cover) {
      await ctx.telegram.editMessageMedia(
        finishedReply.chat.id,
        finishedReply.message_id,
        undefined,
        {
          type: "photo",
          media: manga.cover!,
          has_spoiler: true,
        }
      );
      await ctx.reply(join(interleave(info, "\n")));
    } else {
      isEdited = true;
      await ctx.telegram.editMessageText(
        finishedReply.chat.id,
        finishedReply.message_id,
        undefined,
        join(interleave(info, "\n"))
      );
    }

    for (const urls of chunkArray(manga.urls, CHUNK_SIZE)) {
      await sleep(TIMEOUT);
      await ctx.replyWithMediaGroup(
        urls.map((v) => ({
          type: "photo",
          media: v,
          has_spoiler: true,
        }))
      );
    }

    ctx.reply("Done.");
  } catch {
    if (isEdited) {
      ctx.reply("Failed to Send the Manga.");
    } else {
      const finishedReply = await reply;
      ctx.telegram.editMessageText(
        finishedReply.chat.id,
        finishedReply.message_id,
        undefined,
        "Failed to Fetch Manga."
      );
    }
  }
}

bot.register(
  ["nhentai", "n"],
  "get the manga of the given id from nhentai",
  async (ctx) => await getAndReply(ctx, nGet)
);

bot.register(
  ["wnacg", "w"],
  "get the manga of the given id from wnacg",
  async (ctx) => await getAndReply(ctx, wGet)
);

bot.start();
