const MS_PER_MINUTE = 60 * 1000;
const MS_PER_DAY = 24 * 60 * MS_PER_MINUTE;

function localDateString(date, tz) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(date);
}

function daysBetweenLocal(a, b, tz) {
  const startA = Date.parse(localDateString(a, tz));
  const startB = Date.parse(localDateString(b, tz));
  return Math.floor((startB - startA) / MS_PER_DAY);
}

function expandIntervals(assignments, windowStart, windowEnd, tz, intervalMinutes = 30) {
  const intervals = [];
  for (const a of assignments) {
    const start = Math.max(a.start.getTime(), windowStart.getTime());
    const end = Math.min(a.end.getTime(), windowEnd.getTime());
    if (start >= end) continue;
    let cursor = start;
    while (cursor < end) {
      const time = new Intl.DateTimeFormat('en-GB', {
        timeZone: tz,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      }).format(new Date(cursor));
      intervals.push({
        channel: a.channel,
        time,
        counted: a.counted !== false
      });
      cursor += intervalMinutes * MS_PER_MINUTE;
    }
  }
  return intervals;
}

function canAutoApproveLeave(ctx) {
  const { site, request, assignments, coverage } = ctx;
  const leadTimeDays = daysBetweenLocal(request.createdAt, request.start, site.tz);
  if (leadTimeDays < site.leaveAutoApproveDays) return false;
  const intervals = expandIntervals(assignments, request.start, request.end, site.tz);
  for (const i of intervals) {
    const info = (coverage[i.channel] && coverage[i.channel][i.time]) || { staffed: 0, target: 0 };
    const staffed = info.staffed - (i.counted ? 1 : 0);
    const delta = staffed - info.target;
    if (delta < -site.leaveAutoApproveMaxDeficit) return false;
  }
  return true;
}

function autoApproveLeave(ctx) {
  if (!canAutoApproveLeave(ctx)) return false;
  ctx.request.status = 'APPROVED';
  ctx.request.approvedAt = new Date();
  return true;
}

module.exports = { autoApproveLeave, canAutoApproveLeave };
