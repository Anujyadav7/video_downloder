const fs = require("fs");
const path = require("path");

// Clean up ytdl-core temporary player script files
const projectRoot = process.cwd();

fs.readdirSync(projectRoot).forEach((file) => {
  if (file.match(/^\d+-player-script\.js$/)) {
    const filePath = path.join(projectRoot, file);
    try {
      fs.unlinkSync(filePath);
      console.log(`Deleted: ${file}`);
    } catch (err) {
      console.error(`Failed to delete ${file}:`, err.message);
    }
  }
});

console.log("Cleanup complete!");
