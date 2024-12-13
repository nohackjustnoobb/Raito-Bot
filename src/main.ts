import {
  bold,
  join,
} from 'telegraf/format';

import Bot from './models/bot.ts';
import nGet from './sources/nhentai.ts';
import {
  chunkArray,
  getArgs,
  interleave,
  sleep,
} from './utils.ts';

const HELP_TEXT = `STILL DEVELOPING`;
const CHUNK_SIZE = 9;
const TIMEOUT = 1000;

const bot = new Bot();
bot.setHelpText(HELP_TEXT);

bot.register("echo", (ctx) => {
  ctx.reply(getArgs(ctx.text));
});

bot.register(["nhentai", "n"], async (ctx) => {
  const mesg = getArgs(ctx.text);
  const code = parseInt(mesg);

  if (isNaN(code) || mesg.length !== 6)
    return ctx.reply("Invalid Input. The input must be a 6 digit number.");

  const reply = ctx.reply("Fetching Manga...");

  try {
    const manga = await nGet(mesg);

    const info = [];

    if (manga.title.en) info.push(manga.title.en);
    if (manga.title.jp) info.push(manga.title.jp);

    [
      ["Artists: ", manga.artists.join(", ")],
      ["Language: ", manga.language || ""],
      ["Pages: ", manga.urls.length],
      ["Tags: ", manga.tags.join(", ")],
    ].forEach((v) => info.push(join([bold(v[0]), v[1]])));

    const finishedReply = await reply;
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
    const finishedReply = await reply;
    ctx.telegram.editMessageText(
      finishedReply.chat.id,
      finishedReply.message_id,
      undefined,
      "Failed to Fetch Manga."
    );
  }
});

bot.start();
