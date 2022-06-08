const slack = require('./slack.js')


/**
 * Posts an Annoyance Message via webhook to slack.
 * @param {string} webhookUrl Where to send the annoyance slack message
 * @param {string} body JSON body of annoyance to send.
 */
 const sendAnnoyance = async (webhookUrl, date, issueUrl) => {
  const body = {
    "blocks": [
      {
        "type": "header",
        "text": {
          "type": "plain_text",
          "text": `Release Candidate has been open since ${date}`
        }
      },
      {
        "type": "section",
        "text": {
          "type": "mrkdwn",
          "text": `<!channel> take a look into your RC to determine what is delaying`
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
  await slack.postToSlack(webhookUrl, body)
}

function moreThanXdays(dateInMS, daysAgo) {
  //daysAgo * hours *  min * sec * ms
  const daysAgoInMS = daysAgo * 24 * 60 * 60 * 1000;
  const daysAgotimeStamp = new Date().getTime() - daysAgoInMS;
  return daysAgotimeStamp > dateInMS
}


/**
 * Determines if we should annoy everyone about RC not being closed
 * Will send slack message if RC has been open more than 2 days.
 * @param {string} webhookUrl Where to send the annoyance slack message
 * @param {string} body JSON body of annoyance to send.
 */

const postAnnoyance = async (webhookUrl,github,octokit) => {
  const daysAgo = 2
  const { owner, repo } = github.context.repo
  const issues = await octokit.rest.issues.listForRepo({
    owner,
    repo,
    labels: ['RC']
  });
  date = Date.parse(issues.data[0].created_at)
  issueStale = moreThanXdays(date, daysAgo)
  if(issueStale) {
    await sendAnnoyance(webhookUrl, issues.data[0].created_at, issues.data[0].html_url)
  }
}

module.exports = { postAnnoyance }