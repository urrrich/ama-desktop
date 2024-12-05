const {
  app,
  BrowserWindow,
  Menu,
  shell,
  dialog,
  ipcMain,
} = require("electron");
const log = require("electron-log");
const ProgressBar = require("electron-progressbar");
// import Store = require("electron-store");
const pkg = require("electron-updater");
const path = require("path");
// import url = require("url");

// const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

//Command option to disable hardware acceleration
if (process.argv.indexOf("--disable-acceleration") !== -1) {
  app.disableHardwareAcceleration();
}

// const store = new Store();
const { autoUpdater } = pkg;

const isMac = process.platform === "darwin";
const isWin = process.platform === "win32";

const silentUpdate = false;
autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = "error";
autoUpdater.logger.transports.console.level = "error";
autoUpdater.autoDownload = silentUpdate;
autoUpdater.autoInstallOnAppQuit = silentUpdate;

if (!app.isPackaged) {
  Object.defineProperty(app, "isPackaged", {
    get() {
      return true;
    },
  });
  autoUpdater.updateConfigPath = path.join(__dirname, "../dev-app-update.yml");
}

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 600,
    webPreferences: {
      preload: `${__dirname}/preload.js`,
      // nodeIntegration: true, // 开启渲染页面的node环境
      contextIsolation: true,
      webviewTag: true, // 开启webview支持
    },
    show: false,
  });

  mainWindow.loadURL("http://211.159.155.162/");
  // mainWindow.loadURL("http://localhost:8080/");

  mainWindow.webContents.setWindowOpenHandler((event) => {
    shell.openExternal(event.url);
    return { action: "deny" };
  });

  // mainWindow.webContents.openDevTools();

  mainWindow.maximize();
  mainWindow.show();
}

console.log(app.getName(), " = ", app.getVersion());

autoUpdater.on("error", (e) => log.error("@error@\n", e));
autoUpdater.on("update-available", (a, b) => {
  if (silentUpdate) return;

  dialog
    .showMessageBox({
      type: "question",
      buttons: ["确定", "取消"],
      title: "升级提醒",
      message: "是否要下载并安装新版本？",
      detail: "下载后，应用程序将自动重新启动以完成更新",
    })
    .then((result) => {
      if (result.response === 0) {
        autoUpdater.downloadUpdate();

        var progressBar = new ProgressBar({
          title: "升级",
          text: "正在下载...",
        });

        function reportUpdateError(e) {
          progressBar.detail = "升级失败：" + (e && e.message ? e.message : e);
          progressBar._window.setClosable(true);
        }

        autoUpdater.once("error", (e) => {
          if (progressBar._window != null) {
            reportUpdateError(e);
          } else {
            progressBar.on("ready", function () {
              reportUpdateError(e);
            });
          }
        });

        var firstTimeProg = true;

        autoUpdater.once("download-progress", (d) => {
          //On mac, download-progress event is not called, so the indeterminate progress will continue until download is finished
          var percent = d.percent;

          if (percent) {
            percent = Math.round(percent * 100) / 100;
          }

          if (firstTimeProg) {
            firstTimeProg = false;
            progressBar.close();

            progressBar = new ProgressBar({
              indeterminate: false,
              title: "升级",
              text: "正在下载...",
              detail: `${percent}% ...`,
              initialValue: percent,
            });

            progressBar
              .on("completed", function () {
                progressBar.detail = "下载完成";
              })
              .on("aborted", function (value) {})
              .on("progress", function (value) {
                progressBar.detail = `${value}% ...`;
              })
              .on("ready", function () {
                //InitialValue doesn't set the UI! so this is needed to render it correctly
                progressBar.value = percent;
              });
          } else {
            progressBar.value = percent;
          }
        });

        autoUpdater.once("update-downloaded", (info) => {
          if (!progressBar.isCompleted()) {
            progressBar.close();
          }

          // Ask user to update the app
          dialog
            .showMessageBox({
              type: "question",
              buttons: ["安装", "稍后再说"],
              defaultId: 0,
              message: "新版本已经下载完毕",
              detail: "将在下次重新启动应用程序时安装",
            })
            .then((result) => {
              if (result.response === 0) {
                setTimeout(() => autoUpdater.quitAndInstall(), 1);
              }
            });
        });
      } else if (result.response === 2) {
        //save in settings don't check for updates
        // store.set("dontCheckUpdates", true);
      }
    });
});

function addApiHook(name, callback) {
  ipcMain.on("postMessage", async (event, message) => {
    const { bridgeName, cid, data } = message;
    if (name == bridgeName) {
      console.log(name + " invoke " + cid);
      const successNotify = (data) => {
        console.log(name + " successNotify " + cid);
        event.reply("receiveMessage", {
          bridgeName,
          cid,
          data,
        });
      };
      const errorNotify = (error) => {
        console.log(name + " errorNotify " + cid, error);
        event.reply("receiveMessage", {
          bridgeName,
          cid,
          error,
        });
      };
      callback(data, successNotify, errorNotify);
    }
  });
}

app.whenReady().then(() => {
  createWindow();

  let updateNoAvailAdded = false;

  function checkForUpdatesFn() {
    console.log("checkForUpdatesFn");
    autoUpdater.checkForUpdates();
    // store.set("dontCheckUpdates", false);

    if (!updateNoAvailAdded) {
      updateNoAvailAdded = true;
      autoUpdater.on("update-not-available", (info) => {
        dialog.showMessageBox({
          type: "info",
          title: "没有可用升级",
          message: "当前版本已经是最新版本",
        });
      });
    }
  }

  if (isMac) {
    let template = [
      {
        label: app.name,
        submenu: [
          {
            label: "访问网页版",
            click() {
              shell.openExternal("https://askmanyai.co");
            },
          },
          {
            label: "检查更新",
            click: checkForUpdatesFn,
          },
          {
            label: "关于",
            role: "about",
          },
          { type: "separator" },
          { label: "退出", role: "quit" },
        ],
      },
    ];

    const menuBar = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menuBar);
  } //hide  menubar in win/linux
  else {
    Menu.setApplicationMenu(null);
  }

  // if (!store.get("dontCheckUpdates")) {
  autoUpdater.checkForUpdates();
  // }

  addApiHook("showAbout", () => {
    app.showAboutPanel();
  });
  addApiHook("openWeb", () => {
    shell.openExternal("https://askmanyai.co");
  });
  addApiHook("checkUpdate", () => {
    checkForUpdatesFn();
  });

  app.on("activate", function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", function () {
  if (process.platform !== "darwin") app.quit();
});
