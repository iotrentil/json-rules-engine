'use strict'

import engineFactory from '../src/index'
import { Fact } from '../src/index'
import sinon from 'sinon'

xdescribe('Engine: fact comparison', () => {
  let engine
  let constantCondition = {
    all: [{
      fact: 'height',
      operator: 'lessThanInclusive',
      value: {
        fact: 'width'
      }
    }]
  }

  let eventSpy = sinon.spy()
  function setup(conditions) {
    let event = { type: 'success-event' }
    eventSpy.reset()
    engine = engineFactory()
    let rule = factories.rule({ conditions, event })
    engine.addRule(rule)
    engine.on('success', eventSpy)
  }

  describe('constant facts', () => {
    it('allows a fact to retrieve other fact values', async () => {
      setup(constantCondition)
      await engine.run({ height: 1, width: 2 })
      expect(eventSpy).to.have.been.calledOnce
    })
  })

  let paramsCondition = {
    all: [{
      fact: 'widthMultiplier',
      params: {
        multiplier: 2
      },
      operator: 'equal',
      value: {
        fact: 'heightMultiplier',
        params: {
          multiplier: 3
        }
      }
    }]
  }
  describe('2 rules with parallel conditions', () => {
  })
})
