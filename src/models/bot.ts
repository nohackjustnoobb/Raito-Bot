import { Telegraf } from 'telegraf';

function log(mesg: string) {
  console.log(`%c${new Date().toISOString()}`, "color: gray", mesg);
}

class Bot {
  bot: Telegraf;
  helpText?: string;
  cmds: string[] = ["start", "help"];

  constructor() {
    const token = Deno.env.get("BOT_TOKEN");
    if (!token) throw Error("No token found.");

    this.bot = new Telegraf(token, { handlerTimeout: 300000 });

    this.bot.use(async (ctx, next) => {
      const match = ctx.text?.match(/\/([^ ]*)/);
      const command: string = match ? match[1] : "NONE";

      log(
        `\u001b[33mProcessing \u001b[36mchat=\u001b[37m${ctx.chat?.id} \u001b[36mcommand=\u001b[37m${command}`
      );
      const now = Date.now();

      if (this.cmds.find((v) => v === command)) {
        await next();
      } else {
        ctx.reply("Unknown Command.");
      }

      log(
        `\u001b[32mProcessed \u001b[36mchat=\u001b[37m${
          ctx.chat?.id
        } \u001b[36mduration=\u001b[37m${Date.now() - now}ms`
      );
    });

    const replyHelpTextIfExists = (ctx: { reply: (arg0: string) => void }) => {
      if (this.helpText) ctx.reply(this.helpText);
    };
    this.bot.start(replyHelpTextIfExists);
    this.bot.help(replyHelpTextIfExists);
  }

  setHelpText(text: string) {
    this.helpText = text;
  }

  register(
    cmds: string | Array<string>,
    fn: Parameters<typeof this.bot.command>[1]
  ) {
    for (const cmd of cmds instanceof Array ? cmds : [cmds]) {
      log(`\u001b[34mRegistering Command \u001b[36m${cmd}`);

      this.cmds.push(cmd);
      this.bot.command(cmd, fn);
    }
  }

  start() {
    const domain = Deno.env.get("DOMAIN");

    if (domain) {
      log("\u001b[34mBot Listening on Port \u001b[36m8080\u001b[34m...");

      this.bot.launch({ webhook: { domain: domain, port: 8080 } });
    } else {
      log("\u001b[34mBot Listening \u001b[36m(Dev Mode)\u001b[34m...");
      this.bot.launch();
    }
  }
}

export default Bot;
