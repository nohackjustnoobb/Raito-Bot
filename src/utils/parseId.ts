import { Context } from "telegraf";

async function parseWITHSUMMER(ctx: Context, link: string) {
  const reply = ctx.reply("Fetching Webpage...");

  let fetched = false;
  try {
    let resp = await fetch(link);
    if (!resp.ok) throw new Error("Failed to Fetch the Webpage.");

    let match = (await resp.text()).match(/var\ nexturl=".*\/(.*)";/);
    if (!match) throw new Error("Failed to Parse the Id.");

    const page = match[1];

    match = link.match(/([^?#]*)/);
    if (!match) throw new Error("Invalid Link.");

    resp = await fetch(`${match[1]}/${page}`);
    if (!resp.ok) throw new Error("Failed to Fetch the Webpage.");
    fetched = true;

    match = (await resp.text()).match(/車號n：(\d\d*)/);
    if (!match) throw new Error("Failed to Parse the Id.");

    const finishedReply = await reply;
    await ctx.telegram.editMessageText(
      finishedReply.chat.id,
      finishedReply.message_id,
      undefined,
      `Id: ${match[1]}`,
      {
        reply_markup: {
          inline_keyboard: [[{ text: "Get", callback_data: `/n ${match[1]}` }]],
        },
      }
    );
  } catch {
    const finishedReply = await reply;
    await ctx.telegram.editMessageText(
      finishedReply.chat.id,
      finishedReply.message_id,
      undefined,
      fetched ? "Failed to Parse the Id." : "Failed to Fetch the Webpage."
    );
  }
}

async function parseMAIMAIPRO(ctx: Context, link: string) {
  const reply = ctx.reply("Fetching Webpage...");

  let fetched = false;
  try {
    let match = link.match(/([^?#]*)/);
    if (!match) throw new Error("Invalid Link.");

    const resp = await fetch(`${match[1]}/1`);
    if (!resp.ok) throw new Error("Failed to Fetch the Webpage.");
    fetched = true;

    match = (await resp.text()).match(/nhentai net：(\d*)/);
    if (!match) throw new Error("Failed to Parse the Id.");

    const finishedReply = await reply;
    await ctx.telegram.editMessageText(
      finishedReply.chat.id,
      finishedReply.message_id,
      undefined,
      `Id: ${match[1]}`,
      {
        reply_markup: {
          inline_keyboard: [[{ text: "Get", callback_data: `/n ${match[1]}` }]],
        },
      }
    );
  } catch {
    const finishedReply = await reply;
    await ctx.telegram.editMessageText(
      finishedReply.chat.id,
      finishedReply.message_id,
      undefined,
      fetched ? "Failed to Parse the Id." : "Failed to Fetch the Webpage."
    );
  }
}

async function parseId(ctx: Context, mesg: string) {
  const match = mesg.match(
    /(https?):\/\/([A-Za-z0-9\-\.]*\.[a-zA-Z]*)\/([^ ]*)/
  );

  if (!match) {
    await ctx.reply("Invalid Input. The input must be a link.");
    return;
  }

  const link = `${match[1]}://${match[2]}/${match[3]}`;
  switch (match[2]) {
    case "www.with-summer.com":
    case "furnishwe.com":
    case "www.open-selfless.com":
      await parseWITHSUMMER(ctx, link);
      break;
    case "picread.net":
    case "maimai.pro":
      await parseMAIMAIPRO(ctx, link);
      break;
    default:
      await ctx.reply(
        "Unsupported Site. Please report this site on the GitHub issue or create a pull request to support it. Check /info for the Github repository."
      );
      break;
  }
}

export default parseId;
