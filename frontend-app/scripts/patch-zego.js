/**
 * Post-install script to patch ZegoCloud SDK for Expo Router compatibility.
 *
 * ZegoCloud SDK calls navigation.navigate() internally which doesn't work with
 * Expo Router's file-based routing. This script patches the SDK to use
 * global.__zegoExpoRouterPush() instead.
 *
 * Patches BOTH lib/module/ and lib/commonjs/ builds.
 *
 * Run: node scripts/patch-zego.js
 */
const fs = require("fs");
const path = require("path");

const ZEGO_PKG = path.join(
  __dirname,
  "..",
  "node_modules",
  "@zegocloud",
  "zego-uikit-prebuilt-call-rn",
  "lib"
);

// Patch both module and commonjs builds
const BUILDS = ["module", "commonjs"];

const FILE_PATCHES = [
  {
    relativePath: path.join("services", "invitation.js"),
    replacements: [
      {
        from: `navigation.navigate('ZegoUIKitPrebuiltCallWaitingScreen', {`,
        to: `(global.__zegoExpoRouterPush||navigation.navigate.bind(navigation))('ZegoUIKitPrebuiltCallWaitingScreen', {`,
      },
      {
        from: `navigation.navigate('ZegoUIKitPrebuiltCallInCallScreen', {`,
        to: `(global.__zegoExpoRouterPush||navigation.navigate.bind(navigation))('ZegoUIKitPrebuiltCallInCallScreen', {`,
      },
    ],
  },
  {
    relativePath: path.join(
      "call_invitation",
      "components",
      "ZegoCallInvitationDialog.js"
    ),
    replacements: [
      {
        from: `navigation.navigate('ZegoUIKitPrebuiltCallInCallScreen', {`,
        to: `(global.__zegoExpoRouterPush||navigation.navigate.bind(navigation))('ZegoUIKitPrebuiltCallInCallScreen', {`,
      },
    ],
  },
  {
    relativePath: path.join(
      "call_invitation",
      "pages",
      "ZegoCallInvitationWaiting.js"
    ),
    replacements: [
      {
        from: `navigation.navigate('ZegoUIKitPrebuiltCallInCallScreen', {`,
        to: `(global.__zegoExpoRouterPush||navigation.navigate.bind(navigation))('ZegoUIKitPrebuiltCallInCallScreen', {`,
      },
    ],
  },
];

let totalPatches = 0;

for (const build of BUILDS) {
  for (const { relativePath, replacements } of FILE_PATCHES) {
    const file = path.join(ZEGO_PKG, build, relativePath);

    if (!fs.existsSync(file)) {
      console.warn(`[patch-zego] File not found: ${file}`);
      continue;
    }

    let content = fs.readFileSync(file, "utf8");
    let patchedInFile = 0;

    for (const { from, to } of replacements) {
      if (content.includes(to)) {
        // Already patched
        continue;
      }
      if (content.includes(from)) {
        content = content.replaceAll(from, to);
        patchedInFile++;
        totalPatches++;
      }
    }

    if (patchedInFile > 0) {
      fs.writeFileSync(file, content, "utf8");
      console.log(
        `[patch-zego] Patched ${patchedInFile} occurrence(s) in ${build}/${relativePath}`
      );
    }
  }
}

console.log(`[patch-zego] Total patches applied: ${totalPatches}`);
