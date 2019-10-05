module.exports = function (RED) {

	function DelayOnOff(config) {
		RED.nodes.createNode(this, config);

		let node = this;
		this.prefix = config.prefix;
		this.name = config.name;
		const context = this.context();

		let onDelaySetting = this.onDelay = config.onDelay;
		let offDelaySetting = this.offDelay = config.offDelay;
		let onDelay = parseInt(onDelaySetting)*1000;
		let offDelay = parseInt(offDelaySetting)*1000;

		let timeoutFunc = context.get('timeoutFunc') || null;
		let turningOn = context.get('turningOn') || 0;
		let turningOff = context.get('turningOff') || 1;
		let isOn = context.get('isOn') || 0;

		this.on('input', function (msg) {

			if (msg.payload === 1) {
				if (turningOff) { /* Was turning off but was switched back on before the off delay elapsed */
					clearTimeout(timeoutFunc);
					turningOff = 0;
					isOn = 1;
					context.set('turningOff', turningOff);
					context.set('isOn', isOn);
					node.status({fill:"red", shape:"dot", text:msg.payload});
					node.send(msg);
				} else if (!turningOn && !isOn) {  /* Not turning on and not on, so start turning on */
					turningOn = Date.now();
					context.set('turningOn', turningOn);
					node.status({fill:"yellow", shape:"dot", text:"Turning True"});
					timeoutFunc = setTimeout(function(){
						isOn = 1;
						turningOn = 0;
						context.set('isOn', isOn);
						context.set('turningOn', turningOn);
						node.status({fill:"red", shape:"dot", text:msg.payload});
						node.send(msg);
					}, onDelay);
					context.set('timeoutFunc', timeoutFunc);
				} else if (turningOn && !isOn) { /* Is turning on but isn't on yet */
					const timeRemaining = (onDelay - (Date.now() - turningOn)) / 1000;
					node.status({fill:"yellow", shape:"dot", text: "True In " + timeRemaining + " seconds"});
					msg.payload = 0;
					node.send(msg);
			   } else { /* Is already on */
				   msg.payload = 1;
				   node.send(msg);
			   }
			} else if (msg.payload === 0) {
				if (turningOn) { /* Was turning on but was switched back off before the on delay elapsed */
					clearTimeout(timeoutFunc);
					turningOn = 0;
					isOn = 0;
					context.set('turningOn', turningOn);
					context.set('isOn', isOn);
					node.status({fill:"green", shape:"dot", text:msg.payload});
					node.send(msg);
				} else if (!turningOff && isOn) {  /* Not turning off and is on, so start turning off */
					turningOff = Date.now();
					context.set('turningOff', turningOff);
					node.status({fill:"yellow", shape:"dot", text:"Turning False"});
					timeoutFunc = setTimeout(function(){
						isOn = 0;
						turningOff = 0;
						context.set('isOn', isOn);
						context.set('turningOff', turningOff);
						node.status({fill:"green", shape:"dot", text:msg.payload});
						node.send(msg);
					}, offDelay);
					context.set('timeoutFunc', timeoutFunc);
				} else if (turningOff && isOn) { /* Is turning off but isn't off yet */
					const timeRemaining = (offDelay - (Date.now() - turningOff)) / 1000;
					node.status({fill:"yellow", shape:"dot", text: "False In " + timeRemaining + " seconds"});
					msg.payload = 0;
					node.send(msg);
			   } else { /* Is already on */
				   msg.payload = 0;
				   node.send(msg);
			   }
			}

		});

	}

	RED.nodes.registerType("DelayOnOff", DelayOnOff);

}
