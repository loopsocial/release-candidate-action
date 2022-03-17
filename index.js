const github = require('@actions/github')
const core = require('@actions/core')
const axios = require('axios')
const moment = require('moment')

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
 * Returns today's date in the format YYYYMMDD.
 * @returns {string} Today's date 
 */
const getTodaysDate = () => moment().utcOffset(-8).format('YYYYMMDD')

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
  const { data: tags } = await octokit.rest.repos.listTags({ owner, repo })
  
  // Loop through tags and see if there is another tag from today.
  const today = getTodaysDate()
  const latestTag = tags.find((tag) => tag.name.startsWith('v'))
  const existingTag = tags.find((tag) => tag.name.startsWith(`v${today}`))
  let nextTag
  if (existingTag) {
    // Found existing tag, increment the N by 1.
    const [, n] = existingTag.name.split('.')
    nextTag = `v${today}.${Number.parseInt(n) + 1}`
  } else {
    // No existing tag found, start N at 1.
    nextTag = `v${today}.1`
  }

  console.log(`Latest tag: ${latestTag.name}`)
  console.log(`Next tag: ${nextTag}`)

  return { 
    latestTag: latestTag.name,
    nextTag
  }
}

/**
 * Returns the commit diff between the last tag and current tag.
 * @param {object} octokit Octokit
 * @param {string} latestTag Latest tag
 * @returns {string} List of all the commits from the last tag
 */
const getCommitDiff = async (octokit, latestTag) => {
  const { owner, repo } = github.context.repo
  const currentSha = github.context.sha
  const { data: { status, commits } } = await octokit.rest.repos.compareCommitsWithBasehead({
    owner,
    repo,
    basehead: `release/${latestTag}...${currentSha}`,
    per_page: 100
  })

  console.log(`Commit diff: ${latestTag}...${currentSha}`)
  if (status !== 'ahead') throw Error('Head branch is not ahead of base branch')
  
  return commits.reduce((acc, curr) => {
    const sha = `<a href="${curr.html_url}">${curr.sha.substring(0, 7)}</a>`
    // Add new prod domain (#5325)\n\n* add more prod naboo domain names (#5313)\r\n\r\n* add fw.camera
    const regex = /(.+)\n/
    const message = curr.commit.message
    return acc + `${sha}\t${message}\n`
  }, "")
}

/**
 * Creates the release branch.
 * @param {string} nextTag Next tag
 */
const createReleaseBranch = async (nextTag) => {
  const token = getInput('workflow-token')
  const octokit = github.getOctokit(token)
  const { owner, repo } = github.context.repo
  console.log(`Release branch: release/${nextTag}`)
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
  const body = 
    '**Script generated description. DO NOT MODIFY**\n' +
    '\n' +
    '## Metadata\n' +
    `- Release tag: ${nextTag}\n` +
    `- Branch: release/${nextTag}\n` +
    '\n' +
    '## Actions\n' +
    '- To add release fixes:\n' +
    `\t1. \`git checkout release/${nextTag}\`\n` +
    '\t2. Check in fixes to the release branch.\n' +
    '\t3. (If applied) Cherry-pick the fix to `master/main`.\n' +
    '- To approve the push: Add `QA Approved` label and close the issue.\n' +
    '- To cancel the push: Close the issue directly.\n' +
    '\n' +
    `## Included commits (compared to ${latestTag})\n` +
    '\n' +
    commitDiff

  const { owner, repo } = github.context.repo
  const { data: { html_url: issueUrl } } = await octokit.rest.issues.create({
    owner,
    repo,
    title: `Release candidate ${nextTag}`,
    labels: ['RC'],
    body
  })
  return issueUrl
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
          "text": `\`${nextTag}\` is ready for testing.`
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

  const webhookUrl = getInput('slack-webhook-url')
  await axios.post(webhookUrl, body)
}

const run = async () => {
  try {
    // Get token and init
    const token = getInput('github-token')
    const octokit = github.getOctokit(token)
    
    // Get next tag and commit history 
    const { latestTag, nextTag } = await getTags(octokit)
    const commitDiff = await getCommitDiff(octokit, latestTag)

    // Create release branch
    await createReleaseBranch(nextTag)
  
    // Create issue
    const issueUrl = await createIssue(octokit, latestTag, nextTag, commitDiff)

    // Send webhook to Slack
    await postToSlack(nextTag, issueUrl)
  } catch (error) {
    core.setFailed(error.message)
  }
}
run()
