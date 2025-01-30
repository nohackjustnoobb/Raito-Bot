import {
  Context,
  Telegraf,
} from 'telegraf';

import {
  getArgs,
  log,
  sleep,
} from '../utils/utils.ts';

// 6 hours
const STATE_TIMEOUT = 21600;
// 5 minute
const STATE_CLEANUP_DURATION = 300;

interface Command {
  name: string;
  aliases?: Array<string>;
  patterns?: Array<RegExp>;
  description: string;
  inputDescription?: string;
  handler: (ctx: Context, mesg: string) => Promise<void> | void;
}

interface State {
  currentCommand?: string;
}

class Bot {
  bot: Telegraf<Context>;
  cmds: Array<Command> = [
    {
      name: "cancel",
      description: "cancel current command",
      handler: async (ctx, _) => {
        await ctx.reply("Command cancelled.");
      },
    },
  ];
  state: { [chatId: string]: State & { updateTime: number } } = {};

  constructor() {
    const token = Deno.env.get("BOT_TOKEN");
    if (!token) throw Error("No token found.");

    this.bot = new Telegraf<Context>(token, { handlerTimeout: 1_000_000 });

    this.bot.use(this.mainHandler.bind(this));
    this.bot.start(this.helpHandler.bind(this));
    this.bot.help(this.helpHandler.bind(this));
  }

  register(cmd: Command) {
    this.cmds.splice(this.cmds.length - 1, 0, cmd);

    log(`\u001b[34mRegistering Command \u001b[36m${cmd.name}`);

    for (const alias of cmd.aliases || [])
      log(
        `\u001b[34mRegistering Alias \u001b[36m${alias} \u001b[34m-> \u001b[36m${cmd.name}`
      );
  }

  updateState(chatId: string, state: State | null | undefined = undefined) {
    if (!state || Object.keys(state).length === 0) delete this.state[chatId];

    const stateWithDate = { updateTime: Date.now(), ...state };
    this.state[chatId] = stateWithDate;
  }

  async timerWrapper(
    now: number,
    chatId: number,
    func: () => Promise<void> | void
  ) {
    await func();
    log(
      `\u001b[32mProcessed \u001b[36mchat=\u001b[37m${chatId} \u001b[36mduration=\u001b[37m${
        Date.now() - now
      }ms`
    );
  }

  async helpHandler(ctx: Context) {
    const mesgs = ["Available commands:\n"];

    for (const cmd of this.cmds) {
      mesgs.push(
        `/${cmd.name} - ${cmd.description}`,
        ...(cmd.aliases || []).map((v) => `/${v} - alias of /${cmd.name}`)
      );
      mesgs.push(mesgs.pop() + "\n");
    }

    await ctx.reply(mesgs.join("\n"));
  }

  mainHandler(ctx: Context, next: () => void) {
    let text = ctx.text;
    if (ctx.callbackQuery) text = (ctx.callbackQuery as { data: string }).data;

    const match = text?.match(/^\/([^ ]*)/);
    const command: string = match ? match[1] : "NONE";

    log(
      `\u001b[33mProcessing \u001b[36mchat=\u001b[37m${ctx.chat?.id} \u001b[36mcommand=\u001b[37m${command}`
    );
    const now = Date.now();
    const chatId = String(ctx.chat!.id);

    if (command === "NONE") {
      if (this.state[chatId] && this.state[chatId].currentCommand) {
        const cmd = this.cmds.find(
          (v) => v.name === this.state[chatId].currentCommand
        )!;

        this.timerWrapper(now, ctx.chat!.id, () => cmd.handler(ctx, text!));
        this.updateState(chatId);
      } else {
        const cmd = this.cmds.find(
          (v) => v.patterns && v.patterns.find((v2) => text!.match(v2))
        );

        if (cmd) {
          this.timerWrapper(now, ctx.chat!.id, () => cmd.handler(ctx, text!));
        } else {
          this.timerWrapper(now, ctx.chat!.id, async () => {
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

      if (!buildinCommand && !cmd) {
        this.timerWrapper(now, ctx.chat!.id, async () => {
          await ctx.reply(
            "Invalid Command. Please check /help for available commands."
          );
        });
      } else {
        this.updateState(chatId);

        if (buildinCommand) return this.timerWrapper(now, ctx.chat!.id, next);

        const mesg = getArgs(text!);

        if (mesg == "" && cmd!.inputDescription) {
          this.updateState(chatId, { currentCommand: cmd!.name });
          this.timerWrapper(now, ctx.chat!.id, async () => {
            await ctx.reply(cmd!.inputDescription!);
          });
        } else {
          this.timerWrapper(now, ctx.chat!.id, () => cmd!.handler(ctx, mesg));
        }
      }
    }
  }

  async stateCleaner() {
    while (true) {
      const expiredState = [];
      const now = Date.now();
      for (const [chatId, state] of Object.entries(this.state))
        if (now - state.updateTime > STATE_TIMEOUT * 1000)
          expiredState.push(chatId);

      expiredState.forEach((id) => delete this.state[id]);

      await sleep(STATE_CLEANUP_DURATION * 1000);
    }
  }

  async start() {
    const domain = Deno.env.get("DOMAIN");

    const convertedCmds = this.cmds.map((v) => ({
      command: v.name,
      description: v.description,
    }));

    try {
      await this.bot.telegram.setMyCommands(convertedCmds);
    } catch {
      log("\u001b[31mFailed to Set Commands");
    }
    this.stateCleaner();

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
