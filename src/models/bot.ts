import { Context, Telegraf } from "telegraf";

import { getArgs, log } from "../utils.ts";

interface Command {
  name: string;
  aliases?: Array<string>;
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

    this.bot = new Telegraf<Context>(token, { handlerTimeout: 300000 });

    this.bot.use(async (ctx, next) => {
      const match = ctx.text?.match(/\/([^ ]*)/);
      const command: string = match ? match[1] : "NONE";

      log(
        `\u001b[33mProcessing \u001b[36mchat=\u001b[37m${ctx.chat?.id} \u001b[36mcommand=\u001b[37m${command}`
      );
      const now = Date.now();

      if (command === "NONE" && this.currentCommand[ctx.chat!.id]) {
        const cmd = this.cmds.find(
          (v) => v.name === this.currentCommand[ctx.chat!.id]
        )!;
        await cmd.handler(ctx, ctx.text!);
        delete this.currentCommand[ctx.chat!.id];
      } else if (command !== "NONE") {
        const buildinCommand = ["start", "help"].find((v) => v === command);
        const cmd = this.cmds.find(
          (v) => v.name === command || v.aliases?.find((v2) => v2 == command)
        );

        if (!buildinCommand && !cmd && command !== "cancel") {
          ctx.reply(
            "Invalid Command. Please check /help for available commands."
          );
        } else {
          if (buildinCommand) next();

          if (command === "cancel") {
            delete this.currentCommand[ctx.chat!.id];
            await ctx.reply("Command cancelled.");
          }

          if (cmd) {
            const mesg = getArgs(ctx.text!);

            if (mesg == "") {
              this.currentCommand[ctx.chat!.id] = cmd.name;
              await ctx.reply(cmd.inputDescription);
            } else {
              await cmd.handler(ctx, mesg);
            }
          }
        }
      } else {
        ctx.reply("Invalid Input. Please check /help for available commands.");
      }

      log(
        `\u001b[32mProcessed \u001b[36mchat=\u001b[37m${
          ctx.chat?.id
        } \u001b[36mduration=\u001b[37m${Date.now() - now}ms`
      );
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
          description: `/${v} - alias of /${cmd.name}`,
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
