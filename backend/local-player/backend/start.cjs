process.env.BOX3_PORT ||= process.env.PORT || "4317";
process.env.BOX3_WORLD_MANIFEST ||= "world-bedwars.json";

require("./box3-server.cjs");
