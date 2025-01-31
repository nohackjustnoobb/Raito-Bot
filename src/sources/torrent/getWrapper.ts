import { Context } from 'telegraf';
import {
  bold,
  FmtString,
  join,
  quote,
  spoiler,
  underline,
} from 'telegraf/format';

import Torrent from '../../models/torrent.ts';
import { interleave } from '../../utils/utils.ts';

function getWrapper(
  get: (id: string) => Promise<Torrent>
): (ctx: Context, mesg: string) => Promise<void> {
  return async function (ctx: Context, mesg: string) {
    const match = mesg.match(/(\d\d*)/);

    if (!match) {
      await ctx.reply("Invalid Input. The input must be a number.");
      return;
    }

    const reply = ctx.reply("Fetching Torrent...");

    try {
      const torrent = await get(match[1]);

      const info: Array<FmtString | string> = [underline(bold(torrent.title))];

      const extraInfo = [];

      extraInfo.push(["Link: \n", spoiler(torrent.link)]);

      if (torrent.category) extraInfo.push(["Category: ", torrent.category]);

      if (torrent.fileList.length)
        extraInfo.push([
          "File list: \n",
          join(
            interleave<FmtString | string>(
              torrent.fileList.map((v) => quote(`${v}\n`)),
              "\n"
            )
          ),
        ]);

      // TODO temporary fix for message too long
      // if (torrent.description)
      //   extraInfo.push(["Description: \n", quote(torrent.description)]);

      extraInfo.forEach((v) => info.push(join([bold(v[0] as string), v[1]])));

      const finishedReply = await reply;
      await ctx.telegram.editMessageText(
        finishedReply.chat.id,
        finishedReply.message_id,
        undefined,
        join(interleave(info, "\n")),
        {
          reply_markup: {
            inline_keyboard: [[{ text: "Download", callback_data: `/t d` }]],
          },
        }
      );
    } catch {
      const finishedReply = await reply;
      await ctx.telegram.editMessageText(
        finishedReply.chat.id,
        finishedReply.message_id,
        undefined,
        "Failed to fetch the torrent."
      );
    }
  };
}

export default getWrapper;
