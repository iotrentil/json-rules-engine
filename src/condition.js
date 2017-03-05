'use strict'

let params = require('params')
let debug = require('debug')('json-rules-engine')
let isPlainObject = require('lodash.isplainobject')

export default class Condition {
  constructor (properties) {
    let booleanOperator = Condition.booleanOperator(properties)
    Object.assign(this, properties)
    if (booleanOperator) {
      let subConditions = properties[booleanOperator]
      if (!(subConditions instanceof Array)) {
        throw new Error(`"${booleanOperator}" must be an array`)
      }
      this.operator = booleanOperator
      // boolean conditions always have a priority; default 1
      this.priority = parseInt(properties.priority, 10) || 1
      this[booleanOperator] = subConditions.map((c) => {
        return new Condition(c)
      })
    } else {
      properties = params(properties).require(['fact', 'operator', 'value'])
      // a non-boolean condition does not have a priority by default. this allows
      // priority to be dictated by the fact definition
      if (properties.hasOwnProperty('priority')) {
        properties.priority = parseInt(properties.priority, 10)
      }
    }
  }

  /**
   * Converts the condition into a json-friendly structure
   * @param   {Boolean} stringify - whether to return as a json string
   * @returns {string,object} json string or json-friendly object
   */
  toJSON (stringify = true) {
    let props = {}
    if (this.priority) {
      props.priority = this.priority
    }
    let oper = Condition.booleanOperator(this)
    if (oper) {
      props[oper] = this[oper].map((c) => c.toJSON(stringify))
    } else {
      props.operator = this.operator
      props.value = this.value
      props.fact = this.fact
      if (this.params) {
        props.params = this.params
      }
      if (this.path) {
        props.path = this.path
      }
    }
    if (stringify) {
      return JSON.stringify(props)
    }
    return props
  }

  /**
   * Interprets .value as either a primitive, or if a fact, retrieves it's value
   */
  async _getValue() {
    let value = this.value
    if (isPlainObject(value) && value.hasOwnProperty('fact')) { // value: { fact: 'xyz' }
      value = await almanac.factValue(rightHandSideValue.fact, rightHandSideValue.params, rightHandSideValue.path)
    }
    return value
  }

  /**
   * Takes the fact result and compares it to the condition 'value', using the operator
   *   LHS                      OPER       RHS
   * <fact + params + path>  <operator>  <value>
   *
   * @param   {Almanac} almanac
   * @param   {Map} operatorMap - map of available operators, keyed by operator name
   * @returns {Boolean} - evaluation result
   */
  async evaluate (almanac, operatorMap) {
    if (!almanac) throw new Error('almanac required')
    if (!operatorMap) throw new Error('operatorMap required')
    if (this.isBooleanOperator()) throw new Error('Cannot evaluate() a boolean condition')

    let op = operatorMap.get(this.operator)
    if (!op) throw new Error(`Unknown operator: ${this.operator}`)

    let rightHandSideValue = await this._getValue()
    let leftHandSideValue = await almanac.factValue(this.fact, this.params, this.path)

    let evaluationResult = op.evaluate(leftHandSideValue, rightHandSideValue)
    debug(`condition::evaluate <${leftHandSideValue} ${this.operator} ${rightHandSideValue}?> (${evaluationResult})`)
    return evaluationResult
  }

  /**
   * Returns the boolean operator for the condition
   * If the condition is not a boolean condition, the result will be 'undefined'
   * @return {string 'all' or 'any'}
   */
  static booleanOperator (condition) {
    if (condition.hasOwnProperty('any')) {
      return 'any'
    } else if (condition.hasOwnProperty('all')) {
      return 'all'
    }
  }

  /**
   * Returns the condition's boolean operator
   * Instance version of Condition.isBooleanOperator
   * @returns {string,undefined} - 'any', 'all', or undefined (if not a boolean condition)
   */
  booleanOperator () {
    return Condition.booleanOperator(this)
  }

  /**
   * Whether the operator is boolean ('all', 'any')
   * @returns {Boolean}
   */
  isBooleanOperator () {
    return Condition.booleanOperator(this) !== undefined
  }
}
