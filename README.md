# 🏄🏽‍♀️ [ido-green.appspot.com](https://Ido-green.appspot.com)

My projects, demos and other fun stuff

## Tech Stack 🏔️
- Jest for *smoke tests* -- Check the automation with each push at: https://github.com/greenido/ido-green.appspot.com/actions
- Bootstrap
- [Font-Awesome](http://fortawesome.github.io/Font-Awesome/icons/#web-application)
- https://fontawesome.com/v4.7.0/icons/ -- http://fontawesome.io/icons/

## Bugs and Issues 🚨

Have a bug or an issue with this theme? [Open a new issue](https://github.com/greenido/ido-green.appspot.com/issues) here on GitHub.

## ToDos 🐅

- Fetch an RSS feed from the [blog](https://greenido.wordpress.com)
- 'Playroom' to the examples from [RoadShow page](ido-green.appspot.com/RoadShow.html)
- ServiceWorker - Use it to improve performance and to control the fetching of new / fresh content (e.g. blogs posts)

## Misc 👌🏼

```bash
gcloud app deploy app.yaml --project theProjectID --verbosity=debug
npm run --prefix tests/ test
```

### GitHub Actions Deploy

The repository now includes a workflow that deploys to App Engine on every push to `master`:

- Workflow: `.github/workflows/deploy-app-engine.yml`
- Deploy command: `gcloud app deploy app.yaml --project="${GCP_PROJECT_ID}" --quiet`

Set these GitHub repository secrets before relying on the workflow:

- `GCP_PROJECT_ID`: your Google Cloud project ID.
- `GCP_SA_KEY`: a JSON service account key for an account that can deploy App Engine versions.

How to get `GCP_SA_KEY`:

1. In Google Cloud, open IAM & Admin -> Service Accounts.
2. Create a service account for GitHub Actions, or reuse an existing deploy account.
3. Grant it permissions that can deploy App Engine versions. In most projects that means `App Engine Deployer`, plus `Service Account User` if your deploy uses a runtime service account.
4. Open the service account, go to Keys, and create a new JSON key.
5. Copy the full JSON file contents and save that exact JSON as the GitHub repository secret named `GCP_SA_KEY`.

Example using the `gcloud` CLI:

```bash
gcloud iam service-accounts create github-deployer \
  --display-name="GitHub App Engine Deployer"

gcloud projects add-iam-policy-binding theProjectID \
  --member="serviceAccount:github-deployer@theProjectID.iam.gserviceaccount.com" \
  --role="roles/appengine.deployer"

gcloud iam service-accounts keys create key.json \
  --iam-account="github-deployer@theProjectID.iam.gserviceaccount.com"
```

Then open `key.json` and paste the full file content into the `GCP_SA_KEY` secret in GitHub.

After adding the secrets, pushing to `master` will trigger an automatic deploy. You can also run the workflow manually from the Actions tab.

### PHP Runtime Upgrade (2025)

App Engine Standard will stop accepting deployments with `php81` after 2025-12-31.

Current runtime (see `ido-green/app.yaml`): `php83` (updated from `php81`).

If `php83` is not yet supported in your Google Cloud project, change the line in `app.yaml` to `runtime: php82` and redeploy:

```bash
gcloud app deploy ido-green/app.yaml --project theProjectID --quiet
```

Verification steps after changing runtime:

1. List versions: `gcloud app versions list` – confirm new runtime in the description.
2. Open the site root and a PHP page (e.g. `/main.php`) to ensure responses are served.
3. (Optional) SSH into a flexible environment or run locally with Docker (if migrating to Flexible) to test extensions.

Key changes from PHP 8.1 → 8.2/8.3 relevant here:

- Dynamic properties are deprecated (not used in this project).
- `utf8_encode()`/`utf8_decode()` are deprecated – avoid adding them.
- Read-only properties tightened – not relevant (no classes here yet).
- Improved `Randomizer` API (future enhancement potential).

Because this project is static + a minimal `main.php`, no code changes were required for the upgrade.

Find the number of files in all the directories (under the current one)

```bash
du -a | cut -d/ -f2 | sort | uniq -c | sort -nr
```
