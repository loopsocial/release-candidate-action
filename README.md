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

## Usage

```yaml
uses: loopsocial/release-candidate-action@v1.0.0
with:
  github-token: ${{ secrets.GITHUB_TOKEN }}
  slack-webhook-url: ${{ secrets.SLACK_WEBHOOK_URL }}
```
