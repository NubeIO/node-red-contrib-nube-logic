module.exports = function(RED) {
    
    function boolCount(config) {
        RED.nodes.createNode(this,config);
        
		this.prefix = config.prefix;
		this.name = config.name;
		var node = this;
		let context = this.context();
		

		this.on('input', function(msg) 
						{
							// setup write flag 
							
							let msgZero=0;
							console.log(msg.payload)

							let countUp = context.get('out') || 0
							let countReset = context.get('countReset') || 0
							if(msg.payload === 1  & countReset < 1) {
									countUp++;
									countReset++;
								} else if (msg.payload === 0) {
									msgZero++;
									countReset = 0;
							}
							context.set('countReset', countReset);
							context.set('out', countUp);
							
							let msgOut = context.get('out')
							msg.payload = msgOut
							this.send(msg);
						});
	
	}
    
    RED.nodes.registerType("boolCount",boolCount);
	
}
