import express from "express"
import { and, count, eq, gte, inArray, desc, lt } from "drizzle-orm";
import { database } from "../../db/index.js";
import { partsTable, partManualsTable, projectTable, projectViewsTable, usersTable, projectBookmarksTable, partBookmarksTable } from "../../db/schema.js";
import verifySession from "../../middleware/verifySession.js";
import isAuthenticated from "../../middleware/isAuthenticated.js";
import { validate } from "../../middleware/validate.js";
import { listBookmarksValidator } from "../../validators/bookmark.validator.js";
import { paginate } from "../../lib/pagination.js";

const router = express.Router()

router.get('/projects', verifySession, async (req, res) => {
        const projects = await database
                .select({
                        id: projectTable.id,
                        publicId: projectTable.publicId,
                        name: projectTable.name,
                        description: projectTable.description,
                        glbFileUrl: projectTable.glbFileUrl,
                        unlisted: projectTable.unlisted,
                        createdAt: projectTable.createdAt,
                        updatedAt: projectTable.updatedAt,
                })
                .from(projectTable)
                .where(eq(projectTable.userId, req.user!.id)).orderBy(desc(projectTable.updatedAt));

        const projectIds = projects.map((project) => project.id);
        const [partsByProject, viewsByProject] = projectIds.length === 0
                ? [[], []]
                : await Promise.all([
                        database
                                .select({
                                        projectId: partsTable.projectId,
                                        count: count(),
                                })
                                .from(partsTable)
                                .where(inArray(partsTable.projectId, projectIds))
                                .groupBy(partsTable.projectId),
                        database
                                .select({
                                        projectId: projectViewsTable.projectId,
                                        count: count(),
                                })
                                .from(projectViewsTable)
                                .where(inArray(projectViewsTable.projectId, projectIds))
                                .groupBy(projectViewsTable.projectId),
                ]);

        const partsCounts = new Map(
                partsByProject.map((row) => [row.projectId, Number(row.count)]),
        );
        const viewCounts = new Map(
                viewsByProject.map((row) => [row.projectId, Number(row.count)]),
        );

        const data = projects.map((project) => ({
                ...project,
                parts: partsCounts.get(project.id) ?? 0,
                views: viewCounts.get(project.id) ?? 0,
        }));

        return res.status(200).json({
                success: true,
                message: "Projects retrieved",
                data,
                stats: {
                        total_projects: projects.length,
                        total_parts: data.reduce((total, project) => total + project.parts, 0),
                        total_views: data.reduce((total, project) => total + project.views, 0),
                },
                code: 200,
        });
});

router.get('/project/:publicId/details', verifySession, async (req, res) => {
        const { publicId } = req.params;
        if (typeof publicId !== "string") {
                return res.status(400).json({
                        success: false,
                        message: "Invalid project identifier",
                        data: null,
                        code: 400,
                });
        }

        const [project] = await database
                .select()
                .from(projectTable)
                .where(and(
                        eq(projectTable.publicId, publicId),
                        eq(projectTable.userId, req.user!.id),
                ))
                .limit(1);

        if (!project) {
                return res.status(404).json({
                        success: false,
                        message: "Project not found",
                        data: null,
                        code: 404,
                });
        }

        return res.status(200).json({
                success: true,
                message: "Project details retrieved",
                data: project,
                code: 200,
        });
});

