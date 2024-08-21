import prisma from "@/src/utils/prisma";
import { File } from "@prisma/client";

export const getFileByDeepgramRequestId = async (requestId: string): Promise<File | null> => {
    try {
        const res = await prisma.deepgramTranscriptRequest.findUnique({
            where: {
                request_id: requestId,
            },
            select: {
                file: true,
            },
        });

        return res?.file ?? null;
    } catch (error: any) {
        throw new Error(error);
    }
};