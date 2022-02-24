const github = require('@actions/github')
const core = require('@actions/core')

async function run() {
  // This should be a token with access to your repository scoped in as a secret.
  // The YML workflow will need to set myToken with the GitHub Secret Token
  // myToken: ${{ secrets.GITHUB_TOKEN }}
  // https://help.github.com/en/actions/automating-your-workflow-with-github-actions/authenticating-with-the-github_token#about-the-github_token-secret
  

  

  // You can also pass in additional options as a second parameter to getOctokit
  // const octokit = github.getOctokit(myToken, {userAgent: "MyActionVersion1"});

  const { data: pullRequest } = await octokit.rest.pulls.get({
    owner: 'octokit',
    repo: 'rest.js',
    pull_number: 123,
    mediaType: {
      format: 'diff'
    }
  });

  console.log(pullRequest);
}

run();

const getToken = () => {
  const token = core.getInput('github-token')
  if (!token) throw Error(`"github-token" was not defined`)
  return token
}

const getLatestTag = (octokit) => {
  octokit.rest.repos.listTags({
    "owner",
    repo,
  })
}

try {
  const token = getToken()
  const octokit = github.getOctokit(myToken)
  
  // `who-to-greet` input defined in action metadata file
  const nameToGreet = core.getInput('who-to-greet');
  console.log(`Hello ${nameToGreet}!`);
  const time = (new Date()).toTimeString();
  core.setOutput("time", time);
  // Get the JSON webhook payload for the event that triggered the workflow
  const payload = JSON.stringify(github.context.payload, undefined, 2)
  console.log(`The event payload: ${payload}`);
} catch (error) {
  core.setFailed(error.message);
}8
