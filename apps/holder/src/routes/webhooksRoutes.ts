import prisma from '@/src/utils/prisma';
import express from 'express';
const router = express.Router();
const QUALSEARCH_VERCEL_URL = process.env.QUALSEARCH_VERCEL_URL;
import { File as PrismaFile } from '@prisma/client'; // Rename the import
import { sendTranscriptionCompleteNotificationEmail } from '../infrastructure/services/email.service';
import { getFileByDeepgramRequestId, lockFileForProcessing } from '../infrastructure/services/file.service';

router.post('/deepgram', async (req, res) => {
  console.log('Deepgram webhook received');

  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  const { request_id } = req.body.metadata;
  if (!request_id) {
    return res.status(400).send('Bad Request: No request_id present');
  }

  let file: PrismaFile | null = null;

  try {
    file = await getFileByDeepgramRequestId(request_id);

    if (!file) {
      console.log(`File not found for request ${request_id}`);
      return res.status(404).send('File not found');
    }

    if (file.status === 'COMPLETED') {
      console.log(`File ${file.id} already processed`);
      return res.status(200).send('Already processed');
    }

    // Lock the file for processing
    await lockFileForProcessing(file.id);

    const dgResponse = req.body.results.channels[0].alternatives[0];
    const metadata = req.body.metadata;

    const transcriptData = {
      confidence: dgResponse.confidence,
      words: dgResponse.words,
      topics: dgResponse.topics || {},
      entities: dgResponse.entities || {},
      summaries: dgResponse.summaries || {},
      paragraphs: dgResponse.paragraphs,
      transcriptString: dgResponse.transcript,
      metadata: {
        create: {
          created: metadata.created,
          tags: metadata.tags,
          models: metadata.models,
          sha256: metadata.sha256,
          channels: metadata.channels,
          duration: metadata.duration,
          model_info: metadata.model_info,
          request_id: request_id,
        },
      },
      file: {
        connect: {
          id: file.id,
        },
      },
    };

    try {
      const [updatedFile] = await prisma.$transaction(async (prisma) => {
        const existingTranscript = await prisma.transcript.findUnique({
          where: { fileId: file?.id },
        });

        if (!existingTranscript) {
          await prisma.transcript.create({
            data: transcriptData,
          });
        }

        const updatedFile = await prisma.file.update({
          where: { id: file?.id },
          data: { status: 'COMPLETED' },
        });

        return [updatedFile];
      });

      // Create embeddings for the new transcript
      // console.log("Creating embeddings for the new transcript...");
      // await fetch(`${EXPRESS_BACKEND_URL}/api/embeddings`, {
      //     method: "POST",
      //     headers: {
      //         "Content-Type": "application/json",
      //     },
      //     body: JSON.stringify({
      //         transcriptId: newTranscript.id,
      //     }),
      // });
      // console.log("Embeddings created.");

      // Get the team and users associated with this file
      // Send email notification

      const teamWithUsers = await prisma.team.findUnique({
        where: { id: file.teamId },
        include: { users: true },
      });

      if (teamWithUsers) {
        const linkToTranscribedFile = `${QUALSEARCH_VERCEL_URL}/teams/${teamWithUsers.id}/projects/${file.projectId}/files/${file.id}`;
        for (const user of teamWithUsers.users) {
          await sendTranscriptionCompleteNotificationEmail(
            linkToTranscribedFile,
            user.name as string,
            file.name,
            user.email as string
          );
        }
      }

      return res.status(200).send({
        fileWithThisRequestId: file.id,
        updatedFileStatus: updatedFile.status,
      });
    } catch (transactionError) {
      console.error('Transaction failed:', transactionError);
      throw transactionError;
    }
  } catch (error: unknown) {
    console.error(error);

    // Attempt to update file status to ERROR
    if (file) {
      try {
        await prisma.file.update({
          where: { id: file.id },
          data: { status: 'ERROR' },
        });
      } catch (updateError) {
        console.error('Failed to update file status to ERROR:', updateError);
      }
    }

    if (error instanceof Error) {
      res.status(500).send(`[500] Internal Server Error: ${error.message}`);
    } else {
      res.status(500).send('[500] Internal Server Error');
    }
  }
});

export default router;
