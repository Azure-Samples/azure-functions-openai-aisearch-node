const { app, input, output } = require("@azure/functions");

const embeddingsStoreOutput = output.generic({
    type: "embeddingsStore",
    input: '{Text}', // Name of json key to store in the embeddings store
    inputType: 'RawText', // Type of input to process
    connectionName: "AZURE_AISEARCH_ENDPOINT",
    collection: "openai-index",
    model: "%EMBEDDING_MODEL_DEPLOYMENT_NAME%"
});

app.http('IngestFile', {
    methods: ['POST'],
    authLevel: 'function',
    extraOutputs: [embeddingsStoreOutput],
    handler: async (request, context) => {
        try {
            let requestBody = await request.json();

            // Validate the request body for Title and Text
            if (!requestBody || !requestBody.Title || !requestBody.Text) {
                context.res = {
                    status: 400,
                    body: { status: 400, message: "Invalid request body. Ensure you pass in {\"Title\": value, \"Text\": value}." }
                };
                return;
            }

            // Prepare the raw text for the embeddings store
            const rawText = requestBody.Text; // Use Text directly
            const title = requestBody.Title;

            // Set the extra output with title and rawText

            context.extraOutputs.set(embeddingsStoreOutput, { title: title });

            let response = {
                status: "success",
                title: title
            };

            return { status: 202, jsonBody: response };
        } 
        
        catch (error) {
            context.log(`Error parsing request body: ${error.message}`);
            context.res = {
                status: 500,
                body: { status: 500, message: "Internal server error while processing the request." }
            };
        }
    }
});

const semanticSearchInput = input.generic({
    type: "semanticSearch",
    connectionName: "AZURE_AISEARCH_ENDPOINT",
    collection: "openai-index",
    query: "{Prompt}",
    chatModel: "%CHAT_MODEL_DEPLOYMENT_NAME%",
    embeddingsModel: "%EMBEDDING_MODEL_DEPLOYMENT_NAME%"
});

app.http('PromptFile', {
    methods: ['POST'],
    authLevel: 'function',
    extraInputs: [semanticSearchInput],
    handler: async (_request, context) => {
        var responseBody = context.extraInputs.get(semanticSearchInput);
        return { status: 200, body: responseBody.Response.trim() };
    }
});