const { FusesPlugin } = require("@electron-forge/plugin-fuses");
const { FuseV1Options, FuseVersion } = require("@electron/fuses");

module.exports = {
  packagerConfig: {
    asar: true,
    name: "Slipstream Coach",
    executableName: "slipstream-coach",
  },
  makers: [
    { name: "@electron-forge/maker-zip", platforms: ["darwin", "win32"] },
    { name: "@electron-forge/maker-deb", config: {} },
    { name: "@electron-forge/maker-dmg", platforms: ["darwin"] },
    { name: "@electron-forge/maker-squirrel", config: { name: "slipstream_coach" } },
  ],
  plugins: [
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
};
