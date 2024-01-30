import { ErrorMessages } from "@/constants/ErrorMessages";
import { HttpStatus } from "@/constants/HttpStatus";
import { Request, Response, Router } from "express";
import { PineconeStore } from "langchain/vectorstores/pinecone";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { getTranscriptById } from "@/infrastructure/transcript.service";
import pinecone from "@/utils/pinecone";

const router = Router();

router.post("/", async (req: Request, res: Response) => {
    try {
        // Retrieve transcriptId from the request body.
        const { transcriptId } = req.body;

        // Validate that transcriptId is provided.
        if (!transcriptId) {
            return res.status(HttpStatus.BadRequest).send(ErrorMessages.BadRequest);
        }

        // Get the transcript from DB
        const transcript = await getTranscriptById(transcriptId as string);

        if (!transcript) {
            return res.status(HttpStatus.NotFound).send(ErrorMessages.NotFound);
        }

        const pineconeIndex = pinecone.Index(process.env.PINECONE_INDEX_NAME!);

        // Split transcript into 10,000 char chunks with 500 char overlap
        const splitter = new RecursiveCharacterTextSplitter({
            chunkSize: 10000,
            chunkOverlap: 500,
        });

        const splitTranscript = await splitter.createDocuments([
            // @ts-ignore
            JSON.stringify(transcript.paragraphs.transcript),
        ]);

        // Upsert transcript embeddings to Pinecone vector store.
        await PineconeStore.fromDocuments(
            splitTranscript,
            new OpenAIEmbeddings({
                openAIApiKey: process.env.OPENAI_API_KEY,
            }),
            {
                pineconeIndex,
                namespace: `file-${transcript.fileId}-transcript-${transcript.id}`,
                textKey: "text",
            }
        );

        return res.status(HttpStatus.Ok).send({ message: "Embedding successful." });
    } catch (error) {
        console.log(error);
        return res
            .status(HttpStatus.InternalServerError)
            .send(ErrorMessages.InternalServerError);
    }
});

export default router;