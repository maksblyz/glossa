import { getKindeServerSession } from '@kinde-oss/kinde-auth-nextjs/server';
import { privateProcedure, publicProcedure, router } from './core';
import { TRPCError } from '@trpc/server';
import { db } from '@/db';
import { z } from 'zod'

export const appRouter = router({
    authCallback: publicProcedure.query(async () => {
        const { getUser } = getKindeServerSession();
        const user =  await getUser();

        if(!user?.id || !user?.email) {
            throw new TRPCError({code: "UNAUTHORIZED"});
        }
        
        // check if the user is in the database
        const dbUser = await db.user.findFirst({
            where: {
                id: user.id
            }
        })

        if(!dbUser){
            // create user in db
            await db.user.create({
                data: {
                    id: user.id,
                    email: user.email
                }
            })
        }

        return { success: true, email: user.email };
    }),
    getUserFiles: privateProcedure.query(async ({ctx}) => {
        const {userId} = ctx

        return await db.file.findMany({
            where: {
                userId
            }
        })
    }),
    deleteFile: privateProcedure.input(
        z.object({id: z.string()})
    ).mutation(async ({ctx, input}) => {
        const { userId } = ctx

        const file = await db.file.findFirst({
            where: {
                id: input.id,
                userId,
            },
        })

        if(!file) throw new TRPCError({ code: 'NOT_FOUND'})
        
        await db.file.delete({
            where: {
                id: input.id,
            },
        })
        return file
    }),
    updateFilePosition: privateProcedure.input(
        z.object({
            id: z.string(),
            x: z.number(),
            y: z.number()
        })
    ).mutation(async ({ctx, input}) => {
        const { userId } = ctx

        const file = await db.file.findFirst({
            where: {
                id: input.id,
                userId,
            },
        })

        if(!file) throw new TRPCError({ code: 'NOT_FOUND'})
        
        return await db.file.update({
            where: {
                id: input.id,
            },
            data: {
                x: input.x,
                y: input.y
            },
        })
    }),
})


export type AppRouter = typeof appRouter