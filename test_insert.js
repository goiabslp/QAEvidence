import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env', 'utf8');
const envMap = {};
env.split('\n').forEach(line => {
  const [key, ...val] = line.split('=');
  if (key && !key.startsWith('#')) envMap[key.trim()] = val.join('=').trim();
});

const supabase = createClient(envMap.VITE_SUPABASE_URL, envMap.VITE_SUPABASE_ANON_KEY);

const evidenceData = {
    ticket_title: 'Rascunho de Chamado',
    ticket_status: 'Pendente',
    created_by: 'TEST',
    archived_at: Date.now(),
    ticket_id: 'DRAFT',
    sprint: '',
    client_system: '',
    requester: '',
    analyst: '',
    request_date: '',
    priority: '',
    error_origin: '',
    environment: '',
    environment_version: '',
    evidence_date: '',
    ticket_description: '',
    solution: '',
    blockage_reason: ''
};

async function test() {
    const { data, error } = await supabase
        .from('evidences')
        .insert(evidenceData)
        .select('id')
        .single();
    
    if (error) {
        console.error("SUPABASE ERROR:", JSON.stringify(error, null, 2));
    } else {
        console.log("SUCCESS:", data);
    }
}
test();
