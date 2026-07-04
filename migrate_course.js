const mysql = require('mysql2/promise');

const DB_CONFIG = {
  host: '127.0.0.1',
  port: 3306,
  user: 'appuser',
  password: 'Givemethehappyjklkkjlkjfdkaiovnnhuihiuhininh',
  database: 'appdb',
};

const SOURCE = 25;
const TARGET = 8;

async function main() {
  const conn = await mysql.createConnection(DB_CONFIG);
  await conn.execute('SET FOREIGN_KEY_CHECKS = 0');

  try {
    await conn.beginTransaction();

    // ── 1. Clear target members + cards ──────────────────────────────────────
    console.log('Step 1: Deleting course 8 members and cards...');
    await conn.execute('DELETE FROM eventCard WHERE course_id = ?', [TARGET]);
    const [delResult] = await conn.execute('DELETE FROM memberMain WHERE course_id = ?', [TARGET]);
    console.log(`  Deleted ${delResult.affectedRows} members.`);

    const memberMap    = new Map(); // old member_id  → new member_id
    const rosterMap    = new Map(); // old roster_id  → new roster_id
    const flightMap    = new Map(); // old flight_id  → new flight_id
    const eventMap     = new Map(); // old event_id   → new event_id
    const subEventMap  = new Map(); // old subevent_id→ new subevent_id
    const cardMap      = new Map(); // old card_id    → new card_id
    const bestBallMap  = new Map(); // old bestball_id→ new bestball_id
    const netskinMap   = new Map(); // old netskin_id → new netskin_id

    // ── 2. Members ───────────────────────────────────────────────────────────
    console.log('Step 2: Copying members...');
    const [members] = await conn.execute('SELECT * FROM memberMain WHERE course_id = ?', [SOURCE]);
    for (const m of members) {
      const [r] = await conn.execute(
        `INSERT INTO memberMain (course_id,firstname,lastname,email,handicap,handicap18,
         oldmember_id,handicapold,rhandicap,maxhandicap,maxhandicap18,membernameold)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
        [TARGET, m.firstname, m.lastname, m.email, m.handicap, m.handicap18,
         m.oldmember_id, m.handicapold, m.rhandicap, m.maxhandicap, m.maxhandicap18, m.membernameold]
      );
      memberMap.set(m.member_id, r.insertId);
    }
    console.log(`  Copied ${memberMap.size} members.`);

    // ── 3. Rosters ───────────────────────────────────────────────────────────
    console.log('Step 3: Copying rosters...');
    const [rosters] = await conn.execute('SELECT * FROM rosterMain WHERE course_id = ?', [SOURCE]);
    for (const r of rosters) {
      const [res] = await conn.execute(
        'INSERT INTO rosterMain (rostername, course_id, active_yn) VALUES (?,?,?)',
        [r.rostername, TARGET, r.active_yn]
      );
      rosterMap.set(r.roster_id, res.insertId);
    }
    console.log(`  Copied ${rosterMap.size} rosters.`);

    // ── 4. Roster flights ────────────────────────────────────────────────────
    console.log('Step 4: Copying roster flights...');
    let flightCount = 0;
    for (const [oldRid, newRid] of rosterMap) {
      const [flights] = await conn.execute('SELECT * FROM rosterFlight WHERE roster_id = ?', [oldRid]);
      for (const f of flights) {
        const [res] = await conn.execute(
          'INSERT INTO rosterFlight (roster_id, flightname, hdcp1, hdcp2) VALUES (?,?,?,?)',
          [newRid, f.flightname, f.hdcp1, f.hdcp2]
        );
        flightMap.set(f.flight_id, res.insertId);
        flightCount++;
      }
    }
    console.log(`  Copied ${flightCount} flights.`);

    // ── 5. Roster member links ───────────────────────────────────────────────
    console.log('Step 5: Copying roster member links...');
    let rmlCount = 0;
    for (const [oldRid, newRid] of rosterMap) {
      const [links] = await conn.execute('SELECT * FROM rosterMemberLink WHERE roster_id = ?', [oldRid]);
      for (const l of links) {
        const newMid = memberMap.get(l.member_id);
        if (!newMid) continue;
        await conn.execute(
          'INSERT INTO rosterMemberLink (roster_id, member_id, hdcp) VALUES (?,?,?)',
          [newRid, newMid, l.hdcp]
        );
        rmlCount++;
      }
    }
    console.log(`  Copied ${rmlCount} roster member links.`);

    // ── 6. Events ────────────────────────────────────────────────────────────
    console.log('Step 6: Copying events...');
    const [events] = await conn.execute('SELECT * FROM eventMain WHERE course_id = ?', [SOURCE]);
    for (const e of events) {
      const [res] = await conn.execute(
        `INSERT INTO eventMain (course_id,eventname,eventdescription,start_dt,end_dt,
         handicap_yn,oldevent_id,nine_id,last_handicap_posted)
         VALUES (?,?,?,?,?,?,?,?,?)`,
        [TARGET, e.eventname, e.eventdescription, e.start_dt, e.end_dt,
         e.handicap_yn, e.oldevent_id, e.nine_id, e.last_handicap_posted]
      );
      eventMap.set(e.event_id, res.insertId);
    }
    console.log(`  Copied ${eventMap.size} events.`);

    const oldEventIds = Array.from(eventMap.keys());

    // ── 7. Sub-events ────────────────────────────────────────────────────────
    console.log('Step 7: Copying sub-events...');
    let seCount = 0;
    for (const oldEid of oldEventIds) {
      const [rows] = await conn.execute('SELECT * FROM subEventMain WHERE event_id = ?', [oldEid]);
      for (const se of rows) {
        const [res] = await conn.execute(
          `INSERT INTO subEventMain (course_id,event_id,eventtype_id,eventnumhole_id,roster_id,amount,addedmoney)
           VALUES (?,?,?,?,?,?,?)`,
          [TARGET, eventMap.get(oldEid), se.eventtype_id, se.eventnumhole_id,
           se.roster_id ? (rosterMap.get(se.roster_id) ?? null) : null,
           se.amount, se.addedmoney]
        );
        subEventMap.set(se.subevent_id, res.insertId);
        seCount++;
      }
    }
    console.log(`  Copied ${seCount} sub-events.`);

    // ── 8. Event cards ───────────────────────────────────────────────────────
    console.log('Step 8: Copying event cards...');
    let cardCount = 0;
    for (const oldEid of oldEventIds) {
      const [rows] = await conn.execute(
        'SELECT * FROM eventCard WHERE event_id = ? AND course_id = ?', [oldEid, SOURCE]
      );
      for (const c of rows) {
        const newMid = memberMap.get(c.member_id);
        if (!newMid) continue;
        const [res] = await conn.execute(
          `INSERT INTO eventCard (course_id,member_id,event_id,nine_id,
           hole1,hole2,hole3,hole4,hole5,hole6,hole7,hole8,hole9,
           gross,net,adjustedscore,handicap,hdiff,card_dt,newhandicap,oldhandicap,skins_yn,
           hole10,hole11,hole12,hole13,hole14,hole15,hole16,hole17,hole18,numholes)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          [TARGET, newMid, eventMap.get(oldEid), c.nine_id,
           c.hole1, c.hole2, c.hole3, c.hole4, c.hole5, c.hole6, c.hole7, c.hole8, c.hole9,
           c.gross, c.net, c.adjustedscore, c.handicap, c.hdiff, c.card_dt,
           c.newhandicap, c.oldhandicap, c.skins_yn,
           c.hole10, c.hole11, c.hole12, c.hole13, c.hole14, c.hole15, c.hole16, c.hole17, c.hole18,
           c.numholes]
        );
        cardMap.set(c.card_id, res.insertId);
        cardCount++;
      }
    }
    console.log(`  Copied ${cardCount} cards.`);

    // ── 9. Event handicaps ───────────────────────────────────────────────────
    console.log('Step 9: Copying event handicaps...');
    let ehCount = 0;
    for (const oldEid of oldEventIds) {
      const [rows] = await conn.execute('SELECT * FROM eventHandicap WHERE event_id = ?', [oldEid]);
      for (const h of rows) {
        const newMid = memberMap.get(h.member_id);
        if (!newMid) continue;
        await conn.execute(
          `INSERT INTO eventHandicap (event_id,member_id,handicap,rhandicap,totalcards,cardsused,
           totaldiffs,handicap18,totalcards18,cardsused18,totaldiffs18,rhandicap18)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
          [eventMap.get(oldEid), newMid, h.handicap, h.rhandicap, h.totalcards, h.cardsused,
           h.totaldiffs, h.handicap18, h.totalcards18, h.cardsused18, h.totaldiffs18, h.rhandicap18]
        );
        ehCount++;
      }
    }
    console.log(`  Copied ${ehCount} event handicaps.`);

    // ── 10. Sub-event flight results ─────────────────────────────────────────
    console.log('Step 10: Copying sub-event flight results...');
    let sefCount = 0;
    for (const [oldSeid, newSeid] of subEventMap) {
      const [rows] = await conn.execute('SELECT * FROM subEventFlight WHERE subevent_id = ?', [oldSeid]);
      for (const r of rows) {
        await conn.execute(
          `INSERT INTO subEventFlight (subevent_id,card_id,member_id,handicap,flight_id,
           score,amount,place,used_yn,card18_id)
           VALUES (?,?,?,?,?,?,?,?,?,?)`,
          [newSeid,
           r.card_id   ? (cardMap.get(r.card_id)     ?? null) : null,
           r.member_id ? (memberMap.get(r.member_id) ?? null) : null,
           r.handicap,
           r.flight_id ? (flightMap.get(r.flight_id) ?? null) : null,
           r.score, r.amount, r.place, r.used_yn,
           r.card18_id ? (cardMap.get(r.card18_id)   ?? null) : null]
        );
        sefCount++;
      }
    }
    console.log(`  Copied ${sefCount} sub-event flight results.`);

    // ── 11. Sub-event pay gross ──────────────────────────────────────────────
    console.log('Step 11: Copying sub-event pay gross...');
    let sepgCount = 0;
    for (const oldEid of oldEventIds) {
      const [rows] = await conn.execute('SELECT * FROM subEventPayGross WHERE event_id = ?', [oldEid]);
      for (const r of rows) {
        await conn.execute(
          `INSERT INTO subEventPayGross (card_id,amount,used_yn,score,place,subevent_id,event_id,flight_id,member_id)
           VALUES (?,?,?,?,?,?,?,?,?)`,
          [r.card_id    ? (cardMap.get(r.card_id)       ?? null) : null,
           r.amount, r.used_yn, r.score, r.place,
           r.subevent_id? (subEventMap.get(r.subevent_id)??null) : null,
           eventMap.get(oldEid),
           r.flight_id  ? (flightMap.get(r.flight_id)   ?? null) : null,
           r.member_id  ? (memberMap.get(r.member_id)   ?? null) : null]
        );
        sepgCount++;
      }
    }
    console.log(`  Copied ${sepgCount} sub-event pay gross.`);

    // ── 12. Sub-event pay net ────────────────────────────────────────────────
    console.log('Step 12: Copying sub-event pay net...');
    let sepnCount = 0;
    for (const oldEid of oldEventIds) {
      const [rows] = await conn.execute('SELECT * FROM subEventPayNet WHERE event_id = ?', [oldEid]);
      for (const r of rows) {
        await conn.execute(
          `INSERT INTO subEventPayNet (card_id,amount,used_yn,score,place,subevent_id,event_id,flight_id,member_id)
           VALUES (?,?,?,?,?,?,?,?,?)`,
          [r.card_id    ? (cardMap.get(r.card_id)        ?? null) : null,
           r.amount, r.used_yn, r.score, r.place,
           r.subevent_id? (subEventMap.get(r.subevent_id)??null) : null,
           eventMap.get(oldEid),
           r.flight_id  ? (flightMap.get(r.flight_id)    ?? null) : null,
           r.member_id  ? (memberMap.get(r.member_id)    ?? null) : null]
        );
        sepnCount++;
      }
    }
    console.log(`  Copied ${sepnCount} sub-event pay net.`);

    // ── 13. Sub-event pay chicago ────────────────────────────────────────────
    console.log('Step 13: Copying sub-event pay chicago...');
    let sepcCount = 0;
    for (const oldEid of oldEventIds) {
      const [rows] = await conn.execute('SELECT * FROM subEventPayChicago WHERE event_id = ?', [oldEid]);
      for (const r of rows) {
        await conn.execute(
          `INSERT INTO subEventPayChicago (card_id,amount,used_yn,score,place,subevent_id,event_id,flight_id,member_id)
           VALUES (?,?,?,?,?,?,?,?,?)`,
          [r.card_id    ? (cardMap.get(r.card_id)        ?? null) : null,
           r.amount, r.used_yn, r.score, r.place,
           r.subevent_id? (subEventMap.get(r.subevent_id)??null) : null,
           eventMap.get(oldEid),
           r.flight_id  ? (flightMap.get(r.flight_id)    ?? null) : null,
           r.member_id  ? (memberMap.get(r.member_id)    ?? null) : null]
        );
        sepcCount++;
      }
    }
    console.log(`  Copied ${sepcCount} sub-event pay chicago.`);

    // ── 14. Best ball ────────────────────────────────────────────────────────
    console.log('Step 14: Copying best ball...');
    let bbCount = 0;
    for (const oldEid of oldEventIds) {
      const [rows] = await conn.execute('SELECT * FROM eventBestBall WHERE event_id = ?', [oldEid]);
      for (const r of rows) {
        const [res] = await conn.execute(
          `INSERT INTO eventBestBall (event_id,member1_id,member2_id,card1_id,card2_id,
           handicap1,handicap2,score,net,gross,handicap)
           VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
          [eventMap.get(oldEid),
           r.member1_id ? (memberMap.get(r.member1_id) ?? null) : null,
           r.member2_id ? (memberMap.get(r.member2_id) ?? null) : null,
           r.card1_id   ? (cardMap.get(r.card1_id)     ?? null) : null,
           r.card2_id   ? (cardMap.get(r.card2_id)     ?? null) : null,
           r.handicap1, r.handicap2, r.score, r.net, r.gross, r.handicap]
        );
        bestBallMap.set(r.bestball_id, res.insertId);
        bbCount++;
      }
    }
    console.log(`  Copied ${bbCount} best ball records.`);

    // ── 15. Sub-event BB pay gross ───────────────────────────────────────────
    console.log('Step 15: Copying sub-event BB pay gross...');
    let sebbgCount = 0;
    for (const oldEid of oldEventIds) {
      const [rows] = await conn.execute('SELECT * FROM subEventBBPayGross WHERE event_id = ?', [oldEid]);
      for (const r of rows) {
        await conn.execute(
          `INSERT INTO subEventBBPayGross (bestball_id,amount,used_yn,score,place,subevent_id,event_id,flight_id,member1_id,member2_id)
           VALUES (?,?,?,?,?,?,?,?,?,?)`,
          [r.bestball_id  ? (bestBallMap.get(r.bestball_id) ?? null) : null,
           r.amount, r.used_yn, r.score, r.place,
           r.subevent_id  ? (subEventMap.get(r.subevent_id) ?? null) : null,
           eventMap.get(oldEid),
           r.flight_id    ? (flightMap.get(r.flight_id)     ?? null) : null,
           r.member1_id   ? (memberMap.get(r.member1_id)    ?? null) : null,
           r.member2_id   ? (memberMap.get(r.member2_id)    ?? null) : null]
        );
        sebbgCount++;
      }
    }
    console.log(`  Copied ${sebbgCount} sub-event BB pay gross.`);

    // ── 16. Sub-event BB pay net ─────────────────────────────────────────────
    console.log('Step 16: Copying sub-event BB pay net...');
    let sebbnCount = 0;
    for (const oldEid of oldEventIds) {
      const [rows] = await conn.execute('SELECT * FROM subEventBBPayNet WHERE event_id = ?', [oldEid]);
      for (const r of rows) {
        await conn.execute(
          `INSERT INTO subEventBBPayNet (bestball_id,amount,used_yn,score,place,subevent_id,event_id,flight_id,member1_id,member2_id)
           VALUES (?,?,?,?,?,?,?,?,?,?)`,
          [r.bestball_id  ? (bestBallMap.get(r.bestball_id) ?? null) : null,
           r.amount, r.used_yn, r.score, r.place,
           r.subevent_id  ? (subEventMap.get(r.subevent_id) ?? null) : null,
           eventMap.get(oldEid),
           r.flight_id    ? (flightMap.get(r.flight_id)     ?? null) : null,
           r.member1_id   ? (memberMap.get(r.member1_id)    ?? null) : null,
           r.member2_id   ? (memberMap.get(r.member2_id)    ?? null) : null]
        );
        sebbnCount++;
      }
    }
    console.log(`  Copied ${sebbnCount} sub-event BB pay net.`);

    // ── 17. Event skins ──────────────────────────────────────────────────────
    console.log('Step 17: Copying event skins...');
    let skinCount = 0;
    for (const oldEid of oldEventIds) {
      const [rows] = await conn.execute('SELECT * FROM eventSkin WHERE event_id = ?', [oldEid]);
      for (const r of rows) {
        await conn.execute(
          `INSERT INTO eventSkin (event_id,subevent_id,flight_id,member_id,hole,score,amount,card_id)
           VALUES (?,?,?,?,?,?,?,?)`,
          [eventMap.get(oldEid),
           r.subevent_id ? (subEventMap.get(r.subevent_id) ?? null) : null,
           r.flight_id   ? (flightMap.get(r.flight_id)     ?? null) : null,
           r.member_id   ? (memberMap.get(r.member_id)     ?? null) : null,
           r.hole, r.score, r.amount,
           r.card_id     ? (cardMap.get(r.card_id)         ?? null) : null]
        );
        skinCount++;
      }
    }
    console.log(`  Copied ${skinCount} skins.`);

    // ── 18. Sub-event skin net ───────────────────────────────────────────────
    console.log('Step 18: Copying sub-event skin net...');
    let sesnCount = 0;
    for (const oldEid of oldEventIds) {
      const [rows] = await conn.execute('SELECT * FROM subEventSkinNet WHERE event_id = ?', [oldEid]);
      for (const r of rows) {
        const [res] = await conn.execute(
          `INSERT INTO subEventSkinNet (subevent_id,event_id,member_id,card_id,handicap,
           hole1,hole2,hole3,hole4,hole5,hole6,hole7,hole8,hole9,
           hhole1,hhole2,hhole3,hhole4,hhole5,hhole6,hhole7,hhole8,hhole9,amount,
           hole10,hole11,hole12,hole13,hole14,hole15,hole16,hole17,hole18,
           hhole10,hhole11,hhole12,hhole13,hhole14,hhole15,hhole16,hhole17,hhole18)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          [r.subevent_id ? (subEventMap.get(r.subevent_id) ?? null) : null,
           eventMap.get(oldEid),
           r.member_id   ? (memberMap.get(r.member_id)     ?? null) : null,
           r.card_id     ? (cardMap.get(r.card_id)         ?? null) : null,
           r.handicap,
           r.hole1,r.hole2,r.hole3,r.hole4,r.hole5,r.hole6,r.hole7,r.hole8,r.hole9,
           r.hhole1,r.hhole2,r.hhole3,r.hhole4,r.hhole5,r.hhole6,r.hhole7,r.hhole8,r.hhole9,
           r.amount,
           r.hole10,r.hole11,r.hole12,r.hole13,r.hole14,r.hole15,r.hole16,r.hole17,r.hole18,
           r.hhole10,r.hhole11,r.hhole12,r.hhole13,r.hhole14,r.hhole15,r.hhole16,r.hhole17,r.hhole18]
        );
        netskinMap.set(r.netskin_id, res.insertId);
        sesnCount++;
      }
    }
    console.log(`  Copied ${sesnCount} sub-event skin net.`);

    // ── 19. Sub-event skin net results ───────────────────────────────────────
    console.log('Step 19: Copying sub-event skin net results...');
    let sesnrCount = 0;
    for (const oldEid of oldEventIds) {
      const [rows] = await conn.execute('SELECT * FROM subEventSkinNetResults WHERE event_id = ?', [oldEid]);
      for (const r of rows) {
        await conn.execute(
          `INSERT INTO subEventSkinNetResults (event_id,subevent_id,flight_id,member_id,hole,score,amount,netskin_id)
           VALUES (?,?,?,?,?,?,?,?)`,
          [eventMap.get(oldEid),
           r.subevent_id ? (subEventMap.get(r.subevent_id) ?? null) : null,
           r.flight_id   ? (flightMap.get(r.flight_id)     ?? null) : null,
           r.member_id   ? (memberMap.get(r.member_id)     ?? null) : null,
           r.hole, r.score, r.amount,
           r.netskin_id  ? (netskinMap.get(r.netskin_id)   ?? null) : null]
        );
        sesnrCount++;
      }
    }
    console.log(`  Copied ${sesnrCount} sub-event skin net results.`);

    // ── 20. Money list ───────────────────────────────────────────────────────
    console.log('Step 20: Copying money list...');
    let mlCount = 0;
    for (const oldEid of oldEventIds) {
      const [rows] = await conn.execute('SELECT * FROM eventMoneyList WHERE event_id = ?', [oldEid]);
      for (const r of rows) {
        const newMid = memberMap.get(r.member_id);
        if (!newMid) continue;
        await conn.execute(
          `INSERT INTO eventMoneyList (member_id,amount,event_id,subevent_id,payout_date,
           description,place,flight_id,payout_type,source_table,source_id)
           VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
          [newMid, r.amount, eventMap.get(oldEid),
           r.subevent_id ? (subEventMap.get(r.subevent_id) ?? null) : null,
           r.payout_date, r.description, r.place,
           r.flight_id   ? (flightMap.get(r.flight_id)     ?? null) : null,
           r.payout_type, r.source_table, r.source_id]
        );
        mlCount++;
      }
    }
    console.log(`  Copied ${mlCount} money list entries.`);

    // ── 21. Other pay ────────────────────────────────────────────────────────
    console.log('Step 21: Copying other pay...');
    let opCount = 0;
    for (const oldEid of oldEventIds) {
      const [rows] = await conn.execute('SELECT * FROM eventOtherPay WHERE event_id = ?', [oldEid]);
      for (const r of rows) {
        const newMid = memberMap.get(r.member_id);
        if (!newMid) continue;
        await conn.execute(
          'INSERT INTO eventOtherPay (event_id, member_id, amount, description) VALUES (?,?,?,?)',
          [eventMap.get(oldEid), newMid, r.amount, r.description]
        );
        opCount++;
      }
    }
    console.log(`  Copied ${opCount} other pay entries.`);

    // ── 22. Event files ──────────────────────────────────────────────────────
    console.log('Step 22: Copying event files...');
    let efCount = 0;
    for (const oldEid of oldEventIds) {
      const [rows] = await conn.execute('SELECT * FROM eventFile WHERE event_id = ?', [oldEid]);
      for (const r of rows) {
        await conn.execute(
          `INSERT INTO eventFile (event_id,file_key,filename,content_type,size_bytes,uploaded_at)
           VALUES (?,?,?,?,?,?)`,
          [eventMap.get(oldEid), r.file_key, r.filename, r.content_type, r.size_bytes, r.uploaded_at]
        );
        efCount++;
      }
    }
    console.log(`  Copied ${efCount} event files.`);

    await conn.commit();
    console.log('\n✅ Migration complete!');
    console.log(`   Members: ${memberMap.size}, Events: ${eventMap.size}, Cards: ${cardCount}`);

  } catch (err) {
    await conn.rollback();
    console.error('\n❌ Error — rolled back everything:', err.message);
    process.exit(1);
  } finally {
    await conn.execute('SET FOREIGN_KEY_CHECKS = 1');
    await conn.end();
  }
}

main().catch(console.error);
