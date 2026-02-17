# Temporary Files Cleanup

## Problem

The `@distube/ytdl-core` library creates temporary player script files in the project root directory with names like:

- `1771218467036-player-script.js`
- `1771218624376-player-script.js`
- etc.

These files are created during YouTube video processing and are not automatically cleaned up.

## Solution

### Automatic Prevention

The `.gitignore` file has been updated to exclude these files from version control:

```gitignore
# ytdl-core temporary files
*-player-script.js
[0-9]*-player-script.js
```

### Manual Cleanup

Run the cleanup script to remove all existing temporary files:

```bash
npm run cleanup
```

This will:

1. Scan the project root directory
2. Find all files matching the pattern `[numbers]-player-script.js`
3. Delete them
4. Print a confirmation message

### What Gets Deleted

The script only deletes files that match this exact pattern:

- Starts with one or more digits
- Followed by `-player-script.js`
- Located in the project root directory

Examples:

- ✅ `1771218467036-player-script.js` - DELETED
- ✅ `123-player-script.js` - DELETED
- ❌ `my-player-script.js` - KEPT (doesn't start with numbers)
- ❌ `src/player-script.js` - KEPT (not in root directory)

## Why This Happens

The `@distube/ytdl-core` library:

1. Downloads YouTube player scripts to extract video information
2. Saves them temporarily with timestamp-based names
3. Should clean them up but sometimes doesn't
4. Leaves them in the current working directory (project root)

## Prevention

These files are now:

1. ✅ Ignored by Git (won't be committed)
2. ✅ Can be manually cleaned with `npm run cleanup`
3. ✅ Don't affect application functionality

## Automation

If you want to automatically clean these files on every dev server start, you can modify `package.json`:

```json
{
  "scripts": {
    "dev": "node scripts/cleanup-temp-files.js && next dev"
  }
}
```

**Note:** This is optional and may slow down dev server startup slightly.

## Summary

- **Problem:** ytdl-core creates temporary files
- **Solution:** Cleanup script + .gitignore
- **Command:** `npm run cleanup`
- **Frequency:** Run manually when needed
- **Impact:** None on functionality
