const github = require('@actions/github')
const core = require('@actions/core')

/**
 * Gets the input from the used action.
 * @param {string} key Input key to fetch
 * @returns {string} Returns the value of the input
 */
const getInput = (key) => {
  const input = core.getInput(key)
  if (!input) throw Error(`Input "${key}" was not defined`)
  return input
}

/**
 * Returns today's date in the format YYYYMMDD
 * @returns {string} Today's date 
 */
const getTodaysDate = () => {
  const date = new Date()
  const year = date.getFullYear()
  let month = date.getMonth() + 1
  month = month < 10 ? `0${month}` : month
  const day = date.getDate() < 10 ? `0${date.getDate()}` : date.getDate()
  return `${year}${month}${day}`
}

/**
 * Gets the latest tag and the name of the next tag.
 * Tags are formatted as: YYYYMMDD.N
 * N is the current deployment of the day, starting with 1.
 * If multiple deployments happen on the same date, N increments.
 * @param {object} octokit Octokit
 * @returns {object} Returns the latest and next tags
 */
const getTags = async (octokit) => {
  const { owner, repo } = github.context.repo
  const tags = await octokit.rest.repos.listTags({ owner, repo })
  console.log(tags)
  
  // Loop through tags and see if there is another tag from today.
  const today = getTodaysDate()
  const latestTag = tags.find((tag) => tag.name.startsWith('v'))
  const existing = tags.find((tag) => tag.name.startsWith(`v${today}`))
  let nextTag
  if (existing) {
    // Found existing tag, increment the N by 1.
    const [, n] = existing.split('.')
    nextTag = `v${today}.${Number.parseInt(n) + 1}`
  } else {
    // No existing tag found, start N at 1.
    nextTag = `v${today}.1`
  }
  return { latestTag, nextTag }
}

/**
 * Returns the commit diff between the last tag and current tag.
 * @param {object} octokit Octokit
 * @param {string} latestTag Latest tag
 * @returns {string} List of all the commits from the last tag
 */
const getCommitDiff = async (octokit, latestTag) => {
  const { owner, repo } = github.context.repo
  const { status, commits } = await octokit.rest.repos.compareCommitsWithBasehead({
    owner,
    repo,
    basehead: `${latestTag}...${github.context.sha}`,
    per_page: 100
  })

  if (status !== 'ahead') throw Error('Head branch is not ahead of base branch')
  
  return commits.reduce((prev, curr) => prev + `${curr.commit.message}\n`, "")
}

/**
 * Creates the release branch.
 * @param {object} octokit Octokit
 * @param {string} nextTag Next tag
 */
const createReleaseBranch = async (octokit, nextTag) => {
  const { owner, repo } = github.context.repo
  await octokit.rest.git.createRef({
    owner,
    repo,
    ref: `refs/heads/release/${nextTag}`,
    sha: github.context.sha
  })
}

/**
 * Creates the Release Candidate issue.
 * @param {object} octokit Octokit
 * @param {string} latestTag Latest tag
 * @param {string} nextTag Next tag
 * @param {string} commitDiff Commit history from the last tag
 * @returns {string} URL of the Release Candidate issue
 */
const createIssue = async (octokit, latestTag, nextTag, commitDiff) => {
  const body = `
  **Script generated description. DO NOT MODIFY**

  ## Metadata
  - Release tag: ${nextTag}
  - Branch: release/${nextTag}

  ## Actions
  - To add release fixes:
    1. \`git checkout release/${nextTag}\`
    2. Check in fixes to the release branch.
    3. (If applied) Cherry-pick the fix to \`master/main\`.
  - To approve the push: Add \`QA Approved\` label and close the issue.
  - To cancel the push: Close the issue directly.

  ## Included commits (compared to ${latestTag})
  ${commitDiff}
  `

  const { owner, repo } = github.context.repo
  const { data: { html_url } } = await octokit.rest.issues.create({
    owner,
    repo,
    title: `Release candidate ${nextTag}`,
    labels: ['RC'],
    body
  })
  return html_url
}

/**
 * Posts to Slack via webhook.
 * @param {string} nextTag Next tag
 * @param {string} issueUrl URL of the Release Candidate issue
 */
const postToSlack = async (nextTag, issueUrl) => {
  const body = {
    "blocks": [
      {
        "type": "header",
        "text": {
          "type": "plain_text",
          "text": `[${nextTag}] Release Candidate created 🧪`
        }
      },
      {
        "type": "section",
        "text": {
          "type": "mrkdwn",
          "text": "The Release Candidate is ready for testing."
        },
        "accessory": {
          "type": "button",
          "text": {
            "type": "plain_text",
            "text": "Go"
          },
          "url": issueUrl,
          "action_id": "button-action"
        }
      }
    ]
  }

  const { owner, repo } = github.context.repo
  const webhookUrl = await octokit.rest.actions.getRepoSecret({
    owner,
    repo,
    secret_name: 'SLACK_WEBHOOK_URL',
  })

  const request = new Request(webhookUrl, { method: 'POST', body })
  await fetch(request)
}

const run = async () => {
  try {
    // Get token and init
    const token = getInput('github-token')
    const octokit = github.getOctokit(token)
    
    // Get next tag and commit history 
    const { latestTag, nextTag } = getTags(octokit)
    const commitDiff = await getCommitDiff(octokit, latestTag)

    // Create release branch
    await createReleaseBranch(octokit, nextTag)
  
    // Create issue
    const issueUrl = await createIssue(octokit, latestTag, nextTag, commitDiff)

    // Send webhook to Slack
    await postToSlack(nextTag, issueUrl)
  } catch (error) {
    core.setFailed(error.message)
  }
}
run()
