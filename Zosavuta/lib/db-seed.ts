/**
 * Seed MySQL with demo data.
 * Run: npx tsx lib/db-seed.ts
 */
import mysql from 'mysql2/promise';
import { DEMO_EVENTS, DEMO_BOOKINGS, DEMO_USERS } from './mock-data';

async function main() {
  const conn = await mysql.createConnection(
    process.env.DATABASE_URL || 'mysql://root:password@localhost:3306/zosavuta'
  );
  console.log('Connected to MySQL. Seeding…');

  // ── Users ──
  for (const u of DEMO_USERS) {
    await conn.execute(
      `INSERT IGNORE INTO users (uid, email, fullName, role, provider)
       VALUES (?, ?, ?, ?, ?)`,
      [u.uid, u.email, u.displayName, u.role, 'seed']
    );
  }
  console.log(`✓ ${DEMO_USERS.length} users`);

  // ── Events ──
  for (const e of DEMO_EVENTS) {
    await conn.execute(
      `INSERT IGNORE INTO events
        (id, title, description, fullDescription, category, date, time, location, venue, image,
         price, ticketsTotal, ticketsAvailable, organizerId, status, busTransport, seatingChart, createdAt)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        Number(e.id), e.title, e.description, e.fullDescription, e.category,
        e.date, e.time, e.location, e.venue, e.image,
        e.price, e.ticketsTotal, e.ticketsAvailable, e.organizer, e.status,
        e.busTransport ? 1 : 0, e.seatingChart ? 1 : 0, e.createdAt,
      ]
    );
  }
  console.log(`✓ ${DEMO_EVENTS.length} events`);

  // ── Orders + tickets ──
  for (const b of DEMO_BOOKINGS) {
    await conn.execute(
      `INSERT IGNORE INTO orders
        (id, userId, eventId, eventTitle, eventDate, eventTime, eventLocation, eventVenue, eventImage,
         quantity, price, totalAmount, status, tier, firstName, lastName, email, phone, paymentMethod,
         busTransport, createdAt)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        b.id, b.userId, Number(b.eventId), b.eventTitle, b.eventDate, b.eventTime,
        b.eventLocation, b.eventVenue, b.eventImage,
        b.quantity, b.price, b.totalAmount, b.status, b.tier || 'Regular',
        b.firstName, b.lastName, b.email, b.phone, b.paymentMethod,
        b.busTransport ? 1 : 0, b.createdAt,
      ]
    );
    for (const tn of b.ticketNumbers ?? []) {
      await conn.execute(
        `INSERT INTO order_tickets (orderId, ticketNumber) VALUES (?, ?)`,
        [b.id, tn]
      );
    }
  }
  console.log(`✓ ${DEMO_BOOKINGS.length} orders`);

  await conn.end();
  console.log('\n✔ Seed complete.');
}

main().catch((err) => { console.error('Seed failed:', err); process.exit(1); });
