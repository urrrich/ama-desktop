# 桌面客户端

node 版本 20

vim .npmrc

```
registry=https://registry.npmmirror.com
;electron_mirror=https://registry.npmmirror.com/mirrors/electron/
;registry=https://npmmirror.com
electron_mirror=https://npmmirror.com/mirrors/electron/
electron_custom_dir={{ version }}
```

windows 签名

```
signtool sign /a /tr http://rfc3161timestamp.globalsign.com/advanced /td SHA256 c:/path/to/your/file.exe
```

## 项目说明

为开发部分 web 无法实现的功能，提供接口给 web 端调用。

因此该项目只有 main 进程，renderer 进程只供测试接口，不做打包。

## 开发和打包

```bash
npm install
npm run dev
# build
npm run build
```

## 接口说明

在`expose.js`中实现方法，然后在`main.js`通过`addApiHook`注册

```javascript
// expose.js
export const apiRequest = (params, success, error) => {
  // 具体实现逻辑
};

// main.js
addApiHook("request", apiRequest);
```

| 接口名称    | 备注                 |
| ----------- | -------------------- |
| request     | 请求                 |
| getCookie   | 获取 webview cookies |
| setCookie   | 设置 webview cookies |
| clearCookie | 清除 cookies         |