router.get('/project/:publicId/analytics', verifySession, async (req, res) => {
        const { publicId } = req.params;
        if (typeof publicId !== "string") {
                return res.status(400).json({
                        success: false,
                        message: "Invalid project identifier",
                        data: null,
                        code: 400,
                });
        }

        const [project] = await database
                .select({
                        id: projectTable.id,
                        publicId: projectTable.publicId,
                        name: projectTable.name,
                })
                .from(projectTable)
                .where(and(
                        eq(projectTable.publicId, publicId),
                        eq(projectTable.userId, req.user!.id),
                ))
                .limit(1);

        if (!project) {
                return res.status(404).json({
                        success: false,
                        message: "Project not found",
                        data: null,
                        code: 404,
                });
        }

        const now = new Date();
        const startOfToday = new Date(now);
        startOfToday.setUTCHours(0, 0, 0, 0);
        const startOfWeek = new Date(startOfToday);
        const dayOfWeek = startOfWeek.getUTCDay();
        startOfWeek.setUTCDate(startOfWeek.getUTCDate() - dayOfWeek);
        const startOfMonth = new Date(Date.UTC(
                now.getUTCFullYear(),
                now.getUTCMonth(),
                1,
        ));

        const [total, today, thisWeek, thisMonth, recentViews] = await Promise.all([
                database
                        .select({ count: count() })
                        .from(projectViewsTable)
                        .where(eq(projectViewsTable.projectId, project.id)),
                database
                        .select({ count: count() })
                        .from(projectViewsTable)
                        .where(and(
                                eq(projectViewsTable.projectId, project.id),
                                gte(projectViewsTable.viewedAt, startOfToday),
                        )),
                database
                        .select({ count: count() })
                        .from(projectViewsTable)
                        .where(and(
                                eq(projectViewsTable.projectId, project.id),
                                gte(projectViewsTable.viewedAt, startOfWeek),
                        )),
                database
                        .select({ count: count() })
                        .from(projectViewsTable)
                        .where(and(
                                eq(projectViewsTable.projectId, project.id),
                                gte(projectViewsTable.viewedAt, startOfMonth),
                        )),
                database
                        .select({ viewedAt: projectViewsTable.viewedAt })
                        .from(projectViewsTable)
                        .where(eq(projectViewsTable.projectId, project.id))
                        .orderBy(desc(projectViewsTable.viewedAt))
                        .limit(10),
        ]);

        return res.status(200).json({
                success: true,
                message: "Project analytics retrieved",
                data: {
                        project,
                        uniqueViewers: Number(total[0]?.count ?? 0),
                        viewersToday: Number(today[0]?.count ?? 0),
                        viewersThisWeek: Number(thisWeek[0]?.count ?? 0),
                        viewersThisMonth: Number(thisMonth[0]?.count ?? 0),
                        recentlyViewed: recentViews.map(({ viewedAt }) => viewedAt),
                },
                code: 200,
        });
});

router.get('/project/:publicId/parts', verifySession, async (req, res) => {
        const { publicId } = req.params;
        if (typeof publicId !== "string") {
                return res.status(400).json({
                        success: false,
                        message: "Invalid project identifier",
                        data: null,
                        code: 400,
                });
        }

     
        const [projectRecord] = await database
                .select({
                        id: projectTable.id,
                        publicId: projectTable.publicId,
                        name: projectTable.name,
                        description: projectTable.description,
                        glbFileUrl: projectTable.glbFileUrl,
                        unlisted: projectTable.unlisted,
                        createdAt: projectTable.createdAt,
                        updatedAt: projectTable.updatedAt,
                })
                .from(projectTable)
                .where(and(
                        eq(projectTable.publicId, publicId),
                        eq(projectTable.userId, req.user!.id),
                ))
                .limit(1);

        if (!projectRecord) {
                return res.status(404).json({
                        success: false,
                        message: "Project not found",
                        data: null,
                        code: 404,
                });
        }

        const projectId = projectRecord.id;
        const project = projectRecord;

        const rows = await database
                    .select({
                            part: {
                                    id: partsTable.id,
                                    partNumber: partsTable.partNumber,
                                    name: partsTable.name,
                                    description: partsTable.description,
                                    createdAt: partsTable.createdAt,
                                    updatedAt: partsTable.updatedAt,
                            },
                            manual: {
                                    id: partManualsTable.id,
                                    title: partManualsTable.title,
                                    fileUrl: partManualsTable.fileUrl,
                                    uploadedAt: partManualsTable.uploadedAt,
                            },
                    })
                    .from(partsTable)
                    .leftJoin(partManualsTable, eq(partManualsTable.partId, partsTable.id))
                    .where(eq(partsTable.projectId, projectId))
                    .orderBy(desc(partManualsTable.uploadedAt));

        const parts = new Map<string, {
                    id: string;
                    partNumber: string;
                    name: string;
                    description: string | null;
                    createdAt: Date;
                    updatedAt: Date;
                    manuals: Array<{
                            id: string;
                            title: string;
                            fileUrl: string;
                            uploadedAt: Date;
                    }>;
        }>();

        for (const row of rows) {
                    if (!parts.has(row.part.id)) {
                            parts.set(row.part.id, {
                                    ...row.part,
                                    manuals: [],
                            });
                    }

                    if (row.manual) {
                            parts.get(row.part.id)!.manuals.push(row.manual);
                    }
        }

        return res.status(200).json({
                success: true,
                message: "Project manuals retrieved",
                data: {
                            project,
                            parts: Array.from(parts.values()),
                },
                code: 200,
        });
});

