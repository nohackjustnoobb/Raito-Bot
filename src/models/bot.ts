import { Telegraf } from 'telegraf';

function log(mesg: string) {
  console.log(`%c${new Date().toISOString()}`, "color: gray", mesg);
}

class Bot {
  bot: Telegraf;
  cmds: Array<{ command: string; description: string }> = [];

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

      if (
        ["start", "help", ...this.cmds.map((v) => v.command)].find(
          (v) => v === command
        )
      ) {
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
      ctx.reply(
        [
          "Available commands:",
          ...this.cmds.map((v) => `/${v.command} - ${v.description}`),
        ].join("\n")
      );
    };
    this.bot.start(replyHelpTextIfExists);
    this.bot.help(replyHelpTextIfExists);
  }

  register(
    cmds: string | Array<string>,
    description: string,
    fn: Parameters<typeof this.bot.command>[1]
  ) {
    const commands = cmds instanceof Array ? cmds : [cmds];
    for (let i = 0; i < commands.length; i++) {
      const cmd = commands[i];
      if (i == 0) log(`\u001b[34mRegistering Command \u001b[36m${cmd}`);
      else
        log(
          `\u001b[34mRegistering Alias \u001b[36m${cmd} \u001b[34m-> \u001b[36m${commands[0]}`
        );

      this.cmds.push({
        command: cmd,
        description: i == 0 ? description : `alias of /${commands[0]}`,
      });
      this.bot.command(cmd, fn);
    }
  }

  async start() {
    const domain = Deno.env.get("DOMAIN");
    await this.bot.telegram.setMyCommands(this.cmds);

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
