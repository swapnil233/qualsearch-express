import { ErrorMessages } from "@/src/constants/ErrorMessages";
import { HttpStatus } from "@/src/constants/HttpStatus";
import { getTranscriptById } from "@/src/infrastructure/transcript.service";
import express, { Request, Response } from "express";
import { OpenAI } from "langchain/llms/openai";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { ChatPromptTemplate, PromptTemplate } from "langchain/prompts";
import { ChatOpenAI } from "langchain/chat_models/openai";
import { LLMChain, loadSummarizationChain } from "langchain/chains";
import prisma from "@/src/utils/prisma";
import { get_encoding } from "@dqbd/tiktoken";
const encoding = get_encoding("cl100k_base");

const router = express.Router();

router.get("/", async (req: Request, res: Response) => {
    try {
        // Retrieve transcriptId from the query parameters.
        const transcriptId = req.query.transcriptId as string;
        console.log("Transcript ID: ", transcriptId)

        // Validate that transcriptId is provided.
        if (!transcriptId) {
            console.error("Transcript ID is required.");
            return res.status(HttpStatus.BadRequest).send("A valid transcript ID is required.");
        }

        const transcript = await prisma.transcript.findUniqueOrThrow({
            where: {
                id: transcriptId,
            },
            select: {
                summary: true,
            },
        });

        if (!transcript || !transcript.summary) {
            console.error(`Transcript with the ID "${transcriptId}" not found.`);
            return res.status(HttpStatus.NotFound).send(`Transcript with the ID "${transcriptId}" not found.`)
        }

        // Return the summary
        console.log("Summary: ", transcript.summary);
        return res.status(HttpStatus.Ok).json(transcript.summary);
    } catch (error) {
        console.log(error);
        return res
            .status(HttpStatus.InternalServerError)
            .send(ErrorMessages.InternalServerError);
    }
});

