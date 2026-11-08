import fs from "fs";
import path from "path";

const BUILD_FILE = path.join(__dirname, ".build-number");

function getBuildNumber() {
  if (process.env.EXPO_BUILD === "true") {
    let build = 1;

    if (fs.existsSync(BUILD_FILE)) {
      build = Number(fs.readFileSync(BUILD_FILE, "utf8")) + 1;
    }

    fs.writeFileSync(BUILD_FILE, String(build));
    return build;
  }

  // 👇 For expo start / dev mode
  if (fs.existsSync(BUILD_FILE)) {
    return Number(fs.readFileSync(BUILD_FILE, "utf8"));
  }

  return 1;
}

export default ({ config }) => {
  const buildNumber = getBuildNumber();

  console.log("🔢 Build Number:", buildNumber);

  return {
    ...config,
    /*
      1.0.0 is spent.

      App Store Connect closes a version "train" once a build under it has
      been approved, and 1.0.0 had one from May. Every further upload under
      it is rejected with 90186 "the train version is closed" and 90062
      "must contain a higher version" - and a higher BUILD number does not
      help, because Apple compares CFBundleShortVersionString, which is this
      field.

      1.0.1 specifically: the server's own mobile-app config already names
      1.0.1 as the expected version, so the app and the force-update check
      agree. That check is off today (forceUpdate: false), but when it is
      switched on, this is the build that passes and 1.0.0 is the one told
      to update.
    */
    version: "1.0.1",
    android: {
      ...config.android,
      versionCode: buildNumber,
    },
    ios: {
      ...config.ios,
      buildNumber: String(buildNumber),
    },
  };
};
