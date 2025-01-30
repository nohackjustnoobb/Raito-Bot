import packageInfo from '../deno.json' with { type: 'json' };
import tHandler from './manager/torrentManager.ts';
import Bot from './models/bot.ts';
import nHandler from './sources/doujinshi/nhentai.ts';
import wHandler from './sources/doujinshi/wnacg.ts';
import nyHandler from './sources/torrent/nyaa.ts';
import suHandler from './sources/torrent/sukebei.ts';
import parseId, { PATTERNS as PARSE_PATTERNS } from './utils/parseId.ts';

const bot = new Bot();

bot.register({
  name: "echo",
  description: "echo the given message (for testing only)",
  inputDescription: "Please enter a message to echo.",
  handler: async (ctx, mesg) => {
    await ctx.reply(mesg || "Invalid Input. The input cannot be empty.");
  },
});

bot.register({
  name: "info",
  description: "display the info of this bot",
  handler: async (ctx, _) => {
    const mesgs = [];

    mesgs.push(`Bot Version: ${packageInfo.version}`);

    const source = Deno.env.get("SOURCE");
    if (source) mesgs.push(`Source Code: ${source}`);

    await ctx.reply(mesgs.join("\n"));
  },
});

bot.register({
  name: "parse",
  aliases: ["p"],
  description: "try to parse the doujinshi id from the given link",
  inputDescription: "Please enter a link to parse.",
  handler: parseId,
  patterns: PARSE_PATTERNS
});

bot.register({
  name: "nhentai",
  aliases: ["n"],
  description: "get the doujinshi of the given id from nhentai",
  inputDescription: "Please enter the id of the doujinshi.",
  patterns: [/https:\/\/nhentai\.net\/g\/.*/],
  handler: nHandler,
});

bot.register({
  name: "wnacg",
  aliases: ["w"],
  description: "get the doujinshi of the given id from wnacg",
  inputDescription: "Please enter the id of the doujinshi.",
  patterns: [/https:\/\/www\.wnacg\.com\/.*/],
  handler: wHandler,
});

bot.register({
  name:"torrent",
  aliases: ["t"],
  description: "add the given torrent to the download list",
  inputDescription: "Please enter the Magnet link of the torrent.",
  handler: tHandler,
})


bot.register({
  name: "nyaa",
  aliases: ["ny"],
  description: "get the torrent of the given id from nyaa",
  inputDescription: "Please enter the id of the torrent.",
  patterns: [/https:\/\/nyaa\.si\/.*/],
  handler: nyHandler,
});


bot.register({
  name: "sukebei",
  aliases: ["su"],
  description: "get the torrent of the given id from sukebei",
  inputDescription: "Please enter the id of the torrent.",
  patterns: [/https:\/\/sukebei\.nyaa\.si\/.*/],
  handler: suHandler,
});


bot.start();
