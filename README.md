# Release Candidate Action

This Action will:

1. Create a Release Candidate branch
2. Create a Release Candidate issue
3. Post to Slack

## Inputs

### `github-token`

**Required**
Github token to use to call the Github API.

### `slack-webhook-url`

**Required**
URL of the Slack webhook to send the message to.

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
        uses: loopsocial/release-candidate-action@v1.0.1
        with:
          github-token: ${{ secrets.WORKFLOW_TOKEN }}
          slack-webhook-url: ${{ secrets.SLACK_WEBHOOK_URL }}
```
