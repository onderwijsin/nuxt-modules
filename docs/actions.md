# Custom GitHub Actions

Custom GitHub Actions live in `.github/actions/<action-name>`. Keep each action self-contained and
prefer plain Node.js with built-in modules when the action does not need external dependencies.

## Add an action

Create an `action.yml` file and a JavaScript entrypoint:

```text
.github/actions/<action-name>/
├── action.yml
└── index.js
```

Use the Node runtime directly in `action.yml`:

```yaml
runs:
  using: node24
  main: index.js
```

Define all inputs in `action.yml`, validate required values in the entrypoint, and use GitHub
Actions command output such as `::error::` for failures. Do not add a compiled `dist` directory
unless the action specifically requires a build step.

## Use an action

Reference a local action from a workflow with its repository-relative path:

```yaml
- name: Run custom action
  uses: ./.github/actions/<action-name>
  with:
    input-name: value
```

Reusable workflows belong in `.github/workflows/` and can invoke local actions after checking out
the repository. Pass secrets explicitly when calling reusable workflows.

## Conventions

- Keep actions dependency-free where practical and preserve Node server and GitHub Actions runtime
  compatibility.
- Add JSDoc to action entrypoints and document inputs, outputs, and environment variables.
- Keep payload and file formats stable once an action is used by a workflow.
- Update the relevant workflow and documentation in the same change.
- Validate JavaScript syntax, formatting, linting, and representative action input payloads locally.

The Slack release notification action in `.github/actions/slack-notification/` is the reference
implementation for a dependency-free local action.
