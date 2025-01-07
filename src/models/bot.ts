import {
  Context,
  Telegraf,
} from 'telegraf';

import {
  getArgs,
  log,
} from '../utils.ts';

interface Command {
  name: string;
  aliases?: Array<string>;
  pattern?: Array<RegExp>;
  description: string;
  inputDescription: string;
  handler: (ctx: Context, mesg: string) => Promise<void> | void;
}

class Bot {
  bot: Telegraf<Context>;
  cmds: Array<Command> = [];
  currentCommand: { [chatId: string]: string } = {};

  constructor() {
    const token = Deno.env.get("BOT_TOKEN");
    if (!token) throw Error("No token found.");

    this.bot = new Telegraf<Context>(token, { handlerTimeout: 1_000_000 });

    const timerWrapper = async (
      now: number,
      chatId: number,
      func: () => Promise<void> | void
    ) => {
      await func();
      log(
        `\u001b[32mProcessed \u001b[36mchat=\u001b[37m${chatId} \u001b[36mduration=\u001b[37m${Date.now() - now
        }ms`
      );
    };

    this.bot.use(async (ctx, next) => {
      const match = ctx.text?.match(/^\/([^ ]*)/);
      const command: string = match ? match[1] : "NONE";

      log(
        `\u001b[33mProcessing \u001b[36mchat=\u001b[37m${ctx.chat?.id} \u001b[36mcommand=\u001b[37m${command}`
      );
      const now = Date.now();

      if (command === "NONE") {
        if (this.currentCommand[ctx.chat!.id]) {
          const cmd = this.cmds.find(
            (v) => v.name === this.currentCommand[ctx.chat!.id]
          )!;

          timerWrapper(now, ctx.chat!.id, () => cmd.handler(ctx, ctx.text!));
          delete this.currentCommand[ctx.chat!.id];
        } else {
          const cmd = this.cmds.find(v => v.pattern && v.pattern.find(v2 => ctx.text!.match(v2)))

          if (cmd) {
            timerWrapper(now, ctx.chat!.id, () => cmd.handler(ctx, ctx.text!));
          } else {
            timerWrapper(now, ctx.chat!.id, async () => {
              await ctx.reply(
                "Invalid Input. Please check /help for available commands."
              );
            });
          }
        }
      } else {
        const buildinCommand = ["start", "help"].find((v) => v === command);
        const cmd = this.cmds.find(
          (v) => v.name === command || v.aliases?.find((v2) => v2 == command)
        );

        if (!buildinCommand && !cmd && command !== "cancel") {
          timerWrapper(now, ctx.chat!.id, async () => {
            await ctx.reply(
              "Invalid Command. Please check /help for available commands."
            );
          });
        } else {
          delete this.currentCommand[ctx.chat!.id];

          if (buildinCommand) timerWrapper(now, ctx.chat!.id, next);

          if (command === "cancel") {
            timerWrapper(now, ctx.chat!.id, async () => {
              await ctx.reply("Command cancelled.");
            });
          }

          if (cmd) {
            const mesg = getArgs(ctx.text!);

            if (mesg == "") {
              this.currentCommand[ctx.chat!.id] = cmd.name;
              await ctx.reply(cmd.inputDescription);
            } else {
              timerWrapper(now, ctx.chat!.id, () => cmd.handler(ctx, mesg));
            }
          }
        }
      }
    });

    const replyHelpTextIfExists = (ctx: { reply: (arg0: string) => void }) => {
      const mesgs = ["Available commands:\n"];

      for (const cmd of this.cmds) {
        mesgs.push(
          `/${cmd.name} - ${cmd.description}`,
          ...(cmd.aliases || []).map((v) => `/${v} - alias of /${cmd.name}`)
        );
        mesgs.push(mesgs.pop() + "\n");
      }

      mesgs.push("/cancel - cancel current command");

      ctx.reply(mesgs.join("\n"));
    };
    this.bot.start(replyHelpTextIfExists);
    this.bot.help(replyHelpTextIfExists);
  }

  register(cmd: Command) {
    this.cmds.push(cmd);

    log(`\u001b[34mRegistering Command \u001b[36m${cmd.name}`);

    for (const alias of cmd.aliases || [])
      log(
        `\u001b[34mRegistering Alias \u001b[36m${alias} \u001b[34m-> \u001b[36m${cmd.name}`
      );
  }

  async start() {
    const domain = Deno.env.get("DOMAIN");
    const convertedCmds = [];
    for (const cmd of this.cmds) {
      convertedCmds.push(
        {
          command: cmd.name,
          description: cmd.description,
        },
        ...(cmd.aliases || []).map((v) => ({
          command: v,
          description: `alias of /${cmd.name}`,
        }))
      );
    }
    convertedCmds.push({
      command: "cancel",
      description: "cancel current command",
    });

    await this.bot.telegram.setMyCommands(convertedCmds);

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
