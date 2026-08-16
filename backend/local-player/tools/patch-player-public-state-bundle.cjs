const { readFileSync, writeFileSync } = require("node:fs");

const playerPublicNumberFields = Object.freeze([
  "walkSpeed",
  "runSpeed",
  "runAcceleration",
  "jumpPower",
  "jumpSpeedFactor",
  "jumpAccelerationFactor",
  "doubleJumpPower",
  "crouchSpeed",
  "crouchAcceleration",
  "flySpeed",
  "flyAcceleration",
  "swimAcceleration",
  "swimSpeed",
  "walkAcceleration",
]);

function patchPlayerPublicStateBundle(path) {
  const source = readFileSync(path, "utf8");
  writeFileSync(path, patchPlayerPublicStateSource(source));
}

function patchPlayerPublicStateSource(source) {
  const eol = source.includes("\r\n") ? "\r\n" : "\n";
  const replace = (needle, replacement, label) => {
    const next = source.replace(needle, replacement);
    if (next === source) throw new Error(`Unable to patch player public state bundle: ${label}`);
    source = next;
  };
  replace(
    "  if (command.inputCameraAngle !== void 0) player.inputCameraAngle = command.inputCameraAngle;",
    `  if (command.inputCameraAngle !== void 0) player.inputCameraAngle = command.inputCameraAngle;${eol}${playerPublicNumberFields.map(field => `  if (command.${field} !== void 0) player.${field} = command.${field};`).join(eol)}`,
    "apply player public fields",
  );
  replace(
    "    inputCameraAngle: command.inputCameraAngle\n  });",
    `    inputCameraAngle: command.inputCameraAngle,${eol}${playerPublicNumberFields.map(field => `    ${field}: command.${field}`).join(`,${eol}`)}${eol}  });`,
    "copy player public fields",
  );
  replace(
    "    inputCameraAngle: player.inputCameraAngle\n  });",
    `    inputCameraAngle: player.inputCameraAngle,${eol}${playerPublicNumberFields.map(field => `    ${field}: player.${field}`).join(`,${eol}`)}${eol}  });`,
    "snapshot player public fields",
  );
  replace(
    "    inputCameraAngle: player.inputCameraAngle\n  });",
    `    inputCameraAngle: player.inputCameraAngle,${eol}${playerPublicNumberFields.map(field => `    ${field}: player.${field}`).join(`,${eol}`)}${eol}  });`,
    "snapshot registry player public fields",
  );
  replace(
    "    playerState.id = player.playerId;\n    target.state.players.push(playerState);",
    `    playerState.id = player.playerId;${eol}${playerPublicNumberFields.map(field => `    if (player.${field} !== void 0) playerState.${field} = player.${field};`).join(eol)}${eol}    target.state.players.push(playerState);`,
    "write public player schema fields",
  );
  return source;
}

module.exports = { patchPlayerPublicStateBundle, patchPlayerPublicStateSource, playerPublicNumberFields };