router.get('/project/:publicId/meta', async (req, res) => {
        const { publicId } = req.params;
        if (typeof publicId !== "string") {
                return res.status(400).json({
                        success: false,
                        message: "Invalid project identifier",
                        data: null,
                        code: 400,
                });
        }

        const [project] = await database
                .select({
                        id: projectTable.id,
                        publicId: projectTable.publicId,
                        name: projectTable.name,
                        description: projectTable.description,
                        unlisted: projectTable.unlisted,
                        createdAt: projectTable.createdAt,
                        updatedAt: projectTable.updatedAt,
                        owner: {
                                id: usersTable.id,
                                username: usersTable.username,
                                name: usersTable.name,
                                avatarUrl: usersTable.avatarUrl,
                        },
                })
                .from(projectTable)
                .innerJoin(usersTable, eq(projectTable.userId, usersTable.id))
                .where(eq(projectTable.publicId, publicId))
                .limit(1);

        if (!project) {
                return res.status(404).json({
                        success: false,
                        message: "Project not found",
                        data: null,
                        code: 404,
                });
        }

        return res.status(200).json({
                success: true,
                message: "Project meta retrieved",
                data: project,
                code: 200,
        });
});

router.get('/project/:publicId', isAuthenticated, async (req, res) => {
        const { publicId } = req.params;
        if (typeof publicId !== "string") {
                return res.status(400).json({
                        success: false,
                        message: "Invalid project identifier",
                        data: null,
                        code: 400,
                });
        }

        const projectRows = await database
                .select({
                        project: projectTable,
                        owner: {
                                id: usersTable.id,
                                username: usersTable.username,
                                name: usersTable.name,
                                avatarUrl: usersTable.avatarUrl,
                                createdAt: usersTable.createdAt,
                        },
                        part: partsTable,
                        manual: partManualsTable,
                })
                .from(projectTable)
                .innerJoin(usersTable, eq(projectTable.userId, usersTable.id))
                .leftJoin(partsTable, eq(partsTable.projectId, projectTable.id))
                .leftJoin(partManualsTable, eq(partManualsTable.partId, partsTable.id))
                .where(eq(projectTable.publicId, publicId));

        if (projectRows.length === 0) {
                return res.status(404).json({
                        success: false,
                        message: "Project not found",
                        data: null,
                        code: 404,
                });
        }

        const project = projectRows[0].project;
        const ip = req.ip || "unknown";

        const [viewCount] = await database
                .select({ views: count() })
                .from(projectViewsTable)
                .where(eq(projectViewsTable.projectId, project.id));

        const parts = new Map<string, NonNullable<typeof projectRows[number]["part"]>>();
        const manualsByPart = new Map<string, NonNullable<typeof projectRows[number]["manual"]>[]>();

        for (const row of projectRows) {
                if (!row.part) {
                        continue;
                }

                if (!parts.has(row.part.id)) {
                        parts.set(row.part.id, row.part);
                        manualsByPart.set(row.part.id, []);
                }

                if (row.manual) {
                        manualsByPart.get(row.part.id)!.push(row.manual);
                }
        }

        let projectBookmarked = false;
        const bookmarkedPartIds = new Set<string>();

        if (req.isAuthenticated && req.user) {
                const userId = req.user.id;

                const [projectBookmark] = await database
                        .select({ id: projectBookmarksTable.id })
                        .from(projectBookmarksTable)
                        .where(and(
                                eq(projectBookmarksTable.userId, userId),
                                eq(projectBookmarksTable.projectId, project.id),
                        ))
                        .limit(1);
                projectBookmarked = Boolean(projectBookmark);

                const partIds = Array.from(parts.keys());
                if (partIds.length > 0) {
                        const partBookmarks = await database
                                .select({ partId: partBookmarksTable.partId })
                                .from(partBookmarksTable)
                                .where(and(
                                        eq(partBookmarksTable.userId, userId),
                                        inArray(partBookmarksTable.partId, partIds),
                                ));
                        for (const bookmark of partBookmarks) {
                                bookmarkedPartIds.add(bookmark.partId);
                        }
                }
        }

        const data = {
                ...project,
                bookmarked: projectBookmarked,
                owner: projectRows[0].owner,
                views: Number(viewCount.views),
                parts: Array.from(parts.values()).map((part) => ({
                        ...part,
                        bookmarked: bookmarkedPartIds.has(part.id),
                        manuals: manualsByPart.get(part.id) ?? [],
                })),
        };

        res.status(200).json({
                success: true,
                message: "Project retrieved",
                data,
                code: 200,
        });

        await database
                .insert(projectViewsTable)
                .values({ projectId: project.id, ip, viewedAt: new Date() })
                .onConflictDoUpdate({
                        target: [projectViewsTable.projectId, projectViewsTable.ip],
                        set: { viewedAt: new Date() },
                });

        return;
});




