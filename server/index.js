
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
// Increase limit for base64 images
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// --- UTILS ---
const mapUser = (row) => ({
    id: row.ID_USER,
    acronym: row.ACRONYM,
    name: row.NAME,
    password: row.PASSWORD, 
    role: row.ROLE,
    isActive: row.IS_ACTIVE === 1
});

// --- ROUTES ---

// 1. USERS
app.get('/api/users', async (req, res) => {
    try {
        const result = await db.simpleExecute('SELECT * FROM TB_USERS');
        res.json(result.rows.map(mapUser));
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/users', async (req, res) => {
    const { id, acronym, name, password, role, isActive } = req.body;
    try {
        await db.simpleExecute(
            `INSERT INTO TB_USERS (ID_USER, ACRONYM, NAME, PASSWORD, ROLE, IS_ACTIVE) 
             VALUES (:id, :acronym, :name, :password, :role, :isActive)`,
            { id, acronym, name, password, role, isActive: isActive ? 1 : 0 }
        );
        res.json(req.body);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.put('/api/users/:id', async (req, res) => {
    const { name, password, role, isActive } = req.body;
    const { id } = req.params;
    try {
        await db.simpleExecute(
            `UPDATE TB_USERS SET NAME = :name, PASSWORD = :password, ROLE = :role, IS_ACTIVE = :isActive WHERE ID_USER = :id`,
            { name, password, role, isActive: isActive ? 1 : 0, id }
        );
        res.json(req.body);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.delete('/api/users/:id', async (req, res) => {
    try {
        await db.simpleExecute('DELETE FROM TB_USERS WHERE ID_USER = :id', { id: req.params.id });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// 2. TICKETS
app.get('/api/tickets', async (req, res) => {
    try {
        // 1. Get Tickets
        const ticketsResult = await db.simpleExecute('SELECT * FROM TB_TICKETS ORDER BY CREATED_AT DESC');
        const tickets = [];

        for (const t of ticketsResult.rows) {
            const ticketId = t.ID_TICKET;
            
            // 2. Get Evidences
            const evResult = await db.simpleExecute(
                `SELECT * FROM TB_EVIDENCES WHERE ID_TICKET = :tid ORDER BY SCENARIO_NUMBER, CASE_NUMBER`,
                { tid: ticketId }
            );

            const items = [];
            for (const e of evResult.rows) {
                const evId = e.ID_EVIDENCE;
                
                // 3. Get Steps
                const stepResult = await db.simpleExecute(
                    `SELECT * FROM TB_EVIDENCE_STEPS WHERE ID_EVIDENCE = :eid ORDER BY STEP_NUMBER`,
                    { eid: evId }
                );

                const steps = stepResult.rows.map(s => ({
                    stepNumber: s.STEP_NUMBER,
                    description: s.DESCRIPTION,
                    imageUrl: s.IMAGE_DATA // CLOB read as string automatically by oracledb in most cases
                }));

                items.push({
                    id: e.ID_EVIDENCE,
                    title: e.TITLE,
                    description: e.DESCRIPTION,
                    imageUrl: e.IMAGE_URL,
                    status: e.STATUS,
                    severity: e.SEVERITY,
                    timestamp: new Date(e.CREATED_AT).getTime(),
                    createdBy: t.CREATED_BY,
                    ticketInfo: { 
                        ticketId: t.EXTERNAL_TICKET_ID,
                        ticketTitle: t.TITLE,
                        analyst: t.ANALYST_ACRONYM,
                        sprint: t.SPRINT,
                        priority: t.PRIORITY,
                        ticketSummary: t.SUMMARY,
                        clientSystem: t.CLIENT_SYSTEM,
                        requester: t.REQUESTER,
                        environment: t.ENVIRONMENT,
                        environmentVersion: t.ENV_VERSION,
                        requestDate: t.REQUEST_DATE ? new Date(t.REQUEST_DATE).toISOString().split('T')[0] : '',
                        evidenceDate: t.EVIDENCE_DATE ? new Date(t.EVIDENCE_DATE).toISOString().split('T')[0] : '',
                        ticketDescription: t.DESCRIPTION,
                        solution: t.SOLUTION
                    },
                    testCaseDetails: e.SCENARIO_NUMBER ? {
                        scenarioNumber: e.SCENARIO_NUMBER,
                        caseNumber: e.CASE_NUMBER,
                        caseId: e.CASE_ID_DISPLAY,
                        screen: e.SCREEN_NAME,
                        result: e.STATUS === 'PASS' ? 'Sucesso' : e.STATUS === 'FAIL' ? 'Falha' : e.STATUS === 'BLOCKED' ? 'Impedimento' : 'Pendente',
                        objective: e.OBJECTIVE,
                        preRequisite: e.PRE_REQUISITE,
                        condition: e.CONDITION_DESC,
                        expectedResult: e.EXPECTED_RESULT,
                        failureReason: e.FAILURE_REASON,
                        steps: steps
                    } : undefined
                });
            }

            tickets.push({
                id: t.ID_TICKET,
                createdBy: t.CREATED_BY,
                archivedAt: new Date(t.ARCHIVED_AT).getTime(),
                ticketInfo: items.length > 0 ? items[0].ticketInfo : {},
                items: items
            });
        }
        res.json(tickets);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/tickets', async (req, res) => {
    const ticket = req.body;
    const tInfo = ticket.ticketInfo;
    
    try {
        // Insert Header
        await db.simpleExecute(
            `INSERT INTO TB_TICKETS (
                ID_TICKET, EXTERNAL_TICKET_ID, TITLE, SUMMARY, PRIORITY, SPRINT, REQUESTER, 
                ANALYST_ACRONYM, CLIENT_SYSTEM, ENVIRONMENT, ENV_VERSION, DESCRIPTION, SOLUTION, CREATED_BY, ARCHIVED_AT, REQUEST_DATE, EVIDENCE_DATE
            ) VALUES (
                :id, :extId, :title, :summary, :prio, :sprint, :req, 
                :analyst, :client, :env, :ver, :desc, :sol, :creator, CURRENT_TIMESTAMP, TO_DATE(:reqDate, 'YYYY-MM-DD'), TO_DATE(:evDate, 'YYYY-MM-DD')
            )`,
            {
                id: ticket.id,
                extId: tInfo.ticketId,
                title: tInfo.ticketTitle,
                summary: tInfo.ticketSummary,
                prio: tInfo.priority,
                sprint: tInfo.sprint,
                req: tInfo.requester,
                analyst: tInfo.analyst,
                client: tInfo.clientSystem,
                env: tInfo.environment,
                ver: tInfo.environmentVersion,
                desc: tInfo.ticketDescription,
                sol: tInfo.solution,
                creator: ticket.createdBy,
                reqDate: tInfo.requestDate,
                evDate: tInfo.evidenceDate
            }
        );

        // Insert Items
        for (const item of ticket.items) {
            const details = item.testCaseDetails || {};
            
            await db.simpleExecute(
                `INSERT INTO TB_EVIDENCES (
                    ID_EVIDENCE, ID_TICKET, TITLE, DESCRIPTION, IMAGE_URL, STATUS, SEVERITY,
                    CASE_ID_DISPLAY, SCENARIO_NUMBER, CASE_NUMBER, SCREEN_NAME, OBJECTIVE, 
                    PRE_REQUISITE, CONDITION_DESC, EXPECTED_RESULT, FAILURE_REASON
                ) VALUES (
                    :id, :tid, :title, :desc, :img, :status, :sev,
                    :cid, :snum, :cnum, :screen, :obj,
                    :pre, :cond, :exp, :fail
                )`,
                {
                    id: item.id,
                    tid: ticket.id,
                    title: item.title,
                    desc: item.description,
                    img: item.imageUrl,
                    status: item.status,
                    sev: item.severity,
                    cid: details.caseId,
                    snum: details.scenarioNumber,
                    cnum: details.caseNumber,
                    screen: details.screen,
                    obj: details.objective,
                    pre: details.preRequisite,
                    cond: details.condition,
                    exp: details.expectedResult,
                    fail: details.failureReason
                }
            );

            if (details.steps) {
                for (const step of details.steps) {
                    await db.simpleExecute(
                        `INSERT INTO TB_EVIDENCE_STEPS (ID_EVIDENCE, STEP_NUMBER, DESCRIPTION, IMAGE_DATA)
                         VALUES (:eid, :num, :desc, :img)`,
                        {
                            eid: item.id,
                            num: step.stepNumber,
                            desc: step.description,
                            img: step.imageUrl
                        }
                    );
                }
            }
        }

        res.json(ticket);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

app.put('/api/tickets/:id', async (req, res) => {
    const ticket = req.body;
    const tInfo = ticket.ticketInfo;
    const ticketId = req.params.id;

    try {
        // 1. Update Header
        await db.simpleExecute(
            `UPDATE TB_TICKETS SET 
                EXTERNAL_TICKET_ID = :extId, TITLE = :title, SUMMARY = :summary, PRIORITY = :prio, 
                SPRINT = :sprint, REQUESTER = :req, ANALYST_ACRONYM = :analyst, 
                CLIENT_SYSTEM = :client, ENVIRONMENT = :env, ENV_VERSION = :ver, 
                DESCRIPTION = :desc, SOLUTION = :sol, REQUEST_DATE = TO_DATE(:reqDate, 'YYYY-MM-DD'), EVIDENCE_DATE = TO_DATE(:evDate, 'YYYY-MM-DD')
             WHERE ID_TICKET = :id`,
            {
                extId: tInfo.ticketId,
                title: tInfo.ticketTitle,
                summary: tInfo.ticketSummary,
                prio: tInfo.priority,
                sprint: tInfo.sprint,
                req: tInfo.requester,
                analyst: tInfo.analyst,
                client: tInfo.clientSystem,
                env: tInfo.environment,
                ver: tInfo.environmentVersion,
                desc: tInfo.ticketDescription,
                sol: tInfo.solution,
                reqDate: tInfo.requestDate,
                evDate: tInfo.evidenceDate,
                id: ticketId
            }
        );

        // 2. Strategy for items: Delete all evidences and re-insert. 
        // Cascade Delete handles steps.
        await db.simpleExecute('DELETE FROM TB_EVIDENCES WHERE ID_TICKET = :id', { id: ticketId });

        // 3. Re-insert Items
        for (const item of ticket.items) {
            const details = item.testCaseDetails || {};
            
            await db.simpleExecute(
                `INSERT INTO TB_EVIDENCES (
                    ID_EVIDENCE, ID_TICKET, TITLE, DESCRIPTION, IMAGE_URL, STATUS, SEVERITY,
                    CASE_ID_DISPLAY, SCENARIO_NUMBER, CASE_NUMBER, SCREEN_NAME, OBJECTIVE, 
                    PRE_REQUISITE, CONDITION_DESC, EXPECTED_RESULT, FAILURE_REASON
                ) VALUES (
                    :id, :tid, :title, :desc, :img, :status, :sev,
                    :cid, :snum, :cnum, :screen, :obj,
                    :pre, :cond, :exp, :fail
                )`,
                {
                    id: item.id,
                    tid: ticketId,
                    title: item.title,
                    desc: item.description,
                    img: item.imageUrl,
                    status: item.status,
                    sev: item.severity,
                    cid: details.caseId,
                    snum: details.scenarioNumber,
                    cnum: details.caseNumber,
                    screen: details.screen,
                    obj: details.objective,
                    pre: details.preRequisite,
                    cond: details.condition,
                    exp: details.expectedResult,
                    fail: details.failureReason
                }
            );

            if (details.steps) {
                for (const step of details.steps) {
                    await db.simpleExecute(
                        `INSERT INTO TB_EVIDENCE_STEPS (ID_EVIDENCE, STEP_NUMBER, DESCRIPTION, IMAGE_DATA)
                         VALUES (:eid, :num, :desc, :img)`,
                        {
                            eid: item.id,
                            num: step.stepNumber,
                            desc: step.description,
                            img: step.imageUrl
                        }
                    );
                }
            }
        }

        res.json(ticket);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

app.delete('/api/tickets/:id', async (req, res) => {
    try {
        // Cascade delete handles children
        await db.simpleExecute('DELETE FROM TB_TICKETS WHERE ID_TICKET = :id', { id: req.params.id });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// 3. BUGS
app.get('/api/bugs', async (req, res) => {
    try {
        const result = await db.simpleExecute('SELECT * FROM TB_BUGS ORDER BY CREATED_AT DESC');
        const bugs = [];

        for (const b of result.rows) {
            const attResult = await db.simpleExecute('SELECT IMAGE_DATA FROM TB_BUG_ATTACHMENTS WHERE ID_BUG = :id', { id: b.ID_BUG });
            const attachments = attResult.rows.map(r => r.IMAGE_DATA);

            bugs.push({
                id: b.ID_BUG,
                summary: b.SUMMARY,
                status: b.STATUS,
                priority: b.PRIORITY,
                screen: b.SCREEN,
                module: b.MODULE,
                environment: b.ENVIRONMENT,
                date: b.BUG_DATE ? new Date(b.BUG_DATE).toISOString().split('T')[0] : '',
                dev: b.DEV_RESPONSIBLE,
                analyst: b.ANALYST_NAME,
                preRequisites: b.PRE_REQUISITES ? b.PRE_REQUISITES.split(', ') : [], // Using string split logic based on db structure
                scenarioDescription: b.SCENARIO_DESC,
                expectedResult: b.EXPECTED_RESULT,
                description: b.ERROR_DESCRIPTION,
                devFeedback: b.DEV_FEEDBACK,
                observation: b.OBSERVATION,
                createdBy: b.CREATED_BY,
                attachments: attachments
            });
        }
        res.json(bugs);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/bugs', async (req, res) => {
    const bug = req.body;
    try {
        await db.simpleExecute(
            `INSERT INTO TB_BUGS (
                ID_BUG, SUMMARY, STATUS, PRIORITY, SCREEN, MODULE, ENVIRONMENT, BUG_DATE, 
                DEV_RESPONSIBLE, ANALYST_NAME, PRE_REQUISITES, SCENARIO_DESC, EXPECTED_RESULT, 
                ERROR_DESCRIPTION, DEV_FEEDBACK, OBSERVATION, CREATED_BY
            ) VALUES (
                :id, :sum, :stat, :prio, :scr, :mod, :env, TO_DATE(:bDate, 'YYYY-MM-DD'),
                :dev, :analyst, :pre, :scen, :exp, :err, :feed, :obs, :creator
            )`,
            {
                id: bug.id,
                sum: bug.summary,
                stat: bug.status,
                prio: bug.priority,
                scr: bug.screen,
                mod: bug.module,
                env: bug.environment,
                bDate: bug.date,
                dev: bug.dev,
                analyst: bug.analyst,
                pre: bug.preRequisites ? bug.preRequisites.join(', ') : '',
                scen: bug.scenarioDescription,
                exp: bug.expectedResult,
                err: bug.description,
                feed: bug.devFeedback,
                obs: bug.observation,
                creator: bug.createdBy
            }
        );

        if (bug.attachments && bug.attachments.length > 0) {
            for (const img of bug.attachments) {
                await db.simpleExecute(
                    `INSERT INTO TB_BUG_ATTACHMENTS (ID_BUG, IMAGE_DATA) VALUES (:id, :img)`,
                    { id: bug.id, img: img }
                );
            }
        }
        res.json(bug);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

app.put('/api/bugs/:id', async (req, res) => {
    const bug = req.body;
    const bugId = req.params.id;
    try {
        await db.simpleExecute(
            `UPDATE TB_BUGS SET 
                SUMMARY = :sum, STATUS = :stat, PRIORITY = :prio, SCREEN = :scr, MODULE = :mod, 
                ENVIRONMENT = :env, BUG_DATE = TO_DATE(:bDate, 'YYYY-MM-DD'), DEV_RESPONSIBLE = :dev, 
                PRE_REQUISITES = :pre, SCENARIO_DESC = :scen, EXPECTED_RESULT = :exp, 
                ERROR_DESCRIPTION = :err, DEV_FEEDBACK = :feed, OBSERVATION = :obs
             WHERE ID_BUG = :id`,
            {
                sum: bug.summary,
                stat: bug.status,
                prio: bug.priority,
                scr: bug.screen,
                mod: bug.module,
                env: bug.environment,
                bDate: bug.date,
                dev: bug.dev,
                pre: bug.preRequisites ? bug.preRequisites.join(', ') : '',
                scen: bug.scenarioDescription,
                exp: bug.expectedResult,
                err: bug.description,
                feed: bug.devFeedback,
                obs: bug.observation,
                id: bugId
            }
        );

        // Re-insert attachments
        await db.simpleExecute('DELETE FROM TB_BUG_ATTACHMENTS WHERE ID_BUG = :id', { id: bugId });
        
        if (bug.attachments && bug.attachments.length > 0) {
            for (const img of bug.attachments) {
                await db.simpleExecute(
                    `INSERT INTO TB_BUG_ATTACHMENTS (ID_BUG, IMAGE_DATA) VALUES (:id, :img)`,
                    { id: bugId, img: img }
                );
            }
        }
        res.json(bug);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

app.delete('/api/bugs/:id', async (req, res) => {
    try {
        await db.simpleExecute('DELETE FROM TB_BUGS WHERE ID_BUG = :id', { id: req.params.id });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// INIT
db.initialize().then(() => {
    app.listen(PORT, () => {
        console.log(`Servidor rodando na porta ${PORT}`);
    });
});
