const assert = require('assert');
const { autoApproveLeave } = require('../src/autoApproveLeave');

function d(str) { return new Date(str + 'Z'); }

// Setup common site settings
const site = {
  tz: 'Europe/London',
  leaveAutoApproveDays: 2,
  leaveAutoApproveMaxDeficit: 0
};


// Test: auto approve when no coverage deficit
(function testApprove() {
  const request = { createdAt: d('2023-01-01T00:00'), start: d('2023-01-05T10:00'), end: d('2023-01-05T12:00'), status: 'PENDING' };
  const assignments = [{ start: d('2023-01-05T10:00'), end: d('2023-01-05T12:00'), channel: 'Phone', counted: true }];
  const coverage = { Phone: { '10:00': { staffed: 3, target: 2 }, '10:30': { staffed: 3, target: 2 }, '11:00': { staffed: 3, target: 2 }, '11:30': { staffed: 3, target: 2 } } };
  const ctx = { site, request, assignments, coverage };
  const res = autoApproveLeave(ctx);
  assert.strictEqual(res, true);
  assert.strictEqual(request.status, 'APPROVED');
})();

// Test: reject when coverage deficit would occur
(function testRejectDeficit() {
  const request = { createdAt: d('2023-01-01T00:00'), start: d('2023-01-05T10:00'), end: d('2023-01-05T12:00'), status: 'PENDING' };
  const assignments = [{ start: d('2023-01-05T10:00'), end: d('2023-01-05T12:00'), channel: 'Phone', counted: true }];
  const coverage = { Phone: { '10:00': { staffed: 2, target: 2 }, '10:30': { staffed: 2, target: 2 }, '11:00': { staffed: 2, target: 2 }, '11:30': { staffed: 2, target: 2 } } };
  const ctx = { site, request, assignments, coverage };
  const res = autoApproveLeave(ctx);
  assert.strictEqual(res, false);
  assert.strictEqual(request.status, 'PENDING');
})();

// Test: reject when lead time too short
(function testRejectLeadTime() {
  const request = { createdAt: d('2023-01-01T00:00'), start: d('2023-01-02T10:00'), end: d('2023-01-02T12:00'), status: 'PENDING' };
  const assignments = [{ start: d('2023-01-02T10:00'), end: d('2023-01-02T12:00'), channel: 'Phone', counted: true }];
  const coverage = { Phone: { '10:00': { staffed: 3, target: 2 }, '10:30': { staffed: 3, target: 2 }, '11:00': { staffed: 3, target: 2 }, '11:30': { staffed: 3, target: 2 } } };
  const ctx = { site, request, assignments, coverage };
  const res = autoApproveLeave(ctx);
  assert.strictEqual(res, false);
  assert.strictEqual(request.status, 'PENDING');
})();

// Test: lead time uses site timezone
(function testLeadTimeTimezone() {
  const siteKL = { ...site, tz: 'Asia/Kuala_Lumpur', leaveAutoApproveDays: 1 };
  const request = {
    createdAt: d('2023-01-01T18:00'), // 02:00 local Jan 2
    start: d('2023-01-02T16:00'),     // 00:00 local Jan 3
    end: d('2023-01-02T18:00'),
    status: 'PENDING'
  };
  const assignments = [{ start: d('2023-01-02T16:00'), end: d('2023-01-02T18:00'), channel: 'Phone', counted: true }];
  const coverage = { Phone: { '00:00': { staffed: 3, target: 2 }, '00:30': { staffed: 3, target: 2 }, '01:00': { staffed: 3, target: 2 }, '01:30': { staffed: 3, target: 2 } } };
  const ctx = { site: siteKL, request, assignments, coverage };
  const res = autoApproveLeave(ctx);
  assert.strictEqual(res, true);
  assert.strictEqual(request.status, 'APPROVED');
})();

console.log('All tests passed');