router.get('/bookmarks', verifySession, validate(listBookmarksValidator), async (req, res) => {
        const type = req.query.type;
        if (typeof type !== "string" || (type !== "parts" && type !== "projects")) {
                return res.status(400).json({
                        success: false,
                        message: "Invalid bookmark type",
                        data: null,
                        errors: ["type must be 'parts' or 'projects'"],
                        code: 400,
                });
        }

        const rawCursor = typeof req.query.cursor === "string" ? req.query.cursor : undefined;
        const limit = typeof req.query.limit === "string" ? Number(req.query.limit) : 10;

        const userId = req.user!.id;

        if (type === "projects") {
                const conditions = [eq(projectBookmarksTable.userId, userId)];
                if (rawCursor) {
                        conditions.push(lt(projectBookmarksTable.id, rawCursor));
                }

                const rows = await database
                        .select({
                                id: projectBookmarksTable.id,
                                createdAt: projectBookmarksTable.createdAt,
                                project: {
                                        id: projectTable.id,
                                        publicId: projectTable.publicId,
                                        name: projectTable.name,
                                        description: projectTable.description,
                                        glbFileUrl: projectTable.glbFileUrl,
                                        unlisted: projectTable.unlisted,
                                        createdAt: projectTable.createdAt,
                                        updatedAt: projectTable.updatedAt,
                                },
                        })
                        .from(projectBookmarksTable)
                        .innerJoin(projectTable, eq(projectBookmarksTable.projectId, projectTable.id))
                        .where(and(...conditions))
                        .orderBy(desc(projectBookmarksTable.id))
                        .limit(limit + 1);

                const { items, hasMore, nextCursor } = paginate(rows, limit);

                return res.status(200).json({
                        success: true,
                        message: "Project bookmarks retrieved",
                        data: { items, nextCursor, hasMore },
                        code: 200,
                });
        }

        const conditions = [eq(partBookmarksTable.userId, userId)];
        if (rawCursor) {
                conditions.push(lt(partBookmarksTable.id, rawCursor));
        }

        const rows = await database
                .select({
                        id: partBookmarksTable.id,
                        createdAt: partBookmarksTable.createdAt,
                        part: {
                                id: partsTable.id,
                                partNumber: partsTable.partNumber,
                                name: partsTable.name,
                                description: partsTable.description,
                                createdAt: partsTable.createdAt,
                                updatedAt: partsTable.updatedAt,
                        },
                        project: {
                                id: projectTable.id,
                                publicId: projectTable.publicId,
                                name: projectTable.name,
                        },
                })
                .from(partBookmarksTable)
                .innerJoin(partsTable, eq(partBookmarksTable.partId, partsTable.id))
                .innerJoin(projectTable, eq(partsTable.projectId, projectTable.id))
                .where(and(...conditions))
                .orderBy(desc(partBookmarksTable.id))
                .limit(limit + 1);

        const { items, hasMore, nextCursor } = paginate(rows, limit);

        return res.status(200).json({
                success: true,
                message: "Part bookmarks retrieved",
                data: { items, nextCursor, hasMore },
                code: 200,
        });
});

export default router