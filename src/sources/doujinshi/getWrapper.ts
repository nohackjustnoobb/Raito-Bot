import { Context, TelegramError } from "telegraf";
import { bold, join } from "telegraf/format";

import Doujinshi from "../../models/doujinshi.ts";
import { chunkArray, interleave, log, sleep } from "../../utils/utils.ts";

const CHUNK_SIZE = 10;
const TIMEOUT = 1000;

function getWrapper(
  get: (id: string) => Promise<Doujinshi>
): (ctx: Context, mesg: string) => Promise<void> {
  return async function (ctx: Context, mesg: string) {
    const match = mesg.match(/(\d\d*)/);

    if (!match) {
      await ctx.reply("Invalid Input. The input must be a number.");
      return;
    }

    let isEdited = false;
    const reply = ctx.reply("Fetching Doujinshi...");

    try {
      const doujinshi = await get(match[1]);

      const info = [];

      if (doujinshi.title.en) info.push(doujinshi.title.en);
      if (doujinshi.title.jp) info.push(doujinshi.title.jp);

      const extraInfo = [];

      if (doujinshi.artists.length)
        extraInfo.push(["Artists: ", doujinshi.artists.join(", ")]);

      if (doujinshi.language)
        extraInfo.push(["Language: ", doujinshi.language]);

      if (doujinshi.type) extraInfo.push(["Type: ", doujinshi.type]);

      if (doujinshi.parodies)
        extraInfo.push(["Parodies: ", doujinshi.parodies]);

      extraInfo.push(["Pages: ", doujinshi.urls.length]);

      if (doujinshi.tags.length)
        extraInfo.push(["Tags: ", doujinshi.tags.join(", ")]);

      extraInfo.forEach((v) => info.push(join([bold(v[0]), v[1]])));

      const finishedReply = await reply;
      isEdited = true;
      if (doujinshi.cover) {
        await ctx.telegram.editMessageMedia(
          finishedReply.chat.id,
          finishedReply.message_id,
          undefined,
          {
            type: "photo",
            media: doujinshi.cover!,
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

      for (const urls of chunkArray(doujinshi.urls, CHUNK_SIZE)) {
        await sleep(TIMEOUT);

        let retry = 0;
        while (retry < 5) {
          try {
            await ctx.replyWithMediaGroup(
              urls.map((v) => ({
                type: "photo",
                media: v,
                has_spoiler: true,
              })),
              { disable_notification: true }
            );

            break;
          } catch (err) {
            retry++;

            if (!(err instanceof TelegramError)) throw err;

            const match = err.response.description.match(
              /Too Many Requests: retry after (\d*)/
            );

            if (err.response.error_code == 429 && match) {
              log(
                `\u001b[31Rate limited. Retrying after ${match[1]} seconds...`
              );
              await sleep(parseInt(match[1]) * 1000);
            }
          }
        }
      }

      await sleep(TIMEOUT);
      await ctx.reply("Done.");
    } catch {
      if (isEdited) {
        await ctx.reply("Failed to send the Doujinshi.");
      } else {
        const finishedReply = await reply;
        await ctx.telegram.editMessageText(
          finishedReply.chat.id,
          finishedReply.message_id,
          undefined,
          "Failed to fetch the Doujinshi."
        );
      }
    }
  };
}

export default getWrapper;
