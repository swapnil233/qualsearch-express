import prisma from "@/src/utils/prisma";
import { File as PrismaFile } from "@prisma/client";

export const getFileByDeepgramRequestId = async (requestId: string): Promise<PrismaFile | null> => {
    try {
        const file = await prisma.file.findFirst({
            where: {
                transcriptRequestId: {
                    request_id: requestId,
                }
            }
        });

        return file;
    } catch (error: any) {
        throw new Error(error);
    }
};

export const lockFileForProcessing = async (fileId: string): Promise<void> => {
    try {
        await prisma.file.update({
            where: { id: fileId },
            data: { status: 'PROCESSING' }
        });
    } catch (error: any) {
        throw new Error(error);
    }
}