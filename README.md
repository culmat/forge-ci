# Forge CI Shared Workflows

Reusable GitHub Actions workflows for Atlassian Forge apps.

This repository is mainly for sharing CI/CD logic across [our own repositories](https://github.com/search?q=org%3Aculmat+topic%3Aforge-app&type=repositories).

## Primary focus

- Keep deployment automation consistent across our Forge repos.
- Reduce copy/paste workflow maintenance.
- Roll out improvements quickly by consuming `main` in our own repos.

## What to expect

If you find this useful, [just do WTF you want to](LICENSE).  
Prefer pinning a commit hash as we might introduce breaking changes on main.
Bug reports and other contributions are welcome.
That said, we optimize this repository for our own operational needs first.

For that reason we

- prioritize internal changes over broader feature requests,
- decline PRs that add complexity we do not need,
- close requests that do not fit the maintenance direction of this repo.

## How our repos consume this

Our own repositories intentionally track `main` (latest) for fast shared updates.

## Development

- `npm install`
- `npm run check`
- optional: `act` for local workflow execution

## License

This project is licensed under the WTFPL v2. See `LICENSE`.
