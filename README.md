# Release Candidate Action

This Action will:

1. Create a Release Candidate branch
2. Create a Release Candidate issue
3. Post to Slack

## Inputs

### `github-token`

(Required) Github default token (`GITHUB_TOKEN`) used to call the Github API.

### `workflow-token`

(Required) Github personal access token (`WORKFLOW_TOKEN`) used to call the Github API. This is required to create the ref since the default token cannot do this.

### `slack-webhook-url`

(Required) URL of the Slack webhook to send the message to.

## Example Usage

```yaml
name: Create Release Candidate

on: workflow_dispatch

jobs:
  create_rc:
    runs-on: ubuntu-latest
    name: Create Release Candidate
    steps:
      - name: Create Release Candidate
        id: create_rc
        uses: loopsocial/release-candidate-action@v1.0.2
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          workflow-token: ${{ secrets.WORKFLOW_TOKEN }}
          slack-webhook-url: ${{ secrets.SLACK_WEBHOOK_URL }}
```
