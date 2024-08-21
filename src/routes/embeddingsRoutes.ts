import { ErrorMessages } from "@/src/constants/ErrorMessages";
import { HttpStatus } from "@/src/constants/HttpStatus";
import { Request, Response, Router } from "express";
import { PineconeStore } from "langchain/vectorstores/pinecone";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { getTranscriptById } from "@/src/infrastructure/services/transcript.service";
import pinecone from "@/src/utils/pinecone";
import prisma from "@/src/utils/prisma";
import { Document } from "langchain/document";

const router = Router();

interface INoteEmbeddingRequestBody {
    fileId: string;
    noteId: string;
}

interface IProjectEmbeddingRequestBody {
    projectId: string;
    noteId: string;
}

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
            console.error("Transcript not found.");
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

        console.log("Embedding successful.");
        return res.status(HttpStatus.Ok).send({ message: "Embedding successful." });
    } catch (error) {
        console.log(error);
        return res
            .status(HttpStatus.InternalServerError)
            .send(ErrorMessages.InternalServerError);
    }
});

router.post("/notes", async (req: Request, res: Response) => {
    try {
        // Retrieve transcriptId from the request body.
        const { fileId, noteId } = req.body as INoteEmbeddingRequestBody;

        // Validate that transcriptId is provided.
        if (!fileId || !noteId) {
            return res.status(HttpStatus.BadRequest).send(ErrorMessages.BadRequest);
        }

        // Get the note from the database.
        let note = await prisma.note.findUnique({
            where: {
                id: noteId,
            },
            select: {
                text: true,
                transcriptText: true,
                createdAt: true,
                tags: {
                    select: {
                        name: true,
                    },
                },
                createdBy: {
                    select: {
                        name: true,
                        email: true,
                    },
                },
                file: {
                    select: {
                        name: true,
                        description: true,
                        participantName: true,
                        participantOrganization: true,
                        dateConducted: true,
                    },
                },
                project: {
                    select: {
                        name: true,
                        description: true,
                    },
                },
                start: true,
                end: true,
            },
        });

        const pineconeIndex = pinecone.Index(process.env.PINECONE_INDEX_NAME!);

        // Split transcript into 10,000 char chunks with 500 char overlap
        const splitter = new RecursiveCharacterTextSplitter({
            chunkSize: 10000,
            chunkOverlap: 500,
        });

        const splitNoteInfo = await splitter.createDocuments([
            JSON.stringify(note),
        ]);

        // Upsert transcript embeddings to Pinecone vector store.
        await PineconeStore.fromDocuments(
            splitNoteInfo,
            new OpenAIEmbeddings({
                openAIApiKey: process.env.OPENAI_API_KEY,
            }),
            {
                pineconeIndex,
                namespace: `file-${fileId}-notes`,
                textKey: "text",
            }
        );

        return res.status(HttpStatus.Ok).send("Embedding successful");
    } catch (error) {
        console.log(error);
        return res
            .status(HttpStatus.InternalServerError)
            .send(ErrorMessages.InternalServerError);
    }
});

router.post("/projects", async (req: Request, res: Response) => {
    try {
        // Retrieve transcriptId from the request body.
        const { projectId, noteId } = req.body as IProjectEmbeddingRequestBody;

        // Validate that transcriptId is provided.
        if (!projectId || !noteId) {
            return res.status(HttpStatus.BadRequest).send(ErrorMessages.BadRequest);
        }

        // Get the note from the database.
        let note = await prisma.note.findUnique({
            where: {
                id: noteId,
            },
            select: {
                text: true,
                transcriptText: true,
                createdAt: true,
                tags: {
                    select: {
                        name: true,
                    },
                },
                createdBy: {
                    select: {
                        name: true,
                        email: true,
                    },
                },
                file: {
                    select: {
                        name: true,
                        description: true,
                        participantName: true,
                        participantOrganization: true,
                        dateConducted: true,
                    },
                },
                project: {
                    select: {
                        name: true,
                        description: true,
                    },
                },
                start: true,
                end: true,
            },
        });

        const docs = new Array(
            new Document({
                pageContent: JSON.stringify(note),
            })
        );

        const pineconeIndex = pinecone.Index(process.env.PINECONE_INDEX_NAME!);

        // Upsert transcript embeddings to Pinecone vector store.
        const embeddings = await PineconeStore.fromDocuments(
            docs,
            new OpenAIEmbeddings({
                openAIApiKey: process.env.OPENAI_API_KEY,
            }),
            {
                pineconeIndex,
                namespace: `project-${projectId}-notes`,
                textKey: "text",
            }
        );

        console.log("Embeddings", embeddings.embeddings);

        return res.status(HttpStatus.Ok).send(embeddings);
    } catch (error) {
        console.log(error);
        return res
            .status(HttpStatus.InternalServerError)
            .send(ErrorMessages.InternalServerError);
    }
});

export default router;