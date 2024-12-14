import { Context } from 'telegraf';
import {
  bold,
  join,
} from 'telegraf/format';

import Bot from './models/bot.ts';
import Manga from './models/manga.ts';
import nGet from './sources/nhentai.ts';
import wGet from './sources/wnacg.ts';
import {
  chunkArray,
  interleave,
  sleep,
} from './utils.ts';

const CHUNK_SIZE = 10;
const TIMEOUT = 1500;

const bot = new Bot();

bot.register({
  name: "echo",
  description: "echo the given message (for testing only)",
  inputDescription: "Please enter a message to echo.",
  handler: (ctx, mesg) => {
    ctx.reply(mesg || "Invalid Input. The input cannot be empty.");
  },
});

function getWrapper(
  get: (id: string) => Promise<Manga>
): (ctx: Context, mesg: string) => Promise<void> {
  return async function (ctx: Context, mesg: string) {
    const parsed = parseInt(mesg);

    if (isNaN(parsed)) {
      ctx.reply("Invalid Input. The input must be a number.");
      return;
    }
    let isEdited = false;
    const reply = ctx.reply("Fetching Manga...");

    try {
      const manga = await get(mesg);

      const info = [];

      if (manga.title.en) info.push(manga.title.en);
      if (manga.title.jp) info.push(manga.title.jp);

      const extraInfo = [];
      if (manga.artists.length)
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

      await sleep(TIMEOUT);
      await ctx.reply("Done.");
    } catch {
      if (isEdited) {
        await ctx.reply("Failed to Send the Manga.");
      } else {
        const finishedReply = await reply;
        await ctx.telegram.editMessageText(
          finishedReply.chat.id,
          finishedReply.message_id,
          undefined,
          "Failed to Fetch Manga."
        );
      }
    }
  };
}

bot.register({
  name: "nhentai",
  aliases: ["n"],
  description: "get the manga of the given id from nhentai",
  inputDescription: "Please enter the id of the manga.",
  handler: getWrapper(nGet),
});

bot.register({
  name: "wnacg",
  aliases: ["w"],
  description: "get the manga of the given id from wnacg",
  inputDescription: "Please enter the id of the manga.",
  handler: getWrapper(wGet),
});

bot.start();
