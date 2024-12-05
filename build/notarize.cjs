require("dotenv").config();
const { notarize } = require("@electron/notarize");

exports.default = async function notarizing(context) {
  const { electronPlatformName, appOutDir } = context;
  const appName = context.packager.appInfo.productFilename;

  if (electronPlatformName !== "darwin") {
    return;
  }

  return await notarize({
    tool: "notarytool",
    appBundleId: "com.floatmiracle.askmanyai.desktop",
    appPath: `${appOutDir}/${appName}.app`,
    appleId: "zhangyiming@floatmiracle.com",
    appleIdPassword: "yorf-tmvc-kcpf-bgcn",
    teamId: "SK8V5TAN28",
  });
};
