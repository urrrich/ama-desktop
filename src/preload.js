const { contextBridge, ipcRenderer } = require("electron");

let cid = 0;
const callbacks = {};

ipcRenderer.on("receiveMessage", (_, message) => {
  const { data, cid, error } = message;
  // 如果存在方法名，则调用对应函数
  if (typeof cid === "number" && cid >= 1) {
    if (typeof error !== "undefined") {
      callbacks[cid](error);
      delete callbacks[cid];
    } else if (callbacks[cid]) {
      callbacks[cid](null, data);
      delete callbacks[cid];
    } else {
      throw new Error("Invalid callback id");
    }
  } else {
    throw new Error("message format error");
  }
});
// 注册 nativeBridge
contextBridge.exposeInMainWorld("electronAPI", {
  getPath(...args) {
    // return path.join(__dirname, ...args);
  },
  invoke(bridgeName, data, callback) {
    // 如果不存在方法名或不为字符串，则提示调用失败
    if (typeof bridgeName !== "string") {
      throw new Error("Invoke failed!");
    }
    // 与 Native 的通信信息
    const message = { bridgeName };
    if (typeof data !== "undefined" || data !== null) {
      message.data = data;
    }
    if (typeof callback !== "function") {
      callback = () => null;
    }
    cid = cid + 1;
    // 存储回调函数
    callbacks[cid] = callback;
    message.cid = cid;
    ipcRenderer.send("postMessage", message);
  },
});
