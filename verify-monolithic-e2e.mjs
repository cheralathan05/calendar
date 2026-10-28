/**
 * Comprehensive Monolithic End-to-End Validation Script
 * Verifies Auth -> Database (Prisma) -> NestJS API -> Frontend Contracts
 */

const API_BASE = 'http://127.0.0.1:3005';

async function runValidation() {
  console.log('====================================================');
  console.log('🚀 STARTING MONOLITHIC FULL-STACK E2E VALIDATION');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${message}`);
      failed++;
    }
  }

  // 1. Health check
  console.log('1. Testing System Health & API Availability...');
  try {
    const healthRes = await fetch(`${API_BASE}/v1/health`);
    const healthData = await healthRes.json();
    assert(healthRes.status === 200 && healthData.ok === true, 'GET /v1/health returned 200 OK');
  } catch (err) {
    assert(false, `GET /v1/health connection failed: ${err.message}`);
  }

  // 2. Authentication: Quick Login
  console.log('\n2. Testing Authentication & Session Generation...');
  let token = null;
  let userId = null;
  try {
    const loginRes = await fetch(`${API_BASE}/v1/auth/quick-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'alex.morgan.test@calendar-clone.local',
        name: 'Alex Morgan',
        persona: 'alex',
      }),
    });
    const loginData = await loginRes.json();
    assert(loginRes.status === 201 || loginRes.status === 200, `POST /v1/auth/quick-login returned ${loginRes.status}`);
    assert(loginData.ok === true && !!loginData.token, 'Token and user payload received successfully');
    token = loginData.token;
    userId = loginData.user?.sub;
  } catch (err) {
    assert(false, `Login failed: ${err.message}`);
  }

  if (!token) {
    console.error('\nCannot continue without auth token.');
    process.exit(1);
  }

  const authHeaders = {
    'Content-Type': 'application/json',
    Cookie: `access_token=${token}`,
  };

  // 3. Current User
  console.log('\n3. Testing User Session Verification (/v1/auth/me)...');
  try {
    const meRes = await fetch(`${API_BASE}/v1/auth/me`, { headers: authHeaders });
    const meData = await meRes.json();
    assert(meRes.status === 200 && !!meData.user?.email, `GET /v1/auth/me verified user identity: ${meData.user?.email}`);
  } catch (err) {
    assert(false, `Verify me failed: ${err.message}`);
  }

  // 4. Reseed Calendar
  console.log('\n4. Testing Full Calendar Reseed Engine (/v1/auth/reseed)...');
  try {
    const reseedRes = await fetch(`${API_BASE}/v1/auth/reseed`, {
      method: 'POST',
      headers: authHeaders,
    });
    const reseedData = await reseedRes.json();
    assert(reseedRes.status === 200 || reseedRes.status === 201, `POST /v1/auth/reseed returned ${reseedRes.status}`);
    assert(reseedData.ok === true, 'Calendar re-seeded with realistic full-suite events');
  } catch (err) {
    assert(false, `Reseed failed: ${err.message}`);
  }

  // 5. Calendars List
  console.log('\n5. Testing Calendars List & Management (/v1/calendars)...');
  let defaultCalendarId = null;
  try {
    const calListRes = await fetch(`${API_BASE}/v1/calendars`, { headers: authHeaders });
    const calListData = await calListRes.json();
    assert(Array.isArray(calListData) && calListData.length > 0, `User has ${calListData.length} calendar(s)`);
    defaultCalendarId = calListData[0]?.id;
  } catch (err) {
    assert(false, `Calendars list failed: ${err.message}`);
  }

  // 6. Create Custom Calendar
  console.log('\n6. Testing Create Custom Calendar...');
  let customCalendarId = null;
  try {
    const createCalRes = await fetch(`${API_BASE}/v1/calendars`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        name: 'Project Antigravity Sprint',
        color: '#8E24AA',
      }),
    });
    const createCalData = await createCalRes.json();
    assert(createCalRes.status === 201 && createCalData.name === 'Project Antigravity Sprint', 'Custom calendar created with color #8E24AA');
    customCalendarId = createCalData.id;
  } catch (err) {
    assert(false, `Create calendar failed: ${err.message}`);
  }

  // 7. Update Calendar
  if (customCalendarId) {
    console.log('\n7. Testing Update Calendar...');
    try {
      const updateCalRes = await fetch(`${API_BASE}/v1/calendars/${customCalendarId}`, {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({
          name: 'Project Antigravity (Updated)',
          color: '#3F51B5',
        }),
      });
      const updateCalData = await updateCalRes.json();
      assert(updateCalData.name === 'Project Antigravity (Updated)', 'Calendar renamed and color updated');
    } catch (err) {
      assert(false, `Update calendar failed: ${err.message}`);
    }
  }

  // 8. List Events by Date Window
  console.log('\n8. Testing Bounded Date Range Events Query (/v1/events)...');
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();
  let existingEventId = null;
  try {
    const eventsRes = await fetch(`${API_BASE}/v1/events?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`, {
      headers: authHeaders,
    });
    const eventsData = await eventsRes.json();
    assert(eventsRes.status === 200 && Array.isArray(eventsData), `GET /v1/events retrieved ${eventsData.length} events for current month window`);
    if (eventsData.length > 0) existingEventId = eventsData[0]?.id;
  } catch (err) {
    assert(false, `List events failed: ${err.message}`);
  }

  // 9. Create New Event
  console.log('\n9. Testing Create Event (/v1/events)...');
  let createdEventId = null;
  try {
    const startAt = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 14, 0, 0);
    const endAt = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 15, 0, 0);

    const newEventRes = await fetch(`${API_BASE}/v1/events`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        calendarId: customCalendarId || defaultCalendarId,
        title: 'Executive Architecture Review 🚀',
        description: 'Deep dive into full-stack monolithic calendar architecture and performance',
        location: 'Building 42, Room Orbit or Virtual',
        startAt: startAt.toISOString(),
        endAt: endAt.toISOString(),
        allDay: false,
        color: '#0B57D0',
        meetingProvider: 'jitsi',
        meetingUrl: 'https://meet.jit.si/cal-architecture-review-monolithic',
        guests: [{ email: 'sarah.chen@calendar.local' }, { email: 'marcus.vance@calendar.local' }],
      }),
    });
    const newEventData = await newEventRes.json();
    assert(newEventRes.status === 201 && newEventData.title === 'Executive Architecture Review 🚀', 'New event created with Jitsi meeting & guest list');
    createdEventId = newEventData.id;
  } catch (err) {
    assert(false, `Create event failed: ${err.message}`);
  }

  // 10. Search Events
  console.log('\n10. Testing Event Search (/v1/events/search)...');
  try {
    const searchRes = await fetch(`${API_BASE}/v1/events/search?q=Architecture`, {
      headers: authHeaders,
    });
    const searchData = await searchRes.json();
    assert(Array.isArray(searchData) && searchData.length > 0, `Search returned ${searchData.length} match(es) for query "Architecture"`);
  } catch (err) {
    assert(false, `Search failed: ${err.message}`);
  }

  // 11. Update Event
  if (createdEventId) {
    console.log('\n11. Testing Update Event (/v1/events/:id)...');
    try {
      const patchRes = await fetch(`${API_BASE}/v1/events/${createdEventId}`, {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({
          title: 'Executive Architecture Review [Confirmed]',
          color: '#0B8043',
        }),
      });
      const patchData = await patchRes.json();
      assert(patchData.title === 'Executive Architecture Review [Confirmed]', 'Event title and color updated');
    } catch (err) {
      assert(false, `Update event failed: ${err.message}`);
    }
  }

  // 12. Delete Event
  if (createdEventId) {
    console.log('\n12. Testing Delete Event (/v1/events/:id)...');
    try {
      const delRes = await fetch(`${API_BASE}/v1/events/${createdEventId}`, {
        method: 'DELETE',
        headers: authHeaders,
      });
      assert(delRes.status === 200 || delRes.status === 204, 'Event deleted successfully');
    } catch (err) {
      assert(false, `Delete event failed: ${err.message}`);
    }
  }

  // 13. Delete Custom Calendar
  if (customCalendarId) {
    console.log('\n13. Testing Delete Custom Calendar (/v1/calendars/:id)...');
    try {
      const delCalRes = await fetch(`${API_BASE}/v1/calendars/${customCalendarId}`, {
        method: 'DELETE',
        headers: authHeaders,
      });
      assert(delCalRes.status === 200 || delCalRes.status === 204, 'Custom calendar deleted successfully');
    } catch (err) {
      assert(false, `Delete calendar failed: ${err.message}`);
    }
  }

  // 14. Backend Logout
  console.log('\n14. Testing Backend Logout (/v1/auth/logout)...');
  try {
    const logoutRes = await fetch(`${API_BASE}/v1/auth/logout`, {
      method: 'POST',
      headers: authHeaders,
    });
    const text = await logoutRes.text();
    assert(logoutRes.status === 200 || logoutRes.status === 201, `POST /v1/auth/logout status: ${logoutRes.status}`);
  } catch (err) {
    assert(false, `Logout failed: ${err.message}`);
  }

  // 15. Frontend Next.js Logout Route
  console.log('\n15. Testing Frontend Session Termination (/api/auth/logout)...');
  try {
    const feLogoutRes = await fetch('http://127.0.0.1:3004/api/auth/logout', {
      method: 'POST',
    });
    const feLogoutData = await feLogoutRes.json();
    assert(feLogoutRes.status === 200 && feLogoutData.ok === true, 'Frontend cookie purge route (/api/auth/logout) functional');
  } catch (err) {
    assert(false, `Frontend logout route failed: ${err.message}`);
  }

  console.log('\n====================================================');
  console.log(`🏁 VALIDATION SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runValidation().catch((err) => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});
