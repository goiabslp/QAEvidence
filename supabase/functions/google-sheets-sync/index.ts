// @ts-nocheck
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { JWT } from 'npm:google-auth-library@9'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function getGoogleAuthClient() {
    let serviceAccountStr = Deno.env.get('GOOGLE_SERVICE_ACCOUNT');
    if (!serviceAccountStr) {
        throw new Error("Missing GOOGLE_SERVICE_ACCOUNT secret in Supabase. Please add it via CLI or Dashboard.");
    }
    
    let credentials;
    try {
        credentials = JSON.parse(serviceAccountStr);
        if (credentials.private_key) {
            credentials.private_key = credentials.private_key.replace(/\\n/g, '\n');
        }
    } catch (e) {
        throw new Error("Invalid GOOGLE_SERVICE_ACCOUNT JSON");
    }

    const client = new JWT({
        email: credentials.client_email,
        key: credentials.private_key,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    return client;
}

const COLUMN_KEYS = [
    'steps_text', 'browser', 'bank', 'backoffice', 'mobile', 'analyst', 'automated',
    'bcs_code', 'use_case', 'minimum', 'priority', 'test_id', 'module', 'objective',
    'estimated_time', 'prerequisite', 'description', 'acceptance_criteria', 'result',
    'error_status', 'observation', 'gap'
]; // 22 columns corresponding to A to V

const mapResult = (raw: string) => {
    const rawTrimmed = (raw || '').trim().toLowerCase();
    if (rawTrimmed === '') return 'Pendente';
    if (rawTrimmed === 'ok') return 'Sucesso';
    if (rawTrimmed === 'erro') return 'Erro';
    if (rawTrimmed === 'em andamento') return 'Em Andamento';
    if (rawTrimmed === 'impedimento') return 'Impedimento';
    
    // Explicit return exact casing
    if (raw === 'Pendente') return 'Pendente';
    if (raw === 'Sucesso') return 'Sucesso';
    if (raw === 'Erro') return 'Erro';

    // Se houver algum valor extra já correto ("Pendente", "Sucesso" da própria planilha caso escrevam assim)
    if (rawTrimmed === 'pendente') return 'Pendente';
    if (rawTrimmed === 'sucesso') return 'Sucesso';

    return raw || 'Pendente';
};

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const url = new URL(req.url);
        const action = url.searchParams.get('action');

        const supabaseUrl = Deno.env.get('SUPABASE_URL') || Deno.env.get('SUPABASE_DB_URL');
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
        const supabase = createClient(supabaseUrl!, supabaseKey!);

        // Webhook (Google -> System) logic
        if (action === 'webhook') {
            const body = await req.json();
            const { sheetName, row, values, tagId } = body;
            
            // Expected webhoook body:
            // { sheetName: "NomeDaPlanilha", row: 5, tagId: "QA-0001", values: ["...", "..."] }

            // Log reception
            await supabase.from('google_sheets_logs').insert({
                action: 'WEBHOOK_RECEIVED',
                status: 'INFO',
                details: body
            });

            if (!tagId) {
                return new Response(JSON.stringify({ error: "Missing tagId" }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
            }

            // Map values to object
            const updateData: any = {};
            for (let i = 0; i < COLUMN_KEYS.length; i++) {
                let val = values[i] || '';
                if (COLUMN_KEYS[i] === 'result') val = mapResult(val);
                updateData[COLUMN_KEYS[i]] = val;
            }
            
            // Ensure tagId is explicitly set as test_id in case values array is short
            if (!updateData['test_id']) {
                updateData['test_id'] = tagId;
            }

            // We use upsert so that if the user adds a new row and edits it, it gets created automatically in Supabase.
            const { error: updateErr, data: returnData } = await supabase
                .from('excel_test_records')
                .upsert(updateData, { onConflict: 'test_id' })
                .select('id, test_id');

            if (updateErr) {
                await supabase.from('google_sheets_logs').insert({
                    action: 'WEBHOOK_UPSERT_ERROR',
                    status: 'FAILED',
                    details: updateErr.message
                });
                throw new Error("DB Upsert Error: " + updateErr.message);
            }

            if (!returnData || returnData.length === 0) {
                 await supabase.from('google_sheets_logs').insert({
                    action: 'WEBHOOK_UPSERT_WARNING',
                    status: 'WARNING',
                    details: { tagId, message: "Upsert returned empty" }
                });
            } else {
                 await supabase.from('google_sheets_logs').insert({
                    action: 'WEBHOOK_UPSERT_SUCCESS',
                    status: 'SUCCESS',
                    details: { tagId, updatedId: returnData[0].id }
                });
            }

            return new Response(JSON.stringify({ success: true, message: "Record updated" }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }
        
        if (action === 'webhook_bulk') {
            const body = await req.json();
            const { sheetName, updates } = body;
            
            await supabase.from('google_sheets_logs').insert({
                action: 'WEBHOOK_BULK_RECEIVED',
                status: 'INFO',
                details: { sheetName, updateCount: updates.length }
            });

            if (!updates || !Array.isArray(updates)) {
                return new Response(JSON.stringify({ error: "Missing or invalid updates array" }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
            }

            const upsertPayloads = updates.map((update: any) => {
                const mapData: any = {};
                for (let i = 0; i < COLUMN_KEYS.length; i++) {
                    let val = typeof update.values[i] === 'string' ? update.values[i].trim() : (update.values[i] || '');
                    
                    if (COLUMN_KEYS[i] === 'result') {
                        val = mapResult(val);
                    }
                    
                    mapData[COLUMN_KEYS[i]] = val;
                }
                if (!mapData['test_id']) mapData['test_id'] = update.tagId;
                return mapData;
            }).filter((p: any) => p.test_id); // Only ones with IDs

            if (upsertPayloads.length === 0) {
                 return new Response(JSON.stringify({ success: true, message: "No valid records with tagId found to update" }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                });
            }

            const { error: updateErr, data: returnData } = await supabase
                .from('excel_test_records')
                .upsert(upsertPayloads, { onConflict: 'test_id' })
                .select('id, test_id');

            if (updateErr) {
                await supabase.from('google_sheets_logs').insert({
                    action: 'WEBHOOK_BULK_UPSERT_ERROR',
                    status: 'FAILED',
                    details: updateErr.message
                });
                throw new Error("DB Bulk Upsert Error: " + updateErr.message);
            }

            await supabase.from('google_sheets_logs').insert({
                action: 'WEBHOOK_BULK_UPSERT_SUCCESS',
                status: 'SUCCESS',
                details: { updatedCount: returnData ? returnData.length : 0 }
            });

            return new Response(JSON.stringify({ success: true, message: "Records bulk updated" }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        // Push update (System -> Google) logic
        if (action === 'push') {
            const body = await req.json();
            const { tagId, updates } = body; // updates can just be the entire object or fields

            // Log attempt
            await supabase.from('google_sheets_logs').insert({
                action: 'PUSH_TO_GOOGLE',
                status: 'INFO',
                details: { tagId, updates }
            });

            // Need spreadsheetId
            const { data: config } = await supabase.from('google_sheets_config').select('*').single();
            if (!config || !config.spreadsheet_id) {
                return new Response(JSON.stringify({ error: "Google Sheets not configured" }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
            }

            const spreadsheetId = config.spreadsheet_id;
            const authClient = await getGoogleAuthClient();
            
            // To update Google Sheets, we need the exact row. Finding a row requires finding the tagId.
            // But since the sheet can be 30k elements, reading the entire column L (Tag ID) is standard approach
            const url = 'https://sheets.googleapis.com/v4/spreadsheets/' + spreadsheetId + '/values/A:V';
            const docRes = await authClient.request({ url, method: 'GET' });
            
            const rows: any[] = (docRes.data as any).values || [];
            
            // Column L is index 11
            let targetRowIndex = -1;
            for (let i = 0; i < rows.length; i++) {
                if (rows[i][11] === tagId) {
                    targetRowIndex = i;
                    break;
                }
            }

            if (targetRowIndex === -1) {
                // Not found, should append... (or just ignore/error)
                // Appending:
                const newRow = Array(22).fill('');
                for (let i = 0; i < COLUMN_KEYS.length; i++) {
                    newRow[i] = updates[COLUMN_KEYS[i]] || '';
                }
                newRow[11] = tagId; // enforce tag id

                await authClient.request({
                    url: 'https://sheets.googleapis.com/v4/spreadsheets/' + spreadsheetId + '/values/A1:append?valueInputOption=USER_ENTERED',
                    method: 'POST',
                    data: {
                        values: [newRow]
                    }
                });
                
                return new Response(JSON.stringify({ success: true, message: "Record appended" }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
            }

            // If found, update specifically the changed fields or the whole row
            const updateRow = rows[targetRowIndex];
            // Extend standard length to 22 if the row was shorter
            while(updateRow.length < 22) updateRow.push('');
            
            for (let i = 0; i < COLUMN_KEYS.length; i++) {
                if (updates[COLUMN_KEYS[i]] !== undefined) {
                    updateRow[i] = updates[COLUMN_KEYS[i]] || '';
                }
            }
            updateRow[11] = tagId; // enforce tag id

            // Zero-based index to One-based row number: targetRowIndex + 1
            const rowNumber = targetRowIndex + 1;
            await authClient.request({
                url: 'https://sheets.googleapis.com/v4/spreadsheets/' + spreadsheetId + '/values/A' + rowNumber + ':V' + rowNumber + '?valueInputOption=USER_ENTERED',
                method: 'PUT',
                data: {
                    values: [updateRow]
                }
            });

            return new Response(JSON.stringify({ success: true, message: "Record updated in Google Sheets" }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }
        
        // Push Batch (System -> Google)
        if (action === 'push_batch') {
            const body = await req.json();
            const { updatesArray } = body; // Array of { tagId, updates }
            
            if (!updatesArray || !updatesArray.length) {
                return new Response(JSON.stringify({ success: true, message: "Nothing to update" }), { headers: corsHeaders });
            }

            const { data: config } = await supabase.from('google_sheets_config').select('*').single();
            if (!config || !config.spreadsheet_id) {
                return new Response(JSON.stringify({ error: "Google Sheets not configured" }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
            }

            const spreadsheetId = config.spreadsheet_id;
            const authClient = await getGoogleAuthClient();
            
            // Get the target sheet name (always good to enforce proper sheet reference)
            const metaUrl = `https://sheets.googleapis.com/v4/spreadsheets/${config.spreadsheet_id}?fields=sheets.properties`;
            const metaRes = await authClient.request({ url: metaUrl, method: 'GET' });
            const sheets = (metaRes.data as any).sheets || [];
            let targetSheetName = 'TESTES';
            for (const sheet of sheets) {
                if (sheet.properties.title.toUpperCase() === 'TESTES') {
                    targetSheetName = sheet.properties.title;
                    break;
                }
            }
            
            // Fetch the entire column L to map rows efficiently
            const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${targetSheetName}!A:V`;
            const docRes = await authClient.request({ url, method: 'GET' });
            const rows: any[] = (docRes.data as any).values || [];
            
            // Map tagId -> Row Index (0-based)
            const tagToIndex = new Map<string, number>();
            for (let i = 0; i < rows.length; i++) {
                const id = rows[i][11]; // Column L
                if (id) tagToIndex.set(String(id).trim(), i);
            }
            
            const reqData: any[] = [];
            const appends: any[] = [];
            
            for (const item of updatesArray) {
                const { tagId, updates } = item;
                const rowIndex = tagToIndex.get(tagId);
                
                if (rowIndex === undefined) {
                    // Not found = append
                    const newRow = Array(22).fill('');
                    for (let i = 0; i < COLUMN_KEYS.length; i++) {
                        newRow[i] = updates[COLUMN_KEYS[i]] || '';
                    }
                    newRow[11] = tagId;
                    appends.push(newRow);
                } else {
                    // Update existing row
                    const updateRow = [...rows[rowIndex]];
                    while(updateRow.length < 22) updateRow.push('');
                    
                    for (let i = 0; i < COLUMN_KEYS.length; i++) {
                        if (updates[COLUMN_KEYS[i]] !== undefined) {
                            updateRow[i] = updates[COLUMN_KEYS[i]] || '';
                        }
                    }
                    updateRow[11] = tagId; // enforce tag id
                    
                    const rowNumber = rowIndex + 1;
                    reqData.push({
                        range: `'${targetSheetName}'!A${rowNumber}:V${rowNumber}`,
                        values: [updateRow]
                    });
                }
            }
            
            try {
                // Batch Update
                if (reqData.length > 0) {
                    await authClient.request({
                        url: `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`,
                        method: 'POST',
                        data: {
                            valueInputOption: 'USER_ENTERED',
                            data: reqData
                        }
                    });
                }
                
                // If there are appends
                if (appends.length > 0) {
                    await authClient.request({
                        url: `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${targetSheetName}!A1:append?valueInputOption=USER_ENTERED`,
                        method: 'POST',
                        data: {
                            values: appends
                        }
                    });
                }
                
                return new Response(JSON.stringify({ success: true, updated: reqData.length, appended: appends.length }), { headers: corsHeaders });
            } catch (err: any) {
                return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
            }
        }
        
        if (action === 'describe') {
            const { data: config } = await supabase.from('google_sheets_config').select('*').single();
            if (!config || !config.spreadsheet_id) {
                return new Response(JSON.stringify({ error: "Google Sheets not configured" }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
            }
            
            const authClient = await getGoogleAuthClient();
            const metaUrl = `https://sheets.googleapis.com/v4/spreadsheets/${config.spreadsheet_id}?fields=sheets.properties`;
            const metaRes = await authClient.request({ url: metaUrl, method: 'GET' });
            const sheets = (metaRes.data as any).sheets || [];
            
            let targetSheetName = 'TESTES';
            let maxRows = 30000;
            
            for (const sheet of sheets) {
                if (sheet.properties.title.toUpperCase() === 'TESTES') {
                    targetSheetName = sheet.properties.title;
                    maxRows = sheet.properties?.gridProperties?.rowCount || 30000;
                    break;
                }
            }
            return new Response(JSON.stringify({ targetSheetName, maxRows }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        if (action === 'get_domain_analysts') {
            const { data: config } = await supabase.from('google_sheets_config').select('*').single();
            if (!config || !config.spreadsheet_id) {
                return new Response(JSON.stringify({ error: "Google Sheets not configured" }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
            }
            const authClient = await getGoogleAuthClient();
            const spreadsheetId = config.spreadsheet_id;
            const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Dominio!I2:I1000`;
            try {
                const docRes = await authClient.request({ url, method: 'GET' });
                const rows: any[] = (docRes.data as any).values || [];
                const analysts = Array.from(new Set(rows.map(r => r[0]).filter(val => val && val.trim() !== '')));
                return new Response(JSON.stringify({ analysts }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
            } catch (error: any) {
                return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
            }
        }

        if (action === 'check_modified') {
            const { data: config } = await supabase.from('google_sheets_config').select('*').single();
            if (!config || !config.spreadsheet_id) {
                return new Response(JSON.stringify({ error: "Google Sheets not configured" }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
            }
            
            const authClient = await getGoogleAuthClient();
            // Need to add Drive API scope in the authentication, or just use spreadsheets API if it implies Drive access for the file.
            // Actually, Sheets API does not return modifiedTime. Drive API requires 'https://www.googleapis.com/auth/drive.readonly'.
            // Since we might not have Drive scope, let's just make a dummy request to check if we can get modified time.
            // Wait! The REST API for Drive v3 requires Drive scopes.
            
            // Alternatively, we can use the Spreadsheet Properties from Sheets API. BUT Sheets API has NO modifiedTime.
            // But we can just use the provided Google Service Account to fetch from Drive, assuming it has drive.readonly scope or we add it on the fly.
            try {
                const driveClient = new JWT({
                    email: authClient.email,
                    key: authClient.key,
                    scopes: ['https://www.googleapis.com/auth/drive.readonly'],
                });
                
                const driveUrl = `https://www.googleapis.com/drive/v3/files/${config.spreadsheet_id}?fields=modifiedTime`;
                const driveRes = await driveClient.request({ url: driveUrl, method: 'GET' });
                
                return new Response(JSON.stringify({ modifiedTime: (driveRes.data as any).modifiedTime }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
            } catch (err: any) {
                // Return a fallback or specific error so UI knows
                 return new Response(JSON.stringify({ error: "Could not fetch modifiedTime. " + err.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
            }
        }
        if (action === 'batch') {
            const offsetStr = url.searchParams.get('offset') || '0';
            const limitStr = url.searchParams.get('limit') || '5000';
            const reqSheetName = url.searchParams.get('sheetName') || 'TestesMin';
            const offset = parseInt(offsetStr, 10);
            const limit = parseInt(limitStr, 10);

            if (offset === 0) {
                await supabase.from('google_sheets_logs').insert({
                    action: 'BATCH_SYNC_STARTED',
                    status: 'INFO',
                    details: { offset, limit, sheetName: reqSheetName }
                });
            }

            const { data: config } = await supabase.from('google_sheets_config').select('*').single();
            if (!config || !config.spreadsheet_id) {
                return new Response(JSON.stringify({ error: "Google Sheets not configured" }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
            }

            const spreadsheetId = config.spreadsheet_id;
            const authClient = await getGoogleAuthClient();

            const startRow = offset + 1; // Google Sheets is 1-indexed
            const endRow = offset + limit;
            const encodedSheetName = encodeURIComponent(reqSheetName);
            const fetchUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodedSheetName}!A${startRow}:V${endRow}`;
            
            const docRes = await authClient.request({ url: fetchUrl, method: 'GET' });
            const rowsChunk: any[] = (docRes.data as any).values || [];
            
            let autoGeneratedIds = 0;
            const seenIds = new Set<string>();
            const updatesToGoogle: any[] = [];

            // We update system records with Google sheet data. (Assuming Google is master on batch).
            const batchRecords = rowsChunk.map((row: any, index: number) => {
                // Skip header if it's the absolute first row of the sheet (which is now offset=0, index=0)
                if (offset === 0 && index === 0 && String(row[11]).trim().toLowerCase().includes('teste id')) return null;
                if (!row.some((cell: any) => cell !== '')) return null;

                let tagId = String(row[11] || '').trim();
                
                // If ID is missing or already seen in this batch (duplicate), generate a new one
                if (!tagId || seenIds.has(tagId)) {
                    autoGeneratedIds++;
                    tagId = `AUTO-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
                    
                    const absoluteRow = startRow + index;
                    updatesToGoogle.push({
                        range: `'${reqSheetName}'!L${absoluteRow}:L${absoluteRow}`,
                        values: [[tagId]]
                    });
                }
                
                seenIds.add(tagId);

                return {
                    steps_text: String(row[0] || ''),
                    browser: String(row[1] || ''),
                    bank: String(row[2] || ''),
                    backoffice: String(row[3] || ''),
                    mobile: String(row[4] || ''),
                    analyst: String(row[5] || ''),
                    automated: String(row[6] || ''),
                    bcs_code: String(row[7] || ''),
                    use_case: String(row[8] || ''),
                    minimum: String(row[9] || ''),
                    priority: String(row[10] || ''),
                    test_id: tagId,
                    module: String(row[12] || ''),
                    objective: String(row[13] || ''),
                    estimated_time: String(row[14] || ''),
                    prerequisite: String(row[15] || ''),
                    description: String(row[16] || ''),
                    acceptance_criteria: String(row[17] || ''),
                    result: mapResult(String(row[18] || '')),
                    error_status: String(row[19] || ''),
                    observation: String(row[20] || ''),
                    gap: String(row[21] || ''),
                };
            }).filter(Boolean);

            // If we generated new IDs, we must write them back to Google Sheets to maintain consistency
            if (updatesToGoogle.length > 0) {
                try {
                    const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`;
                    await authClient.request({
                        url: updateUrl,
                        method: 'POST',
                        data: {
                            valueInputOption: 'USER_ENTERED',
                            data: updatesToGoogle
                        }
                    });
                    
                    await supabase.from('google_sheets_logs').insert({
                        action: 'AUTO_ID_GENERATED',
                        status: 'INFO',
                        details: { generatedCount: updatesToGoogle.length, sample: updatesToGoogle[0] }
                    });
                } catch (updateErr: any) {
                    await supabase.from('google_sheets_logs').insert({
                        action: 'ERROR_UPDATING_SHEET',
                        status: 'FAILED',
                        details: updateErr.message
                    });
                }
            }

            // Since we deduped locally, we can just use batchRecords directly, but just in case:
            const uniqueRecordsMap = new Map();
            batchRecords.forEach(record => uniqueRecordsMap.set(record.test_id, record));
            const dedupedRecords = Array.from(uniqueRecordsMap.values());

            if (dedupedRecords.length > 0) {
                // Upsert directly, don't slice again
                const { data: upsertData, error: upsertErr } = await supabase.from('excel_test_records')
                                             .upsert(dedupedRecords, { onConflict: 'test_id' })
                                             .select('id, test_id');
                
                if (upsertErr) {
                    await supabase.from('google_sheets_logs').insert({
                        action: 'ERROR',
                        status: 'FAILED',
                        details: upsertErr
                    });
                } else {
                    await supabase.from('google_sheets_logs').insert({
                        action: 'BATCH_SYNC_PROGRESS',
                        status: 'SUCCESS',
                        details: { offset, limit, processed: batchRecords.length, sample_upsert_result: upsertData && upsertData.length > 0 ? upsertData[0] : null, sample_payload: batchRecords[0] }
                    });
                }
            }

            // If we got fewer rows than requested, we must have hit the end of the data.
            const isFinished = rowsChunk.length < limit;

            return new Response(JSON.stringify({ 
                success: true, 
                recordsProcessed: dedupedRecords.length, 
                duplicatesIgnored: 0, // Now 0 since we automatically process them into unique IDs!
                missingIdsIgnored: 0,
                autoGeneratedIds: autoGeneratedIds,
                isFinished,
                totalRows: 30000 // Placeholder for UI approximation
            }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
        
        if (action === 'cleanup_deleted') {
            const reqSheetName = url.searchParams.get('sheetName') || 'TestesMin';
            
            const { data: config } = await supabase.from('google_sheets_config').select('*').single();
            if (!config || !config.spreadsheet_id) {
                return new Response(JSON.stringify({ error: "Google Sheets not configured" }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
            }

            const spreadsheetId = config.spreadsheet_id;
            const authClient = await getGoogleAuthClient();

            // 1. Fetch all Tag IDs from Google Sheets Column L (excluding header potentially, but we just use all non-empty)
            const encodedSheetName = encodeURIComponent(reqSheetName);
            const fetchUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodedSheetName}!L1:L`;
            const docRes = await authClient.request({ url: fetchUrl, method: 'GET' });
            
            const rows: any[] = (docRes.data as any).values || [];
            const googleIds = new Set<string>();
            for (const row of rows) {
                if (row && row[0]) {
                    const id = String(row[0]).trim();
                    if (id && !id.toLowerCase().includes('teste id')) {
                        googleIds.add(id);
                    }
                }
            }

            // 2. Fetch all IDs from Supabase in loop
            let hasMore = true;
            let offset = 0;
            const limit = 1000;
            const idsToDelete: string[] = [];

            while (hasMore) {
                const { data: dbRecords, error } = await supabase
                    .from('excel_test_records')
                    .select('test_id')
                    .range(offset, offset + limit - 1);
                
                if (error || !dbRecords || dbRecords.length === 0) {
                    hasMore = false;
                    break;
                }

                for (const rec of dbRecords) {
                    const dbId = rec.test_id?.trim();
                    if (dbId && !googleIds.has(dbId)) {
                        idsToDelete.push(dbId);
                    }
                }

                if (dbRecords.length < limit) {
                    hasMore = false;
                } else {
                    offset += limit;
                }
            }

            // 3. Delete from Supabase in chunks
            let deletedCount = 0;
            const chunkSize = 200;
            for (let i = 0; i < idsToDelete.length; i += chunkSize) {
                const chunk = idsToDelete.slice(i, i + chunkSize);
                const { error: delErr } = await supabase
                    .from('excel_test_records')
                    .delete()
                    .in('test_id', chunk);
                
                if (!delErr) {
                    deletedCount += chunk.length;
                }
            }

            await supabase.from('google_sheets_logs').insert({
                action: 'CLEANUP_DELETED_RECORDS',
                status: 'SUCCESS',
                details: { deletedCount, totalGoogleIds: googleIds.size }
            });

            return new Response(JSON.stringify({ success: true, deletedCount }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
        
        return new Response('Invalid action', { status: 400, headers: corsHeaders });

    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
});
