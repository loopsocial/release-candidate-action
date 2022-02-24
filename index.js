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
const getCurrentTag = async (octokit, owner, repo) => {
  const today = getTodaysDate()
  const tags = await octokit.rest.repos.listTags({ owner, repo })

  // Loop through tags and see if there is another tag from today.
  const existing = tags.find((tag) => tag.name.startsWith(today))
  if (existing) {
    // Found existing tag, increment the N by 1.
    const [, n] = existing.split('.')
    return `${today}.${Number.parseInt(n) + 1}`
  } else {
    // No existing tag found, start N at 1.
    return `${today}.1`
  }
}

const run = async () => {
  try {
    const token = getInput('github-token')
    const repository = getInput('github-repository')
    const [owner, repo] = repository.split('/')
    const octokit = github.getOctokit(token)
    const currentTag = getCurrentTag(octokit, owner, repo)
  
    
    // // `who-to-greet` input defined in action metadata file
    // const nameToGreet = core.getInput('who-to-greet');
    // console.log(`Hello ${nameToGreet}!`);
    // const time = (new Date()).toTimeString();
    // core.setOutput("time", time);
    // // Get the JSON webhook payload for the event that triggered the workflow
    // const payload = JSON.stringify(github.context.payload, undefined, 2)
    // console.log(`The event payload: ${payload}`);
  } catch (error) {
    core.setFailed(error.message);
  }
}

run()