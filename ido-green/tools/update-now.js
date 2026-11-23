#!/usr/bin/env node
/**
 * Refreshes the "github" entry in www/data/now.json from public GitHub activity.
 *
 * Run on a schedule by .github/workflows/now.yml. The homepage reads now.json
 * from raw.githubusercontent.com, so a commit from that workflow is live within
 * minutes without a deploy. Only the "github" field is touched: "building" and
 * "reading" are written by hand and left exactly as they are.
 *
 * Deliberately stores no commit messages or PR titles - just the repo, the kind
 * of activity and when - so nothing private can leak through a public event.
 */
const fs = require('fs');
const path = require('path');

const USER = 'greenido';
const FILE = path.join(__dirname, '..', 'www', 'data', 'now.json');

// Event type -> a short verb, or null to skip. Stars, forks and comments are
// noise next to "what is being built"; everything else here is real work.
function describe(event) {
  const p = event.payload || {};
  switch (event.type) {
    case 'PushEvent': return 'Pushed to';
    case 'PullRequestEvent':
      if (p.action === 'opened') return 'Opened a PR on';
      if (p.action === 'closed' && p.pull_request && p.pull_request.merged) return 'Merged a PR on';
      return null;
    case 'ReleaseEvent': return p.action === 'published' ? 'Released' : null;
    case 'CreateEvent': return p.ref_type === 'repository' ? 'Started' : null;
    default: return null;
  }
}

/** The newest event worth showing, as the small object now.json stores. */
function summarize(events) {
  if (!Array.isArray(events)) return null;
  for (const event of events) {
    const verb = describe(event);
    if (!verb || !event.repo || !event.repo.name) continue;
    return {
      verb,
      repo: event.repo.name,
      url: `https://github.com/${event.repo.name}`,
      at: event.created_at
    };
  }
  return null;
}

async function main() {
  const headers = { 'User-Agent': 'now-json-updater', Accept: 'application/vnd.github+json' };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;

  const res = await fetch(`https://api.github.com/users/${USER}/events/public?per_page=50`, { headers });
  if (!res.ok) throw new Error(`GitHub events request failed: ${res.status}`);
  const latest = summarize(await res.json());

  const now = JSON.parse(fs.readFileSync(FILE, 'utf8'));
  // Keep the last known activity rather than blanking the strip when the
  // recent window happens to hold only stars and comments.
  if (!latest) {
    console.log('No qualifying public activity; now.json left unchanged.');
    return;
  }
  now.github = latest;
  fs.writeFileSync(FILE, JSON.stringify(now, null, 2) + '\n');
  console.log(`now.json: ${latest.verb} ${latest.repo} at ${latest.at}`);
}

module.exports = { summarize, describe };

if (require.main === module) {
  main().catch(err => { console.error(err.message); process.exit(1); });
}
