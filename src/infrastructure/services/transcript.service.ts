import prisma from "@/src/utils/prisma";
import { Transcript } from "@prisma/client";

export const getTranscriptById = async (
  id: string
): Promise<Transcript | null> => {
  try {
    const transcript = await prisma.transcript.findUnique({
      where: {
        id: id,
      },
    });

    return transcript;
  } catch (error: any) {
    throw new Error(error);
  }
};
