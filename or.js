module.exports = function (RED) {
    "use strict";
    const RuleManager = require("./lib/RuleManager")
    var ruleManager = null;

    function orGateNode(n) {
        RED.nodes.createNode(this, n);
        var node = this;
        this.rules = n.rules || [];
        this.topic = n.outputTopic || null;
        this.type = n.gateType || "or";
        this.emitOnlyIfTrue = n.emitOnlyIfTrue || 0;
        var payload = null;
        node.status({ fill: "blue", shape: "ring", text: "Loading..." });

        this.ruleManager = new RuleManager(RED, node, this.type);
        this.ruleManager.storeRule(this.rules).then((result) => {
            if (result)
                node.status({ fill: "green", shape: "dot", text: "true" });
            else
                node.status({ fill: "red", shape: "dot", text: "false" });

            if (this.emitOnlyIfTrue && result || !this.emitOnlyIfTrue)
                node.send({ topic: this.topic, result: 0, bool: payload })
                // node.send({ topic: this.topic, payload: null, bool: result })
        })

        this.on('input', function (msg) {
            this.ruleManager.updateState(msg).then((result) => {
                if (result)
                    node.status({ fill: "green", shape: "dot", text: "true" });
                else
                    node.status({ fill: "red", shape: "dot", text: "false" });

                if (this.emitOnlyIfTrue && result || !this.emitOnlyIfTrue)
                    node.send({ topic: this.topic, payload: result ? 1 : 0  || 0, bool: msg.payload  });  //updated app
                    // node.send({ topic: this.topic, payload: msg.payload || null, bool: result });  

            })
        });
    }

    RED.nodes.registerType("or-gate", orGateNode);
}