"use strict"

var RED = null;
var operators = {
    'eq': function (a, b) { return a == b; },
    'neq': function (a, b) { return a != b; },
    'lt': function (a, b) { return a < b; },
    'lte': function (a, b) { return a <= b; },
    'gt': function (a, b) { return a > b; },
    'gte': function (a, b) { return a >= b; },
    'btwn': function (a, b, c) { return a >= b && a <= c; },
    'cont': function (a, b) { return (a + "").indexOf(b) != -1; },
    'regex': function (a, b, c, d) { return (a + "").match(new RegExp(b, d ? 'i' : '')); },
    'true': function (a) { return a === true; },
    'false': function (a) { return a === false; },
    'null': function (a) { return (typeof a == "undefined" || a === null); },
    'nnull': function (a) { return (typeof a != "undefined" && a !== null); }
};

var gates = {
    'and': function (data) {
        return data.every(function (element) {
            if (element.hasOwnProperty("validated")) return element.validated; else return false;
        })
    },
    'or': function (data) {
        return data.some(function (element) {
            if (element.hasOwnProperty("validated")) return element.validated; else return false;
        })
    },
    'nand': function (data) {
        return !data.every(function (element) {
            if (element.hasOwnProperty("validated")) return element.validated; else return false;
        })
    },
    'nor': function (data) {
        return !data.some(function (element) {
            if (element.hasOwnProperty("validated")) return element.validated; else return false;
        });
    },
    'xor': function (data) {
        return data.filter(function (element) {
            if (element.hasOwnProperty("validated")) return element.validated; else return false;
        }).length === 1;
    },
    'xnor': function (data) {
        return data.filter(function (element) {
            if (element.hasOwnProperty("validated")) return element.validated; else return false;
        }).length !== 1;
    }
}

class RuleManager {
    constructor(red, node, gate) {
        this.data = [];
        RED = red;
        this.node = node;
        this.gate = gate;
    }

    storeRule(rules) {
        return new Promise((resolve, reject) => {
            // Store all rules
            for (let i = 0; i < rules.length; i++) {
                let rule = rules[i];
                //Mandatory check
                if (!rule.vt) {
                    if (!isNaN(Number(rule.v))) {
                        rule.vt = 'num';
                    } else {
                        rule.vt = 'str';
                    }
                }
                if (rule.vt === 'num') {
                    if (!isNaN(Number(rule.v))) {
                        rule.v = Number(rule.v);
                    }
                }
                if (typeof rule.v2 !== 'undefined') {
                    if (!rule.v2t) {
                        if (!isNaN(Number(rule.v2))) {
                            rule.v2t = 'num';
                        } else {
                            rule.v2t = 'str';
                        }
                    }
                    if (rule.v2t === 'num') {
                        rule.v2 = Number(rule.v2);
                    }
                }
                this.data.push(rule);
            }
            this.updateState().then(resolve)
        });
    }

    getRules() {
        return this.data;
    }

    getRulesLength() {
        return this.data.length;
    }

    updateState(msg) {
        return new Promise((resolve, reject) => {
            for (let i = 0; i < this.data.length; i++) {
                let rule = this.data[i];
                let test = RED.util.evaluateNodeProperty(rule.property, rule.propertyType, this.node, msg);
                let v1 = undefined, v2 = undefined;

                switch (rule.vt) {
                    case 'prev': {
                        v1 = rule.previousValue;
                        break;
                    }
                    case 'msg':
                    case 'flow':
                    case 'global':
                    case 're':
                    case 'bool': {
                        v1 = RED.util.evaluateNodeProperty(rule.v, rule.vt, this.node, msg);
                        break;
                    }
                    default: {
                        if (rule.hasOwnProperty("v")) { // if the user set the value, take it
                            v1 = rule.v;
                        }
                        break;
                    }
                }

                v2 = rule.v2;
                switch (rule.v2t) {
                    case 'prev': {
                        v2 = rule.previousValue;
                        break;
                    }
                    case 'msg':
                    case 'flow':
                    case 'global':
                    case 're':
                    case 'bool': {
                        if (typeof v2 !== undefined) {
                            v2 = RED.util.evaluateNodeProperty(rule.v2, rule.v2t, this.node, msg);
                        }
                        break;
                    }
                    default: {
                        if (typeof v2 !== undefined) {
                            v2 = RED.util.evaluateNodeProperty(rule.v2, rule.v2t, this.node, msg);
                        }
                        if (rule.hasOwnProperty("v")) { // if the user set the value, take it
                            v2 = rule.v2;
                        }
                        break;
                    }
                }

                //Check if the rule is ok
                if (msg) { // if there is a msg
                    if ((rule.propertyType === 'msg' && msg.topic === rule.topic) || rule.propertyType !== 'msg') { // if the rule match with the message got
                        if (operators[rule.t](test, v1, v2, rule.case)) {
                            rule.validated = true;
                        } else {
                            rule.validated = false
                        }
                        rule.previousValue = test;
                    }
                } else { //if not
                    if (rule.propertyType !== 'msg') { // if the rule isn't about a message
                        if (operators[rule.t](test, v1, v2, rule.case)) {
                            rule.validated = true;
                        } else {
                            rule.validated = false
                        }
                        rule.previousValue = test;
                    }
                }
            }
            resolve(gates[this.gate](this.data))
        })
    }
}

module.exports = RuleManager;