import { Command } from "commander";
import apiCommand from "./commands/apiCommand";
import installCommand from "./commands/installCommand";
import uiCommand from "./commands/uiCommand";
import reloadAppChart from "./manage/reloadAppChart";

//
// Define program
//

const program = new Command();

program.addHelpText(
  "before",
  "Proprietary software. Copyright Martti Laine.\n\nThis command-line utility is used internally by Shipmight.\n"
);

//
// Run service (default)
//

// It might make more sense to implement a subcommand-architecture instead of
// options per service. However, it's useful in development to be able to start
// one process which starts multiple services. Therefore we use options instead
// of subcommands.

const runCommand = program.command("run", { isDefault: true });

runCommand.option("--install");
runCommand.option("--api");
runCommand.option("--ui");

runCommand.action(async function executeRun(options) {
  try {
    if (options.install) {
      installCommand();
    }

    if (options.api) {
      apiCommand();
    }

    if (options.ui) {
      uiCommand();
    }
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
});

//
// Manage (for admin use)
//

const manageNamespace = program.command("manage").action(() => {
  console.error("please supply a subcommand");
});

manageNamespace
  .command("reload-app-chart <appChartId> <chartPath>")
  .action((arg1, arg2) =>
    reloadAppChart(arg1, arg2).catch((error) => {
      console.error(error);
      process.exit(1);
    })
  );

//
// Launch
//

program.parse(process.argv);