router.post("/", async (req: Request, res: Response) => {
    try {
        // Retrieve transcriptId from the request body.
        const { transcriptId } = req.body;

        // Validate that transcriptId is provided.
        if (!transcriptId) {
            console.error("Transcript ID is required.");
            return res.status(HttpStatus.BadRequest).send(ErrorMessages.BadRequest);
        }

        // Get the transcript from DB
        const transcript = await getTranscriptById(transcriptId as string);

        if (!transcript) {
            console.error(`Transcript with the ID "${transcriptId}" not found.`);
            return res.status(HttpStatus.NotFound).send(ErrorMessages.NotFound);
        }

        // Split transcript into 10,000 char chunks with 500 char overlap
        const splitter = new RecursiveCharacterTextSplitter({
            chunkSize: 40_000,
            chunkOverlap: 500,
        });

        const model = new OpenAI({
            modelName: "gpt-4-1106-preview",
            temperature: 0.3,
        });

        // @ts-ignore Prisma stores transcript as a generic JsonValue
        const tokenCount = encoding.encode(transcript.paragraphs.transcript).length;

        let aiSummary = "";

        // gpt-4-1106-preview has a 128,000 token limit. Setting the limit to 126,000 to be safe.
        if (tokenCount < 126_000) {
            const template = `Given text is a transcript of a UX team conducting usability tests. Produce a summary including three sections, styled exactly as such:
          
          **Overview**: 
          
          Briefly encapsulate key discussions or outcomes. The summary targets UX professionals and web application developers; UX jargon usage is acceptable. 
      
          **Key Findings**: 
          
          5 to 10 insights in a numbered list, such as "1. User finds the log-in process difficult due to 2FA requirement". Start with issues and problems the user had during the usability test, then cover the remaining items. Do not talk about problems unrelated to the usability test (e.g., if the user had trouble sharing their screen to the researchers, or if the user had trouble with their internet connection). Do not refer to speakers as their integer labels (e.g., "Speaker 0 said..."). Whenever possible, refer to speakers by their names.
      
          **Quotes**: 
          
          Include 5-10 unique and direct quotes from the transcript that are representative of the user's experience. Do not include quotes that are not representative of the user's experience (e.g., if the user was talking about their personal life, or if the user was talking about a different product, or when the researcher was introducing the testing session, etc.). Do not repeat quotes.
      
          If the text isn't a usability test transcript, return an appropriate message.`;

            const humanTemplate = "{text}";

            const chatPrompt = ChatPromptTemplate.fromMessages([
                ["system", template],
                ["human", humanTemplate],
            ]);

            const chat = new ChatOpenAI(model);

            const chain = new LLMChain({
                llm: chat,
                prompt: chatPrompt,
            });

            const result = await chain.call({
                // @ts-ignore Prisma stores transcript as a generic JsonValue
                text: transcript.paragraphs.transcript as string,
            });

            aiSummary = result.text;
        } else {
            const splitTranscript = await splitter.createDocuments([
                // @ts-ignore Prisma stores transcript.paragraph as a generic JsonValue
                JSON.stringify(transcript.paragraphs.transcript),
            ]);

            const combineMapPromptTemplate = new PromptTemplate({
                inputVariables: ["text"],
                template: `The following is a chunk of text from the transcript of a UX team conducting a usability test. Speakers are labelled as integers, starting from 0. Summarize the text and provide 1-2 representative quotes from this chunk. Keep in mind that this summary will be fed to another summary-generation tool, so do not leave any important parts out.
      
            The output of this action should be a JSON object with the following structure:
              
            "summary": "The summary of the text goes here.",
              "quotes": [
                "The first quote goes here.",
                "The second quote goes here."
              ]
            Text:
            
            {text}`,
            });

            const combinePromptTemplate = new PromptTemplate({
                inputVariables: ["text"],
                template: `Given text is a transcript of a UX team conducting usability tests. Produce a summary including three sections, styled exactly as such:
          
            **Overview**: 
            
            Briefly encapsulate key discussions or outcomes. The summary targets UX professionals and web application developers; UX jargon usage is acceptable. 
        
            **Key Findings**: 
            
            5 to 10 insights in a numbered list, such as "1. User finds the log-in process difficult due to 2FA requirement". Start with issues and problems the user had during the usability test, then cover the remaining items. Do not talk about problems unrelated to the usability test (e.g., if the user had trouble sharing their screen to the researchers, or if the user had trouble with their internet connection). Do not refer to speakers as their integer labels (e.g., "Speaker 0 said..."). Whenever possible, refer to speakers by their names.
        
            **Quotes**: 
            
            Include 5-10 unique and direct quotes from the transcript that are representative of the user's experience. Do not include quotes that are not representative of the user's experience (e.g., if the user was talking about their personal life, or if the user was talking about a different product, or when the researcher was introducing the testing session, etc.). Do not repeat quotes.
        
            If the text isn't a usability test transcript, return an appropriate message.
      
            Text:
            
            {text}`,
            });

            // Generate a summary
            // https://js.langchain.com/docs/modules/chains/popular/summarize
            const summaryChain = loadSummarizationChain(model, {
                type: "map_reduce",
                verbose: true,
                combinePrompt: combinePromptTemplate,
                combineMapPrompt: combineMapPromptTemplate,
            });

            const result = await summaryChain.call({
                input_documents: splitTranscript,
            });

            aiSummary = result.text;
        }

        // Insert the summary to the DB
        const summary = await prisma.transcript.update({
            where: {
                id: transcriptId,
            },
            data: {
                summary: {
                    create: {
                        content: aiSummary,
                    },
                },
            },
            select: {
                summary: true,
            },
        });

        return res.status(HttpStatus.Ok).send(summary);
    } catch (error) {
        console.log(error);
        return res
            .status(HttpStatus.InternalServerError)
            .send(ErrorMessages.InternalServerError);
    }
});

export default router;

