const rewire = require('rewire');
const sinon = require("sinon");
const annoy = rewire('../src/annoy');
const assert = require('assert')
var stub;


const webhookUrl = 'a_test'
const github = {
  context: {
    repo: 'test',
    owner: 'tom_test'
  }
}

const listForRepo = (x) => {
  return { data: [{ created_at: '2022-05-27T17:07:37Z' }] }
}

const octokit = () => {
  return {
    rest: {
      issues: {
        listForRepo: listForRepo
      }
    }
  }
}

describe('annoyer', function () {
  beforeEach(() => { stub = sinon.stub() })
  const tests = [
    {
      date: '2022-05-27T17:07:37Z',
      title: 'sends annoyance because created date is past two days',
      assert: 'calledOnce'
    },
    {
      date: new Date().toUTCString(),
      title: 'does not send because created date is today',
      assert: 'notCalled'
    }
  ]

  tests.forEach((test) => {
    it(`${test.title} Annoyance because 2 days have passed`, async function () {
      const listForRepo = (x) => {
        return { data: [{ created_at: test.date }] }
      }

      const octokit = () => {
        return {
          rest: {
            issues: {
              listForRepo: listForRepo
            }
          }
        }
      }
      const stub = sinon.stub()
      annoy.__set__('sendAnnoyance', stub)
      await annoy.postAnnoyance(webhookUrl, github, octokit())
      await assert(stub[test.assert])
    })
  })
})