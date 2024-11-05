module.exports = (RED) => {
    const { Anthropic } = require("@anthropic-ai/sdk");

    const ACCEPT_TOPIC_LIST = [
        "opus",
        "sonnet",
        "haiku",
    ].map((item) => item.toLowerCase());


    const main = function (config) {
        const node = this;
        RED.nodes.createNode(node, config);

        node.on("input", async(msg) => {
            const API_KEY = this.credentials.ANTHROPIC_API_KEY || msg.ANTHROPIC_API_KEY;

            const configuration = {
                apiKey: API_KEY,
            };


            const anthropicClient = new Anthropic(configuration);

            node.status({
                fill: "green",
                shape: "dot",
                text: "Processing...",
            });

            if (config.topic !== "__EMPTY__") {
                msg.topic = config.topic;
            }

            if (msg.topic) {
                msg.topic = msg.topic.toLowerCase();
            }

            if (!ACCEPT_TOPIC_LIST.includes(msg.topic) && msg.topic !== "__empty__") {
                node.status({
                    fill: "red",
                    shape: "dot",
                    text: "msg.topic is incorrect",
                });
                node.error(`msg.topic must be a string set to one of the following values: ${ACCEPT_TOPIC_LIST.map((item) => ` '${item}' `).join(", ")}`);

                node.send(msg);
            } else {
                const claudeModel = `claude-3-5-${msg.topic}-20241022`         

                try {
                    if (typeof msg.history === "undefined")
                        msg.history = [];
                    
                    const input = {
                        role: "user",
                        content: msg.payload,
                    };
                    msg.history.push(input);

                    
		    const response = await anthropicClient.messages.create({
                        model: claudeModel,
                        max_tokens: parseInt(msg.max_tokens) || 1024,
                        messages: msg.history,
                        metadata: msg.metadata,
			stop_sequences: msg.stop_sequences || msg.stop || null, // for gpt compat
			temperature: parseInt(msg.temperature) || 1,
			top_p: parseInt(msg.top_p) || 1,
			top_k: parseInt(msg.top_k) || null,
			tools: msg.tools || null,
			tool_choice: msg.tool_choice || null,
			system: msg.system || null,
			stream: msg.stream || false
                    });
	

	            // wont handle differnet content yet
                    const trimmedContent =
                        response.content[0].text.trim();
                    
		    const result = {
                        role: "assistant",
                        content: trimmedContent,
                    };

                    msg.history.push(result);
                    msg.payload = result;
                    msg.full = response;

                    node.status({
                        fill: "blue",
                        shape: "dot",
                        text: "Response complete",
                    });

                    node.send(msg);

                } catch (error) {
                    node.status({
                        fill: "red",
                        shape: "dot",
                        text: "Error",
                    });
                    if (error.response) {
                        node.error(error.response, msg);
                    } else {
                        node.error(error.message, msg);
                    }
                }
            }
        });
        node.on("close", () => {
            node.status({});
        });
    };

    RED.nodes.registerType("anthropic", main, {
        credentials: {
            ANTHROPIC_API_KEY: { type: "text" },

        },
    });
};
