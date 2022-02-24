const github = require('@actions/github')
const core = require('@actions/core')

const getInput = (key) => {
  const input = core.getInput(key)
  if (!input) throw Error(`Input "${key}" was not defined`)
  return input
}

const getTodaysDate = () => {
  const date = new Date()
  const year = date.getFullYear()
  const month = date.getMonth() < 10 ? `0${date.getMonth()}` : date.getMonth()
  const day = date.getDay() < 10 ? `0${date.getDay()}` : date.getDay()
  return `${year}${month}${day}`
}

// Tags are formatted as: YYYYMMDD.N
// N is the current deployment of the day, starting with 1.
// If multiple deployments happen on the same date, N increments.
const getTags = async (octokit) => {
  const { owner, repo } = github.context.repo()
  const tags = await octokit.rest.repos.listTags({ owner, repo })
  
  // Loop through tags and see if there is another tag from today.
  const today = getTodaysDate()
  const latestTag = tags.find((tag) => tag.name.startsWith('v'))
  const existing = tags.find((tag) => tag.name.startsWith(today))
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

const getCommitSummary = async () => {
  // TODO
}

const createReleaseBranch = async (octokit, nextTag) => {
  const { owner, repo } = github.context.repo()
  await octokit.rest.git.createRef({
    owner,
    repo,
    ref: `refs/heads/release/${nextTag}`,
    sha: github.context.sha
  })
}

const createIssue = async (octokit, latestTag, nextTag, commitSummary) => {
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
  ${commitSummary}
  `

  const { owner, repo } = github.context.repo()
  const issue = await octokit.rest.issues.create({
    owner,
    repo,
    title: `Release candidate ${nextTag}`,
    labels: ['RC'],
    body
  })
  return issue.data.html_url
}

const postToSlack = async () => {

}

const run = async () => {
  try {
    // Init
    const token = getInput('github-token')
    const octokit = github.getOctokit(token)
    
    // Get next tag and commit history 
    const { latestTag, nextTag } = getTags(octokit)
    const commitSummary = await getCommitSummary()

    // Create release branch
    await createReleaseBranch(octokit, nextTag)
  
    // Create issue
    await createIssue(octokit, latestTag, nextTag, commitSummary)

    // Send webhook to Slack
    await postToSlack()
  } catch (error) {
    core.setFailed(error.message);
  }
}

run()
