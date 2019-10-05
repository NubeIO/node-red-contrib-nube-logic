module.exports = function (RED) {

    let PID = require('pid-controller');

    function pidNode(config) {
        RED.nodes.createNode(this, config);

        this.prefix = config.prefix;
        this.name = config.name;
        // this.topicX = config.topicX;
        // this.topicY0 = config.topicY0;
        // this.topicY1 = config.topicY1;

        const context = this.context();
        const outTopic = "PID_OUT";

        const node = this;



        // var inputs = [0, 0, 0];
        // var output = 0;


        this.on('input', function (msg) {


            var requiredInputs = {
                "PID_ENABLE": "PID_ENABLE",
                "PID_SETPOINT": "PID_SETPOINT",
                "PID_INPUT": "PID_INPUT",
                "PID_P": "PID_P",
                "PID_I": "PID_I",
                "PID_D": "PID_D",
                "PID_DIRECTION": "PID_DIRECTION",
                "PID_CALC_INTERVAL": "PID_CALC_INTERVAL",
                "PID_MAX_OUTPUT": "PID_MAX_OUTPUT",
                "PID_MIN_OUTPUT": "PID_MIN_OUTPUT",
                "PID_MANUAL_OUTPUT": "PID_MANUAL_OUTPUT",
                "PID_TRIGGER": "PID_TRIGGER"
                //    "PID_BIAS": "PID_BIAS",                   //NOT IMPLEMENTED
                //    "PID_DEADBAND": "PID_DEADBAND",           //NOT IMPLEMENTED
            };



            // loop through and set requiredInputs topics to context
            let validTopic = 0;
            for (var topic in requiredInputs) {
                if (msg.topic == topic) {
                    context.set(requiredInputs[topic], msg.payload);
                    ++validTopic;
                    break;
                }
            }

            // if the topic isn't being used in this function, return it unchanged.
            if (validTopic === 0) {
                // node.warn('im here');
                node.send({
                    payload: msg.payload,
                    topic: msg.topic
                });
                return;
            }

            // define and set function variables from context or to default values
            let PID_ENABLE = context.get('PID_ENABLE') || 'MANUAL';                        // Set as 'MANUAL' or 'AUTO'
            let PID_SETPOINT = context.get('PID_SETPOINT') || 0;
            let PID_INPUT = context.get('PID_INPUT') || 0;                                 // Control Variable
            let PID_P = context.get('PID_P') || 1;                                         // Set as units of VAR/SETPOINT for full output range
            let PID_I = context.get('PID_I') || 0;                                         // Set as repeats per minute
            let PID_D = context.get('PID_D') || 0;
            let PID_DIRECTION = context.get('PID_DIRECTION') || 'DIRECT';                  // Set as 'DIRECT' or 'REVERSE'
            let PID_CALC_INTERVAL = context.get('PID_CALC_INTERVAL') || 1000;              // Interval that the output is recalculated (in milliseconds)
            let PID_MAX_OUTPUT = context.get('PID_MAX_OUTPUT') || 100;
            let PID_MIN_OUTPUT = context.get('PID_MIN_OUTPUT') || 0;
            let PID_MANUAL_OUTPUT = context.get('PID_MANUAL_OUTPUT') || 0;                 // Once PID_ENABLE is set to 'MANUAL' PID_MANUAL_OUTPUT allows the PID output to be manually overriden
            let PID_OUT = context.get('PID_OUT') || 0;






            // setup write flag 
            // first time through so initialise PID controller
            let PID_INITIALIZED = context.get('PID_INITIALIZED') || 'no';
            if (PID_INITIALIZED == 'no') {
                let pid = new PID(PID_INPUT, PID_SETPOINT, PID_P, PID_I, PID_D, PID_DIRECTION);
                pid.setSampleTime(PID_CALC_INTERVAL);
                pid.setOutputLimits(PID_MIN_OUTPUT, PID_MAX_OUTPUT);
                pid.setMode('MANUAL');
                context.set('pid', pid);                                                  // Save the pid controller instance to context
                context.set('PID_INITIALIZED', 'yes')
                node.warn('PID CONTROLLER SETUP INITIALIZED')
                return;
            }

            let pid = context.get('pid');                                                 // Get the existing pid controller instance from context

            // if the message is simply to trigger the PID computation
            if (msg.topic == 'PID_TRIGGER') {
                pid.setInput(PID_INPUT);
                pid.compute();
            }

            else if (msg.topic == 'PID_SETPOINT') {
                pid.setPoint(PID_SETPOINT);
                pid.compute();
            }

            else if (msg.topic == 'PID_ENABLE') {
                if (msg.payload === true) {
                    context.set('PID_MANUAL_OUTPUT', 0);
                    pid.setMode('AUTO');
                    pid.compute();
                    if (PID_MANUAL_OUTPUT !== 0) {
                        pid.setMode('MANUAL');               // these lines are here to counteract a bug where 
                        pid.compute();                       // when switching from MANUAL(with a overriden output) to AUTO
                        pid.setMode('AUTO');                 // the PID controller doesn't start.  It requires
                        pid.compute();                       // switching back and forth between MANUAL and AUTO once more.
                    }
                }
                else if (msg.payload === false) {
                    pid.setMode('MANUAL');
                    pid.setOutput(0);
                    pid.compute();
                }
                //node.warn('PID_ENABLE = ' + pid.getMode());
            }

            else if (msg.topic == 'PID_SETPOINT') {
                pid.setPoint(PID_SETPOINT);
                pid.compute();
                //node.warn('PID_SETPOINT = ' + pid.getSetPoint());
            }

            else if (msg.topic == 'PID_INPUT') {
                pid.setInput(PID_INPUT);
                pid.compute();
                //node.warn('PID_INPUT = ' + pid.getInput());
            }

            else if (msg.topic == 'PID_DIRECTION') {
                if (msg.payload === true || msg.payload === 'DIRECT') {
                    pid.setControllerDirection('DIRECT');
                    pid.compute();
                }
                else if (msg.payload === false || msg.payload === 'REVERSE') {
                    pid.setControllerDirection('REVERSE');
                    pid.compute();
                }
                //node.warn('PID_DIRECTION = ' + pid.getDirection());
            }

            else if (msg.topic == 'PID_CALC_INTERVAL') {
                pid.setSampleTime(PID_CALC_INTERVAL);
                pid.compute();
            }

            else if (msg.topic == 'PID_MIN_OUTPUT' || msg.topic === 'PID_MAX_OUTPUT') {
                pid.setOutputLimits(PID_MIN_OUTPUT, PID_MAX_OUTPUT);
                pid.compute();
            }

            else if (msg.topic == 'PID_P' || msg.topic == 'PID_I' || msg.topic == 'PID_D') {
                pid.setTunings(PID_P, PID_I, PID_D);
                pid.compute();
                //node.warn('PID_P = ' + pid.getKp());
                //node.warn('PID_I = ' + pid.getKi());
                //node.warn('PID_D = ' + pid.getKd());
            }

            else if (msg.topic == 'PID_MANUAL_OUTPUT' && PID_ENABLE == 'MANUAL') {
                pid.setOutput(PID_MANUAL_OUTPUT);
                pid.compute();
            }

            PID_OUT = pid.getOutput();
            context.set('PID_OUT', PID_OUT);
            // node.warn(PID_OUT);
            var msg = ({
                payload: PID_OUT,
                sp: PID_SETPOINT,
                input: PID_INPUT,
                enable: PID_ENABLE,
                DIRECTION: PID_DIRECTION,
                topic: outTopic
            });
            this.send(msg);
            // return;



            // var msg = { topic: node.name, payload: Number(output) };
            // this.status({ fill: "green", shape: "dot", text: output.toString() });
            // this.send(msg);
        });

    }

    RED.nodes.registerType("pidNode", pidNode);

}