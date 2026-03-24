/**
 * Custom Expo Config Plugin to add ZegoCloud Maven repository
 * to android/build.gradle automatically during prebuild.
 */
const { withProjectBuildGradle } = require("expo/config-plugins");

function addZegoMavenRepo(buildGradle) {
  const zegoRepo = `maven { url 'https://storage.zego.im/maven' }`;

  // Already added?
  if (buildGradle.includes("storage.zego.im")) {
    return buildGradle;
  }

  // Insert after jitpack (or after mavenCentral in allprojects)
  return buildGradle.replace(
    /maven\s*\{\s*url\s*'https:\/\/www\.jitpack\.io'\s*\}/,
    `maven { url 'https://www.jitpack.io' }\n    ${zegoRepo}`
  );
}

module.exports = function withZegoMaven(config) {
  return withProjectBuildGradle(config, (cfg) => {
    if (cfg.modResults.language === "groovy") {
      cfg.modResults.contents = addZegoMavenRepo(cfg.modResults.contents);
    }
    return cfg;
  });
};
