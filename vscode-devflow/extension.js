const vscode = require("vscode");

function activate(context) {
  const openDashboard = vscode.commands.registerCommand("devflow.openDashboard", () => {
    const url = vscode.workspace.getConfiguration("devflow").get("url", "http://localhost:4000");
    vscode.env.openExternal(vscode.Uri.parse(`${url}/`));
  });

  const healthCheck = vscode.commands.registerCommand("devflow.healthCheck", async () => {
    const url = vscode.workspace.getConfiguration("devflow").get("url", "http://localhost:4000");
    try {
      const response = await fetch(`${url}/api/health`);
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      const body = await response.json();
      vscode.window.showInformationMessage(`DevFlow AI is ${body.status}.`);
    } catch (error) {
      vscode.window.showErrorMessage(`DevFlow AI health check failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  });

  context.subscriptions.push(openDashboard, healthCheck);
}

function deactivate() {}

module.exports = { activate, deactivate };
