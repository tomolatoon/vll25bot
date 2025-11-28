import {
  Client,
  GatewayIntentBits,
  Interaction,
  REST,
  Routes,
  Partials,
} from "discord.js";
import { config } from "dotenv";
import { countChannelCommand } from "./commands/countChannel";
import { countForumCommand } from "./commands/countForum";
import { countUserCommand } from "./commands/countUser";

config();

const commands = [
  countChannelCommand.data.toJSON(),
  countForumCommand.data.toJSON(),
  countUserCommand.data.toJSON(),
];

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Channel, Partials.Message],
});

client.once("ready", async () => {
  console.log(`ログイン完了: ${client.user?.tag}`);

  const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN!);

  try {
    console.log("スラッシュコマンドを登録中...");

    await rest.put(Routes.applicationCommands(client.user!.id), {
      body: commands,
    });

    console.log("スラッシュコマンドの登録完了！");
  } catch (error) {
    console.error("スラッシュコマンドの登録に失敗しました:", error);
  }
});

client.on("interactionCreate", async (interaction: Interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const { commandName } = interaction;

  try {
    switch (commandName) {
      case "count-channel":
        await countChannelCommand.execute(interaction);
        break;
      case "count-forum":
        await countForumCommand.execute(interaction);
        break;
      case "count-user":
        await countUserCommand.execute(interaction);
        break;
      default:
        await interaction.reply({
          content: "不明なコマンドです。",
          ephemeral: true,
        });
    }
  } catch (error) {
    console.error(`コマンド実行エラー (${commandName}):`, error);
    const errorMessage = "コマンドの実行中にエラーが発生しました。";

    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ content: errorMessage, ephemeral: true });
    } else {
      await interaction.reply({ content: errorMessage, ephemeral: true });
    }
  }
});

const token = process.env.DISCORD_TOKEN;
if (!token) {
  console.error("DISCORD_TOKENが設定されていません。.envファイルを確認してください。");
  process.exit(1);
}

client.login(token);
