import { StatusCodes } from 'http-status-codes';

import prisma from '../utils/prisma.js';

/**
 * Create a new program.  
 * *Only users with the **COMPANY** role can create programs.*
 * @param {import('express').Request} req The request object, with body containing `{ name, description, scope, rewardMin, rewardMax }` and `req.user` set by authentication middleware
 * @param {import('express').Response} res The response object
 * @returns {Promise<import('express').Response>} The created program
 */
async function createProgram(req, res) {
	const { name, description, scope, rewardMin, rewardMax } = req.body;

	if (!name || !description || !scope || !rewardMin || !rewardMax) {
		return res.status(StatusCodes.BAD_REQUEST).json({ error: 'All fields are required' });
	}

	try {
		const program = await prisma.program.create({
			data: {
				name,
				description,
				scope,
				rewardMin,
				rewardMax,
				companyId: req.user.id, // The authenticated COMPANY user
			},
		});

		return res.status(StatusCodes.CREATED).json(program);
	} catch (error) {
		console.error(error);
		return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: 'Failed to create program' });
	}
}

/**
 * Get all programs.  
 * *Publicly accessible.*
 * @param {import('express').Response} res The response object
 * @return {Promise<import('express').Response>} List of programs
 */
async function getPrograms(req, res) {
	try {
		const programs = await prisma.program.findMany();
		return res.status(StatusCodes.OK).json(programs);
	} catch (error) {
		console.error(error);
		return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: 'Failed to fetch programs' });
	}
}

/**
 * Get a single program by its ID.
 * *Publicly accessible.*
 * @param {import('express').Request} req The request object, with `req.params.id`
 * @param {import('express').Response} res The response object
 * @returns {Promise<import('express').Response>} The program object or 404 if not found
 */
async function getProgramById(req, res) {
	const { id } = req.params;

	try {
		const program = await prisma.program.findUnique({
			where: { id },
		});

		if (!program) {
			return res.status(StatusCodes.NOT_FOUND).json({ error: 'Program not found' });
		}

		return res.status(StatusCodes.OK).json(program);
	} catch (error) {
		console.error(error);
		return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: 'Failed to fetch program' });
	}
}

/**
 * Update a program.
 * *Only the **COMPANY** that owns the program can update it.*
 * @param {import('express').Request} req The request object, with body containing `{ name, description, scope, rewardMin, rewardMax }` and `req.user` set by authentication middleware
 * @param {import('express').Response} res The response object
 * @returns {Promise<import('express').Response>} The updated program
 */
async function updateProgram(req, res) {
	const { id } = req.params;
	const { name, description, scope, rewardMin, rewardMax } = req.body;

	try {
		const program = await prisma.program.findUnique({ where: { id } });

		if (!program) {
			return res.status(StatusCodes.NOT_FOUND).json({ error: 'Program not found' });
		}

		if (program.companyId !== req.user.id) {
			return res.status(StatusCodes.FORBIDDEN).json({ error: 'You are not authorized to update this program' });
		}

		const updatedProgram = await prisma.program.update({
			where: { id },
			data: { name, description, scope, rewardMin, rewardMax },
		});

		return res.status(StatusCodes.OK).json(updatedProgram);
	} catch (error) {
		console.error(error);
		return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: 'Failed to update program' });
	}
}

/**
 * Delete a program.
 * *Only the **COMPANY** that owns the program can delete it.*
 * @param {import('express').Request} req The request object, with `req.user` set by authentication middleware
 * @param {import('express').Response} res The response object
 * @returns {Promise<import('express').Response>} No content on success
 */
async function deleteProgram(req, res) {
	const { id } = req.params;

	try {
		const program = await prisma.program.findUnique({ where: { id } });

		if (!program) {
			return res.status(StatusCodes.NOT_FOUND).json({ error: 'Program not found' });
		}

		if (program.companyId !== req.user.id) {
			return res.status(StatusCodes.FORBIDDEN).json({ error: 'You are not authorized to delete this program' });
		}

		await prisma.program.delete({ where: { id } });
		return res.status(StatusCodes.NO_CONTENT).send();
	} catch (error) {
		console.error(error);
		return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: 'Failed to delete program' });
	}
}

export { createProgram, getPrograms, getProgramById, updateProgram, deleteProgram };
