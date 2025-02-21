import Fastify, { FastifyRequest, FastifyReply } from 'fastify';
import { config } from 'dotenv';
import { getFrameworkSnippets } from './src/analyzeFramework';

config(); // Load environment variables from .env file

const fastify = Fastify({ logger: true });

interface SnippetsQuery {
    owner: string;
    repo: string;
    ref: string;
}

fastify.get('/snippets', async (request: FastifyRequest<{ Querystring: SnippetsQuery }>, reply: FastifyReply) => {
    const { owner, repo, ref } = request.query;

    try {
        const snippets = await getFrameworkSnippets(owner, repo, ref);
        reply.send({ snippets });
    } catch (error) {
        reply.status(500).send({ error: (error as Error).message });
    }
});

const start = async () => {
    try {
        await fastify.listen({ port: 3000 });
        fastify.log.info(`Server is running on port 3000`);
    } catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
};

start();