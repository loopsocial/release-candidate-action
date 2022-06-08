const axios = require('axios')

/**
 * Posts to Slack via webhook.
 * @param {string} webhookUrl Where to send slack message
 * @param {string} body JSON body of message to send.
 */
const postToSlack = async (webhookUrl, body) => {
  await axios.post(webhookUrl, body)
}


/**
 * Posts to Slack via webhook.
 * @param {string} nextTag Next tag
 * @param {string} issueUrl URL of the Release Candidate issue
 */
 const postRCCreated = async (webhookUrl,nextTag, issueUrl) => {
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
  await postToSlack(webhookUrl, body)
}

module.exports = { postRCCreated }