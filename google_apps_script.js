// == INSTRUÇÕES DE INSTALAÇÃO ==
// 1. Apague tudo e cole este código completo.
// 2. Salve (Ctrl+S).
// 3. Volte para a sua Planilha e atualize a página (F5).
// 4. Um novo menu aparecerá lá no topo chamado "QAEvidence Sync". Clique nele e em "Ativar Sincronização". Dê as permissões.
// =================================

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('QAEvidence Sync')
    .addItem('Ativar Sincronização em Tempo Real (Webhook)', 'setupTrigger')
    .addToUi();
}
// 1. Abra sua planilha do Google
// 2. Vá em: Extensões > Apps Script
// 3. Cole o código abaixo, salve (Ctrl+S)
// 4. Clique em "Executar" na função setupTrigger (ele vai pedir permissões, autorize)
// =================================

// Módulo: Integração QAEvidence

const WEBHOOK_URL = "https://aqlwziggdwmbrlazpuhv.supabase.co/functions/v1/google-sheets-sync?action=webhook";

function onEditWebhook(e) {
  // Evitar execução se e.source for nulo
  if (!e || !e.source) return;
  
  const sheet = e.source.getActiveSheet();
  const range = e.range;
  const row = range.getRow();
  
  // Ignora edição na linha de cabeçalho
  if (row === 1) return;
  
  const sheetName = sheet.getName();
  
  // Pega a linha inteira para enviar os dados
  const maxCols = sheet.getLastColumn() || 22; 
  const rowValues = sheet.getRange(row, 1, 1, maxCols).getValues()[0];
  
  // No seu mapeamento, a Tag ID (Teste ID) fica na coluna L (Índice 11, pois arrays são zero-based)
  const tagId = rowValues[11]; 
  
  // Se não tiver Tag ID, ignora a alteração (pode ser uma linha em branco ou não formatada)
  if (!tagId || String(tagId).trim() === '') return;
  
  const payload = {
    sheetName: sheetName,
    row: row,
    tagId: String(tagId),
    values: rowValues
  };
  
  const options = {
    'method': 'post',
    'contentType': 'application/json',
    'payload': JSON.stringify(payload)
  };
  
  try {
    UrlFetchApp.fetch(WEBHOOK_URL, options);
  } catch (err) {
    console.error("Erro ao enviar Webhook: " + err.message);
  }
}

// ==== Função auxiliar para criar a trigger de Installable OnEdit ====
// Nota: Às vezes onEdit simples (Simple Trigger) não permite UrlFetchApp por segurança,
// então a recomendação é rodar o setupTrigger 1x.
function setupTrigger() {
  const sheet = SpreadsheetApp.getActive();
  ScriptApp.newTrigger("onEditWebhook")
    .forSpreadsheet(sheet)
    .onEdit()
    .create();
    
  SpreadsheetApp.getUi().alert("Webhook configurado com sucesso! Agora, o QAEvidence receberá as atualizações em tempo real.");
}
