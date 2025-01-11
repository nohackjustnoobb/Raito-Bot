import { Context, TelegramError } from "telegraf";
import { bold, join } from "telegraf/format";

import Manga from "../models/manga.ts";
import { chunkArray, interleave, sleep } from "../utils/utils.ts";

const CHUNK_SIZE = 10;
const TIMEOUT = 1000;

function getWrapper(
  get: (id: string) => Promise<Manga>
): (ctx: Context, mesg: string) => Promise<void> {
  return async function (ctx: Context, mesg: string) {
    const match = mesg.match(/(\d\d*)/);

    if (!match) {
      await ctx.reply("Invalid Input. The input must be a number.");
      return;
    }

    let isEdited = false;
    const reply = ctx.reply("Fetching Manga...");

    try {
      const manga = await get(match[1]);

      const info = [];

      if (manga.title.en) info.push(manga.title.en);
      if (manga.title.jp) info.push(manga.title.jp);

      const extraInfo = [];

      if (manga.artists.length)
        extraInfo.push(["Artists: ", manga.artists.join(", ")]);

      if (manga.language) extraInfo.push(["Language: ", manga.language]);

      if (manga.type) extraInfo.push(["Type: ", manga.type]);

      if (manga.parodies) extraInfo.push(["Parodies: ", manga.parodies]);

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
        try {
          await ctx.replyWithMediaGroup(
            urls.map((v) => ({
              type: "photo",
              media: v,
              has_spoiler: true,
            })),
            { disable_notification: true }
          );
        } catch (err) {
          if (!(err instanceof TelegramError)) throw err;

          const match = err.response.description.match(
            /Too Many Requests: retry after (\d*)/
          );

          if (err.response.error_code == 429 && match) {
            console.log("waiting for ", match[1], "s");
            await sleep(parseInt(match[1]) * 1000);
          }
        }
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
          "Failed to Fetch the Manga."
        );
      }
    }
  };
}

export default getWrapper;
