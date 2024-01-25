import prisma from '../../utils/prisma';
import express from 'express';
const router = express.Router();

router.get('/', async (req, res) => {
    try {
        const users = await prisma.user.findMany();

        res.status(200).send(users);
    } catch (error: unknown) {
        if (error instanceof Error) {
            res.status(500).send({ message: error.message });
        }
    }
});

export default router;