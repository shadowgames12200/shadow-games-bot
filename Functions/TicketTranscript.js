'use strict';

const MAX_TRANSCRIPT_MESSAGES = 5000;

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[char]);
}

function safeUrl(value) {
  const url = String(value || '').trim();
  return /^https?:\/\/[^\s"'<>]+$/i.test(url) ? url : '';
}

function formatDate(value) {
  const date = value instanceof Date ? value : new Date(value || Date.now());
  if (Number.isNaN(date.getTime())) return 'Data não informada';
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Sao_Paulo'
  }).format(date);
}

function toDateValue(value) {
  if (value instanceof Date) return value.getTime();
  const numeric = Number(value);
  if (Number.isFinite(numeric) && numeric > 0) return numeric;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

async function collectMessages(thread, maxMessages = MAX_TRANSCRIPT_MESSAGES) {
  const messages = [];
  let before;
  let incomplete = false;
  let fetchError = '';
  const maximum = Math.max(1, Math.min(Number(maxMessages) || MAX_TRANSCRIPT_MESSAGES, MAX_TRANSCRIPT_MESSAGES));

  while (messages.length < maximum) {
    const limit = Math.min(100, maximum - messages.length);
    let batch;
    try {
      batch = await thread.messages.fetch({ limit, ...(before ? { before } : {}) });
    } catch (error) {
      if (!messages.length) throw error;
      incomplete = true;
      fetchError = String(error?.message || 'erro ao buscar mensagens');
      break;
    }

    const page = [...(batch?.values?.() || [])];
    if (!page.length) break;
    messages.push(...page);

    const oldest = page.reduce((current, message) => {
      if (!current) return message;
      return toDateValue(message.createdTimestamp) < toDateValue(current.createdTimestamp) ? message : current;
    }, null);
    if (!oldest?.id || page.length < limit) break;
    before = String(oldest.id);
  }

  if (messages.length >= maximum && before) {
    try {
      const older = await thread.messages.fetch({ limit: 1, before });
      if (older?.size || [...(older?.values?.() || [])].length) incomplete = true;
    } catch (error) {
      incomplete = true;
      fetchError ||= String(error?.message || 'erro ao verificar o restante do histórico');
    }
  }

  messages.sort((a, b) => toDateValue(a.createdTimestamp) - toDateValue(b.createdTimestamp));
  return { messages, incomplete, fetchError, maxMessages: maximum };
}

function renderEmbed(embed) {
  const data = embed?.data || embed || {};
  const title = data.title ? `<div class="embed-title">${escapeHtml(data.title)}</div>` : '';
  const description = data.description ? `<div class="embed-description">${escapeHtml(data.description).replace(/\n/g, '<br>')}</div>` : '';
  const author = data.author?.name ? `<div class="embed-author">${escapeHtml(data.author.name)}</div>` : '';
  const fields = (data.fields || []).map(field =>
    `<div class="embed-field"><b>${escapeHtml(field.name || 'Campo')}</b><div>${escapeHtml(field.value || '').replace(/\n/g, '<br>')}</div></div>`
  ).join('');
  const footer = data.footer?.text ? `<div class="embed-footer">${escapeHtml(data.footer.text)}</div>` : '';
  const url = safeUrl(data.url);
  if (!title && !description && !author && !fields && !footer) return '';
  const content = `${author}${title}${description}${fields ? `<div class="embed-fields">${fields}</div>` : ''}${footer}`;
  return url
    ? `<a class="embed-card" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${content}</a>`
    : `<div class="embed-card">${content}</div>`;
}

function renderAttachment(file) {
  const url = safeUrl(file?.url);
  const name = escapeHtml(file?.name || 'Anexo');
  const type = String(file?.contentType || '').toLowerCase();
  const imageByName = /\.(?:png|jpe?g|gif|webp|avif)$/i.test(String(file?.name || ''));
  const isImage = type.startsWith('image/') || imageByName;
  const size = Number(file?.size || 0);
  const sizeLabel = size > 0 ? `${(size / (1024 * 1024) >= 1 ? size / (1024 * 1024) : size / 1024).toFixed(1)} ${size / (1024 * 1024) >= 1 ? 'MB' : 'KB'}` : '';
  const preview = isImage && url ? `<a class="image-link" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer"><img class="attachment-preview" src="${escapeHtml(url)}" alt="${name}" loading="lazy"></a>` : '';
  const link = url ? `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${name}</a>` : name;
  return `<div class="attachment">${preview}<div class="attachment-meta"><span class="attachment-icon">${isImage ? '▧' : '↗'}</span>${link}${sizeLabel ? `<span class="file-size">${escapeHtml(sizeLabel)}</span>` : ''}</div></div>`;
}

function renderMessage(message, thread) {
  const author = message.author || {};
  let avatar = '';
  try { avatar = safeUrl(author.displayAvatarURL?.({ extension: 'png', size: 96 }) || ''); } catch (_) { /* avatar is optional */ }
  const avatarHtml = avatar
    ? `<img class="avatar" src="${escapeHtml(avatar)}" alt="" loading="lazy">`
    : `<div class="avatar avatar-fallback">${escapeHtml((author.username || author.tag || 'U').slice(0, 1).toUpperCase())}</div>`;
  const authorName = author.globalName || author.displayName || author.tag || author.username || 'Usuário';
  const botBadge = author.bot ? '<span class="bot-badge">BOT</span>' : '';
  const contentValue = message.cleanContent || message.content || '';
  const content = contentValue ? `<div class="message-content">${escapeHtml(contentValue).replace(/\n/g, '<br>')}</div>` : '';
  const attachments = [...(message.attachments?.values?.() || [])].map(renderAttachment).join('');
  const embeds = (message.embeds || []).map(renderEmbed).join('');
  const timestamp = formatDate(message.createdTimestamp);
  const edited = message.editedTimestamp ? `<span class="edited">(editada ${escapeHtml(formatDate(message.editedTimestamp))})</span>` : '';
  const referenceId = message.reference?.messageId;
  const guildId = thread.guildId || thread.guild?.id || '';
  const messageUrl = guildId && message.id ? `https://discord.com/channels/${guildId}/${thread.id}/${message.id}` : '';
  const messageSource = messageUrl
    ? `<a class="message-source" href="${escapeHtml(messageUrl)}" target="_blank" rel="noopener noreferrer">Abrir mensagem ↗</a>`
    : '';
  const reply = referenceId && guildId
    ? `<div class="reply-line">↳ Resposta a <a href="https://discord.com/channels/${escapeHtml(guildId)}/${escapeHtml(thread.id)}/${escapeHtml(referenceId)}" target="_blank" rel="noopener noreferrer">uma mensagem anterior</a></div>`
    : '';
  const fallback = !content && !attachments && !embeds ? '<div class="message-content muted">(Mensagem sem conteúdo textual.)</div>' : '';
  const body = `${reply}${content || fallback}${attachments}${embeds}`;
  return `<article class="message"><div class="avatar-wrap">${avatarHtml}</div><div class="message-body"><div class="message-heading"><span class="author-name">${escapeHtml(authorName)}</span>${botBadge}<time datetime="${new Date(toDateValue(message.createdTimestamp) || Date.now()).toISOString()}">${escapeHtml(timestamp)}</time>${edited}${messageSource}</div>${body}</div></article>`;
}

function renderTranscript({ thread, messages, profile = {}, stateInfo = {}, ownerId = '', incomplete = false, fetchError = '' }) {
  const guildName = thread.guild?.name || 'Servidor';
  const ticketName = String(thread.name || 'Ticket');
  const category = stateInfo.category || ticketName.split('・')[0] || 'Atendimento';
  const openedAt = stateInfo.openedAt || thread.createdTimestamp || messages[0]?.createdTimestamp || Date.now();
  const status = stateInfo.status || 'aberto';
  const closedAt = stateInfo.closedAt || '';
  const closedBy = stateInfo.closedByTag || (stateInfo.closedBy ? `ID ${stateInfo.closedBy}` : '—');
  const owner = stateInfo.ownerTag || (ownerId ? `ID ${ownerId}` : 'Usuário não identificado');
  const avatar = safeUrl(profile.icon);
  const logo = avatar ? `<img class="brand-logo" src="${escapeHtml(avatar)}" alt="">` : '<div class="brand-mark">SG</div>';
  const messageRows = messages.map(message => renderMessage(message, thread)).join('');
  const attachmentCount = messages.reduce((count, message) => count + (message.attachments?.size || [...(message.attachments?.values?.() || [])].length), 0);
  const statusLabel = /resolvido|fechado|closed/i.test(status) ? 'Encerrado' : 'Em andamento';
  const warning = incomplete
    ? `<div class="notice">Histórico parcialmente exportado${fetchError ? `: ${escapeHtml(fetchError)}` : ` (limite de ${MAX_TRANSCRIPT_MESSAGES.toLocaleString('pt-BR')} mensagens atingido)`}.</div>`
    : '';
  const generatedAt = formatDate(Date.now());
  const openedLabel = formatDate(openedAt);
  const closedLabel = closedAt ? formatDate(closedAt) : 'Ainda aberto';
  const linkedPurchase = stateInfo.linkedPurchase ? escapeHtml(stateInfo.linkedPurchase) : '—';

  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light"><title>Transcript • ${escapeHtml(ticketName)}</title>
<style>
:root{color-scheme:light;--ink:#202938;--muted:#728096;--line:#e6eaf0;--canvas:#f3f5f9;--surface:#fff;--brand:#5865f2;--brand-dark:#313a9a;--success:#169b62;--shadow:0 12px 32px rgba(25,36,58,.08)}*{box-sizing:border-box}body{margin:0;background:var(--canvas);color:var(--ink);font:14px/1.55 Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif}.page{width:min(100%,1060px);margin:0 auto;padding:32px 22px 54px}.hero{position:relative;overflow:hidden;border-radius:18px;background:linear-gradient(125deg,#202a44 0%,#313a70 58%,#4a55bd 100%);color:#fff;padding:26px 30px 28px;box-shadow:var(--shadow)}.hero:after{content:"";position:absolute;width:330px;height:330px;right:-95px;top:-180px;border:1px solid rgba(255,255,255,.13);border-radius:50%;box-shadow:0 0 0 35px rgba(255,255,255,.035),0 0 0 75px rgba(255,255,255,.025)}.brand{display:flex;align-items:center;gap:11px;font-weight:750;font-size:13px;letter-spacing:.1em;text-transform:uppercase;color:#d9defe}.brand-logo,.brand-mark{width:38px;height:38px;border-radius:12px;object-fit:cover;background:#fff;color:#303b84;display:grid;place-items:center;font-weight:850;font-size:13px}.eyebrow{margin:23px 0 4px;color:#c4caf7;font-size:11px;letter-spacing:.15em;text-transform:uppercase;font-weight:750}.title-row{display:flex;justify-content:space-between;align-items:center;gap:16px}.title{margin:0;font-size:clamp(22px,4vw,32px);line-height:1.15;overflow-wrap:anywhere}.status{flex:0 0 auto;border:1px solid rgba(255,255,255,.24);border-radius:999px;padding:6px 11px;color:#e7ffef;background:rgba(22,155,98,.2);font-size:12px;font-weight:750}.hero-subtitle{margin:9px 0 0;color:#d7dcfa}.section{margin-top:19px;background:var(--surface);border:1px solid var(--line);border-radius:14px;box-shadow:0 4px 16px rgba(25,36,58,.035)}.section-head{padding:17px 20px;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;gap:12px;align-items:center}.section-head h2{margin:0;font-size:15px}.section-head span{color:var(--muted);font-size:12px}.meta-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:0}.meta{padding:15px 20px;border-bottom:1px solid #eff1f5;min-width:0}.meta-label{font-size:10px;text-transform:uppercase;letter-spacing:.09em;color:var(--muted);font-weight:750}.meta-value{margin-top:4px;font-weight:650;overflow-wrap:anywhere}.messages{padding:2px 20px}.message-link{display:block;color:inherit;text-decoration:none}.message{display:flex;gap:13px;padding:17px 0;border-bottom:1px solid #eff1f5;min-width:0}.message-link:last-child .message{border-bottom:0}.avatar-wrap{flex:0 0 40px}.avatar{width:40px;height:40px;border-radius:50%;object-fit:cover;background:#e9ecfa}.avatar-fallback{display:grid;place-items:center;background:#5865f2;color:#fff;font-weight:800}.message-body{min-width:0;flex:1}.message-heading{display:flex;align-items:baseline;gap:8px;flex-wrap:wrap}.author-name{font-weight:760}.message-heading time,.edited{font-size:11px;color:var(--muted)}.bot-badge{border-radius:4px;background:#5865f2;color:#fff;padding:1px 5px;font-size:9px;font-weight:800;letter-spacing:.04em}.message-content{margin-top:5px;white-space:normal;overflow-wrap:anywhere}.muted{color:var(--muted)}.reply-line{margin:3px 0 7px;color:var(--muted);font-size:12px}.reply-line a{color:var(--brand);text-decoration:none}.attachment{margin-top:9px;max-width:440px;border:1px solid var(--line);border-radius:10px;overflow:hidden;background:#fafbfe}.image-link{display:block}.attachment-preview{display:block;max-width:100%;max-height:340px;object-fit:contain;background:#eef1f6}.attachment-meta{display:flex;align-items:center;gap:7px;padding:9px 11px;font-size:12px}.attachment-meta a{color:var(--brand);font-weight:650;text-decoration:none;overflow-wrap:anywhere}.attachment-icon{color:var(--brand)}.file-size{margin-left:auto;color:var(--muted);white-space:nowrap}.embed-card{display:block;color:inherit;text-decoration:none;margin-top:9px;padding:11px 13px;border-left:4px solid var(--brand);border-radius:5px;background:#f5f6fb;max-width:620px}.embed-author{font-size:11px;color:var(--muted);font-weight:700;margin-bottom:3px}.embed-title{font-weight:760;color:#303b84}.embed-description{margin-top:5px;overflow-wrap:anywhere}.embed-fields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:8px}.embed-field{font-size:12px;overflow-wrap:anywhere}.embed-field b{display:block;margin-bottom:2px}.embed-footer{margin-top:9px;font-size:10px;color:var(--muted)}.notice{margin:14px 20px 4px;padding:10px 12px;border-radius:8px;background:#fff8e8;color:#825d08;font-size:12px}.footer{display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;padding:16px 4px;color:var(--muted);font-size:11px}.footer strong{color:var(--success)}@media(max-width:700px){.page{padding:16px 11px 34px}.hero{padding:20px 18px;border-radius:13px}.title-row{align-items:flex-start;flex-direction:column}.meta-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.meta{padding:12px 14px}.messages{padding:0 13px}.section-head{padding:14px}.embed-fields{grid-template-columns:1fr}}@media(max-width:420px){.meta-grid{grid-template-columns:1fr}.avatar-wrap{flex-basis:34px}.avatar{width:34px;height:34px}}
</style>
</head>
<body><main class="page">
<header class="hero"><div class="brand">${logo}<span>${escapeHtml(profile.name || guildName)} · Central de atendimento</span></div><div class="eyebrow">Registro de atendimento</div><div class="title-row"><h1 class="title">${escapeHtml(ticketName)}</h1><span class="status">${escapeHtml(statusLabel)}</span></div><p class="hero-subtitle">${escapeHtml(guildName)} · Transcript HTML do ticket</p></header>
<section class="section"><div class="section-head"><h2>Resumo do ticket</h2><span>Gerado em ${escapeHtml(generatedAt)}</span></div><div class="meta-grid">
<div class="meta"><div class="meta-label">Solicitante</div><div class="meta-value">${escapeHtml(owner)}</div></div>
<div class="meta"><div class="meta-label">Categoria</div><div class="meta-value">${escapeHtml(category)}</div></div>
<div class="meta"><div class="meta-label">ID do ticket</div><div class="meta-value">${escapeHtml(thread.id)}</div></div>
<div class="meta"><div class="meta-label">Aberto em</div><div class="meta-value">${escapeHtml(openedLabel)}</div></div>
<div class="meta"><div class="meta-label">Encerrado por</div><div class="meta-value">${escapeHtml(closedBy)}</div></div>
<div class="meta"><div class="meta-label">Encerrado em</div><div class="meta-value">${escapeHtml(closedLabel)}</div></div>
<div class="meta"><div class="meta-label">Mensagens</div><div class="meta-value">${messages.length}</div></div>
<div class="meta"><div class="meta-label">Anexos</div><div class="meta-value">${attachmentCount}</div></div>
<div class="meta"><div class="meta-label">Compra vinculada</div><div class="meta-value">${linkedPurchase}</div></div>
</div>${warning}</section>
<section class="section"><div class="section-head"><h2>Histórico da conversa</h2><span>${messages.length} ${messages.length === 1 ? 'mensagem' : 'mensagens'}</span></div><div class="messages">${messageRows || '<div class="message"><div class="message-body muted">Nenhuma mensagem encontrada.</div></div>'}</div></section>
<footer class="footer"><span><strong>Transcript exportado</strong> · ${escapeHtml(profile.name || guildName)}</span><span>Arquivo HTML independente · ${escapeHtml(ticketName)}</span></footer>
</main></body></html>`;
}

module.exports = { MAX_TRANSCRIPT_MESSAGES, collectMessages, renderTranscript, escapeHtml };
