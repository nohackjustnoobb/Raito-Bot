import packageInfo from '../deno.json' with { type: 'json' };
import Bot from './models/bot.ts';
import nHandler from './sources/nhentai.ts';
import wHandler from './sources/wnacg.ts';
import parseId from './utils/parseId.ts';

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
  description: "try to parse the manga id from the given link",
  inputDescription: "Please enter a link to parse.",
  handler: parseId,
});

bot.register({
  name: "nhentai",
  aliases: ["n"],
  description: "get the manga of the given id from nhentai",
  inputDescription: "Please enter the id of the manga.",
  pattern: [/^https:\/\/nhentai\.net\/g\/.*$/],
  handler: nHandler,
});

bot.register({
  name: "wnacg",
  aliases: ["w"],
  description: "get the manga of the given id from wnacg",
  inputDescription: "Please enter the id of the manga.",
  pattern: [/^https:\/\/www\.wnacg\.com\/.*$/],
  handler: wHandler,
});

bot.start();
